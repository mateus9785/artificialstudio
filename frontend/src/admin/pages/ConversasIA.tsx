import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Send, Bot, User, Headset, AlertTriangle, KanbanSquare, Sparkles, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'

const CONVERSATIONS_POLL_MS = 5000
const DETAIL_POLL_MS = 3000

type QuoteStatus = 'none' | 'presented' | 'confirmed'
type Sender = 'visitor' | 'ai' | 'admin'
type JobStatus = 'pending' | 'running' | 'done' | 'error'

interface ConversationSummary {
  id: number
  sessionId: string
  visitorName: string | null
  visitorContact: string | null
  status: string
  mode: 'ai' | 'human'
  quoteStatus: QuoteStatus
  updatedAt: string
  lastMessage: string | null
  unreadCount: number
  visitorTurns: number
  kanbanCardId: number | null
  failedJobs: number
}

interface ChatMessage {
  id: number
  sender: Sender
  text: string
  createdAt: string
}

interface ChatJob {
  id: number
  kind: 'reply' | 'quote'
  status: JobStatus
  error: string | null
  createdAt: string
}

interface ChatQuote {
  id: number
  projectName: string
  clientName: string | null
  companyName: string | null
  contact: string | null
  serviceType: string | null
  summary: string | null
  requirements: string[]
  integrations: string[]
  priceMin: number | null
  priceMax: number | null
  monthly: number | null
  timelineWeeks: string | null
  paymentTerms: string | null
  status: string
  kanbanCardId: number | null
  createdAt: string
}

interface ConversationDetail {
  conversation: {
    id: number
    sessionId: string
    visitorName: string | null
    visitorContact: string | null
    mode: 'ai' | 'human'
    quoteStatus: QuoteStatus
    createdAt: string
    updatedAt: string
  }
  messages: ChatMessage[]
  quote: ChatQuote | null
  jobs: ChatJob[]
}

const QUOTE_BADGE: Record<QuoteStatus, { label: string; color: string } | null> = {
  none: null,
  presented: { label: 'Orçamento enviado', color: '#f59e0b' },
  confirmed: { label: 'Fechado', color: '#22c55e' },
}

const SENDER_STYLE: Record<Sender, { icon: LucideIcon; align: string; iconColor: string; bubble: CSSProperties }> = {
  visitor: {
    icon: User,
    align: 'self-start',
    iconColor: '#a855f7',
    bubble: { background: 'rgba(255,255,255,0.05)', color: '#d4d4d8' },
  },
  ai: {
    icon: Sparkles,
    align: 'self-end',
    iconColor: '#22d3ee',
    bubble: { background: 'linear-gradient(135deg, rgba(8,145,178,0.25), rgba(124,58,237,0.25))', color: '#e4e4e7' },
  },
  admin: {
    icon: Headset,
    align: 'self-end',
    iconColor: '#f59e0b',
    bubble: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', color: '#e4e4e7' },
  },
}

function money(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function priceLabel(quote: ChatQuote): string {
  const min = money(quote.priceMin)
  const max = money(quote.priceMax)
  if (!min && !max) return '—'
  if (!max || min === max) return (min || max) as string
  return `${min} a ${max}`
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: '#52525b' }}>
        {label}
      </p>
      <p className="text-sm" style={{ color: '#d4d4d8' }}>
        {children}
      </p>
    </div>
  )
}

