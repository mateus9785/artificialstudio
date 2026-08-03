import { pool } from '../db/pool.js'
import { ClaudeNotInstalledError } from './claudeRunner.js'
import { ClaudeQueueFullError } from './claudeGate.js'
import { generateSuggestion } from './waSellerRunner.js'
import { extractQuote } from './quoteExtractor.js'
import { createCardFromQuote } from './projectCard.js'

/**
 * Worker de sugestões de resposta do WhatsApp — espelho do aiChatWorker, com uma diferença de
 * natureza: aqui a IA NUNCA envia nada. O resultado do job é um rascunho (status 'draft') que fica
 * aguardando o admin aprovar, editar ou descartar na tela. Por isso também não existe fallback de
 * mensagem ao cliente: falha de geração só aparece no painel, ninguém está esperando resposta
 * automática do outro lado.
 *
 * A tabela whatsapp_ai_suggestions é fila e rascunho ao mesmo tempo:
 * pending → running → draft → approved_sent | discarded | superseded | error
 */

const POLL_MS = Number(process.env.AI_CHAT_POLL_MS) || 2000
const MAX_ATTEMPTS = 2

/**
 * Enfileira a geração de uma sugestão. Antes de inserir, marca como 'superseded' tudo que ainda não
 * foi resolvido na conversa — inclusive jobs 'running': se um estiver no meio da geração, o UPDATE
 * final dele (condicionado a status='running') não acha a linha e o resultado é descartado. Um
 * rascunho por conversa, sempre o mais novo.
 */
export async function enqueueSuggestion(conversationId, kind, { triggerMessageId = null, prospectId = null } = {}) {
  await pool.query(
    `UPDATE whatsapp_ai_suggestions SET status = 'superseded', finished_at = NOW()
     WHERE conversation_id = ? AND status IN ('pending', 'running', 'draft', 'error')`,
    [conversationId],
  )
  const [result] = await pool.query(
    'INSERT INTO whatsapp_ai_suggestions (conversation_id, kind, trigger_message_id, prospect_id) VALUES (?, ?, ?, ?)',
    [conversationId, kind, triggerMessageId, prospectId],
  )
  return result.insertId
}

async function loadConversation(id) {
  const [rows] = await pool.query(
    `SELECT c.*, ct.phone_number AS phone_number
     FROM whatsapp_conversations c
     JOIN whatsapp_contacts ct ON ct.id = c.contact_id
     WHERE c.id = ?`,
    [id],
  )
  return rows[0] || null
}

async function loadMessages(conversationId) {
  const [rows] = await pool.query(
    `SELECT id, direction, text, attachment_type AS attachmentType
     FROM whatsapp_messages
     WHERE conversation_id = ? AND deleted_at IS NULL
     ORDER BY sent_at ASC, id ASC`,
    [conversationId],
  )
  return rows
}

function renderTranscript(messages) {
  return messages
    .map((m) => {
      const who = m.direction === 'inbound' ? 'cliente' : 'vendedor'
      const body = m.text || (m.attachmentType ? `[${m.attachmentType}]` : '[mensagem sem texto]')
      return `${who}: ${body}`
    })
    .join('\n\n')
}

