import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { Search, Loader2, RotateCw, MessageCircle, Star, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import type { ScoutLead, ScoutRun } from '../../lib/types'

const RUN_POLL_MS = 5000

// Teto baixo de propósito: quanto maior o raio/resultados, mais tiles o
// pegasus-scout varre no Google Maps num mesmo run — e mais perto de levar
// CAPTCHA (ver pegasus-scout/README.md, seção "Riscos reais"). Fixo aqui em
// vez de expor como input pra ninguém "testar um valor mais alto" sem querer.
const SCOUT_RADIUS_KM = 2
const SCOUT_MAX_RESULTS = 10

const STATUS_LABEL: Record<ScoutRun['status'], string> = {
  todo: 'Na fila',
  doing: 'Rodando…',
  done: 'Concluído',
  error: 'Erro',
}

const VERDICT_LABEL: Record<string, string> = {
  provavelmente_manual: 'atendimento manual',
  provavelmente_automatizado: 'já automatizado',
  indefinido: 'indefinido',
}

const PIPELINE_LABEL: Record<string, string> = {
  novo: 'Novo',
  qualificado: 'Qualificado',
  descartado: 'Descartado',
  em_atendimento: 'Em atendimento',
}

const SITE_STATUS: Record<string, { label: string; color: string }> = {
  ok: { label: 'Site abriu normalmente', color: '#4ade80' },
  fora_do_ar: { label: 'Site fora do ar', color: '#f87171' },
  falha_temporaria: { label: 'Falha ao acessar (temporária)', color: '#fbbf24' },
  nao_verificado: { label: 'Ainda não verificado', color: '#a1a1aa' },
  sem_site: { label: 'Sem site cadastrado', color: '#a1a1aa' },
}

const CATALOGO_LABEL: Record<string, string> = {
  nenhum: 'Nenhum catálogo',
  pequeno: 'Catálogo pequeno',
  medio: 'Catálogo médio',
  grande: 'Catálogo grande',
  indefinido: 'Indefinido',
}

const BRAZIL_STATES: Array<{ uf: string; name: string }> = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
]

const selectStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e4e4e7',
  colorScheme: 'dark',
  cursor: 'pointer',
}

const optionStyle: CSSProperties = { background: '#0a0a0a', color: '#e4e4e7' }

interface ScoutForm {
  niche: string
  city: string
  state: string
  withLlm: boolean
}

const DEFAULT_FORM: ScoutForm = { niche: '', city: '', state: '', withLlm: true }

function RunStatus({ run, onRetry }: { run: ScoutRun | null; onRetry: (id: number) => void }) {
  if (!run) return null

  if (run.status === 'todo' || run.status === 'doing') {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: '#a1a1aa' }}>
        {run.status === 'doing' && <Loader2 size={12} className="animate-spin" />}
        <span>
          {STATUS_LABEL[run.status]} — {run.niche} em {run.city}
          {run.state ? `-${run.state}` : ''}
        </span>
      </div>
    )
  }

  if (run.status === 'error') {
    return (
      <div className="flex flex-col gap-1.5 text-xs">
        <span style={{ color: '#f87171' }}>Erro: {run.error || 'falha desconhecida'}</span>
        <button onClick={() => onRetry(run.id)} className="self-start px-2 py-1 rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#e4e4e7' }}>
          Tentar de novo
        </button>
      </div>
    )
  }

  const r = run.result || {}
  return (
    <div className="text-xs" style={{ color: '#a1a1aa' }}>
      Última: {run.niche} em {run.city}
      {run.state ? `-${run.state}` : ''} — {r.qualificados ?? 0} qualificadas, score médio {r.mediaScore ?? '—'}
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium" style={{ color: '#71717a' }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: '#e4e4e7' }}>
        {children}
      </span>
    </div>
  )
}

function TagList({ label, items }: { label: string; items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <span className="text-[11px] font-medium block mb-1.5" style={{ color: '#71717a' }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="text-[11px] px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: '#d4d4d8' }}>
            {String(item)}
          </span>
        ))}
      </div>
    </div>
  )
}

interface LeadDetailModalProps {
  lead: ScoutLead
  isConnected: boolean
  onClose: () => void
  onStartConversation: (lead: ScoutLead) => void
}

