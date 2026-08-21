import { pool } from '../db/pool.js'
import { promptFingerprint, runChatTurn, ClaudeNotInstalledError } from './claudeRunner.ts'
import { ClaudeQueueFullError } from './claudeGate.ts'
import { extractQuote } from './quoteExtractor.js'
import { createCardFromQuote } from './projectCard.js'

const POLL_MS = Number(process.env.AI_CHAT_POLL_MS) || 2000
const MAX_ATTEMPTS = 2

/** Mensagem enviada quando o turno falha de vez. Silêncio é pior que admitir e dar uma saída. */
const FALLBACK_TEXT = `Tive um problema técnico aqui e não consegui responder agora. Me chama no WhatsApp que a gente continua por lá:

https://wa.me/5516988190586`

export const AI_MARKERS = {
  presented: '[[ORCAMENTO_APRESENTADO]]',
  confirmed: '[[ORCAMENTO_CONFIRMADO]]',
}

/**
 * Separa os marcadores de controle do texto que o cliente lê.
 *
 * Aceita o marcador em qualquer linha (não só na última) porque o modelo às vezes o coloca antes de
 * uma despedida. O que não pode, em nenhuma hipótese, é o marcador chegar ao visitante.
 */
export function splitMarkers(reply) {
  let quoteStatus = null

  if (reply.includes(AI_MARKERS.confirmed)) quoteStatus = 'confirmed'
  // "Apresentado" não sobrescreve "confirmado" se os dois vierem juntos: confirmar é o estado mais
  // avançado e é ele que dispara o card.
  else if (reply.includes(AI_MARKERS.presented)) quoteStatus = 'presented'

  // A remoção é por substring, e não só por linha inteira, porque um marcador colado no fim de uma
  // frase ("...seguir? [[ORCAMENTO_APRESENTADO]]") continuaria sendo detectado mas chegaria ao
  // visitante. O marcador vazar é pior que qualquer sujeira de formatação.
  const text = reply
    .split(AI_MARKERS.confirmed)
    .join('')
    .split(AI_MARKERS.presented)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { text, quoteStatus }
}

async function loadConversation(id) {
  const [rows] = await pool.query('SELECT * FROM chat_conversations WHERE id = ?', [id])
  return rows[0] || null
}

function renderTranscript(messages) {
  const label = { visitor: 'cliente', ai: 'atendente', admin: 'atendente (humano)' }
  return messages.map((m) => `${label[m.sender] || m.sender}: ${m.text}`).join('\n\n')
}

async function loadMessages(conversationId) {
  const [rows] = await pool.query(
    'SELECT id, sender, text FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC',
    [conversationId],
  )
  return rows
}

/**
 * Junta todas as mensagens do visitante que ainda não foram respondidas.
 *
 * Enquanto um turno de 60s roda, o cliente costuma mandar mais duas ou três mensagens. Responder só
 * a última perderia contexto, e responder uma por uma geraria três respostas seguidas para a mesma
 * pergunta — os dois erros que a regra "responda a última mensagem" existe para evitar.
 */
function splitPendingVisitorMessages(messages) {
  let firstPending = messages.length
  while (firstPending > 0 && messages[firstPending - 1].sender === 'visitor') {
    firstPending -= 1
  }
  return {
    answered: messages.slice(0, firstPending),
    visitorText: messages
      .slice(firstPending)
      .map((m) => m.text)
      .join('\n'),
  }
}

