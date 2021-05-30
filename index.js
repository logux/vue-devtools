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
    let prevConnected = false
    let ignore = ignoreActions.reduce((all, i) => {
      all[i] = true
      return all
    }, {})

    setupDevtoolsPlugin(
      {
        id: 'logux',
        label: 'Logux Vue Devtools',
        packageName: '@logux/vue-devtools',
        homepage: 'https://github.com/logux/vue-devtools',
        logo: 'https://logux.io/branding/logo.svg',
        app
      },
      api => {
        devtools.api = api

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
        }

        if (layers.role !== false) {
          api.addTimelineLayer({
            id: roleLayerId,
            label: 'Logux Tab Role',
            color
          })
        }

        if (layers.action !== false) {
          api.addTimelineLayer({
            id: actionLayerId,
            label: 'Logux Action',
            color
          })
        }

        if (layers.subscription !== false) {
          api.addTimelineLayer({
            id: subscriptionLayerId,
            label: 'Logux Subscription',
            color
          })
        }

        if (layers.user !== false) {
          api.addTimelineLayer({
            id: userLayerId,
            label: 'Logux User',
            color
          })
        }

        if (layers.clean !== false) {
          api.addTimelineLayer({
            id: cleanLayerId,
            label: 'Logux Clean',
            color
          })
        }

        if (layers.state !== false) {
          client.on('state', () => {
            let data = {}
            let time = Date.now()

            if (client.state === 'connecting' && node.connection.url) {
              data = {
                nodeId: node.localNodeId,
                server: node.connection.url
              }
            } else if (
              client.connected &&
              !prevConnected &&
              node.remoteNodeId
            ) {
              prevConnected = true
              data = {
                server: node.remoteNodeId
              }
            } else if (!client.connected) {
              prevConnected = false
            }

            api.addTimelineEvent({
              layerId: stateLayerId,
              event: {
                title: client.state,
                time,
                data
              }
            })
          })
        }

        if (layers.role !== false) {
          client.on('role', () => {
            api.addTimelineEvent({
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

        if (layers.subscription !== false) {
          client.on('add', (action, meta) => {
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
              api.addTimelineEvent({
                layerId: subscriptionLayerId,
                event: {
                  title: 'Subscribing',
                  subtitle: action.channel,
                  groupId: meta.id,
                  time,
                  data: { action, meta }
                }
              })
            } else if (action.type === 'logux/unsubscribe') {
              api.addTimelineEvent({
                layerId: subscriptionLayerId,
                event: {
                  title: 'Unsubscribed',
                  subtitle: action.channel,
                  time,
                  data: { action, meta }
                }
              })
            } else if (action.type === 'logux/processed') {
              if (subscribing[action.id]) {
                let processed = subscribing[action.id]
                if (processed.type === 'logux/subscribe') {
                  api.addTimelineEvent({
                    layerId: subscriptionLayerId,
                    event: {
                      title: 'Subscribed',
                      subtitle: processed.channel,
                      groupId: action.id,
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
              api.addTimelineEvent({
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

        if (layers.action !== false) {
          client.on('add', (action, meta) => {
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
                    api.addTimelineEvent({
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
                  api.addTimelineEvent({
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

                api.addTimelineEvent({
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

                api.addTimelineEvent({
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

        if (layers.user !== false) {
          client.on('user', userId => {
            api.addTimelineEvent({
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

        if (layers.clean !== false) {
          client.on('clean', (action, meta) => {
            if (cleaned[meta.id]) {
              delete cleaned[meta.id]
              return
            }
            if (meta.tab && meta.tab !== client.id) return
            if (ignore[action.type]) return
            if (action.type.startsWith('logux/')) return

            api.addTimelineEvent({
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
      }
    )
  }
}
