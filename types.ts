import { CrossTabClient } from '@logux/client'
import { createApp } from 'vue'

import { devtools, actionLayerId } from './index.js'

let client = new CrossTabClient({
  server: 'wss://localhost:1337',
  subprotocol: '1.0.0',
  userId: '10'
})

let app = createApp(() => () => null)

app.use(devtools)

devtools(app, client, {
  ignoreActions: ['user/add']
})

let api = devtools(app, client, {
  layers: {
    state: false
  }
})

api.addTimelineEvent({
  layerId: actionLayerId,
  event: {
    time: Date.now(),
    data: {}
  }
})