async function insertAiMessage(conversationId, text) {
  const [result] = await pool.query(
    'INSERT INTO chat_messages (conversation_id, sender, text, read_by_admin) VALUES (?, ?, ?, FALSE)',
    [conversationId, 'ai', text.slice(0, 4000)],
  )
  await pool.query('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [conversationId])
  return result.insertId
}

export async function enqueueJob(conversationId, kind, triggerMessageId = null) {
  const [result] = await pool.query(
    'INSERT INTO chat_ai_jobs (conversation_id, kind, trigger_message_id) VALUES (?, ?, ?)',
    [conversationId, kind, triggerMessageId],
  )
  return result.insertId
}

// ---- Execução dos jobs ----

async function runReplyJob(job) {
  const conversation = await loadConversation(job.conversation_id)
  if (!conversation) return

  // O admin assumiu a conversa enquanto o job esperava na fila: a IA cala a boca.
  if (conversation.mode === 'human') return

  const messages = await loadMessages(job.conversation_id)
  const { answered, visitorText } = splitPendingVisitorMessages(messages)
  if (!visitorText) return

  const fingerprint = promptFingerprint()
  // Fingerprint diferente = CLAUDE.md/PRECOS.md/ROTEIRO.md mudaram desde que a sessão nasceu. A
  // sessão antiga continuaria respondendo pelas regras e preços velhos, então ela é descartada e o
  // histórico volta pelo prompt.
  const reuseSession = conversation.claude_session_id && conversation.prompt_fingerprint === fingerprint
  const history = reuseSession || answered.length === 0 ? null : renderTranscript(answered)

  const turn = await runChatTurn({
    sessionId: reuseSession ? conversation.claude_session_id : null,
    visitorText,
    history: history || null,
  })

  const { text, quoteStatus } = splitMarkers(turn.reply)
  if (!text) throw new Error('claude devolveu uma resposta vazia')

  await insertAiMessage(job.conversation_id, text)
  await pool.query('UPDATE chat_conversations SET claude_session_id = ?, prompt_fingerprint = ? WHERE id = ?', [
    turn.sessionId,
    turn.fingerprint,
    job.conversation_id,
  ])

  if (!quoteStatus) return

  // 'presented' nunca rebaixa uma conversa já confirmada: se o cliente pedir um ajuste depois de
  // fechar, o card já existe e o estado comercial continua sendo "confirmado".
  if (quoteStatus === 'presented' && conversation.quote_status !== 'confirmed') {
    await pool.query("UPDATE chat_conversations SET quote_status = 'presented' WHERE id = ?", [job.conversation_id])
    return
  }

  if (quoteStatus === 'confirmed') {
    await pool.query("UPDATE chat_conversations SET quote_status = 'confirmed' WHERE id = ?", [job.conversation_id])

    // Idempotência: o cliente pode dizer "confirmo" de novo, e o modelo pode repetir o marcador.
    // Um orçamento já materializado em card não vira um segundo card.
    const [existing] = await pool.query(
      "SELECT id FROM chat_quotes WHERE conversation_id = ? AND status IN ('draft', 'confirmed', 'card_created')",
      [job.conversation_id],
    )
    const [queued] = await pool.query(
      "SELECT id FROM chat_ai_jobs WHERE conversation_id = ? AND kind = 'quote' AND status IN ('pending', 'running')",
      [job.conversation_id],
    )
    if (existing.length === 0 && queued.length === 0) {
      await enqueueJob(job.conversation_id, 'quote')
    }
  }
}

async function runQuoteJob(job) {
  const conversation = await loadConversation(job.conversation_id)
  if (!conversation) return

  const [alreadyCarded] = await pool.query(
    'SELECT id FROM chat_quotes WHERE conversation_id = ? AND kanban_card_id IS NOT NULL',
    [job.conversation_id],
  )
  if (alreadyCarded.length > 0) return

  const messages = await loadMessages(job.conversation_id)
  const quote = await extractQuote(renderTranscript(messages))

  const [inserted] = await pool.query(
    `INSERT INTO chat_quotes
       (conversation_id, project_name, client_name, company_name, contact, service_type, summary,
        requirements_json, integrations_json, price_min_brl, price_max_brl, monthly_brl,
        timeline_weeks, payment_terms, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    [
      job.conversation_id,
      quote.projectName,
      quote.clientName,
      quote.companyName,
      quote.contact,
      quote.serviceType,
      quote.summary,
      JSON.stringify(quote.requirements),
      JSON.stringify(quote.integrations),
      quote.priceMin,
      quote.priceMax,
      quote.monthly,
      quote.timelineWeeks,
      quote.paymentTerms,
    ],
  )

  const cardId = await createCardFromQuote(quote, conversation)

  await pool.query("UPDATE chat_quotes SET kanban_card_id = ?, status = 'card_created' WHERE id = ?", [
    cardId,
    inserted.insertId,
  ])
  if (quote.contact) {
    await pool.query('UPDATE chat_conversations SET visitor_contact = ?, visitor_name = COALESCE(visitor_name, ?) WHERE id = ?', [
      quote.contact,
      quote.clientName,
      job.conversation_id,
    ])
  }

  console.log(`[ai-chat] conversa ${job.conversation_id} virou o card ${cardId} em Produção Automatizada.`)
}

// ---- Bomba de jobs ----

async function claimNextJob() {
  const [candidates] = await pool.query(
    "SELECT id FROM chat_ai_jobs WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
  )
  if (candidates.length === 0) return null

  const [claimed] = await pool.query(
    "UPDATE chat_ai_jobs SET status = 'running', started_at = NOW(), attempts = attempts + 1 WHERE id = ? AND status = 'pending'",
    [candidates[0].id],
  )
  if (claimed.affectedRows === 0) return null

  const [rows] = await pool.query('SELECT * FROM chat_ai_jobs WHERE id = ?', [candidates[0].id])
  return rows[0]
}

async function failJob(job, err) {
  const message = String(err?.message || err).slice(0, 2000)

  // Fila cheia não é falha do job: é o servidor pedindo para tentar de novo daqui a pouco, sem
  // gastar uma tentativa nem incomodar o cliente.
  if (err instanceof ClaudeQueueFullError) {
    await pool.query("UPDATE chat_ai_jobs SET status = 'pending', attempts = attempts - 1 WHERE id = ?", [job.id])
    return
  }

  const giveUp = job.attempts >= MAX_ATTEMPTS || err instanceof ClaudeNotInstalledError
  if (!giveUp) {
    await pool.query("UPDATE chat_ai_jobs SET status = 'pending', error = ? WHERE id = ?", [message, job.id])
    return
  }

  await pool.query("UPDATE chat_ai_jobs SET status = 'error', error = ?, finished_at = NOW() WHERE id = ?", [
    message,
    job.id,
  ])
  console.error(`[ai-chat] job ${job.id} (${job.kind}) falhou: ${message}`)

  // Só o turno de conversa deixa alguém esperando do outro lado. A extração do orçamento falha em
  // silêncio de propósito — o cliente já foi avisado de que deu tudo certo, e quem resolve é o
  // admin pela tela de Conversas IA.
  if (job.kind === 'reply') {
    await insertAiMessage(job.conversation_id, FALLBACK_TEXT)
  }
}

let running = false

async function tick() {
  if (running) return
  running = true
  try {
    // Um job por tick. Encadear jobs aqui dentro criaria um laço apertado quando um deles volta
    // para 'pending' (fila cheia, retentativa) e ele seria reivindicado de novo na mesma iteração.
    const job = await claimNextJob()
    if (job) {
      try {
        if (job.kind === 'quote') await runQuoteJob(job)
        else await runReplyJob(job)
        await pool.query("UPDATE chat_ai_jobs SET status = 'done', finished_at = NOW() WHERE id = ?", [job.id])
      } catch (err) {
        await failJob(job, err)
      }
    }
  } catch (err) {
    console.error('[ai-chat] erro na bomba de jobs:', err)
  } finally {
    running = false
  }
}

export function startAiChatWorker() {
  if (process.env.AI_CHAT_ENABLED === 'false') {
    console.log('[ai-chat] desligado por AI_CHAT_ENABLED=false — as mensagens ficam na fila.')
    return
  }

  // Turnos anteriores que ficaram 'running' quando o processo caiu voltam para a fila: sem isso a
  // mensagem do cliente ficaria travada para sempre depois de um deploy no meio do atendimento.
  pool
    .query("UPDATE chat_ai_jobs SET status = 'pending' WHERE status = 'running'")
    .then(([result]) => {
      if (result.affectedRows > 0) {
        console.log(`[ai-chat] ${result.affectedRows} job(s) interrompido(s) devolvido(s) para a fila.`)
      }
    })
    .catch((err) => console.error('[ai-chat] falha ao recuperar jobs interrompidos:', err))

  setInterval(tick, POLL_MS).unref()
  console.log('[ai-chat] atendimento com IA ativo.')
}
