import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.routes.js'
import { postsRouter } from './routes/posts.routes.js'
import { trackRouter } from './routes/track.routes.js'
import { chatRouter } from './routes/chat.routes.js'
import { affiliatesRouter } from './routes/affiliates.routes.js'

export const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  }),
)
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api', postsRouter)
app.use('/api', trackRouter)
app.use('/api', chatRouter)
app.use('/api', affiliatesRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})
