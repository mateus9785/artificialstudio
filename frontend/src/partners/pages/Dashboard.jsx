import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, LogOut, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { getAffiliateToken, getAffiliateUser, clearAffiliateSession } from '../../lib/affiliateAuth'
import { SERVICE_TYPES, STATUS_META } from '../../lib/referralMeta'
import { useAffiliateGuard } from '../useAffiliateGuard'
import { inputStyle } from '../formStyles'

const EMPTY_FORM = {
  contactName: '',
  companyName: '',
  contactInfo: '',
  serviceType: SERVICE_TYPES[0],
  alreadyNotified: false,
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { handleError } = useAffiliateGuard()
  const affiliate = getAffiliateUser()

  const [referrals, setReferrals] = useState([])
  const [status, setStatus] = useState('loading')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  function loadReferrals() {
    setStatus('loading')
    api
      .get('/affiliates/referrals', getAffiliateToken())
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

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleLogout() {
    clearAffiliateSession()
    navigate('/indique/login', { replace: true })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSuccessMessage('')
    setSaving(true)
    try {
      await api.post('/affiliates/referrals', form, getAffiliateToken())
      setForm(EMPTY_FORM)
      setSuccessMessage('Indicação enviada! Vamos entrar em contato em breve.')
      loadReferrals()
    } catch (err) {
      if (!handleError(err)) setFormError(err.message || 'Não foi possível enviar a indicação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}>
            <Handshake size={16} color="white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
              {affiliate?.name || 'Parceiro'}
            </p>
            <p className="text-xs" style={{ color: '#52525b' }}>
              {affiliate?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer"
          style={{ color: '#a1a1aa' }}
        >
          <LogOut size={15} />
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-10">
        <section>
          <h1 className="text-lg font-semibold mb-1" style={{ color: '#f4f4f5' }}>
            Nova indicação
          </h1>
          <p className="text-sm mb-5" style={{ color: '#71717a' }}>
            Conte para a gente quem você quer indicar. Cuidamos do resto.
          </p>

          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl flex flex-col gap-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
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
                  WhatsApp ou e-mail do indicado
                </label>
                <input value={form.contactInfo} onChange={(e) => update('contactInfo', e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                  O que eles precisam?
                </label>
                <select value={form.serviceType} onChange={(e) => update('serviceType', e.target.value)} style={inputStyle}>
                  {SERVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
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
            {successMessage && (
              <p className="text-xs" style={{ color: '#4ade80' }}>
                {successMessage}
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
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#f4f4f5' }}>
            Minhas indicações
          </h2>

          {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
          {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar suas indicações.</p>}

          {status === 'ready' && (
            <div className="flex flex-col gap-2">
              {referrals.length === 0 && <p style={{ color: '#52525b' }}>Você ainda não enviou nenhuma indicação.</p>}
              {referrals.map((referral) => {
                const meta = STATUS_META[referral.status]
                return (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                        {referral.contactName}
                        {referral.companyName ? ` · ${referral.companyName}` : ''}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#52525b' }}>
                        {referral.serviceType} · {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {referral.status === 'fechado' && (
                        <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                          {formatCurrency(referral.commissionValue)}
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-md"
                        style={{ background: `${meta.color}14`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
