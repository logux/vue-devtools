import { CrossTabClient } from '@logux/client'
import { createApp } from 'vue'

import { devtools } from './index.js'

let client = new CrossTabClient({
  server: 'wss://localhost:1337',
  subprotocol: '1.0.0',
  userId: '10'
})

let app = createApp({})

app.use(devtools)

devtools.install(app, client, {
  layers: {
    // THROWS 'string' is not assignable
    user: "true"
  },
  // THROWS 'string' is not assignable
  ignoreActions: 'user/add'
})
