import { App } from 'vue'
import { DevtoolsPluginApi } from '@vue/devtools-api'
import { Client, CrossTabClient } from '@logux/client'

export const userLayerId: string
export const roleLayerId: string
export const cleanLayerId: string
export const stateLayerId: string
export const actionLayerId: string
export const subscriptionLayerId: string

export interface DevtoolsOptions {
  layers?: {
    /**
     * Disable connection state layer.
     */
    state?: boolean

    /**
     * Disable tab role layer.
     */
    role?: boolean

    /**
     * Disable action layer.
     */
    action?: boolean

    /**
     * Disable subscription layer.
     */
    subscription?: boolean

    /**
     * Disable user layer.
     */
    user?: boolean

    /**
     * Disable action cleaned layer.
     */
    clean?: boolean
  }

  /**
   * Disable action messages with specific types.
   */
  ignoreActions?: string[]
}

export interface VueDevtools {
  /**
   * Vue Devtools API
   */
  api: DevtoolsPluginApi | null

  /**
   * Plugin installer.
   *
   * @param app Vue app instance.
   * @param client Logux Client instance.
   * @param options Disable specific layers or action types.
   */
  install(
    app: App,
    client: Client | CrossTabClient,
    options?: DevtoolsOptions
  ): void
}

/**
 * Vue Devtools plugin that adds Logux events to the timeline.
 *
 * ```js
 * import { createApp } from 'vue'
 * import { devtools } from '@logux/vue-devtools'
 *
 * import { client } from './logux'
 *
 * let app = createApp(…)
 *
 * app.use(devtools, client, {
 *   layers: {
 *     state: false
 *   },
 *   ignoreActions: ['user/add']
 * })
 * ```
 */
export const devtools: VueDevtools
