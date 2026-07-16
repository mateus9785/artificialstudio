import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const chatRouter = Router()

const GREETING_TEXT = 'Olá! 👋 Em breve alguém da nossa equipe responde por aqui. Conta pra gente o que você precisa.'

function isValidSessionId(sessionId) {
  return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 64
}

async function getOrCreateConversation(sessionId) {
  const [existing] = await pool.query('SELECT * FROM chat_conversations WHERE session_id = ?', [sessionId])
  if (existing[0]) return existing[0]

  const [result] = await pool.query('INSERT INTO chat_conversations (session_id) VALUES (?)', [sessionId])
  await pool.query('INSERT INTO chat_messages (conversation_id, sender, text, read_by_visitor) VALUES (?, ?, ?, ?)', [
    result.insertId,
    'admin',
    GREETING_TEXT,
    false,
  ])

  const [rows] = await pool.query('SELECT * FROM chat_conversations WHERE id = ?', [result.insertId])
  return rows[0]
}

// Público: inicia (ou retoma) a conversa do visitante e retorna o histórico
chatRouter.post('/chat/start', async (req, res) => {
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

  res.json({ conversationId: conversation.id, messages })
})

// Público: visitante envia uma mensagem
chatRouter.post('/chat/:sessionId/messages', async (req, res) => {
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

  const [rows] = await pool.query('SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE id = ?', [
    result.insertId,
  ])
  res.status(201).json(rows[0])
})

// Público: visitante faz polling por mensagens novas (respostas do admin)
chatRouter.get('/chat/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params
  const after = Number(req.query.after) || 0

  if (!isValidSessionId(sessionId)) {
    return res.status(400).json({ error: 'sessionId é obrigatório.' })
  }

  const [conversations] = await pool.query('SELECT id FROM chat_conversations WHERE session_id = ?', [sessionId])
  if (!conversations[0]) return res.json({ messages: [] })

  const [messages] = await pool.query(
    'SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC',
    [conversations[0].id, after],
  )
  await pool.query('UPDATE chat_messages SET read_by_visitor = TRUE WHERE conversation_id = ? AND sender = "admin"', [
    conversations[0].id,
  ])

  res.json({ messages })
})

// Admin: lista conversas com preview da última mensagem e contagem de não lidas
chatRouter.get('/admin/chat/conversations', requireAdmin, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT c.id, c.session_id AS sessionId, c.visitor_name AS visitorName, c.status, c.updated_at AS updatedAt,
      (SELECT text FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage,
      (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.sender = 'visitor' AND m.read_by_admin = FALSE) AS unreadCount
    FROM chat_conversations c
    ORDER BY c.updated_at DESC
  `)
  res.json(rows)
})

chatRouter.get('/admin/chat/conversations/:id/messages', requireAdmin, async (req, res) => {
  const { id } = req.params
  const [messages] = await pool.query(
    'SELECT id, sender, text, created_at AS createdAt FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC',
    [id],
  )
  await pool.query('UPDATE chat_messages SET read_by_admin = TRUE WHERE conversation_id = ? AND sender = "visitor"', [id])
  res.json(messages)
})

chatRouter.post('/admin/chat/conversations/:id/reply', requireAdmin, async (req, res) => {
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
})
