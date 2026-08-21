import { fileURLToPath } from 'node:url'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.routes.ts'
import { postsRouter } from './routes/posts.routes.ts'
import { chatRouter } from './routes/chat.routes.ts'
import { kanbanRouter } from './routes/kanban.routes.ts'
import { financeiroRouter } from './routes/financeiro.routes.ts'
import { whatsappRouter } from './routes/whatsapp.routes.ts'
import { scoutRunsRouter } from './routes/scoutRuns.routes.ts'

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
app.use('/api', kanbanRouter)
app.use('/api', financeiroRouter)
app.use('/api', whatsappRouter)
app.use('/api', scoutRunsRouter)

// Express só reconhece isso como error handler pela aridade (4 parâmetros) —
// `_next` não é usado, mas remover o parâmetro faria o Express tratar isso
// como middleware normal e nunca chamar essa função em erros.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})
