import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import pino from 'pino'
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  Browsers,
} from 'baileys'
import { pool } from '../db/pool.js'
import { enqueueSuggestion } from './waSuggestionWorker.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_DIR = path.join(__dirname, '../../whatsapp-session')
const MEDIA_DIR = path.join(__dirname, '../../uploads/whatsapp-media')

const logger = pino({ level: 'warn' })

const MAX_RECONNECT_DELAY_MS = 30_000
const MEDIA_MESSAGE_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']

// Backfill de historico sob demanda (botao "buscar historico completo" do painel).
const BACKFILL_BATCH_SIZE = 50
const BACKFILL_MAX_BATCHES = 20
const BACKFILL_POLL_INTERVAL_MS = 1000
const BACKFILL_POLL_TIMEOUT_MS = 20_000
const backfillingJids = new Set()

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Porta simplificada de ominichain/backend/src/adapters/whatsapp/WhatsAppAdapter.ts:
 * mesma lib (Baileys), mesma ideia de sessão persistida em disco via
 * useMultiFileAuthState, mas processo único (sem BullMQ/worker separado, sem
 * Socket.io) e uma única conta (sem multi-tenant, sem reconciliação de alias
 * @lid/telefone). Grupos (@g.us) seguem fora de escopo, igual ao original.
 */
let socket = null
let status = 'disconnected'
let reconnectAttempts = 0
let qrData = null
const avatarUrlCache = new Map()

let cachedVersion
async function getWaVersion() {
  if (cachedVersion) return cachedVersion
  try {
    const { version } = await fetchLatestBaileysVersion()
    cachedVersion = version
    return version
  } catch (err) {
    logger.error({ err }, 'failed to fetch latest WhatsApp Web version, using baileys default')
    return undefined
  }
}

function jidToPhoneNumber(jid) {
  if (!jid) return undefined
  return jid.split('@')[0].split(':')[0]
}

/** Portão de ingestão: só guarda mensagem de numero que e lead do pegasus-scout
 * (scout_prospects.whatsapp_phone_e164/phone_e164). Vale para mensagem live E
 * para o replay de syncFullHistory — o numero conectado e pessoal, entao sem o
 * portao entrariam contatos pessoais e visitantes do site (que o dono atende
 * direto no aplicativo, sem IA). O painel e a IA vendedora sao exclusivos da
 * prospeccao. */
async function isKnownLeadPhone(phoneDigits) {
  if (!phoneDigits) return false
  const [rows] = await pool.query(
    `SELECT 1 FROM scout_prospects
     WHERE REGEXP_REPLACE(COALESCE(whatsapp_phone_e164, phone_e164), '[^0-9]', '') = ?
     LIMIT 1`,
    [phoneDigits],
  )
  return rows.length > 0
}

function extractText(msg) {
  const m = msg.message
  if (!m) return undefined
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    undefined
  )
}

function mediaKeyToType(key) {
  switch (key) {
    case 'imageMessage':
      return 'image'
    case 'videoMessage':
      return 'video'
    case 'audioMessage':
      return 'audio'
    case 'stickerMessage':
      return 'sticker'
    default:
      return 'document'
  }
}

async function setConnectionState({ status: nextStatus, qrData: nextQr, phoneNumber, connectedAt }) {
  await pool.query(
    `INSERT INTO whatsapp_connection (id, status, qr_data, phone_number, last_connected_at)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       qr_data = VALUES(qr_data),
       phone_number = COALESCE(VALUES(phone_number), phone_number),
       last_connected_at = COALESCE(VALUES(last_connected_at), last_connected_at)`,
    [nextStatus, nextQr ?? null, phoneNumber ?? null, connectedAt ?? null],
  )
}

async function upsertContact({ jid, displayName, avatarUrl, phoneNumber }) {
  await pool.query(
    `INSERT INTO whatsapp_contacts (external_jid, display_name, avatar_url, phone_number)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       display_name = COALESCE(?, display_name),
       avatar_url = COALESCE(?, avatar_url),
       phone_number = COALESCE(?, phone_number)`,
    [jid, displayName ?? null, avatarUrl ?? null, phoneNumber ?? null, displayName ?? null, avatarUrl ?? null, phoneNumber ?? null],
  )
  const [rows] = await pool.query('SELECT * FROM whatsapp_contacts WHERE external_jid = ?', [jid])
  return rows[0]
}

/** Upsert da conversa 1:1 do contato — replica a lógica de messageIngestService.ts do
 * ominichain (não deixa uma mensagem de history-sync mais antiga sobrescrever o preview/
 * unread de uma mensagem live mais recente que já tenha chegado). */
