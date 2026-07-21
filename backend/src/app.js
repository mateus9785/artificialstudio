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

const corsOrigins = process.env.CORS_ORIGIN?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (!corsOrigins || corsOrigins.length === 0) {
  console.warn('[cors] CORS_ORIGIN não definida — bloqueando todas as origens cross-origin.')
}

app.use(
  cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : false,
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