/** Mesmo casamento por telefone das rotas: prospect + brief mais recente. */
async function loadLeadByPhone(phoneDigits) {
  if (!phoneDigits) return null
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category, p.city, p.state, p.website, p.rating,
       p.reviews_count AS reviewsCount, p.fit_score AS fitScore,
       b.segmento, b.porte, b.resumo, b.gancho_abordagem AS ganchoAbordagem, b.dores_json AS dores
     FROM scout_prospects p
     LEFT JOIN scout_prospect_briefs b ON b.prospect_id = p.id
     WHERE REGEXP_REPLACE(COALESCE(p.whatsapp_phone_e164, p.phone_e164), '[^0-9]', '') = ?
     ORDER BY b.updated_at DESC
     LIMIT 1`,
    [phoneDigits],
  )
  if (!rows[0]) return null
  const lead = rows[0]
  if (typeof lead.dores === 'string') {
    try {
      lead.dores = JSON.parse(lead.dores)
    } catch {
      lead.dores = null
    }
  }
  return lead
}

function parseCollected(value) {
  if (value === null || value === undefined) return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) || {}
    } catch {
      return {}
    }
  }
  return value
}

/**
 * Merge dos dados coletados na conversa: campo novo não-nulo vence, campo nulo preserva o que já
 * havia sido coletado antes (o modelo re-extrai da transcrição inteira a cada geração, mas um campo
 * que ele deixou de repetir não pode apagar um dado já capturado).
 */
async function mergeCollectedData(conversationId, current, incoming) {
  if (!incoming || typeof incoming !== 'object') return
  const merged = { ...parseCollected(current) }
  for (const [key, value] of Object.entries(incoming)) {
    const empty = value === null || value === undefined || (Array.isArray(value) && value.length === 0)
    if (!empty) merged[key] = value
  }
  await pool.query('UPDATE whatsapp_conversations SET collected_data = ? WHERE id = ?', [
    JSON.stringify(merged),
    conversationId,
  ])
}

async function runSuggestionJob(job) {
  const conversation = await loadConversation(job.conversation_id)
  if (!conversation) return

  const messages = await loadMessages(job.conversation_id)
  const last = messages[messages.length - 1] || null

  // Sugestão automática (disparada por mensagem recebida) só faz sentido se a última mensagem
  // ainda for do cliente — se o admin respondeu manualmente enquanto o job esperava na fila, a IA
  // cala a boca. Regeneração manual (sem trigger_message_id) passa direto: com a última mensagem
  // nossa, ela vira um follow-up.
  const isAuto = job.trigger_message_id !== null
  if (job.kind === 'reply' && isAuto && (!last || last.direction !== 'inbound')) {
    await pool.query(
      "UPDATE whatsapp_ai_suggestions SET status = 'superseded', finished_at = NOW() WHERE id = ? AND status = 'running'",
      [job.id],
    )
    return
  }

  const followUp = job.kind === 'reply' && last?.direction === 'outbound'
  const lead = await loadLeadByPhone(conversation.phone_number)

  const suggestion = await generateSuggestion({
    transcript: renderTranscript(messages),
    lead,
    kind: job.kind,
    followUp,
  })

  // Condicionado a status='running': se uma mensagem nova chegou durante a geração,
  // enqueueSuggestion já marcou esta linha como superseded e o resultado morre aqui.
  const [updated] = await pool.query(
    `UPDATE whatsapp_ai_suggestions
     SET status = 'draft', suggested_text = ?, quote_marker = ?, prompt_fingerprint = ?, finished_at = NOW()
     WHERE id = ? AND status = 'running'`,
    [suggestion.text, suggestion.quoteMarker, suggestion.fingerprint, job.id],
  )
  if (updated.affectedRows === 0) return

  await mergeCollectedData(job.conversation_id, conversation.collected_data, suggestion.collectedData)
}

/**
 * Extrai o orçamento confirmado de uma conversa de WhatsApp e cria o card no kanban. Chamado pela
 * rota de aprovação quando a mensagem enviada carregava o marcador de confirmação. `chat_quotes`
 * tem FK para chat_conversations e não serve aqui — a idempotência fica no collected_data da
 * própria conversa (kanban_card_id gravado após criar).
 */
export async function materializeWhatsAppQuote(conversationId) {
  const conversation = await loadConversation(conversationId)
  if (!conversation) return

  const collected = parseCollected(conversation.collected_data)
  if (collected.kanban_card_id) return // orçamento desta conversa já virou card

  const messages = await loadMessages(conversationId)
  const quote = await extractQuote(renderTranscript(messages))

  const cardId = await createCardFromQuote(quote, conversation, {
    originLabel: `/admin/whatsapp (conversa #${conversationId})`,
  })

  await mergeCollectedData(conversationId, conversation.collected_data, { kanban_card_id: cardId })
  console.log(`[wa-ia] conversa ${conversationId} virou o card ${cardId} em Produção Automatizada.`)
}

// ---- Bomba de jobs (mesmo padrão do aiChatWorker) ----

async function claimNextJob() {
  const [candidates] = await pool.query(
    "SELECT id FROM whatsapp_ai_suggestions WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
  )
  if (candidates.length === 0) return null

  const [claimed] = await pool.query(
    "UPDATE whatsapp_ai_suggestions SET status = 'running', started_at = NOW(), attempts = attempts + 1 WHERE id = ? AND status = 'pending'",
    [candidates[0].id],
  )
  if (claimed.affectedRows === 0) return null

  const [rows] = await pool.query('SELECT * FROM whatsapp_ai_suggestions WHERE id = ?', [candidates[0].id])
  return rows[0]
}

async function failJob(job, err) {
  const message = String(err?.message || err).slice(0, 2000)

  // Fila cheia não é falha do job: volta para pending sem gastar tentativa.
  if (err instanceof ClaudeQueueFullError) {
    await pool.query(
      "UPDATE whatsapp_ai_suggestions SET status = 'pending', attempts = attempts - 1 WHERE id = ? AND status = 'running'",
      [job.id],
    )
    return
  }

  const giveUp = job.attempts >= MAX_ATTEMPTS || err instanceof ClaudeNotInstalledError
  if (!giveUp) {
    await pool.query(
      "UPDATE whatsapp_ai_suggestions SET status = 'pending', error = ? WHERE id = ? AND status = 'running'",
      [message, job.id],
    )
    return
  }

  await pool.query(
    "UPDATE whatsapp_ai_suggestions SET status = 'error', error = ?, finished_at = NOW() WHERE id = ? AND status = 'running'",
    [message, job.id],
  )
  console.error(`[wa-ia] sugestão ${job.id} (${job.kind}) falhou: ${message}`)
}

let running = false

async function tick() {
  if (running) return
  running = true
  try {
    const job = await claimNextJob()
    if (job) {
      try {
        await runSuggestionJob(job)
      } catch (err) {
        await failJob(job, err)
      }
    }
  } catch (err) {
    console.error('[wa-ia] erro na bomba de sugestões:', err)
  } finally {
    running = false
  }
}

export function startWaSuggestionWorker() {
  if (process.env.AI_CHAT_ENABLED === 'false') {
    console.log('[wa-ia] desligado por AI_CHAT_ENABLED=false — sugestões ficam na fila.')
    return
  }

  // Jobs que ficaram 'running' quando o processo caiu voltam para a fila.
  pool
    .query("UPDATE whatsapp_ai_suggestions SET status = 'pending' WHERE status = 'running'")
    .then(([result]) => {
      if (result.affectedRows > 0) {
        console.log(`[wa-ia] ${result.affectedRows} sugestão(ões) interrompida(s) devolvida(s) para a fila.`)
      }
    })
    .catch((err) => console.error('[wa-ia] falha ao recuperar sugestões interrompidas:', err))

  setInterval(tick, POLL_MS).unref()
  console.log('[wa-ia] sugestões de resposta do WhatsApp ativas.')
}
