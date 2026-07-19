import { fileURLToPath } from 'node:url'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.routes.js'
import { postsRouter } from './routes/posts.routes.js'
import { chatRouter } from './routes/chat.routes.js'
import { affiliatesRouter } from './routes/affiliates.routes.js'
import { kanbanRouter } from './routes/kanban.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  }),
)
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api', postsRouter)
app.use('/api', chatRouter)
app.use('/api', affiliatesRouter)
app.use('/api', kanbanRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})
