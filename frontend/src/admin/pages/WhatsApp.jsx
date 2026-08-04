import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Send,
  User,
  CheckCheck,
  Clock,
  AlertTriangle,
  MessageCircle,
  Paperclip,
  Bot,
  Sparkles,
  RefreshCw,
  X,
  Pencil,
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  MessageSquarePlus,
  PenLine,
} from 'lucide-react'
import { api, API_URL } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import ScoutPanel from '../components/ScoutPanel'
import AddManualMessageModal from '../components/AddManualMessageModal'

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

function ContactAvatar({ avatarUrl, size = 36, iconSize = 16 }) {
  const resolvedUrl = resolveMediaUrl(avatarUrl)
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: 'rgba(255,255,255,0.06)' }}
    >
      {resolvedUrl ? (
        <img src={resolvedUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <User size={iconSize} style={{ color: '#a1a1aa' }} />
      )}
    </div>
  )
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

/** Rascunho da IA aguardando o admin — nada é enviado sem clique. */
function SuggestionPanel({ suggestion, busy, onApprove, onEdit, onRegenerate, onDiscard }) {
  if (!suggestion) return null

  const isGenerating = suggestion.status === 'pending' || suggestion.status === 'running'
  const isError = suggestion.status === 'error'

  return (
    <div
      className="mx-3 mb-2 rounded-xl p-3 flex flex-col gap-2 flex-shrink-0"
      style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)' }}
    >
      <div className="flex items-center gap-1.5 text-xs" style={{ color: '#22d3ee' }}>
        <Sparkles size={12} />
        <span className="font-medium">
          {suggestion.kind === 'cold_outreach' ? 'Abordagem sugerida pela IA' : 'Resposta sugerida pela IA'}
        </span>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs py-1" style={{ color: '#a1a1aa' }}>
          <RefreshCw size={12} className="animate-spin" />
          Gerando sugestão... (pode levar até 2 minutos)
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 text-xs py-1" style={{ color: '#f87171' }}>
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          <span>Falha ao gerar: {suggestion.error || 'erro desconhecido'}</span>
        </div>
      )}

      {suggestion.status === 'draft' && (
        <p className="text-sm leading-relaxed" style={{ color: '#e4e4e7', whiteSpace: 'pre-wrap' }}>
          {suggestion.suggestedText}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {suggestion.status === 'draft' && (
          <>
            <button
              onClick={onApprove}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
            >
              <Send size={11} /> Enviar
            </button>
            <button
              onClick={onEdit}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e4e4e7' }}
            >
              <Pencil size={11} /> Editar
            </button>
          </>
        )}
        {(suggestion.status === 'draft' || isError) && (
          <>
            <button
              onClick={onRegenerate}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e4e4e7' }}
            >
              <RefreshCw size={11} /> Regenerar
            </button>
            <button
              onClick={onDiscard}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }}
            >
              <X size={11} /> Descartar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const ESTAGIO_LABEL = {
  sondagem: 'Sondagem',
  revelacao: 'Revelação',
  abertura: 'Abertura',
  descoberta: 'Descoberta',
  proposta: 'Proposta',
  orcamento_apresentado: 'Orçamento apresentado',
  orcamento_confirmado: 'Orçamento confirmado',
  encerrado: 'Encerrado',
}

/**
 * Painel lateral com os dados que a IA coleta durante a conversa (nome, empresa,
 * contato, requisitos...) — mesmo papel do QuotePanel da tela Conversas IA — e,
 * quando o contato é lead do pegasus-scout, os dados de prospecção. Faz acordeão
 * com o painel de Prospecção: abrir um colapsa o outro.
 */
function CollectedDataPanel({ collectedData, lead, collapsed, onToggleCollapse }) {
  const data = collectedData || {}
  const hasCollected = Object.entries(data).some(
    ([key, value]) => key !== 'kanban_card_id' && value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0),
  )

  const Row = ({ label, value }) =>
    value === null || value === undefined || value === '' ? null : (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wide" style={{ color: '#52525b' }}>
          {label}
        </span>
        <span className="text-xs leading-relaxed" style={{ color: '#d4d4d8' }}>
          {value}
        </span>
      </div>
    )

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full p-4 flex items-center justify-between cursor-pointer flex-shrink-0"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#f4f4f5' }}>
          <ClipboardList size={15} style={{ color: '#22d3ee' }} />
          Dados do contato
        </h2>
        {collapsed ? (
          <ChevronDown size={15} style={{ color: '#71717a' }} />
        ) : (
          <ChevronUp size={15} style={{ color: '#71717a' }} />
        )}
      </button>

      <div
        className={collapsed ? 'hidden' : 'p-4 flex flex-col gap-3 overflow-y-auto'}
        style={{ maxHeight: '45vh' }}
      >
      {!hasCollected && !lead && (
        <p className="text-xs" style={{ color: '#52525b' }}>
          A IA ainda não coletou dados desta conversa — eles aparecem aqui conforme o papo avança.
        </p>
      )}
      {lead && (
        <div className="flex flex-col gap-2 pb-3" style={{ borderBottom: hasCollected ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#a78bfa' }}>
            <Building2 size={12} /> Lead do Pegasus Scout
          </div>
          <Row label="Empresa" value={lead.name} />
          <Row label="Segmento" value={lead.segmento || lead.category} />
          <Row label="Cidade" value={lead.city && lead.state ? `${lead.city}/${lead.state}` : lead.city} />
          <Row label="Fit score" value={lead.fitScore != null ? `${lead.fitScore}/100` : null} />
          <Row label="Resumo" value={lead.resumo} />
          <Row label="Gancho" value={lead.ganchoAbordagem} />
        </div>
      )}

      {hasCollected && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#22d3ee' }}>
            <Sparkles size={12} /> Dados coletados na conversa
          </div>
          <Row label="Nome" value={data.nome} />
          <Row label="Empresa" value={data.empresa} />
          <Row label="Contato" value={data.contato} />
          <Row label="Tipo de serviço" value={data.tipo_de_servico} />
          <Row label="Estágio" value={ESTAGIO_LABEL[data.estagio] || data.estagio} />
          {Array.isArray(data.requisitos) && data.requisitos.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: '#52525b' }}>
                Requisitos
              </span>
              <ul className="text-xs leading-relaxed flex flex-col gap-0.5" style={{ color: '#d4d4d8' }}>
                {data.requisitos.map((req, i) => (
                  <li key={i}>- {req}</li>
                ))}
              </ul>
            </div>
          )}
          <Row label="Observações" value={data.observacoes} />
          {data.kanban_card_id && <Row label="Card no kanban" value={`#${data.kanban_card_id} (Produção Automatizada)`} />}
        </div>
      )}
      </div>
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
  const [triggeringSync, setTriggeringSync] = useState(false)
  const [showManualMessageModal, setShowManualMessageModal] = useState(false)
  const [suggestionBusy, setSuggestionBusy] = useState(false)
  // Sugestão que o admin mandou para o input via "Editar": o envio do form passa
  // pela rota de aprovação (grava final_text) em vez do envio comum.
  const [editingSuggestionId, setEditingSuggestionId] = useState(null)
  // Acordeão da coluna direita: exatamente um painel aberto por vez —
  // 'dados' (dados do contato/lead) ou 'scout' (Prospecção).
  const [openPanel, setOpenPanel] = useState('scout')
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
    if (!selectedId) {
      setOpenPanel('scout') // sem conversa não existe painel de dados — Prospecção volta a abrir
      return
    }
    setDetail(null)
    setEditingSuggestionId(null)
    setOpenPanel('dados') // acabou de abrir uma conversa: mostra os dados dela
    loadDetail(selectedId)
    const interval = setInterval(() => loadDetail(selectedId), DETAIL_POLL_MS)
    return () => clearInterval(interval)
  }, [selectedId, loadDetail])

  // Clicar num cabeçalho abre aquele painel e colapsa o outro; clicar no que já
  // está aberto inverte — sempre exatamente um aberto.
  function togglePanel(name) {
    setOpenPanel((prev) => (prev === name ? (name === 'dados' ? 'scout' : 'dados') : name))
  }

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
      if (editingSuggestionId) {
        await api.post(`/admin/whatsapp/suggestions/${editingSuggestionId}/approve`, { text }, getAdminToken())
        setEditingSuggestionId(null)
      } else {
        await api.post(`/admin/whatsapp/conversations/${selectedId}/messages`, { text }, getAdminToken())
      }
      loadDetail(selectedId)
      loadConversations()
    } catch (err) {
      handleError(err)
    } finally {
      setSending(false)
    }
  }

  async function approveSuggestion() {
    if (!detail?.suggestion || suggestionBusy) return
    setSuggestionBusy(true)
    try {
      await api.post(`/admin/whatsapp/suggestions/${detail.suggestion.id}/approve`, {}, getAdminToken())
      loadDetail(selectedId)
      loadConversations()
    } catch (err) {
      handleError(err)
    } finally {
      setSuggestionBusy(false)
    }
  }

  function editSuggestion() {
    if (!detail?.suggestion?.suggestedText) return
    setReply(detail.suggestion.suggestedText)
    setEditingSuggestionId(detail.suggestion.id)
  }

  async function regenerateSuggestion() {
    if (!selectedId || suggestionBusy) return
    setSuggestionBusy(true)
    setEditingSuggestionId(null)
    try {
      await api.post(`/admin/whatsapp/conversations/${selectedId}/suggestion/regenerate`, {}, getAdminToken())
      loadDetail(selectedId)
    } catch (err) {
      handleError(err)
    } finally {
      setSuggestionBusy(false)
    }
  }

  async function discardSuggestion() {
    if (!detail?.suggestion || suggestionBusy) return
    setSuggestionBusy(true)
    setEditingSuggestionId(null)
    try {
      await api.post(`/admin/whatsapp/suggestions/${detail.suggestion.id}/discard`, {}, getAdminToken())
      loadDetail(selectedId)
    } catch (err) {
      handleError(err)
    } finally {
      setSuggestionBusy(false)
    }
  }

  async function toggleAi() {
    if (!selectedId) return
    try {
      await api.post(`/admin/whatsapp/conversations/${selectedId}/ai-toggle`, {}, getAdminToken())
      loadDetail(selectedId)
      loadConversations()
    } catch (err) {
      handleError(err)
    }
  }

  // Botão de buscar histórico: dispara o backfill sob demanda no WhatsApp (não é
  // só reler o banco — o polling de 3s já faz isso sozinho). O backend roda em
  // segundo plano e reporta o progresso via conversation.historySyncing, que o
  // polling de detalhe já busca a cada 3s — o spinner acompanha esse flag.
  async function syncHistory() {
    if (!selectedId || triggeringSync || detail?.conversation?.historySyncing) return
    setTriggeringSync(true)
    try {
      await api.post(`/admin/whatsapp/conversations/${selectedId}/sync-history`, {}, getAdminToken())
      loadDetail(selectedId)
    } catch (err) {
      handleError(err)
    } finally {
      setTriggeringSync(false)
    }
  }

  const aiEnabled = detail?.conversation?.aiEnabled
  const historySyncing = triggeringSync || Boolean(detail?.conversation?.historySyncing)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ color: '#f4f4f5' }}>
        WhatsApp
      </h1>
      <p className="text-sm mb-6" style={{ color: '#71717a' }}>
        Conversas do número conectado via WhatsApp Web. A IA sugere respostas — você aprova antes de enviar.
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
                  <div className="flex items-center gap-2.5">
                    <ContactAvatar avatarUrl={c.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                          {c.displayName || c.phoneNumber || 'Contato'}
                        </span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          {c.suggestionStatus === 'draft' && (
                            <Sparkles size={11} style={{ color: '#22d3ee' }} title="Sugestão da IA pronta" />
                          )}
                          {(c.suggestionStatus === 'pending' || c.suggestionStatus === 'running') && (
                            <RefreshCw size={11} className="animate-spin" style={{ color: '#71717a' }} />
                          )}
                          {c.isLead && (
                            <span
                              className="text-[9px] px-1 rounded uppercase tracking-wide"
                              style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
                            >
                              lead
                            </span>
                          )}
                          {c.unreadCount > 0 && (
                            <span
                              className="text-xs px-1.5 rounded-full"
                              style={{ background: '#22d3ee', color: '#050505' }}
                            >
                              {c.unreadCount}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs truncate block" style={{ color: '#71717a' }}>
                        {c.lastMessage}
                      </span>
                    </div>
                  </div>
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
                    <ContactAvatar avatarUrl={detail.conversation.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                          {detail.conversation.displayName || detail.conversation.phoneNumber || 'Contato'}
                        </p>
                        {detail.lead && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
                            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
                            title={detail.lead.name}
                          >
                            lead
                          </span>
                        )}
                      </div>
                      {detail.conversation.phoneNumber && (
                        <p className="text-xs truncate" style={{ color: '#71717a' }}>
                          {detail.conversation.phoneNumber}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowManualMessageModal(true)}
                      title="Adicionar mensagem manualmente"
                      aria-label="Adicionar mensagem manualmente"
                      className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer flex-shrink-0"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: '#a1a1aa',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <MessageSquarePlus size={13} />
                    </button>
                    <button
                      onClick={syncHistory}
                      disabled={historySyncing}
                      title={historySyncing ? 'Buscando histórico completo no WhatsApp...' : 'Buscar histórico completo dessa conversa no WhatsApp'}
                      aria-label="Buscar histórico completo"
                      className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer flex-shrink-0 disabled:opacity-50"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: '#a1a1aa',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <RefreshCw size={13} className={historySyncing ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={regenerateSuggestion}
                      disabled={suggestionBusy}
                      title="Gerar nova sugestão da IA"
                      aria-label="Gerar nova sugestão da IA"
                      className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer flex-shrink-0 disabled:opacity-50"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: '#a1a1aa',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Sparkles size={13} className={suggestionBusy ? 'animate-pulse' : ''} />
                    </button>
                    <button
                      onClick={toggleAi}
                      title={aiEnabled ? 'IA ligada nesta conversa — clique para desligar' : 'IA desligada nesta conversa — clique para ligar'}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer flex-shrink-0"
                      style={{
                        background: aiEnabled ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.05)',
                        color: aiEnabled ? '#22d3ee' : '#52525b',
                        border: `1px solid ${aiEnabled ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <Bot size={13} />
                      IA
                    </button>
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
                          {((isMe && StatusIcon) || msg.isManual) && (
                            <div
                              className={`flex items-center gap-1 px-1 ${isMe ? 'self-end' : 'self-start'}`}
                              style={{ color: '#52525b' }}
                            >
                              {isMe && StatusIcon && <StatusIcon size={11} />}
                              {msg.isManual && (
                                <span className="flex items-center gap-0.5 text-[10px]" title="Adicionada manualmente pelo admin">
                                  <PenLine size={10} />
                                  manual
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {!editingSuggestionId && (
                    <SuggestionPanel
                      suggestion={detail.suggestion}
                      busy={suggestionBusy}
                      onApprove={approveSuggestion}
                      onEdit={editSuggestion}
                      onRegenerate={regenerateSuggestion}
                      onDiscard={discardSuggestion}
                    />
                  )}

                  <form
                    onSubmit={sendReply}
                    className="p-3 flex gap-2 flex-shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={editingSuggestionId ? 'Editando sugestão da IA — Enter envia a versão editada' : 'Responder...'}
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: editingSuggestionId ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(255,255,255,0.08)',
                        color: '#e4e4e7',
                      }}
                    />
                    {editingSuggestionId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSuggestionId(null)
                          setReply('')
                        }}
                        aria-label="Cancelar edição da sugestão"
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
                      >
                        <X size={15} />
                      </button>
                    )}
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

        <div className="flex flex-col gap-4 min-h-0">
          {isConnected && detail && (
            <CollectedDataPanel
              collectedData={detail.conversation.collectedData}
              lead={detail.lead}
              collapsed={openPanel !== 'dados'}
              onToggleCollapse={() => togglePanel('dados')}
            />
          )}
          <ScoutPanel
            isConnected={isConnected}
            onStartConversation={handleStartConversation}
            collapsed={Boolean(detail) && openPanel !== 'scout'}
            onToggleCollapse={() => togglePanel('scout')}
          />
        </div>
      </div>

      {showManualMessageModal && selectedId && (
        <AddManualMessageModal
          conversationId={selectedId}
          onClose={() => setShowManualMessageModal(false)}
          onAdded={() => {
            loadDetail(selectedId)
            loadConversations()
          }}
        />
      )}
    </div>
  )
}