async function upsertConversationForMessage(contact, { sentAt, preview, direction }, { isHistory }) {
  const [existingRows] = await pool.query('SELECT * FROM whatsapp_conversations WHERE contact_id = ?', [contact.id])
  const existing = existingRows[0]
  const isNewestKnown = !existing || !existing.last_message_at || sentAt > existing.last_message_at
  const bumpUnread = direction === 'inbound' && !isHistory

  if (!existing) {
    const [result] = await pool.query(
      `INSERT INTO whatsapp_conversations (contact_id, started_by, last_message_at, last_message_preview, unread_count)
       VALUES (?, ?, ?, ?, ?)`,
      [contact.id, direction === 'outbound' ? 'admin' : 'contact', sentAt, preview, bumpUnread ? 1 : 0],
    )
    const [rows] = await pool.query('SELECT * FROM whatsapp_conversations WHERE id = ?', [result.insertId])
    return rows[0]
  }

  const sets = []
  const params = []
  if (isNewestKnown) {
    sets.push('last_message_at = ?', 'last_message_preview = ?')
    params.push(sentAt, preview)
  }
  if (bumpUnread) sets.push('unread_count = unread_count + 1')
  if (sets.length > 0) {
    await pool.query(`UPDATE whatsapp_conversations SET ${sets.join(', ')} WHERE id = ?`, [...params, existing.id])
  }
  const [rows] = await pool.query('SELECT * FROM whatsapp_conversations WHERE id = ?', [existing.id])
  return rows[0]
}

