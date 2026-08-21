import { Router } from 'express'
import { pool } from '../db/pool.ts'
import { requireAdmin } from '../middleware/requireAdmin.ts'
import { enqueueJob } from '../services/aiChatWorker.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'

export const chatRouter = Router()

const GREETING_TEXT =
  'Oi! 👋 Sou a IA da Artificial Studio — sim, um robô, e é justamente esse tipo de atendimento que a gente desenvolve. Me conta o que você quer construir?'

// Teto de turnos por conversa. Sem isso, um visitante (ou um script) segurando o chat aberto queima
// a cota do Claude Code da casa inteira. Ao estourar, a conversa continua aberta para resposta
// manual pelo admin, mas a IA para.
const MAX_TURNS = Number(process.env.AI_CHAT_MAX_TURNS_PER_CONVERSATION) || 40

interface ConversationRow {
  id: number
  session_id: string
  mode: 'ai' | 'human'
  quote_status: 'none' | 'presented' | 'confirmed'
}

interface MessageRow {
  id: number
  sender: 'visitor' | 'ai' | 'admin'
  text: string
  createdAt: string
}

function isValidSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 64
}

async function getOrCreateConversation(sessionId: string): Promise<ConversationRow> {
  const [existing] = await pool.query('SELECT * FROM chat_conversations WHERE session_id = ?', [sessionId])
  const existingRow = (existing as ConversationRow[])[0]
  if (existingRow) return existingRow

  const [result] = await pool.query('INSERT INTO chat_conversations (session_id) VALUES (?)', [sessionId])
  await pool.query('INSERT INTO chat_messages (conversation_id, sender, text, read_by_visitor) VALUES (?, ?, ?, ?)', [
    (result as { insertId: number }).insertId,
    'ai',
    GREETING_TEXT,
    false,
  ])

  const [rows] = await pool.query('SELECT * FROM chat_conversations WHERE id = ?', [(result as { insertId: number }).insertId])
  return (rows as ConversationRow[])[0]
}

/** Há um turno da IA na fila ou rodando — é o que vira a bolha de "digitando" no widget. */
async function hasPendingTurn(conversationId: number): Promise<boolean> {
  const [rows] = await pool.query(
    "SELECT id FROM chat_ai_jobs WHERE conversation_id = ? AND kind = 'reply' AND status IN ('pending', 'running') LIMIT 1",
    [conversationId],
  )
  return (rows as unknown[]).length > 0
}

/**
 * O bloqueio de enfileiramento olha só para 'pending', não para 'running'.
 *
 * Um job que já começou leu as mensagens do banco e não vai enxergar a que acabou de chegar. Se
 * "rodando" também bloqueasse, a mensagem enviada durante o turno ficaria sem resposta para sempre.
 * Um job novo na fila resolve: quando chegar a vez dele, ou existe mensagem sem responder (e ele
 * responde) ou não existe (e ele encerra sem fazer nada).
 */
async function hasQueuedTurn(conversationId: number): Promise<boolean> {
  const [rows] = await pool.query(
    "SELECT id FROM chat_ai_jobs WHERE conversation_id = ? AND kind = 'reply' AND status = 'pending' LIMIT 1",
    [conversationId],
  )
  return (rows as unknown[]).length > 0
}

// Público: inicia (ou retoma) a conversa do visitante e retorna o histórico
chatRouter.post(
  '/chat/start',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body || {}
    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ error: 'sessionId é obrigatório.' })
    }

    const conversation = await getOrCreateConversation(sessionId)
    const [messages] = await pool.query(
      'SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC',
      [conversation.id],
    )
    await pool.query('UPDATE chat_messages SET read_by_visitor = TRUE WHERE conversation_id = ?', [conversation.id])

    res.json({
      conversationId: conversation.id,
      messages,
      mode: conversation.mode,
      aiPending: await hasPendingTurn(conversation.id),
    })
  }),
)

