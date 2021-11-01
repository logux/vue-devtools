import { setupDevtoolsPlugin } from '@vue/devtools-api'
import { parseId } from '@logux/core'

export const userLayerId = 'logux:user'
export const roleLayerId = 'logux:role'
export const cleanLayerId = 'logux:clean'
export const stateLayerId = 'logux:state'
export const actionLayerId = 'logux:action'
export const subscriptionLayerId = 'logux:subscription'

const color = 0xf5a623

export const devtools = {
  api: null,
  install: (app, client, options = {}) => {
    let layers = options.layers || {}
    let ignoreActions = options.ignoreActions || []

    let node = client.node

    let sent = {}
    let cleaned = {}
    let subscribing = {}
    let subscriptions = {}
    let subscriptionId = 0
    let prevConnected = false
    let ignore = ignoreActions.reduce((all, i) => {
      all[i] = true
      return all
    }, {})

    let stopCollector = collectEvents()

    setupDevtoolsPlugin(
      {
        id: 'io.logux.vue-devtools',
        label: 'Logux',
        packageName: '@logux/vue-devtools',
        homepage: 'https://github.com/logux/vue-devtools',
        logo: 'https://logux.io/branding/logo.svg',
        componentStateTypes: ['Logux'],
        app
      },
      api => {
        devtools.api = api
        let preSetupEvents = stopCollector()
        let addTimelineEvent = e => api.addTimelineEvent(e)

        if (options.client !== false) {
          api.on.inspectComponent(payload => {
            if (payload.instanceData) {
              payload.instanceData.state.push({
                key: '$client',
                type: 'Logux',
                value: client,
                editable: false
              })
            }
          })
        }

        if (layers.state !== false) {
          api.addTimelineLayer({
            id: stateLayerId,
            label: 'Logux State',
            color
          })
          bindState(addTimelineEvent)
        }

        if (layers.role !== false) {
          api.addTimelineLayer({
            id: roleLayerId,
            label: 'Logux Tab Role',
            color
          })
          bindRole(addTimelineEvent)
        }

        if (layers.action !== false) {
          api.addTimelineLayer({
            id: actionLayerId,
            label: 'Logux Action',
            color
          })
          bindAction(addTimelineEvent)
        }

        if (layers.subscription !== false) {
          api.addTimelineLayer({
            id: subscriptionLayerId,
            label: 'Logux Subscription',
            color
          })
          bindSubscription(addTimelineEvent)
        }

        if (layers.user !== false) {
          api.addTimelineLayer({
            id: userLayerId,
            label: 'Logux User',
            color
          })
          bindUser(addTimelineEvent)
        }

        if (layers.clean !== false) {
          api.addTimelineLayer({
            id: cleanLayerId,
            label: 'Logux Clean',
            color
          })
          bindClean(addTimelineEvent)
        }

        setTimeout(() => {
          for (let event of preSetupEvents) {
            api.addTimelineEvent(event)
          }
        }, 1000)
      }
    )

    function bindState(cb) {
      return client.on('state', () => {
        let data = {}
        let time = Date.now()

        if (client.state === 'connecting' && node.connection.url) {
          data = {
            nodeId: node.localNodeId,
            server: node.connection.url
          }
        } else if (client.connected && !prevConnected && node.remoteNodeId) {
          prevConnected = true
          data = {
            server: node.remoteNodeId
          }
        } else if (!client.connected) {
          prevConnected = false
        }

        cb({
          layerId: stateLayerId,
          event: {
            title: client.state,
            time,
            data
          }
        })
      })
    }

    function bindRole(cb) {
      return client.on('role', () => {
        cb({
          layerId: roleLayerId,
          event: {
            title: 'Changed',
            subtitle: client.role,
            time: Date.now(),
            data: {
              role: client.role
            }
          }
        })
      })
    }

    function bindSubscription(cb) {
      return client.on('add', (action, meta) => {
        if (
          action.type !== 'logux/processed' &&
          action.type !== 'logux/subscribe' &&
          action.type !== 'logux/subscribed' &&
          action.type !== 'logux/unsubscribe'
        ) {
          return
        }

        if (meta.tab && meta.tab !== client.tabId) return
        if (ignore[action.type]) return
        subscribing[meta.id] = action

        let time = Date.now()

        if (action.type === 'logux/subscribe') {
          subscriptionId += 1
          subscriptions[action.channel] = subscriptionId
          cb({
            layerId: subscriptionLayerId,
            event: {
              title: 'Subscribing',
              subtitle: action.channel,
              groupId: subscriptions[action.channel],
              time,
              data: { action, meta }
            }
          })
        } else if (action.type === 'logux/unsubscribe') {
          cb({
            layerId: subscriptionLayerId,
            event: {
              title: 'Unsubscribed',
              subtitle: action.channel,
              groupId: subscriptions[action.channel],
              time,
              data: { action, meta }
            }
          })
          delete subscriptions[action.channel]
        } else if (action.type === 'logux/processed') {
          if (subscribing[action.id]) {
            let processed = subscribing[action.id]
            if (processed.type === 'logux/subscribe') {
              cb({
                layerId: subscriptionLayerId,
                event: {
                  title: 'Subscribed',
                  subtitle: processed.channel,
                  groupId: subscriptions[processed.channel],
                  time,
                  data: {
                    action: processed
                  }
                }
              })
              delete subscribing[action.id]
            }
            if (processed.type === 'logux/unsubscribe') {
              delete subscribing[action.id]
            }
          }
        } else if (action.type === 'logux/subscribed') {
          cb({
            layerId: subscriptionLayerId,
            event: {
              title: 'Subscribed by server',
              subtitle: action.channel,
              time,
              data: { action, meta }
            }
          })
        }
      })
    }

    function bindAction(cb) {
      return client.on('add', (action, meta) => {
        if (meta.tab && meta.tab !== client.tabId) return
        if (ignore[action.type]) return
        if (meta.sync) sent[meta.id] = action

        let time = Date.now()

        if (
          action.type !== 'logux/subscribe' &&
          action.type !== 'logux/unsubscribe'
        ) {
          if (action.type === 'logux/processed') {
            if (sent[action.id]) {
              let processed = sent[action.id]
              if (processed.type !== 'logux/subscribe') {
                cb({
                  layerId: actionLayerId,
                  event: {
                    title: 'Processed',
                    subtitle: processed.type,
                    time,
                    data: { processed, action, meta }
                  }
                })
              }
              delete sent[action.id]
            } else {
              cb({
                layerId: actionLayerId,
                event: {
                  title: 'Processed',
                  time,
                  data: { action, meta }
                }
              })
            }
          } else if (action.type === 'logux/undo') {
            let data = {
              reason: action.reason,
              action,
              meta
            }

            if (sent[action.id]) {
              data.undone = {
                action: sent[action.id]
              }
              delete sent[action.id]
            }

            cb({
              layerId: actionLayerId,
              event: {
                title: 'Undid',
                subtitle: data.undone.type || '',
                time,
                data
              }
            })
          } else {
            let title = 'Added'
            let data = { action, meta }

            if (meta.reasons.length === 0) {
              cleaned[meta.id] = true
              title += ' and cleaned'
            }

            let { nodeId } = parseId(meta.id)
            if (nodeId !== node.localNodeId) {
              data.by = nodeId
            }

            cb({
              layerId: actionLayerId,
              event: {
                title,
                subtitle: action.type,
                time,
                data
              }
            })
          }
        }
      })
    }

    function bindUser(cb) {
      return client.on('user', userId => {
        cb({
          layerId: userLayerId,
          event: {
            title: 'Changed',
            time: Date.now(),
            data: {
              userId,
              nodeId: client.nodeId
            }
          }
        })
      })
    }

    function bindClean(cb) {
      return client.on('clean', (action, meta) => {
        if (cleaned[meta.id]) {
          delete cleaned[meta.id]
          return
        }
        if (meta.tab && meta.tab !== client.id) return
        if (ignore[action.type]) return
        if (action.type.startsWith('logux/')) return

        cb({
          layerId: cleanLayerId,
          event: {
            title: 'Cleaned',
            subtitle: action.type,
            time: Date.now(),
            data: { action, meta }
          }
        })
      })
    }

    function collectEvents() {
      let events = []
      let unbind = []

      let saveEvent = e => events.push(e)

      if (layers.state !== false) {
        unbind.push(bindState(saveEvent))
      }

      if (layers.role !== false) {
        unbind.push(bindRole(saveEvent))
      }

      if (layers.subscription !== false) {
        unbind.push(bindSubscription(saveEvent))
      }

      if (layers.action !== false) {
        unbind.push(bindAction(saveEvent))
      }

      if (layers.user !== false) {
        unbind.push(bindUser(saveEvent))
      }

      if (layers.clean !== false) {
        unbind.push(bindClean(saveEvent))
      }

      return () => {
        for (let i of unbind) i()
        return events
      }
    }
  }
}
