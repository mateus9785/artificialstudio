import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { enqueueJob } from '../services/aiChatWorker.js'

export const chatRouter = Router()

const GREETING_TEXT =
  'Oi! 👋 Sou a IA da Artificial Studio — sim, um robô, e é justamente esse tipo de atendimento que a gente desenvolve. Me conta o que você quer construir?'

// Teto de turnos por conversa. Sem isso, um visitante (ou um script) segurando o chat aberto queima
// a cota do Claude Code da casa inteira. Ao estourar, a conversa continua aberta para resposta
// manual pelo admin, mas a IA para.
const MAX_TURNS = Number(process.env.AI_CHAT_MAX_TURNS_PER_CONVERSATION) || 40

// Express 4 não encaminha rejeição de handler async para o middleware de erro sozinho.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

function isValidSessionId(sessionId) {
  return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 64
}

async function getOrCreateConversation(sessionId) {
  const [existing] = await pool.query('SELECT * FROM chat_conversations WHERE session_id = ?', [sessionId])
  if (existing[0]) return existing[0]

  const [result] = await pool.query('INSERT INTO chat_conversations (session_id) VALUES (?)', [sessionId])
  await pool.query('INSERT INTO chat_messages (conversation_id, sender, text, read_by_visitor) VALUES (?, ?, ?, ?)', [
    result.insertId,
    'ai',
    GREETING_TEXT,
    false,
  ])

  const [rows] = await pool.query('SELECT * FROM chat_conversations WHERE id = ?', [result.insertId])
  return rows[0]
}

/** Há um turno da IA na fila ou rodando — é o que vira a bolha de "digitando" no widget. */
async function hasPendingTurn(conversationId) {
  const [rows] = await pool.query(
    "SELECT id FROM chat_ai_jobs WHERE conversation_id = ? AND kind = 'reply' AND status IN ('pending', 'running') LIMIT 1",
    [conversationId],
  )
  return rows.length > 0
}

/**
 * O bloqueio de enfileiramento olha só para 'pending', não para 'running'.
 *
 * Um job que já começou leu as mensagens do banco e não vai enxergar a que acabou de chegar. Se
 * "rodando" também bloqueasse, a mensagem enviada durante o turno ficaria sem resposta para sempre.
 * Um job novo na fila resolve: quando chegar a vez dele, ou existe mensagem sem responder (e ele
 * responde) ou não existe (e ele encerra sem fazer nada).
 */
async function hasQueuedTurn(conversationId) {
  const [rows] = await pool.query(
    "SELECT id FROM chat_ai_jobs WHERE conversation_id = ? AND kind = 'reply' AND status = 'pending' LIMIT 1",
    [conversationId],
  )
  return rows.length > 0
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
    const [[{ turns }]] = await pool.query(
      "SELECT COUNT(*) AS turns FROM chat_messages WHERE conversation_id = ? AND sender = 'visitor'",
      [conversation.id],
    )
    const canReply = conversation.mode === 'ai' && turns <= MAX_TURNS && !(await hasQueuedTurn(conversation.id))
    if (canReply) {
      await enqueueJob(conversation.id, 'reply', result.insertId)
    }

    const [rows] = await pool.query('SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE id = ?', [
      result.insertId,
    ])
    res.status(201).json({ ...rows[0], aiPending: await hasPendingTurn(conversation.id) })
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
    if (!conversations[0]) return res.json({ messages: [], aiPending: false })

    const [messages] = await pool.query(
      'SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC',
      [conversations[0].id, after],
    )
    await pool.query(
      "UPDATE chat_messages SET read_by_visitor = TRUE WHERE conversation_id = ? AND sender <> 'visitor'",
      [conversations[0].id],
    )

    res.json({ messages, aiPending: await hasPendingTurn(conversations[0].id) })
  }),
)

// ---- Admin ----

function serializeQuote(row) {
  if (!row) return null
  const parseList = (value) => {
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
    if (!conversations[0]) return res.status(404).json({ error: 'Conversa não encontrada.' })

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

    res.json({
      conversation: {
        id: conversations[0].id,
        sessionId: conversations[0].session_id,
        visitorName: conversations[0].visitor_name,
        visitorContact: conversations[0].visitor_contact,
        mode: conversations[0].mode,
        quoteStatus: conversations[0].quote_status,
        createdAt: conversations[0].created_at,
        updatedAt: conversations[0].updated_at,
      },
      messages,
      quote: serializeQuote(quotes[0]),
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
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Conversa não encontrada.' })

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
    if (!conversations[0]) {
      return res.status(404).json({ error: 'Conversa não encontrada.' })
    }

    const [result] = await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender, text, read_by_visitor) VALUES (?, ?, ?, ?)',
      [id, 'admin', text.trim().slice(0, 2000), false],
    )
    await pool.query('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [id])

    const [rows] = await pool.query('SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE id = ?', [
      result.insertId,
    ])
    res.status(201).json(rows[0])
  }),
)
