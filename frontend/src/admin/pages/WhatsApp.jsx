import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Send, User, CheckCheck, Clock, AlertTriangle, MessageCircle, Paperclip } from 'lucide-react'
import { api, API_URL } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import ScoutPanel from '../components/ScoutPanel'

const STATUS_POLL_MS = 3000
const CONVERSATIONS_POLL_MS = 5000
const DETAIL_POLL_MS = 3000

function resolveMediaUrl(url) {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  return `${new URL(API_URL).origin}${url}`
}

const MESSAGE_STATUS_ICON = {
  queued: Clock,
  sent: CheckCheck,
  failed: AlertTriangle,
}

function ConnectScreen({ connectionStatus, qr, onConnect }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      {connectionStatus === 'pending_auth' && qr ? (
        <>
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={qr} size={220} />
          </div>
          <p className="text-sm max-w-xs" style={{ color: '#a1a1aa' }}>
            Abra o WhatsApp no celular, vá em Aparelhos conectados e escaneie o código.
          </p>
        </>
      ) : (
        <>
          <MessageCircle size={40} style={{ color: '#22d3ee' }} />
          <p className="text-sm max-w-xs" style={{ color: '#a1a1aa' }}>
            {connectionStatus === 'pending_auth'
              ? 'Gerando QR code...'
              : 'Nenhum WhatsApp conectado. Clique abaixo para gerar o QR code de pareamento.'}
          </p>
          <button
            onClick={onConnect}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
          >
            Conectar WhatsApp
          </button>
        </>
      )}
    </div>
  )
}

export default function WhatsApp() {
  const { handleError } = useAdminGuard()
  const [connection, setConnection] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const loadStatus = useCallback(() => {
    api
      .get('/admin/whatsapp/status', getAdminToken())
      .then(setConnection)
      .catch((err) => handleError(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, STATUS_POLL_MS)
    return () => clearInterval(interval)
  }, [loadStatus])

  const isConnected = connection?.status === 'connected'

  const loadConversations = useCallback(() => {
    api
      .get('/admin/whatsapp/conversations', getAdminToken())
      .then(setConversations)
      .catch((err) => handleError(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isConnected) return
    loadConversations()
    const interval = setInterval(loadConversations, CONVERSATIONS_POLL_MS)
    return () => clearInterval(interval)
  }, [isConnected, loadConversations])

  const loadDetail = useCallback((id) => {
    api
      .get(`/admin/whatsapp/conversations/${id}`, getAdminToken())
      .then(setDetail)
      .catch((err) => handleError(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setDetail(null)
    loadDetail(selectedId)
    const interval = setInterval(() => loadDetail(selectedId), DETAIL_POLL_MS)
    return () => clearInterval(interval)
  }, [selectedId, loadDetail])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail?.messages?.length])

  function handleStartConversation(conversationId, draftText) {
    setSelectedId(conversationId)
    setReply(draftText || '')
    loadConversations()
  }

  async function handleConnect() {
    try {
      await api.post('/admin/whatsapp/connect', {}, getAdminToken())
      loadStatus()
    } catch (err) {
      handleError(err)
    }
  }

  async function sendReply(e) {
    e.preventDefault()
    const text = reply.trim()
    if (!text || !selectedId || sending) return
    setReply('')
    setSending(true)
    try {
      await api.post(`/admin/whatsapp/conversations/${selectedId}/messages`, { text }, getAdminToken())
      loadDetail(selectedId)
      loadConversations()
    } catch (err) {
      handleError(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ color: '#f4f4f5' }}>
        WhatsApp
      </h1>
      <p className="text-sm mb-6" style={{ color: '#71717a' }}>
        Conversas do número conectado via WhatsApp Web.
      </p>

      <div className="flex flex-col xl:grid xl:grid-cols-[260px_1fr_320px] gap-4 xl:h-[72vh]">
        <div
          className="flex flex-col xl:grid xl:grid-cols-[260px_1fr] xl:col-span-2 gap-4 xl:h-full rounded-xl overflow-hidden"
          style={!isConnected ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' } : undefined}
        >
        {!isConnected ? (
          <ConnectScreen connectionStatus={connection?.status} qr={connection?.qr} onConnect={handleConnect} />
        ) : (
          <>
            <div
              className="h-48 xl:h-auto flex-shrink-0 rounded-xl overflow-y-auto"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {conversations.length === 0 && (
                <p className="text-xs p-4" style={{ color: '#52525b' }}>
                  Nenhuma conversa ainda.
                </p>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="w-full text-left p-4 flex flex-col gap-1 cursor-pointer"
                  style={{
                    background: selectedId === c.id ? 'rgba(34,211,238,0.06)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                      {c.displayName || c.phoneNumber || 'Contato'}
                    </span>
                    {c.unreadCount > 0 && (
                      <span
                        className="text-xs px-1.5 rounded-full flex-shrink-0"
                        style={{ background: '#22d3ee', color: '#050505' }}
                      >
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs truncate" style={{ color: '#71717a' }}>
                    {c.lastMessage}
                  </span>
                </button>
              ))}
            </div>

            <div
              className="h-[60vh] xl:h-auto flex-1 min-h-0 rounded-xl flex flex-col overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {!detail ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm" style={{ color: '#52525b' }}>
                    {selectedId ? 'Carregando...' : 'Selecione uma conversa'}
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <User size={16} style={{ color: '#a1a1aa' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                        {detail.conversation.displayName || detail.conversation.phoneNumber || 'Contato'}
                      </p>
                      {detail.conversation.phoneNumber && (
                        <p className="text-xs truncate" style={{ color: '#71717a' }}>
                          {detail.conversation.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
                    {detail.messages.map((msg) => {
                      const isMe = msg.direction === 'outbound'
                      const StatusIcon = MESSAGE_STATUS_ICON[msg.status]
                      const mediaUrl = resolveMediaUrl(msg.attachmentUrl)
                      return (
                        <div key={msg.id} className={`max-w-[80%] ${isMe ? 'self-end' : 'self-start'} flex flex-col gap-1`}>
                          <div
                            className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                            style={{
                              whiteSpace: 'pre-wrap',
                              background: isMe
                                ? 'linear-gradient(135deg, rgba(8,145,178,0.25), rgba(124,58,237,0.25))'
                                : 'rgba(255,255,255,0.05)',
                              color: '#e4e4e7',
                            }}
                          >
                            {msg.attachmentType && msg.attachmentType !== 'image' && (
                              <div className="flex items-center gap-1.5 mb-1" style={{ color: '#a1a1aa' }}>
                                <Paperclip size={12} />
                                <span className="text-xs">{msg.attachmentType}</span>
                              </div>
                            )}
                            {msg.attachmentType === 'image' && mediaUrl && (
                              <img src={mediaUrl} alt="" className="rounded-lg mb-1.5 max-w-full max-h-64 object-contain" />
                            )}
                            {msg.text}
                          </div>
                          {isMe && StatusIcon && (
                            <div className="flex items-center gap-1 self-end px-1" style={{ color: '#52525b' }}>
                              <StatusIcon size={11} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form
                    onSubmit={sendReply}
                    className="p-3 flex gap-2 flex-shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Responder..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e4e4e7',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      aria-label="Enviar resposta"
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                      style={{
                        background: reply.trim() ? 'linear-gradient(135deg, #0891b2, #7c3aed)' : 'rgba(255,255,255,0.05)',
                        color: reply.trim() ? 'white' : '#3f3f46',
                      }}
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </>
        )}
        </div>

        <ScoutPanel isConnected={isConnected} onStartConversation={handleStartConversation} />
      </div>
    </div>
  )
}