// Público: visitante envia uma mensagem
chatRouter.post(
  '/chat/:sessionId/messages',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const { text } = req.body || {}

    if (!isValidSessionId(sessionId) || !text || !text.trim()) {
      return res.status(400).json({ error: 'Mensagem inválida.' })
    }

    const conversation = await getOrCreateConversation(sessionId)
    const [result] = await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender, text, read_by_admin) VALUES (?, ?, ?, ?)',
      [conversation.id, 'visitor', text.trim().slice(0, 2000), false],
    )
    await pool.query('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [conversation.id])

    // A resposta da IA leva de 30s a 2min, então aqui só se enfileira: devolver 201 na hora é o que
    // permite ao widget mostrar a mensagem do cliente e a bolha de "digitando" imediatamente.
    const [[{ turns }]] = (await pool.query(
      "SELECT COUNT(*) AS turns FROM chat_messages WHERE conversation_id = ? AND sender = 'visitor'",
      [conversation.id],
    )) as [Array<{ turns: number }>, unknown]
    const canReply = conversation.mode === 'ai' && turns <= MAX_TURNS && !(await hasQueuedTurn(conversation.id))
    if (canReply) {
      await enqueueJob(conversation.id, 'reply', (result as { insertId: number }).insertId)
    }

    const [rows] = await pool.query('SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE id = ?', [
      (result as { insertId: number }).insertId,
    ])
    res.status(201).json({ ...(rows as MessageRow[])[0], aiPending: await hasPendingTurn(conversation.id) })
  }),
)

// Público: visitante faz polling por mensagens novas (resposta da IA ou do admin)
chatRouter.get(
  '/chat/:sessionId/messages',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const after = Number(req.query.after) || 0

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ error: 'sessionId é obrigatório.' })
    }

    const [conversations] = await pool.query('SELECT id FROM chat_conversations WHERE session_id = ?', [sessionId])
    const conversationRows = conversations as Array<{ id: number }>
    if (!conversationRows[0]) return res.json({ messages: [], aiPending: false })

    const [messages] = await pool.query(
      'SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC',
      [conversationRows[0].id, after],
    )
    await pool.query(
      "UPDATE chat_messages SET read_by_visitor = TRUE WHERE conversation_id = ? AND sender <> 'visitor'",
      [conversationRows[0].id],
    )

    res.json({ messages, aiPending: await hasPendingTurn(conversationRows[0].id) })
  }),
)

// ---- Admin ----

interface QuoteRow {
  id: number
  project_name: string
  client_name: string | null
  company_name: string | null
  contact: string | null
  service_type: string | null
  summary: string | null
  requirements_json: unknown
  integrations_json: unknown
  price_min_brl: string | null
  price_max_brl: string | null
  monthly_brl: string | null
  timeline_weeks: string | null
  payment_terms: string | null
  status: string
  kanban_card_id: number | null
  created_at: string
}

function serializeQuote(row: QuoteRow | undefined) {
  if (!row) return null
  const parseList = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string') return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name,
    companyName: row.company_name,
    contact: row.contact,
    serviceType: row.service_type,
    summary: row.summary,
    requirements: parseList(row.requirements_json),
    integrations: parseList(row.integrations_json),
    priceMin: row.price_min_brl === null ? null : Number(row.price_min_brl),
    priceMax: row.price_max_brl === null ? null : Number(row.price_max_brl),
    monthly: row.monthly_brl === null ? null : Number(row.monthly_brl),
    timelineWeeks: row.timeline_weeks,
    paymentTerms: row.payment_terms,
    status: row.status,
    kanbanCardId: row.kanban_card_id,
    createdAt: row.created_at,
  }
}

