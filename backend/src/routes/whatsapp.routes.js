import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { connectWhatsApp, disconnectWhatsApp, sendWhatsAppMessage, deleteWhatsAppMessage } from '../services/whatsappClient.js'

export const whatsappRouter = Router()

// Express 4 não encaminha rejeição de handler async para o middleware de erro sozinho.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

whatsappRouter.get(
  '/admin/whatsapp/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT status, qr_data AS qr, phone_number AS phoneNumber FROM whatsapp_connection WHERE id = 1',
    )
    res.json(rows[0] || { status: 'disconnected', qr: null, phoneNumber: null })
  }),
)

whatsappRouter.post(
  '/admin/whatsapp/connect',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await connectWhatsApp()
    res.status(202).json({ ok: true })
  }),
)

whatsappRouter.post(
  '/admin/whatsapp/disconnect',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await disconnectWhatsApp()
    res.status(204).send()
  }),
)

whatsappRouter.get(
  '/admin/whatsapp/conversations',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT c.id, ct.display_name AS displayName, ct.avatar_url AS avatarUrl, ct.phone_number AS phoneNumber,
        c.last_message_preview AS lastMessage, c.last_message_at AS lastMessageAt, c.unread_count AS unreadCount
      FROM whatsapp_conversations c
      JOIN whatsapp_contacts ct ON ct.id = c.contact_id
      WHERE EXISTS (
        SELECT 1 FROM scout_prospects p
        WHERE REGEXP_REPLACE(COALESCE(p.whatsapp_phone_e164, p.phone_e164), '[^0-9]', '') = ct.phone_number
      )
      ORDER BY c.last_message_at DESC
    `)
    res.json(rows)
  }),
)

whatsappRouter.get(
  '/admin/whatsapp/conversations/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const [convRows] = await pool.query(
      `SELECT c.id, ct.external_jid AS jid, ct.display_name AS displayName, ct.avatar_url AS avatarUrl,
         ct.phone_number AS phoneNumber
       FROM whatsapp_conversations c
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE c.id = ?`,
      [id],
    )
    if (!convRows[0]) return res.status(404).json({ error: 'conversa não encontrada' })

    const [messages] = await pool.query(
      `SELECT id, direction, status, text, attachment_type AS attachmentType, attachment_url AS attachmentUrl,
         attachment_mime AS attachmentMime, sent_at AS sentAt
       FROM whatsapp_messages
       WHERE conversation_id = ? AND deleted_at IS NULL
       ORDER BY sent_at ASC`,
      [id],
    )
    await pool.query('UPDATE whatsapp_conversations SET unread_count = 0 WHERE id = ?', [id])

    res.json({ conversation: convRows[0], messages })
  }),
)

whatsappRouter.post(
  '/admin/whatsapp/conversations/:id/messages',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { text, imageBase64, imageMimeType } = req.body || {}
    const trimmed = text?.trim()
    if (!trimmed && !imageBase64) {
      return res.status(400).json({ error: 'mensagem vazia' })
    }

    const [convRows] = await pool.query(
      `SELECT c.id, ct.external_jid AS jid
       FROM whatsapp_conversations c
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE c.id = ?`,
      [id],
    )
    if (!convRows[0]) return res.status(404).json({ error: 'conversa não encontrada' })

    const [inserted] = await pool.query(
      `INSERT INTO whatsapp_messages (conversation_id, direction, status, text, attachment_type, sent_at)
       VALUES (?, 'outbound', 'queued', ?, ?, NOW())`,
      [id, trimmed || null, imageBase64 ? 'image' : null],
    )
    const messageId = inserted.insertId

    try {
      const externalMessageId = await sendWhatsAppMessage(convRows[0].jid, { text: trimmed, imageBase64, imageMimeType })
      await pool.query('UPDATE whatsapp_messages SET status = ?, external_message_id = ? WHERE id = ?', [
        'sent',
        externalMessageId,
        messageId,
      ])
      await pool.query('UPDATE whatsapp_conversations SET last_message_at = NOW(), last_message_preview = ? WHERE id = ?', [
        trimmed ? trimmed.slice(0, 150) : '[imagem]',
        id,
      ])
    } catch (err) {
      await pool.query('UPDATE whatsapp_messages SET status = ?, error_message = ? WHERE id = ?', [
        'failed',
        String(err.message || err).slice(0, 2000),
        messageId,
      ])
      return res.status(502).json({ error: err.message || 'falha ao enviar mensagem' })
    }

    const [rows] = await pool.query(
      `SELECT id, direction, status, text, attachment_type AS attachmentType, sent_at AS sentAt
       FROM whatsapp_messages WHERE id = ?`,
      [messageId],
    )
    res.status(201).json(rows[0])
  }),
)

whatsappRouter.delete(
  '/admin/whatsapp/conversations/:id/messages/:messageId',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id, messageId } = req.params
    const [rows] = await pool.query(
      `SELECT m.direction, m.external_message_id AS externalMessageId, ct.external_jid AS jid
       FROM whatsapp_messages m
       JOIN whatsapp_conversations c ON c.id = m.conversation_id
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE m.id = ? AND m.conversation_id = ?`,
      [messageId, id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'mensagem não encontrada' })

    await pool.query('UPDATE whatsapp_messages SET deleted_at = NOW() WHERE id = ?', [messageId])

    if (rows[0].direction === 'outbound' && rows[0].externalMessageId) {
      deleteWhatsAppMessage(rows[0].jid, rows[0].externalMessageId).catch((err) => {
        console.error('[whatsapp] falha ao revogar mensagem no provedor', err)
      })
    }

    res.status(204).send()
  }),
)
