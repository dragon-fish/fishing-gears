import { Hono } from 'hono'

const apiRoute = new Hono()

apiRoute.get('/', (c) => c.json({ message: 'Hello from API' }))

export default apiRoute