function QuotePanel({ quote }: { quote: ChatQuote | null }) {
  if (!quote) {
    return (
      <p className="text-xs p-4" style={{ color: '#52525b' }}>
        Nenhum orçamento fechado nesta conversa ainda.
      </p>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium" style={{ color: '#f4f4f5' }}>
          {quote.projectName}
        </p>
        {quote.serviceType && (
          <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>
            {quote.serviceType}
          </p>
        )}
      </div>

      {quote.kanbanCardId ? (
        <Link
          to="/admin/producao-automatizada"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}
        >
          <KanbanSquare size={14} />
          Card #{quote.kanbanCardId} em Produção Automatizada
        </Link>
      ) : (
        <p className="text-xs" style={{ color: '#f59e0b' }}>
          Orçamento extraído, mas o card ainda não foi criado.
        </p>
      )}

      <Field label="Cliente">{quote.clientName}</Field>
      <Field label="Empresa">{quote.companyName}</Field>
      <Field label="Contato">{quote.contact}</Field>
      <Field label="Valor">{priceLabel(quote)}</Field>
      <Field label="Mensalidade">{money(quote.monthly)}</Field>
      <Field label="Prazo">{quote.timelineWeeks ? `${quote.timelineWeeks} semanas` : null}</Field>
      <Field label="Pagamento">{quote.paymentTerms}</Field>
      <Field label="Resumo">{quote.summary}</Field>

      {quote.requirements.length > 0 && (
        <div>
          <p className="text-xs mb-1" style={{ color: '#52525b' }}>
            Requisitos ({quote.requirements.length})
          </p>
          <ul className="flex flex-col gap-1">
            {quote.requirements.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed" style={{ color: '#a1a1aa' }}>
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {quote.integrations.length > 0 && (
        <div>
          <p className="text-xs mb-1" style={{ color: '#52525b' }}>
            Integrações
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quote.integrations.map((item, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.12)', color: '#c4b5fd' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConversasIA() {
  const { handleError } = useAdminGuard()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [reply, setReply] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(() => {
    api
      .get('/admin/chat/conversations', getAdminToken())
      .then((data) => setConversations(data as ConversationSummary[]))
      .catch((err) => handleError(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, CONVERSATIONS_POLL_MS)
    return () => clearInterval(interval)
  }, [loadConversations])

  // `handleError` fica fora das dependências de propósito: ele é recriado a cada render pelo
  // useAdminGuard, e incluí-lo faria o useEffect abaixo recriar o setInterval a cada render.
  const loadDetail = useCallback((id: number) => {
    api
      .get(`/admin/chat/conversations/${id}`, getAdminToken())
      .then((data) => setDetail(data as ConversationDetail))
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

  async function toggleMode() {
    if (!detail || !selectedId) return
    const next = detail.conversation.mode === 'ai' ? 'human' : 'ai'
    try {
      await api.post(`/admin/chat/conversations/${selectedId}/mode`, { mode: next }, getAdminToken())
      loadDetail(selectedId)
    } catch (err) {
      handleError(err)
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault()
    const text = reply.trim()
    if (!text || !selectedId) return
    setReply('')
    try {
      await api.post(`/admin/chat/conversations/${selectedId}/reply`, { text }, getAdminToken())
      loadDetail(selectedId)
      loadConversations()
    } catch (err) {
      handleError(err)
    }
  }

  const pendingJob = detail?.jobs?.find((j) => j.status === 'pending' || j.status === 'running')
  const failedJob = detail?.jobs?.find((j) => j.status === 'error')
  const isHuman = detail?.conversation?.mode === 'human'

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ color: '#f4f4f5' }}>
        Conversas IA
      </h1>
      <p className="text-sm mb-6" style={{ color: '#71717a' }}>
        Atendimento comercial do site. Orçamento fechado vira card em Produção Automatizada.
      </p>

      <div className="flex flex-col xl:grid xl:grid-cols-[280px_1fr_320px] gap-4 xl:h-[72vh]">
        <div className="h-48 xl:h-auto flex-shrink-0 rounded-xl overflow-y-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {conversations.length === 0 && (
            <p className="text-xs p-4" style={{ color: '#52525b' }}>
              Nenhuma conversa ainda.
            </p>
          )}
          {conversations.map((c) => {
            const badge = QUOTE_BADGE[c.quoteStatus]
            return (
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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {c.failedJobs > 0 && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
                    {c.mode === 'human' && <Headset size={12} style={{ color: '#f59e0b' }} />}
                    {c.unreadCount > 0 && (
                      <span className="text-xs px-1.5 rounded-full" style={{ background: '#22d3ee', color: '#050505' }}>
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs truncate" style={{ color: '#71717a' }}>
                  {c.lastMessage}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${badge.color}20`, color: badge.color }}>
                      {badge.label}
                    </span>
                  )}
                  <span className="text-[10px]" style={{ color: '#3f3f46' }}>
                    {c.visitorTurns} msg
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="h-[60vh] xl:h-auto flex-1 min-h-0 rounded-xl flex flex-col overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {!detail ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: '#52525b' }}>
                {selectedId ? 'Carregando...' : 'Selecione uma conversa'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                    {detail.conversation.visitorName || `Visitante ${detail.conversation.sessionId.slice(0, 8)}`}
                  </p>
                  {detail.conversation.visitorContact && (
                    <p className="text-xs truncate" style={{ color: '#71717a' }}>
                      {detail.conversation.visitorContact}
                    </p>
                  )}
                </div>
                <button
                  onClick={toggleMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex-shrink-0"
                  style={isHuman ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' } : { background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}
                  title={isHuman ? 'A IA está pausada nesta conversa' : 'A IA está respondendo esta conversa'}
                >
                  {isHuman ? <Headset size={13} /> : <Bot size={13} />}
                  {isHuman ? 'Você assumiu' : 'IA ativa'}
                </button>
              </div>

              {failedJob && (
                <div className="px-4 py-2 flex items-start gap-2 flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={13} style={{ color: '#ef4444', marginTop: 2 }} className="flex-shrink-0" />
                  <p className="text-xs leading-relaxed" style={{ color: '#fca5a5' }}>
                    Falha da IA ({failedJob.kind === 'quote' ? 'extração do orçamento' : 'resposta'}): {failedJob.error}
                  </p>
                </div>
              )}

              <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
                {detail.messages.map((msg) => {
                  const style = SENDER_STYLE[msg.sender] || SENDER_STYLE.visitor
                  const Icon = style.icon
                  return (
                    <div key={msg.id} className={`max-w-[80%] ${style.align} flex flex-col gap-1`}>
                      <div className="flex items-center gap-1.5 px-1">
                        <Icon size={11} style={{ color: style.iconColor }} />
                        <span className="text-[10px]" style={{ color: '#52525b' }}>
                          {msg.sender === 'visitor' ? 'cliente' : msg.sender === 'ai' ? 'IA' : 'você'}
                        </span>
                      </div>
                      <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap', ...style.bubble }}>
                        {msg.text}
                      </div>
                    </div>
                  )
                })}
                {pendingJob && (
                  <p className="text-xs self-end px-1" style={{ color: '#52525b' }}>
                    IA {pendingJob.status === 'running' ? 'escrevendo' : 'na fila'}...
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendReply} className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={isHuman ? 'Responder...' : 'Responder (a IA continua ativa)...'}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
                />
                <button
                  type="submit"
                  disabled={!reply.trim()}
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

        <div className="xl:h-auto rounded-xl overflow-y-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium px-4 py-3" style={{ color: '#71717a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            Orçamento
          </p>
          {detail ? (
            <QuotePanel quote={detail.quote} />
          ) : (
            <p className="text-xs p-4" style={{ color: '#52525b' }}>
              Selecione uma conversa.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
