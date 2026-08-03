import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Loader2, RotateCw, MessageCircle, Star } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'

const RUN_POLL_MS = 5000

const STATUS_LABEL = {
  todo: 'Na fila',
  doing: 'Rodando…',
  done: 'Concluído',
  error: 'Erro',
}

const VERDICT_LABEL = {
  provavelmente_manual: 'atendimento manual',
  provavelmente_automatizado: 'já automatizado',
  indefinido: 'indefinido',
}

const DEFAULT_FORM = { niche: '', city: '', state: '', radiusKm: 5, maxResults: 60, withLlm: true }

function RunStatus({ run, onRetry }) {
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
        <button
          onClick={() => onRetry(run.id)}
          className="self-start px-2 py-1 rounded-lg cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#e4e4e7' }}
        >
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

export default function ScoutPanel({ isConnected, onStartConversation }) {
  const { handleError } = useAdminGuard()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [latestRun, setLatestRun] = useState(null)
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const prevStatusRef = useRef(null)

  const loadLeads = useCallback(() => {
    api
      .get('/admin/scout/leads?limit=30', getAdminToken())
      .then((rows) => {
        setLeads(rows)
        setLeadsLoading(false)
      })
      .catch((err) => handleError(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadLatestRun = useCallback(() => {
    api
      .get('/admin/scout/runs?limit=1', getAdminToken())
      .then(([run]) => {
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

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.niche.trim() || !form.city.trim()) {
      setFormError('Informe nicho e cidade.')
      return
    }
    setSubmitting(true)
    try {
      await api.post(
        '/admin/scout/runs',
        {
          niche: form.niche.trim(),
          city: form.city.trim(),
          state: form.state.trim() || undefined,
          radiusKm: Number(form.radiusKm),
          maxResults: Number(form.maxResults),
          withLlm: form.withLlm,
        },
        getAdminToken(),
      )
      loadLatestRun()
    } catch (err) {
      if (err.status === 401) return handleError(err)
      setFormError(err.message || 'Falha ao pedir a execução.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetry(id) {
    try {
      await api.post(`/admin/scout/runs/${id}/retry`, {}, getAdminToken())
      loadLatestRun()
    } catch (err) {
      handleError(err)
    }
  }

  async function handleStartConversation(lead) {
    try {
      const { conversationId, draftText } = await api.post(
        `/admin/scout/leads/${lead.id}/start-conversation`,
        {},
        getAdminToken(),
      )
      onStartConversation(conversationId, draftText)
    } catch (err) {
      handleError(err)
    }
  }

  const runPending = latestRun?.status === 'todo' || latestRun?.status === 'doing'

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden min-h-0"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="p-4 flex flex-col gap-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#f4f4f5' }}>
          <Search size={15} style={{ color: '#22d3ee' }} />
          Prospecção
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            value={form.niche}
            onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
            placeholder="Nicho (ex.: pet shop)"
            className="px-3 py-2 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
          />
          <div className="flex gap-2">
            <input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Cidade"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
            />
            <input
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.slice(0, 2).toUpperCase() }))}
              placeholder="UF"
              className="w-14 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.2"
              max="100"
              step="0.5"
              value={form.radiusKm}
              onChange={(e) => setForm((f) => ({ ...f, radiusKm: e.target.value }))}
              placeholder="Raio (km)"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
            />
            <input
              type="number"
              min="1"
              max="5000"
              value={form.maxResults}
              onChange={(e) => setForm((f) => ({ ...f, maxResults: e.target.value }))}
              placeholder="Máximo"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
            />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#a1a1aa' }}>
            <input
              type="checkbox"
              checked={form.withLlm}
              onChange={(e) => setForm((f) => ({ ...f, withLlm: e.target.checked }))}
            />
            Analisar com IA
          </label>

          {formError && <p className="text-xs" style={{ color: '#f87171' }}>{formError}</p>}

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

        {leadsLoading && <p className="text-xs px-1" style={{ color: '#52525b' }}>Carregando…</p>}
        {!leadsLoading && leads.length === 0 && (
          <p className="text-xs px-1" style={{ color: '#52525b' }}>Nenhum lead ainda — rode uma prospecção.</p>
        )}

        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-3 rounded-lg flex flex-col gap-1.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium truncate" style={{ color: '#e4e4e7' }}>
                {lead.name}
              </span>
              {lead.fitScore !== null && (
                <span
                  className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}
                >
                  <Star size={9} />
                  {lead.fitScore}
                </span>
              )}
            </div>
            <span className="text-[11px] truncate" style={{ color: '#71717a' }}>
              {lead.category || '—'} · {lead.city || '—'}
              {lead.state ? `-${lead.state}` : ''} · {VERDICT_LABEL[lead.automationVerdict] || lead.automationVerdict}
            </span>
            {lead.ganchoAbordagem && (
              <p className="text-[11px] line-clamp-2" style={{ color: '#a1a1aa' }}>
                {lead.ganchoAbordagem}
              </p>
            )}
            <button
              onClick={() => handleStartConversation(lead)}
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
  )
}
