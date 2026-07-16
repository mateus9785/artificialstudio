import { useEffect, useState } from 'react'
import { X, Save, UserCog } from 'lucide-react'
import { api } from '../../lib/api'
import { getAffiliateToken, setAffiliateSession } from '../../lib/affiliateAuth'
import { inputStyle, formatWhatsapp } from '../formStyles'

export default function EditProfileModal({ affiliate, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: affiliate?.name || '',
    email: affiliate?.email || '',
    whatsapp: affiliate?.whatsapp || '',
    pixKey: affiliate?.pixKey || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    setError('')
    setSaving(true)
    try {
      const { affiliate: updated } = await api.put('/affiliates/me', form, getAffiliateToken())
      setAffiliateSession(getAffiliateToken(), updated)
      onSaved(updated)
    } catch (err) {
      setError(err.message || 'Não foi possível salvar seus dados.')
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
        className="w-full max-w-md p-8 rounded-2xl relative my-auto"
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
            <UserCog size={18} color="white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Meus dados
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Nome completo
            </label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              E-mail
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              WhatsApp
            </label>
            <input
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', formatWhatsapp(e.target.value))}
              placeholder="(11) 91234-5678"
              inputMode="numeric"
              maxLength={16}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Chave PIX (opcional, para receber comissões)
            </label>
            <input value={form.pixKey} onChange={(e) => update('pixKey', e.target.value)} style={inputStyle} />
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
          >
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
