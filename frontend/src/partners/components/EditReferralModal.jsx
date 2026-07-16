import { useEffect, useState } from 'react'
import { X, Save, Trash2, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { getAffiliateToken } from '../../lib/affiliateAuth'
import { SERVICE_TYPES } from '../../lib/referralMeta'
import { inputStyle, selectStyle, optionStyle, formatWhatsapp } from '../formStyles'

export default function EditReferralModal({ referral, onClose, onSaved, onDeleted, handleError }) {
  const [form, setForm] = useState({
    contactName: referral.contactName,
    companyName: referral.companyName || '',
    contactInfo: referral.contactInfo,
    serviceType: referral.serviceType,
    alreadyNotified: referral.alreadyNotified,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const updated = await api.put(`/affiliates/referrals/${referral.id}`, form, getAffiliateToken())
      onSaved(updated)
    } catch (err) {
      if (!handleError(err)) setFormError(err.message || 'Não foi possível salvar a indicação.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setFormError('')
    setDeleting(true)
    try {
      await api.del(`/affiliates/referrals/${referral.id}`, getAffiliateToken())
      onDeleted(referral.id)
    } catch (err) {
      if (!handleError(err)) setFormError(err.message || 'Não foi possível excluir a indicação.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-10 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg p-8 rounded-2xl relative my-auto"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg cursor-pointer transition-colors"
          style={{ color: '#71717a' }}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
          >
            <Handshake size={18} color="white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Editar indicação
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                Nome do contato
              </label>
              <input value={form.contactName} onChange={(e) => update('contactName', e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                Nome da empresa (opcional)
              </label>
              <input value={form.companyName} onChange={(e) => update('companyName', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                WhatsApp
              </label>
              <input
                value={form.contactInfo}
                onChange={(e) => update('contactInfo', formatWhatsapp(e.target.value))}
                placeholder="(11) 91234-5678"
                inputMode="numeric"
                maxLength={16}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                O que eles precisam?
              </label>
              <select value={form.serviceType} onChange={(e) => update('serviceType', e.target.value)} style={selectStyle}>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type} style={optionStyle}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Você já avisou que nós entraríamos em contato?
            </label>
            <div className="flex gap-3">
              {[
                { label: 'Sim', value: true },
                { label: 'Não', value: false },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => update('alreadyNotified', value)}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer"
                  style={{
                    background: form.alreadyNotified === value ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)',
                    color: form.alreadyNotified === value ? '#22d3ee' : '#a1a1aa',
                    border: '1px solid',
                    borderColor: form.alreadyNotified === value ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <p className="text-xs" style={{ color: '#f87171' }}>
              {formError}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#a1a1aa' }}>
                  Excluir esta indicação?
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                >
                  {deleting ? 'Excluindo...' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ color: '#71717a' }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer"
                style={{ color: '#f87171' }}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
            >
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
