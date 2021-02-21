import { CrossTabClient } from '@logux/client'
import { createApp } from 'vue'

import { devtools } from './index.js'

let client = new CrossTabClient({
  server: 'wss://localhost:1337',
  subprotocol: '1.0.0',
  userId: '10'
})

let app = createApp({
  template: '<div></div>'
})

app.use(devtools)

devtools(app, client, {
  layers: {
    // THROWS Type 'string' is not assignable to type 'boolean | undefined'.
    user: "true"
  },
  // THROWS Type 'string' is not assignable to type 'string[] | undefined'.
  ignoreActions: 'user/add'
})