function LeadDetailModal({ lead, isConnected, onClose, onStartConversation }: LeadDetailModalProps) {
  const phone = lead.whatsappPhoneE164 || lead.phoneE164
  const site = SITE_STATUS[lead.siteStatus] || null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold" style={{ color: '#f4f4f5' }}>
            {lead.name}
          </h3>
          <button onClick={onClose} className="cursor-pointer flex-shrink-0" style={{ color: '#71717a' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lead.fitScore !== null && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}>
              <Star size={11} />
              Score {lead.fitScore}
            </span>
          )}
          {site && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: site.color }}>
              ● {site.label}
            </span>
          )}
        </div>
        {lead.siteStatus === 'fora_do_ar' && lead.siteOfflineReason && (
          <p className="text-[11px] -mt-2" style={{ color: '#71717a' }}>
            Motivo: {lead.siteOfflineReason}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <DetailRow label="Categoria">{lead.category}</DetailRow>
          <DetailRow label="Cidade/UF">
            {lead.city || '—'}
            {lead.state ? `-${lead.state}` : ''}
          </DetailRow>
          <DetailRow label="Endereço">{lead.address}</DetailRow>
          <DetailRow label="E-mail">{lead.email}</DetailRow>
          <DetailRow label="Segmento">{lead.segmento}</DetailRow>
          <DetailRow label="Porte">{lead.porte}</DetailRow>
          <DetailRow label="Catálogo">{(lead.catalogo && CATALOGO_LABEL[lead.catalogo]) || lead.catalogo}</DetailRow>
          <DetailRow label="Vende online?">{lead.vendeOnline === null ? null : lead.vendeOnline ? 'Sim' : 'Não'}</DetailRow>
          <DetailRow label="Atende por WhatsApp?">{lead.atendePorWhatsapp === null ? null : lead.atendePorWhatsapp ? 'Sim' : 'Não'}</DetailRow>
          <DetailRow label="Avaliação">{lead.rating !== null ? `${lead.rating} ★ (${lead.reviewsCount ?? 0} avaliações)` : null}</DetailRow>
          <DetailRow label="Verdict de automação">{(lead.automationVerdict && VERDICT_LABEL[lead.automationVerdict]) || lead.automationVerdict}</DetailRow>
          <DetailRow label="Status no pipeline">{(lead.pipelineStatus && PIPELINE_LABEL[lead.pipelineStatus]) || lead.pipelineStatus}</DetailRow>
          <DetailRow label="Widget de chat">{lead.chatWidget}</DetailRow>
          <DetailRow label="Plataforma de e-commerce">{lead.ecommercePlatform}</DetailRow>
          <DetailRow label="Telefone">{phone}</DetailRow>
          <DetailRow label="Instagram">{lead.instagramFollowers ? `${lead.instagramFollowers} seguidores` : null}</DetailRow>
          <DetailRow label="Facebook">{lead.facebookResponseTime}</DetailRow>
          <DetailRow label="Confiança da análise da IA">{lead.confianca !== null ? `${Math.round(lead.confianca * 100)}%` : null}</DetailRow>
        </div>

        <TagList label="O que vende" items={lead.vende} />
        <TagList label="Sinais de automação encontrados" items={lead.sinaisAutomacao} />
        <TagList label="Dores de atendimento identificadas" items={lead.dores} />
        <TagList label="Integrações úteis" items={lead.integracoes} />

        {lead.resumo && (
          <div>
            <span className="text-[11px] font-medium block mb-1" style={{ color: '#71717a' }}>
              Resumo da IA
            </span>
            <p className="text-xs leading-relaxed" style={{ color: '#d4d4d8' }}>
              {lead.resumo}
            </p>
          </div>
        )}

        {lead.ganchoAbordagem && (
          <div>
            <span className="text-[11px] font-medium block mb-1" style={{ color: '#71717a' }}>
              Gancho de abordagem
            </span>
            <p className="text-xs leading-relaxed" style={{ color: '#d4d4d8' }}>
              {lead.ganchoAbordagem}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#22d3ee' }}>
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
              <ExternalLink size={11} /> Site
            </a>
          )}
          {lead.instagramUrl && (
            <a href={lead.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
              <ExternalLink size={11} /> Instagram
            </a>
          )}
          {lead.facebookUrl && (
            <a href={lead.facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
              <ExternalLink size={11} /> Facebook
            </a>
          )}
          {lead.mapsUrl && (
            <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
              <ExternalLink size={11} /> Google Maps
            </a>
          )}
        </div>

        <button
          onClick={() => onStartConversation(lead)}
          disabled={!isConnected || !phone}
          title={!isConnected ? 'Conecte o WhatsApp para iniciar conversas' : undefined}
          className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
        >
          <MessageCircle size={13} />
          Iniciar conversa
        </button>
      </div>
    </div>
  )
}

interface ScoutPanelProps {
  isConnected: boolean
  onStartConversation: (conversationId: number, draftText: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function ScoutPanel({ isConnected, onStartConversation, collapsed = false, onToggleCollapse }: ScoutPanelProps) {
  const { handleError } = useAdminGuard()
  const [form, setForm] = useState<ScoutForm>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [latestRun, setLatestRun] = useState<ScoutRun | null>(null)
  const [leads, setLeads] = useState<ScoutLead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [citiesError, setCitiesError] = useState('')
  const [selectedLead, setSelectedLead] = useState<ScoutLead | null>(null)
  const prevStatusRef = useRef<ScoutRun['status'] | null>(null)

  const loadCities = useCallback((uf: string) => {
    if (!uf) {
      setCities([])
      return
    }
    setCitiesLoading(true)
    setCitiesError('')
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar cidades.')
        return res.json()
      })
      .then((rows: Array<{ nome: string }>) => setCities(rows.map((row) => row.nome)))
      .catch(() => setCitiesError('Não foi possível carregar as cidades. Tente de novo.'))
      .finally(() => setCitiesLoading(false))
  }, [])

  useEffect(() => {
    loadCities(form.state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state])

  const loadLeads = useCallback(() => {
    api
      .get('/admin/scout/leads?limit=30', getAdminToken())
      .then((rows) => {
        setLeads(rows as ScoutLead[])
        setLeadsLoading(false)
      })
      .catch((err) => handleError(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadLatestRun = useCallback(() => {
    api
      .get('/admin/scout/runs?limit=1', getAdminToken())
      .then((rows) => {
        const run = (rows as ScoutRun[])[0]
        setLatestRun(run || null)
        if (run && prevStatusRef.current && prevStatusRef.current !== 'done' && run.status === 'done') {
          loadLeads()
        }
        prevStatusRef.current = run?.status ?? null
      })
      .catch((err) => handleError(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadLeads])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  useEffect(() => {
    loadLatestRun()
    const interval = setInterval(loadLatestRun, RUN_POLL_MS)
    return () => clearInterval(interval)
  }, [loadLatestRun])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.niche.trim() || !form.state || !form.city) {
      setFormError('Informe nicho, UF e cidade.')
      return
    }
    setSubmitting(true)
    try {
      await api.post(
        '/admin/scout/runs',
        {
          niche: form.niche.trim(),
          city: form.city,
          state: form.state,
          radiusKm: SCOUT_RADIUS_KM,
          maxResults: SCOUT_MAX_RESULTS,
          withLlm: form.withLlm,
        },
        getAdminToken(),
      )
      loadLatestRun()
    } catch (err) {
      const apiErr = err as Error & { status?: number }
      if (apiErr.status === 401) {
        handleError(err)
        return
      }
      setFormError(apiErr.message || 'Falha ao pedir a execução.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetry(id: number) {
    try {
      await api.post(`/admin/scout/runs/${id}/retry`, {}, getAdminToken())
      loadLatestRun()
    } catch (err) {
      handleError(err)
    }
  }

  async function handleStartConversation(lead: ScoutLead) {
    try {
      const { conversationId, draftText } = (await api.post(`/admin/scout/leads/${lead.id}/start-conversation`, {}, getAdminToken())) as {
        conversationId: number
        draftText: string
      }
      onStartConversation(conversationId, draftText)
    } catch (err) {
      handleError(err)
    }
  }

  const runPending = latestRun?.status === 'todo' || latestRun?.status === 'doing'

  return (
    <div className="flex flex-col rounded-xl overflow-hidden min-h-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Cabeçalho clicável: no acordeão da tela WhatsApp, abrir este painel colapsa o de dados do contato. */}
      <button
        type="button"
        onClick={onToggleCollapse}
        disabled={!onToggleCollapse}
        className="w-full p-4 flex items-center justify-between flex-shrink-0 cursor-pointer disabled:cursor-default"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#f4f4f5' }}>
          <Search size={15} style={{ color: '#22d3ee' }} />
          Prospecção
        </h2>
        {onToggleCollapse && (collapsed ? <ChevronDown size={15} style={{ color: '#71717a' }} /> : <ChevronUp size={15} style={{ color: '#71717a' }} />)}
      </button>

      {/* `hidden` em vez de desmontar: preserva formulário, leads carregados e execução em andamento. */}
      <div className={collapsed ? 'hidden' : 'flex flex-col min-h-0 flex-1'}>
        <div className="px-4 pb-4 flex flex-col gap-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              value={form.niche}
              onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
              placeholder="Nicho (ex.: pet shop)"
              className="px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
            />
            <div className="flex gap-2">
              <select
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, city: '' }))}
                className="w-32 px-3 py-2 rounded-lg text-xs outline-none"
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  UF
                </option>
                {BRAZIL_STATES.map((s) => (
                  <option key={s.uf} value={s.uf} style={optionStyle}>
                    {s.uf} — {s.name}
                  </option>
                ))}
              </select>
              <select
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                disabled={!form.state || citiesLoading}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50"
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  {!form.state ? 'Escolha a UF primeiro' : citiesLoading ? 'Carregando…' : 'Cidade'}
                </option>
                {cities.map((city) => (
                  <option key={city} value={city} style={optionStyle}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            {citiesError && (
              <div className="flex items-center justify-between gap-2 text-xs" style={{ color: '#f87171' }}>
                <span>{citiesError}</span>
                <button type="button" onClick={() => loadCities(form.state)} className="px-2 py-1 rounded-lg cursor-pointer flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: '#e4e4e7' }}>
                  Tentar de novo
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#a1a1aa' }}>
              <input type="checkbox" checked={form.withLlm} onChange={(e) => setForm((f) => ({ ...f, withLlm: e.target.checked }))} />
              Analisar com IA
            </label>

            {formError && (
              <p className="text-xs" style={{ color: '#f87171' }}>
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || runPending}
              className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
            >
              {runPending ? 'Já tem uma execução em andamento…' : 'Rodar prospecção'}
            </button>
          </form>

          <RunStatus run={latestRun} onRetry={handleRetry} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-medium" style={{ color: '#a1a1aa' }}>
              Leads
            </h3>
            <button onClick={loadLeads} aria-label="Atualizar leads" className="cursor-pointer" style={{ color: '#52525b' }}>
              <RotateCw size={12} />
            </button>
          </div>

          {leadsLoading && (
            <p className="text-xs px-1" style={{ color: '#52525b' }}>
              Carregando…
            </p>
          )}
          {!leadsLoading && leads.length === 0 && (
            <p className="text-xs px-1" style={{ color: '#52525b' }}>
              Nenhum lead ainda — rode uma prospecção.
            </p>
          )}

          {leads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="p-3 rounded-lg flex flex-col gap-1.5 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium truncate" style={{ color: '#e4e4e7' }}>
                  {lead.name}
                </span>
                {lead.fitScore !== null && (
                  <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}>
                    <Star size={9} />
                    {lead.fitScore}
                  </span>
                )}
              </div>
              <span className="text-[11px] truncate" style={{ color: '#71717a' }}>
                {lead.category || '—'} · {lead.city || '—'}
                {lead.state ? `-${lead.state}` : ''} · {(lead.automationVerdict && VERDICT_LABEL[lead.automationVerdict]) || lead.automationVerdict}
              </span>
              {lead.ganchoAbordagem && (
                <p className="text-[11px] line-clamp-2" style={{ color: '#a1a1aa' }}>
                  {lead.ganchoAbordagem}
                </p>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartConversation(lead)
                }}
                disabled={!isConnected || (!lead.whatsappPhoneE164 && !lead.phoneE164)}
                title={!isConnected ? 'Conecte o WhatsApp para iniciar conversas' : undefined}
                className="self-start flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#e4e4e7' }}
              >
                <MessageCircle size={11} />
                Iniciar conversa
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isConnected={isConnected}
          onClose={() => setSelectedLead(null)}
          onStartConversation={(lead) => {
            setSelectedLead(null)
            handleStartConversation(lead)
          }}
        />
      )}
    </div>
  )
}
