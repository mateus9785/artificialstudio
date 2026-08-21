import { Router } from 'express'
import { pool } from '../db/pool.ts'
import { requireAdmin } from '../middleware/requireAdmin.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'
import {
  connectWhatsApp,
  disconnectWhatsApp,
  sendWhatsAppMessage,
  deleteWhatsAppMessage,
  backfillConversationHistory,
  isBackfillRunning,
} from '../services/whatsappClient.ts'
import { enqueueSuggestion, materializeWhatsAppQuote } from '../services/waSuggestionWorker.ts'

export const whatsappRouter = Router()

interface SendErrorLike extends Error {
  statusCode?: number
}

// mysql2 devolve coluna JSON já parseada, mas versões antigas (e dumps manuais)
// podem devolver string — normaliza os dois casos.
function parseJsonColumn(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

interface SendOptions {
  text?: string | null
  imageBase64?: string | null
  imageMimeType?: string | null
}

/**
 * Envia uma mensagem de texto/imagem e registra em whatsapp_messages, com o mesmo
 * ciclo queued → sent/failed do envio manual. Usado pelo composer da tela e pela
 * aprovação de sugestão da IA — os dois caminhos terminam no mesmo registro.
 */
async function sendAndRecordMessage(conversationId: string | number, jid: string, { text, imageBase64, imageMimeType }: SendOptions) {
  const trimmed = text?.trim()
  const [inserted] = await pool.query(
    `INSERT INTO whatsapp_messages (conversation_id, direction, status, text, attachment_type, sent_at)
     VALUES (?, 'outbound', 'queued', ?, ?, NOW())`,
    [conversationId, trimmed || null, imageBase64 ? 'image' : null],
  )
  const messageId = (inserted as { insertId: number }).insertId

  try {
    const externalMessageId = await sendWhatsAppMessage(jid, { text: trimmed, imageBase64, imageMimeType })
    await pool.query('UPDATE whatsapp_messages SET status = ?, external_message_id = ? WHERE id = ?', [
      'sent',
      externalMessageId,
      messageId,
    ])
    await pool.query('UPDATE whatsapp_conversations SET last_message_at = NOW(), last_message_preview = ? WHERE id = ?', [
      trimmed ? trimmed.slice(0, 150) : '[imagem]',
      conversationId,
    ])
  } catch (err) {
    await pool.query('UPDATE whatsapp_messages SET status = ?, error_message = ? WHERE id = ?', [
      'failed',
      String((err as Error).message || err).slice(0, 2000),
      messageId,
    ])
    const wrapped: SendErrorLike = new Error((err as Error).message || 'falha ao enviar mensagem')
    wrapped.statusCode = 502
    throw wrapped
  }

  const [rows] = await pool.query(
    `SELECT id, direction, status, text, attachment_type AS attachmentType, sent_at AS sentAt
     FROM whatsapp_messages WHERE id = ?`,
    [messageId],
  )
  return (rows as unknown[])[0]
}

const CURRENT_SUGGESTION_SQL = `
  SELECT id, kind, status, suggested_text AS suggestedText, quote_marker AS quoteMarker,
    error, created_at AS createdAt
  FROM whatsapp_ai_suggestions
  WHERE conversation_id = ? AND status IN ('pending', 'running', 'draft', 'error')
  ORDER BY id DESC
  LIMIT 1`

async function loadCurrentSuggestion(conversationId: string | number) {
  const [rows] = await pool.query(CURRENT_SUGGESTION_SQL, [conversationId])
  return (rows as unknown[])[0] || null
}

whatsappRouter.get(
  '/admin/whatsapp/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT status, qr_data AS qr, phone_number AS phoneNumber FROM whatsapp_connection WHERE id = 1')
    res.json((rows as unknown[])[0] || { status: 'disconnected', qr: null, phoneNumber: null })
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

// Lista só as conversas de leads do pegasus-scout — o painel e a IA vendedora
// são exclusivos da prospecção. Visitantes do site e contatos pessoais falam
// com o dono direto no aplicativo do WhatsApp, sem passar por aqui (o gate de
// ingestão em whatsappClient.js nem grava as mensagens deles).
whatsappRouter.get(
  '/admin/whatsapp/conversations',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT c.id, ct.display_name AS displayName, ct.avatar_url AS avatarUrl, ct.phone_number AS phoneNumber,
        c.last_message_preview AS lastMessage, c.last_message_at AS lastMessageAt, c.unread_count AS unreadCount,
        c.ai_enabled AS aiEnabled,
        (SELECT s.status FROM whatsapp_ai_suggestions s
          WHERE s.conversation_id = c.id AND s.status IN ('pending', 'running', 'draft', 'error')
          ORDER BY s.id DESC LIMIT 1) AS suggestionStatus
      FROM whatsapp_conversations c
      JOIN whatsapp_contacts ct ON ct.id = c.contact_id
      WHERE EXISTS (
        SELECT 1 FROM scout_prospects p
        WHERE REGEXP_REPLACE(COALESCE(p.whatsapp_phone_e164, p.phone_e164), '[^0-9]', '') = ct.phone_number
      )
      ORDER BY c.last_message_at DESC
    `)
    res.json(
      (rows as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        aiEnabled: Boolean(row.aiEnabled),
        isLead: true,
      })),
    )
  }),
)

whatsappRouter.get(
  '/admin/whatsapp/conversations/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const [convRows] = await pool.query(
      `SELECT c.id, ct.external_jid AS jid, ct.display_name AS displayName, ct.avatar_url AS avatarUrl,
         ct.phone_number AS phoneNumber, c.ai_enabled AS aiEnabled, c.collected_data AS collectedData
       FROM whatsapp_conversations c
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE c.id = ?`,
      [id],
    )
    interface ConversationDetailRow {
      id: number
      jid: string
      displayName: string | null
      avatarUrl: string | null
      phoneNumber: string | null
      aiEnabled: number | boolean
      collectedData: unknown
    }
    const convRow = (convRows as ConversationDetailRow[])[0]
    if (!convRow) return res.status(404).json({ error: 'conversa não encontrada' })

    const conversation = {
      ...convRow,
      aiEnabled: Boolean(convRow.aiEnabled),
      collectedData: parseJsonColumn(convRow.collectedData),
      historySyncing: isBackfillRunning(convRow.jid as string),
    }

    const [messages] = await pool.query(
      `SELECT id, direction, status, text, is_manual AS isManual, attachment_type AS attachmentType,
         attachment_url AS attachmentUrl, attachment_mime AS attachmentMime, sent_at AS sentAt
       FROM whatsapp_messages
       WHERE conversation_id = ? AND deleted_at IS NULL
       ORDER BY sent_at ASC`,
      [id],
    )

    // Dados do lead do pegasus-scout, quando o número bate com um prospect —
    // alimentam o badge no header e o painel lateral de dados.
    const [leadRows] = await pool.query(
      `SELECT p.id, p.name, p.category, p.city, p.state, p.website, p.rating,
         p.reviews_count AS reviewsCount, p.fit_score AS fitScore, p.pipeline_status AS pipelineStatus,
         b.segmento, b.porte, b.resumo, b.gancho_abordagem AS ganchoAbordagem, b.dores_json AS dores
       FROM scout_prospects p
       LEFT JOIN scout_prospect_briefs b ON b.prospect_id = p.id
       WHERE REGEXP_REPLACE(COALESCE(p.whatsapp_phone_e164, p.phone_e164), '[^0-9]', '') = ?
       ORDER BY b.updated_at DESC
       LIMIT 1`,
      [conversation.phoneNumber],
    )
    const leadRow = (leadRows as Array<Record<string, unknown>>)[0]
    const lead = leadRow ? { ...leadRow, dores: parseJsonColumn(leadRow.dores) } : null

    const suggestion = await loadCurrentSuggestion(id)

    await pool.query('UPDATE whatsapp_conversations SET unread_count = 0 WHERE id = ?', [id])

    res.json({ conversation, messages, lead, suggestion })
  }),
)

// Registra uma mensagem que existiu de verdade no WhatsApp mas o Baileys não
// capturou sozinho (ex: falha de sessão/criptografia) — o admin viu ela no
// próprio WhatsApp e digita aqui. Só grava no histórico, não envia nada.
whatsappRouter.post(
  '/admin/whatsapp/conversations/:id/messages/manual',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { text, direction, sentAt } = req.body || {}
    const trimmed = text?.trim()
    if (!trimmed) return res.status(400).json({ error: 'mensagem vazia' })
    if (direction !== 'inbound' && direction !== 'outbound') {
      return res.status(400).json({ error: 'direção inválida' })
    }

    const [convRows] = await pool.query('SELECT id, last_message_at AS lastMessageAt FROM whatsapp_conversations WHERE id = ?', [id])
    const convRow = (convRows as Array<{ id: number; lastMessageAt: Date | null }>)[0]
    if (!convRow) return res.status(404).json({ error: 'conversa não encontrada' })

    const parsedSentAt = sentAt ? new Date(sentAt) : new Date()
    if (Number.isNaN(parsedSentAt.getTime())) {
      return res.status(400).json({ error: 'data inválida' })
    }

    const [inserted] = await pool.query(
      `INSERT INTO whatsapp_messages (conversation_id, direction, status, text, is_manual, sent_at)
       VALUES (?, ?, ?, ?, TRUE, ?)`,
      [id, direction, direction === 'inbound' ? 'delivered' : 'sent', trimmed, parsedSentAt],
    )

    const isNewest = !convRow.lastMessageAt || parsedSentAt > convRow.lastMessageAt
    if (isNewest) {
      await pool.query('UPDATE whatsapp_conversations SET last_message_at = ?, last_message_preview = ? WHERE id = ?', [
        parsedSentAt,
        trimmed.slice(0, 150),
        id,
      ])
    }

    const [rows] = await pool.query(
      `SELECT id, direction, status, text, is_manual AS isManual, sent_at AS sentAt
       FROM whatsapp_messages WHERE id = ?`,
      [(inserted as { insertId: number }).insertId],
    )
    res.status(201).json((rows as unknown[])[0])
  }),
)

// Pede o histórico antigo dessa conversa pro WhatsApp (on-demand history sync do
// Baileys) — roda em segundo plano, o admin acompanha pelo historySyncing que volta
// no GET /conversations/:id enquanto o backfill ainda está buscando lotes.
whatsappRouter.post(
  '/admin/whatsapp/conversations/:id/sync-history',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const [convRows] = await pool.query(
      `SELECT ct.external_jid AS jid
       FROM whatsapp_conversations c
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE c.id = ?`,
      [id],
    )
    const convRow = (convRows as Array<{ jid: string }>)[0]
    if (!convRow) return res.status(404).json({ error: 'conversa não encontrada' })

    backfillConversationHistory(convRow.jid).catch((err) => {
      console.error(`[whatsapp] falha ao buscar historico da conversa ${id}:`, err)
    })
    res.status(202).json({ ok: true })
  }),
)

whatsappRouter.post(
  '/admin/whatsapp/conversations/:id/messages',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { text, imageBase64, imageMimeType } = req.body || {}
    if (!text?.trim() && !imageBase64) {
      return res.status(400).json({ error: 'mensagem vazia' })
    }

    const [convRows] = await pool.query(
      `SELECT c.id, ct.external_jid AS jid
       FROM whatsapp_conversations c
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE c.id = ?`,
      [id],
    )
    const convRow = (convRows as Array<{ id: number; jid: string }>)[0]
    if (!convRow) return res.status(404).json({ error: 'conversa não encontrada' })

    try {
      const message = await sendAndRecordMessage(id, convRow.jid, { text, imageBase64, imageMimeType })
      res.status(201).json(message)
    } catch (err) {
      const sendErr = err as SendErrorLike
      res.status(sendErr.statusCode || 502).json({ error: sendErr.message || 'falha ao enviar mensagem' })
    }
  }),
)

// ---- Sugestões da IA (rascunhos que o admin aprova, edita ou descarta) ----

whatsappRouter.get(
  '/admin/whatsapp/conversations/:id/suggestion',
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await loadCurrentSuggestion(req.params.id))
  }),
)

whatsappRouter.post(
  '/admin/whatsapp/conversations/:id/suggestion/regenerate',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const [convRows] = await pool.query('SELECT id FROM whatsapp_conversations WHERE id = ?', [id])
    if ((convRows as unknown[]).length === 0) return res.status(404).json({ error: 'conversa não encontrada' })

    // Conversa ainda sem mensagem só existe vinda do fluxo de abordagem fria do
    // scout — regenerar nela é regenerar a abertura. Nas demais é a próxima
    // resposta (ou um follow-up, se o cliente sumiu).
    const [countRows] = await pool.query('SELECT COUNT(*) AS n FROM whatsapp_messages WHERE conversation_id = ? AND deleted_at IS NULL', [
      id,
    ])
    const kind = (countRows as Array<{ n: number }>)[0].n === 0 ? 'cold_outreach' : 'reply'
    await enqueueSuggestion(Number(id), kind)
    res.status(202).json({ ok: true, kind })
  }),
)

interface SuggestionRow {
  id: number
  conversation_id: number
  suggested_text: string | null
  status: string
  quote_marker: 'none' | 'presented' | 'confirmed'
  jid: string
}

whatsappRouter.post(
  '/admin/whatsapp/suggestions/:id/approve',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const bodyText = req.body?.text?.trim()

    const [rows] = await pool.query(
      `SELECT s.*, ct.external_jid AS jid
       FROM whatsapp_ai_suggestions s
       JOIN whatsapp_conversations c ON c.id = s.conversation_id
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE s.id = ?`,
      [id],
    )
    const suggestion = (rows as SuggestionRow[])[0]
    if (!suggestion) return res.status(404).json({ error: 'sugestão não encontrada' })
    if (suggestion.status !== 'draft') {
      return res.status(409).json({ error: `sugestão não está mais disponível (status: ${suggestion.status})` })
    }

    const text = bodyText || suggestion.suggested_text
    if (!text) return res.status(400).json({ error: 'sugestão sem texto' })

    let message: { id: number } & Record<string, unknown>
    try {
      message = (await sendAndRecordMessage(suggestion.conversation_id, suggestion.jid, { text })) as { id: number } & Record<
        string,
        unknown
      >
    } catch (err) {
      const sendErr = err as SendErrorLike
      return res.status(sendErr.statusCode || 502).json({ error: sendErr.message || 'falha ao enviar mensagem' })
    }

    await pool.query(
      `UPDATE whatsapp_ai_suggestions
       SET status = 'approved_sent', final_text = ?, sent_message_id = ?, finished_at = NOW()
       WHERE id = ?`,
      [text, message.id, id],
    )

    // Orçamento confirmado nesta mensagem aprovada: extrai o acordo e cria o
    // card no kanban em segundo plano (não bloqueia o clique do admin).
    if (suggestion.quote_marker === 'confirmed') {
      materializeWhatsAppQuote(suggestion.conversation_id).catch((err) => {
        console.error(`[wa-ia] falha ao materializar orçamento da conversa ${suggestion.conversation_id}:`, err)
      })
    }

    res.status(201).json(message)
  }),
)

whatsappRouter.post(
  '/admin/whatsapp/suggestions/:id/discard',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [result] = await pool.query(
      "UPDATE whatsapp_ai_suggestions SET status = 'discarded', finished_at = NOW() WHERE id = ? AND status IN ('draft', 'error')",
      [req.params.id],
    )
    if ((result as { affectedRows: number }).affectedRows === 0) return res.status(404).json({ error: 'sugestão não encontrada ou já resolvida' })
    res.status(204).send()
  }),
)

whatsappRouter.post(
  '/admin/whatsapp/conversations/:id/ai-toggle',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const enabled = req.body?.enabled
    const [result] = await pool.query(
      typeof enabled === 'boolean'
        ? 'UPDATE whatsapp_conversations SET ai_enabled = ? WHERE id = ?'
        : 'UPDATE whatsapp_conversations SET ai_enabled = NOT ai_enabled WHERE id = ?',
      typeof enabled === 'boolean' ? [enabled, id] : [id],
    )
    if ((result as { affectedRows: number }).affectedRows === 0) return res.status(404).json({ error: 'conversa não encontrada' })
    const [rows] = await pool.query('SELECT ai_enabled AS aiEnabled FROM whatsapp_conversations WHERE id = ?', [id])
    res.json({ aiEnabled: Boolean((rows as Array<{ aiEnabled: unknown }>)[0].aiEnabled) })
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
    const row = (rows as Array<{ direction: string; externalMessageId: string | null; jid: string }>)[0]
    if (!row) return res.status(404).json({ error: 'mensagem não encontrada' })

    await pool.query('UPDATE whatsapp_messages SET deleted_at = NOW() WHERE id = ?', [messageId])

    if (row.direction === 'outbound' && row.externalMessageId) {
      deleteWhatsAppMessage(row.jid, row.externalMessageId).catch((err) => {
        console.error('[whatsapp] falha ao revogar mensagem no provedor', err)
      })
    }

    res.status(204).send()
  }),
)
