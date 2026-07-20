import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import { STATUS_META, STATUS_ORDER, COMMISSION_TYPE_LABELS, suggestCommission } from '../../lib/referralMeta'

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
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS_META[value].label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

function ReferralCard({ referral, onOpen, onDragStart, onDragEnd, isDragging }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(referral)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(referral)}
      className="p-3.5 rounded-xl cursor-grab"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
        {referral.contactName}
      </p>
      {referral.companyName && (
        <p className="text-xs truncate mt-0.5" style={{ color: '#71717a' }}>
          {referral.companyName}
        </p>
      )}
      <p className="text-xs mt-1.5" style={{ color: '#52525b' }}>
        {referral.serviceType}
      </p>
      <p className="text-xs mt-1 truncate" style={{ color: '#52525b' }}>
        {referral.affiliate?.name} · {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
      </p>
      {(referral.status === 'fechado' || referral.status === 'finalizado') && (
        <p className="text-sm font-semibold mt-2" style={{ color: '#4ade80' }}>
          {formatCurrency(referral.closedValue)}
        </p>
      )}
    </div>
  )
}

export default function Referrals() {
  const { handleError } = useAdminGuard()
  const [referrals, setReferrals] = useState([])
  const [status, setStatus] = useState('loading')
  const [editing, setEditing] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  function loadReferrals() {
    setStatus('loading')
    api
      .get('/admin/referrals', getAdminToken())
      .then((data) => {
        setReferrals(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err)) setStatus('error')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReferrals, [])

  function handleSaved(saved) {
    setEditing(null)
    setReferrals((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))
  }

  async function moveReferral(referral, newStatus) {
    if (referral.status === newStatus) return
    const previousStatus = referral.status
    setReferrals((prev) => prev.map((r) => (r.id === referral.id ? { ...r, status: newStatus } : r)))
    try {
      const saved = await api.put(`/admin/referrals/${referral.id}`, { status: newStatus }, getAdminToken())
      setReferrals((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))
    } catch (err) {
      setReferrals((prev) => prev.map((r) => (r.id === referral.id ? { ...r, status: previousStatus } : r)))
      if (!handleError(err)) window.alert(err.message || 'Não foi possível mover a indicação.')
    }
  }

  function handleDrop(columnStatus) {
    setDragOverColumn(null)
    if (dragging) moveReferral(dragging, columnStatus)
    setDragging(null)
  }

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-xl font-semibold mb-6 flex-shrink-0" style={{ color: '#f4f4f5' }}>
        Indicações
      </h1>

      {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
      {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar as indicações.</p>}

      {status === 'ready' && (
        <div className="flex gap-4 overflow-x-auto flex-1 min-h-0 pb-3">
          {STATUS_ORDER.map((columnStatus) => {
            const meta = STATUS_META[columnStatus]
            const columnReferrals = referrals.filter((r) => r.status === columnStatus)
            return (
              <div
                key={columnStatus}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverColumn(columnStatus)
                }}
                onDragLeave={() => setDragOverColumn((prev) => (prev === columnStatus ? null : prev))}
                onDrop={() => handleDrop(columnStatus)}
                className="flex-shrink-0 w-72 h-full flex flex-col rounded-xl"
                style={{
                  background: dragOverColumn === columnStatus ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${dragOverColumn === columnStatus ? meta.color : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="flex items-center gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <span className="text-xs font-medium flex-1" style={{ color: '#d4d4d8' }}>
                    {meta.label}
                  </span>
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{ background: `${meta.color}14`, color: meta.color }}
                  >
                    {columnReferrals.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-0">
                  {columnReferrals.length === 0 && (
                    <p className="text-xs p-2" style={{ color: '#3f3f46' }}>
                      Nenhuma indicação
                    </p>
                  )}
                  {columnReferrals.map((referral) => (
                    <ReferralCard
                      key={referral.id}
                      referral={referral}
                      onOpen={setEditing}
                      onDragStart={setDragging}
                      onDragEnd={() => setDragging(null)}
                      isDragging={dragging?.id === referral.id}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && <ReferralForm referral={editing} onCancel={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
