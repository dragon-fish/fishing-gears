import { Hono } from 'hono'

import apiRoute from './api'

const app = new Hono()

app.route('/api', apiRoute)

export default {
  fetch: app.fetch,
}