async function insertMessage({ conversationId, direction, status: messageStatus, externalMessageId, text, attachment, sentAt }) {
  try {
    const [result] = await pool.query(
      `INSERT INTO whatsapp_messages
         (conversation_id, direction, status, external_message_id, text, attachment_type, attachment_url, attachment_mime, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        direction,
        messageStatus,
        externalMessageId ?? null,
        text ?? null,
        attachment?.type ?? null,
        attachment?.url ?? null,
        attachment?.mimeType ?? null,
        sentAt,
      ],
    )
    return result.insertId
  } catch (err) {
    // Já ingerida (mesmo external_message_id nesta conversa) — idempotente, inclusive
    // para o eco do próprio WhatsApp de uma mensagem que enviamos pelo painel.
    if (err.code === 'ER_DUP_ENTRY') return null
    throw err
  }
}

async function getContactAvatarUrl(jid) {
  if (avatarUrlCache.has(jid)) return avatarUrlCache.get(jid)
  let url
  try {
    url = await socket.profilePictureUrl(jid, 'image')
  } catch {
    url = undefined // sem foto, ou bloqueado pela privacidade do contato
  }
  avatarUrlCache.set(jid, url)
  return url
}

async function saveMediaAttachment(msg, mediaKey) {
  const mediaContent = msg.message[mediaKey]
  const type = mediaKeyToType(mediaKey)
  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: socket.updateMediaMessage })
    const ext = mediaContent?.mimetype?.split('/')[1]?.split(';')[0] || 'bin'
    const filename = `${msg.key.id || crypto.randomUUID()}.${ext}`
    await mkdir(MEDIA_DIR, { recursive: true })
    await writeFile(path.join(MEDIA_DIR, filename), buffer)
    return { type, url: `/uploads/whatsapp-media/${filename}`, mimeType: mediaContent?.mimetype }
  } catch (err) {
    logger.error({ err }, 'failed to download whatsapp media, ingesting without attachment')
    return { type, url: null, mimeType: undefined }
  }
}

async function ingestOne(msg, { isHistory = false } = {}) {
  const remoteJid = msg.key.remoteJid ?? undefined
  if (!remoteJid) return
  if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') return // grupos/status: fora de escopo
  if (!msg.message || msg.message.protocolMessage) return

  const phoneNumber = remoteJid.endsWith('@s.whatsapp.net') ? jidToPhoneNumber(remoteJid) : undefined
  if (!(await isKnownLeadPhone(phoneNumber))) return // numero nao e lead do pegasus-scout: nao ingere

  const mediaKey = MEDIA_MESSAGE_TYPES.find((key) => msg.message?.[key])
  const attachment = mediaKey ? await saveMediaAttachment(msg, mediaKey) : null
  const text = extractText(msg)
  const timestampSeconds = Number(msg.messageTimestamp ?? 0)
  const sentAt = timestampSeconds > 0 ? new Date(timestampSeconds * 1000) : new Date()
  const fromMe = Boolean(msg.key.fromMe)
  const direction = fromMe ? 'outbound' : 'inbound'

  const contact = await upsertContact({
    jid: remoteJid,
    displayName: fromMe ? null : msg.pushName || null,
    avatarUrl: await getContactAvatarUrl(remoteJid),
    phoneNumber: phoneNumber ?? null,
  })

  const preview = text ? text.slice(0, 150) : attachment ? `[${attachment.type}]` : ''
  const conversation = await upsertConversationForMessage(contact, { sentAt, preview, direction }, { isHistory })

  const messageId = await insertMessage({
    conversationId: conversation.id,
    direction,
    status: direction === 'inbound' ? 'delivered' : 'sent',
    externalMessageId: msg.key.id ?? `${remoteJid}-${Date.now()}`,
    text,
    attachment,
    sentAt,
  })

  // Mensagem live recebida numa conversa com IA ligada: enfileira a geração da
  // sugestão de resposta (enqueueSuggestion já marca rascunhos antigos como
  // superseded). A sugestão nunca é enviada sozinha — fica aguardando o admin.
  if (messageId && direction === 'inbound' && !isHistory && conversation.ai_enabled) {
    enqueueSuggestion(conversation.id, 'reply', { triggerMessageId: messageId }).catch((err) => {
      logger.error({ err, conversationId: conversation.id }, 'failed to enqueue ai suggestion')
    })
  }
}

async function handleMessagesUpsert(upsert) {
  if (upsert.type !== 'notify') return // pula replays de history-sync na reconexão
  for (const msg of upsert.messages) {
    try {
      await ingestOne(msg)
    } catch (err) {
      logger.error({ err, messageId: msg.key.id }, 'failed to ingest whatsapp message')
    }
  }
}

/** Disparado uma vez, logo após um QR novo (syncFullHistory: true abaixo), com o
 * histórico de conversas do número. Mensagens chegam da mais nova para a mais antiga —
 * processadas na ordem inversa para caírem no mesmo funil das mensagens live. */
async function handleHistorySync({ messages }) {
  for (const msg of [...messages].reverse()) {
    try {
      await ingestOne(msg, { isHistory: true })
    } catch (err) {
      logger.error({ err, messageId: msg.key.id }, 'failed to ingest whatsapp history message')
    }
  }
}

async function getOldestMessageAnchor(jid) {
  const [rows] = await pool.query(
    `SELECT m.external_message_id AS id, m.direction, m.sent_at AS sentAt
     FROM whatsapp_messages m
     JOIN whatsapp_conversations c ON c.id = m.conversation_id
     JOIN whatsapp_contacts ct ON ct.id = c.contact_id
     WHERE ct.external_jid = ? AND m.external_message_id IS NOT NULL
     ORDER BY m.sent_at ASC
     LIMIT 1`,
    [jid],
  )
  return rows[0] || null
}

export function isBackfillRunning(jid) {
  return backfillingJids.has(jid)
}

/**
 * Pede ao WhatsApp o histórico mais antigo de uma conversa via on-demand history
 * sync do Baileys — mesmo mecanismo do scroll infinito do WhatsApp Web. As
 * mensagens que chegarem são ingeridas pelo listener global de
 * messaging-history.set (handleHistorySync, já registrado em startSocket); esta
 * função só dispara os pedidos e observa a tabela pra saber quando parar. Repete
 * puxando cada vez mais pra trás até a mensagem mais antiga parar de mudar (sinal
 * de que acabou o histórico do lado do WhatsApp) ou bater o limite de tentativas.
 */
export async function backfillConversationHistory(jid) {
  if (!socket || status !== 'connected') {
    throw new Error('WhatsApp não está conectado')
  }
  if (backfillingJids.has(jid)) return { fetchedBatches: 0, alreadyRunning: true }

  backfillingJids.add(jid)
  try {
    let anchor = await getOldestMessageAnchor(jid)
    if (!anchor) return { fetchedBatches: 0 } // sem mensagem nenhuma ainda: sem âncora pra pedir histórico anterior

    let fetchedBatches = 0
    for (let i = 0; i < BACKFILL_MAX_BATCHES; i++) {
      await socket.fetchMessageHistory(
        BACKFILL_BATCH_SIZE,
        { remoteJid: jid, fromMe: anchor.direction === 'outbound', id: anchor.id },
        anchor.sentAt.getTime(),
      )

      const deadline = Date.now() + BACKFILL_POLL_TIMEOUT_MS
      let next = anchor
      while (Date.now() < deadline) {
        await delay(BACKFILL_POLL_INTERVAL_MS)
        next = await getOldestMessageAnchor(jid)
        if (next && next.id !== anchor.id) break
      }

      if (!next || next.id === anchor.id) break // nada novo chegou: acabou o histórico (ou o pedido falhou)
      anchor = next
      fetchedBatches += 1
    }
    return { fetchedBatches }
  } finally {
    backfillingJids.delete(jid)
  }
}

async function handleConnectionUpdate(update) {
  if (update.qr) {
    status = 'pending_auth'
    qrData = update.qr
    await setConnectionState({ status, qrData })
  }

  if (update.connection === 'open') {
    status = 'connected'
    reconnectAttempts = 0
    qrData = null
    await setConnectionState({
      status,
      qrData: null,
      phoneNumber: jidToPhoneNumber(socket.user?.id),
      connectedAt: new Date(),
    })
  }

  if (update.connection === 'close') {
    const statusCode = update.lastDisconnect?.error?.output?.statusCode
    const loggedOut = statusCode === DisconnectReason.loggedOut
    logger.error({ statusCode, message: update.lastDisconnect?.error?.message }, 'whatsapp connection closed')

    if (loggedOut) {
      socket = null
      await rm(SESSION_DIR, { recursive: true, force: true })
      status = 'disconnected'
      qrData = null
      await setConnectionState({ status, qrData: null })
      return
    }

    status = 'disconnected'
    await setConnectionState({ status })
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** reconnectAttempts)
    reconnectAttempts += 1
    setTimeout(() => {
      void startSocket()
    }, delay)
  }
}

async function startSocket() {
  await mkdir(SESSION_DIR, { recursive: true })
  const [{ state: authState, saveCreds }, version] = await Promise.all([
    useMultiFileAuthState(SESSION_DIR),
    getWaVersion(),
  ])

  socket = makeWASocket({
    auth: authState,
    logger,
    version,
    browser: Browsers.appropriate('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: true,
  })

  socket.ev.on('creds.update', saveCreds)
  socket.ev.on('connection.update', (update) => void handleConnectionUpdate(update))
  socket.ev.on('messages.upsert', (upsert) => void handleMessagesUpsert(upsert))
  socket.ev.on('messaging-history.set', (set) => void handleHistorySync(set))
}

/** Chamado no boot do processo — só reconecta sozinho se já existir uma sessão pareada
 * em disco (sobrevive a redeploys porque `backend/whatsapp-session/` está no
 * .gitignore e o deploy só faz `git reset --hard`, sem `git clean`). Sem sessão salva,
 * espera o admin clicar em "Conectar" na tela para então gerar o QR. */
export async function initWhatsAppClient() {
  try {
    const files = await readdir(SESSION_DIR)
    if (files.length > 0) await startSocket()
  } catch {
    // diretório ainda não existe — nenhuma sessão pareada
  }
}

export async function connectWhatsApp() {
  if (socket && (status === 'connected' || status === 'pending_auth')) return
  await startSocket()
}

export async function disconnectWhatsApp() {
  if (socket) {
    try {
      await socket.logout()
    } catch {
      socket.end(undefined)
    }
  }
  socket = null
  await rm(SESSION_DIR, { recursive: true, force: true })
  status = 'disconnected'
  qrData = null
  await setConnectionState({ status, qrData: null })
}

/** Cria (ou acha) a conversa 1:1 de um número sem depender de nenhuma mensagem ter
 * chegado antes — usado pelo painel de leads do pegasus-scout (POST
 * /admin/scout/leads/:id/start-conversation) para abrir uma conversa vazia, pronta
 * para o admin revisar um rascunho e enviar manualmente. Não manda nada sozinho. */
export async function getOrCreateConversationByPhone(phoneE164, { displayName } = {}) {
  const digits = String(phoneE164).replace(/\D/g, '')
  const jid = `${digits}@s.whatsapp.net`

  const contact = await upsertContact({ jid, displayName, avatarUrl: undefined, phoneNumber: digits })

  const [existingRows] = await pool.query('SELECT * FROM whatsapp_conversations WHERE contact_id = ?', [contact.id])
  if (existingRows[0]) return existingRows[0]

  const [result] = await pool.query(
    "INSERT INTO whatsapp_conversations (contact_id, started_by, last_message_at, last_message_preview, unread_count) VALUES (?, 'admin', NULL, NULL, 0)",
    [contact.id],
  )
  const [rows] = await pool.query('SELECT * FROM whatsapp_conversations WHERE id = ?', [result.insertId])
  return rows[0]
}

export async function sendWhatsAppMessage(jid, { text, imageBase64, imageMimeType }) {
  if (!socket || status !== 'connected') {
    throw new Error('WhatsApp não está conectado')
  }
  const content = imageBase64
    ? { image: Buffer.from(imageBase64, 'base64'), caption: text, mimetype: imageMimeType }
    : { text: text ?? '' }
  const sent = await socket.sendMessage(jid, content)
  return sent?.key?.id ?? null
}

/** Revoga no WhatsApp ("apagar para todos") — só funciona para mensagens que nós
 * enviamos e dentro da janela de revogação do WhatsApp. Best-effort: quem chama já
 * marcou a mensagem como apagada no nosso lado independente do resultado disso. */
export async function deleteWhatsAppMessage(jid, externalMessageId) {
  if (!socket || status !== 'connected') return
  await socket.sendMessage(jid, { delete: { remoteJid: jid, id: externalMessageId, fromMe: true } })
}
