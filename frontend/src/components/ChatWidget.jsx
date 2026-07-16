import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Minus, X, Send, Headset, User } from 'lucide-react'
import { api } from '../lib/api'
import { getSessionId } from '../lib/session'

const CHAT_NAME = 'Atendimento ArtificialCode'
const POLL_INTERVAL_MS = 4000

function Message({ msg }) {
  const isAdmin = msg.sender === 'admin'
  return (
    <div className={`flex items-end gap-3 animate-slide-in ${isAdmin ? '' : 'flex-row-reverse'}`}>
      {isAdmin ? (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
        >
          <Headset size={14} color="white" />
        </div>
      ) : (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)' }}
        >
          <User size={14} style={{ color: '#a855f7' }} />
        </div>
      )}
      <div
        className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={
          isAdmin
            ? {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#d4d4d8',
                borderBottomLeftRadius: '4px',
              }
            : {
                background: 'linear-gradient(135deg, rgba(8,145,178,0.25), rgba(124,58,237,0.25))',
                border: '1px solid rgba(34,211,238,0.15)',
                color: '#e4e4e7',
                borderBottomRightRadius: '4px',
              }
        }
      >
        {msg.text}
      </div>
    </div>
  )
}

function ChatLauncher({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Abrir chat"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105"
      style={{
        background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
        boxShadow: '0 8px 30px rgba(34,211,238,0.35)',
        animation: 'pulse-glow 2.5s ease-in-out infinite',
      }}
    >
      <MessageCircle size={24} color="white" />
    </button>
  )
}

function ChatHeader({ onMinimize, onClose }) {
  return (
    <div
      className="px-4 py-3.5 flex items-center gap-3 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
      >
        <Headset size={16} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#f4f4f5' }}>
          {CHAT_NAME}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
          />
          <span className="text-xs truncate" style={{ color: '#71717a' }}>
            nossa equipe responde por aqui
          </span>
        </div>
      </div>
      <button
        onClick={onMinimize}
        aria-label="Minimizar chat"
        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
        style={{ color: '#71717a' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Minus size={16} />
      </button>
      <button
        onClick={onClose}
        aria-label="Fechar chat"
        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
        style={{ color: '#71717a' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loaded, setLoaded] = useState(false)
  const messagesEndRef = useRef(null)
  const lastIdRef = useRef(0)
  const pollRef = useRef(null)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  const mergeMessages = useCallback((incoming) => {
    if (!incoming.length) return
    setMessages((prev) => [...prev, ...incoming])
    lastIdRef.current = incoming[incoming.length - 1].id
  }, [])

  // Inicia a conversa e carrega o histórico ao abrir o chat pela primeira vez
  useEffect(() => {
    if (!isOpen || loaded) return
    api
      .post(`/chat/start`, { sessionId: getSessionId() })
      .then((data) => {
        setMessages(data.messages)
        lastIdRef.current = data.messages.at(-1)?.id || 0
        setLoaded(true)
      })
      .catch(() => {})
  }, [isOpen, loaded])

  // Poll por novas respostas do admin enquanto o chat estiver aberto
  useEffect(() => {
    if (!isOpen || !loaded) return

    pollRef.current = setInterval(() => {
      api
        .get(`/chat/${getSessionId()}/messages?after=${lastIdRef.current}`)
        .then((data) => mergeMessages(data.messages))
        .catch(() => {})
    }, POLL_INTERVAL_MS)

    return () => clearInterval(pollRef.current)
  }, [isOpen, loaded, mergeMessages])

  const sendMessage = useCallback(() => {
    const text = inputValue.trim()
    if (!text) return

    setInputValue('')
    api
      .post(`/chat/${getSessionId()}/messages`, { text })
      .then((msg) => {
        setMessages((prev) => [...prev, msg])
        lastIdRef.current = msg.id
      })
      .catch(() => {})
  }, [inputValue])

  const openChat = () => {
    setIsOpen(true)
    setIsMinimized(false)
  }

  const minimizeChat = () => setIsMinimized(true)
  const closeChat = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  if (!isOpen) {
    return <ChatLauncher onClick={openChat} />
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full cursor-pointer transition-transform duration-300 hover:scale-105"
        style={{
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
        >
          <Headset size={14} color="white" />
        </div>
        <span className="text-sm font-medium" style={{ color: '#e4e4e7' }}>
          {CHAT_NAME}
        </span>
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col w-[calc(100vw-3rem)] sm:w-96 rounded-2xl overflow-hidden animate-slide-in"
      style={{
        height: 'min(600px, calc(100vh - 3rem))',
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(34,211,238,0.06)',
      }}
    >
      <ChatHeader onMinimize={minimizeChat} onClose={closeChat} />

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {!loaded && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#3f3f46' }}>
              Iniciando conversa...
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Digite sua mensagem..."
          disabled={!loaded}
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#e4e4e7',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!loaded || !inputValue.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer"
          style={{
            background:
              loaded && inputValue.trim()
                ? 'linear-gradient(135deg, #0891b2, #7c3aed)'
                : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: loaded && inputValue.trim() ? 'white' : '#3f3f46',
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
