import { useEffect, useState } from 'react'
import { X, Send, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { getAffiliateToken } from '../../lib/affiliateAuth'
import { SERVICE_TYPES } from '../../lib/referralMeta'
import { inputStyle, selectStyle, optionStyle, formatWhatsapp } from '../formStyles'

const EMPTY_FORM = {
  contactName: '',
  companyName: '',
  contactInfo: '',
  serviceType: SERVICE_TYPES[0],
  alreadyNotified: false,
}

export default function NewReferralModal({ onClose, onCreated, handleError }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
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
      await api.post('/affiliates/referrals', form, getAffiliateToken())
      onCreated()
    } catch (err) {
      if (!handleError(err)) setFormError(err.message || 'Não foi possível enviar a indicação.')
    } finally {
      setSaving(false)
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

        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
          >
            <Handshake size={18} color="white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Nova indicação
          </span>
        </div>
        <p className="text-sm mb-6" style={{ color: '#71717a' }}>
          Conte para a gente quem você quer indicar. Cuidamos do resto.
        </p>

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

          <button
            type="submit"
            disabled={saving}
            className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
          >
            <Send size={14} />
            {saving ? 'Enviando...' : 'Enviar indicação'}
          </button>
        </form>
      </div>
    </div>
  )
}
