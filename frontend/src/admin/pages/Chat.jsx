import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'

const CONVERSATIONS_POLL_MS = 5000
const MESSAGES_POLL_MS = 3000

export default function Chat() {
  const { handleError } = useAdminGuard()
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const messagesEndRef = useRef(null)

  function loadConversations() {
    api
      .get('/admin/chat/conversations', getAdminToken())
      .then(setConversations)
      .catch((err) => handleError(err))
  }

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, CONVERSATIONS_POLL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadMessages(id) {
    api
      .get(`/admin/chat/conversations/${id}/messages`, getAdminToken())
      .then(setMessages)
      .catch((err) => handleError(err))
  }

  useEffect(() => {
    if (!selectedId) return
    loadMessages(selectedId)
    const interval = setInterval(() => loadMessages(selectedId), MESSAGES_POLL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendReply(e) {
    e.preventDefault()
    const text = reply.trim()
    if (!text || !selectedId) return
    setReply('')
    try {
      const msg = await api.post(`/admin/chat/conversations/${selectedId}/reply`, { text }, getAdminToken())
      setMessages((prev) => [...prev, msg])
      loadConversations()
    } catch (err) {
      handleError(err)
    }
  }

  const selected = conversations.find((c) => c.id === selectedId)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6" style={{ color: '#f4f4f5' }}>
        Conversas
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4" style={{ height: '70vh' }}>
        <div
          className="rounded-xl overflow-y-auto"
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
                  {c.visitorName || `Visitante ${c.sessionId.slice(0, 8)}`}
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
          className="rounded-xl flex flex-col overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: '#52525b' }}>
                Selecione uma conversa
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'admin' ? 'self-end' : 'self-start'
                    }`}
                    style={
                      msg.sender === 'admin'
                        ? {
                            background: 'linear-gradient(135deg, rgba(8,145,178,0.25), rgba(124,58,237,0.25))',
                            color: '#e4e4e7',
                          }
                        : { background: 'rgba(255,255,255,0.05)', color: '#d4d4d8' }
                    }
                  >
                    {msg.text}
                  </div>
                ))}
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
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
                />
                <button
                  type="submit"
                  disabled={!reply.trim()}
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
      </div>
    </div>
  )
}
