import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import { STATUS_META, COMMISSION_TYPE_LABELS, suggestCommission } from '../../lib/referralMeta'

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e4e4e7',
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ReferralForm({ referral, onCancel, onSaved }) {
  const { handleError } = useAdminGuard()
  const [status, setStatus] = useState(referral.status)
  const [commissionType, setCommissionType] = useState(referral.commissionType)
  const [closedValue, setClosedValue] = useState(referral.closedValue ?? '')
  const [commissionValue, setCommissionValue] = useState(referral.commissionValue ?? '')
  const [adminNotes, setAdminNotes] = useState(referral.adminNotes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleClosedValueChange(value) {
    setClosedValue(value)
    setCommissionValue(suggestCommission(commissionType, value))
  }

  function handleCommissionTypeChange(value) {
    setCommissionType(value)
    setCommissionValue(suggestCommission(value, closedValue))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const saved = await api.put(
        `/admin/referrals/${referral.id}`,
        {
          status,
          commissionType,
          closedValue: closedValue === '' ? null : Number(closedValue),
          commissionValue: commissionValue === '' ? null : Number(commissionValue),
          adminNotes: adminNotes || null,
        },
        getAdminToken(),
      )
      onSaved(saved)
    } catch (err) {
      if (!handleError(err)) setError(err.message || 'Não foi possível salvar a indicação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#f4f4f5' }}>
            {referral.contactName}
          </h3>
          <button onClick={onCancel} className="cursor-pointer" style={{ color: '#71717a' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', color: '#a1a1aa' }}>
          <p>
            <span style={{ color: '#71717a' }}>Empresa:</span> {referral.companyName || '—'}
          </p>
          <p>
            <span style={{ color: '#71717a' }}>Contato:</span> {referral.contactInfo}
          </p>
          <p>
            <span style={{ color: '#71717a' }}>Serviço:</span> {referral.serviceType}
          </p>
          <p>
            <span style={{ color: '#71717a' }}>Já avisou o indicado?</span> {referral.alreadyNotified ? 'Sim' : 'Não'}
          </p>
          <p className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#71717a' }}>Parceiro:</span> {referral.affiliate?.name} ·{' '}
            {referral.affiliate?.whatsapp} · {referral.affiliate?.email}
            {referral.affiliate?.pixKey && ` · PIX: ${referral.affiliate.pixKey}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Status
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                Tipo de comissão
              </label>
              <select value={commissionType} onChange={(e) => handleCommissionTypeChange(e.target.value)} style={inputStyle}>
                {Object.entries(COMMISSION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                Valor fechado (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={closedValue}
                onChange={(e) => handleClosedValueChange(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Comissão do parceiro (R$) — sugerida automaticamente, pode ajustar
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Notas internas (opcional)
            </label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} style={inputStyle} />
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Referrals() {
  const { handleError } = useAdminGuard()
  const [referrals, setReferrals] = useState([])
  const [status, setStatus] = useState('loading')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState(null)

  function loadReferrals() {
    setStatus('loading')
    const query = statusFilter ? `?status=${statusFilter}` : ''
    api
      .get(`/admin/referrals${query}`, getAdminToken())
      .then((data) => {
        setReferrals(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err)) setStatus('error')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReferrals, [statusFilter])

  function handleSaved(saved) {
    setEditing(null)
    setReferrals((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#f4f4f5' }}>
          Indicações
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, width: 'auto' }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
      {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar as indicações.</p>}

      {status === 'ready' && (
        <div className="flex flex-col gap-2">
          {referrals.length === 0 && <p style={{ color: '#52525b' }}>Nenhuma indicação por aqui ainda.</p>}
          {referrals.map((referral) => {
            const meta = STATUS_META[referral.status]
            return (
              <button
                key={referral.id}
                onClick={() => setEditing(referral)}
                className="flex items-center justify-between gap-4 p-4 rounded-xl text-left cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                    {referral.contactName}
                    {referral.companyName ? ` · ${referral.companyName}` : ''}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#52525b' }}>
                    {referral.serviceType} · indicado por {referral.affiliate?.name} ·{' '}
                    {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {referral.status === 'fechado' && (
                    <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                      {formatCurrency(referral.commissionValue)}
                    </span>
                  )}
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: `${meta.color}14`, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {editing && <ReferralForm referral={editing} onCancel={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