// Admin: lista conversas com preview da última mensagem e contagem de não lidas
chatRouter.get(
  '/admin/chat/conversations',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT c.id, c.session_id AS sessionId, c.visitor_name AS visitorName, c.visitor_contact AS visitorContact,
        c.status, c.mode, c.quote_status AS quoteStatus, c.updated_at AS updatedAt,
        (SELECT text FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.sender = 'visitor' AND m.read_by_admin = FALSE) AS unreadCount,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.sender = 'visitor') AS visitorTurns,
        (SELECT q.kanban_card_id FROM chat_quotes q WHERE q.conversation_id = c.id ORDER BY q.id DESC LIMIT 1) AS kanbanCardId,
        (SELECT COUNT(*) FROM chat_ai_jobs j WHERE j.conversation_id = c.id AND j.status = 'error') AS failedJobs
      FROM chat_conversations c
      ORDER BY c.updated_at DESC
    `)
    res.json(rows)
  }),
)

// Admin: conversa completa — mensagens, orçamento extraído e falhas da IA
chatRouter.get(
  '/admin/chat/conversations/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params

    const [conversations] = await pool.query('SELECT * FROM chat_conversations WHERE id = ?', [id])
    const conversationRows = conversations as Array<Record<string, unknown>>
    if (!conversationRows[0]) return res.status(404).json({ error: 'Conversa não encontrada.' })

    const [messages] = await pool.query(
      'SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC',
      [id],
    )
    const [quotes] = await pool.query('SELECT * FROM chat_quotes WHERE conversation_id = ? ORDER BY id DESC LIMIT 1', [id])
    const [jobs] = await pool.query(
      "SELECT id, kind, status, error, created_at AS createdAt FROM chat_ai_jobs WHERE conversation_id = ? AND status IN ('pending', 'running', 'error') ORDER BY id DESC LIMIT 5",
      [id],
    )
    await pool.query('UPDATE chat_messages SET read_by_admin = TRUE WHERE conversation_id = ? AND sender = "visitor"', [id])

    const conversation = conversationRows[0]
    res.json({
      conversation: {
        id: conversation.id,
        sessionId: conversation.session_id,
        visitorName: conversation.visitor_name,
        visitorContact: conversation.visitor_contact,
        mode: conversation.mode,
        quoteStatus: conversation.quote_status,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
      messages,
      quote: serializeQuote((quotes as QuoteRow[])[0]),
      jobs,
    })
  }),
)

// Mantida para compatibilidade com quem já consumia a rota antiga.
chatRouter.get(
  '/admin/chat/conversations/:id/messages',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const [messages] = await pool.query(
      'SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC',
      [id],
    )
    await pool.query('UPDATE chat_messages SET read_by_admin = TRUE WHERE conversation_id = ? AND sender = "visitor"', [id])
    res.json(messages)
  }),
)

// Admin: liga/desliga a IA numa conversa. Sem isso, responder manualmente não adianta — a IA
// continuaria respondendo por cima na mensagem seguinte do cliente.
chatRouter.post(
  '/admin/chat/conversations/:id/mode',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { mode } = req.body || {}
    if (mode !== 'ai' && mode !== 'human') {
      return res.status(400).json({ error: 'Modo inválido. Use "ai" ou "human".' })
    }

    const [result] = await pool.query('UPDATE chat_conversations SET mode = ? WHERE id = ?', [mode, req.params.id])
    if ((result as { affectedRows: number }).affectedRows === 0) return res.status(404).json({ error: 'Conversa não encontrada.' })

    // Ao assumir, cancela o que estiver na fila: uma resposta da IA chegando depois da sua seria
    // uma segunda resposta para a mesma pergunta.
    if (mode === 'human') {
      await pool.query(
        "UPDATE chat_ai_jobs SET status = 'done', finished_at = NOW() WHERE conversation_id = ? AND status = 'pending'",
        [req.params.id],
      )
    }

    res.json({ mode })
  }),
)

chatRouter.post(
  '/admin/chat/conversations/:id/reply',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { text } = req.body || {}

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Mensagem inválida.' })
    }

    const [conversations] = await pool.query('SELECT id FROM chat_conversations WHERE id = ?', [id])
    if ((conversations as unknown[]).length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada.' })
    }

    const [result] = await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender, text, read_by_visitor) VALUES (?, ?, ?, ?)',
      [id, 'admin', text.trim().slice(0, 2000), false],
    )
    await pool.query('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [id])

    const [rows] = await pool.query('SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE id = ?', [
      (result as { insertId: number }).insertId,
    ])
    res.status(201).json((rows as MessageRow[])[0])
  }),
)
