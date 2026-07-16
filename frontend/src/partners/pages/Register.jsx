import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { setAffiliateSession, getAffiliateToken } from '../../lib/affiliateAuth'
import { inputStyle } from '../formStyles'

const EMPTY_FORM = { name: '', email: '', whatsapp: '', pixKey: '', password: '' }

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAffiliateToken()) navigate('/indique/dashboard', { replace: true })
  }, [navigate])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/affiliates/register', form)
      setAffiliateSession(data.token, data.affiliate)
      navigate('/indique/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Não foi possível concluir o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: '#050505' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}>
            <Handshake size={18} color="white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Cadastro de Parceiro
          </span>
        </div>
        <p className="text-sm mb-6" style={{ color: '#71717a' }}>
          Gratuito, sem compromisso. Leva menos de 1 minuto.
        </p>

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
              onChange={(e) => update('whatsapp', e.target.value)}
              placeholder="(11) 91234-5678"
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
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Senha
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-transform hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: loading ? 0.7 : 1 }}
          >
            <UserPlus size={14} />
            {loading ? 'Criando conta...' : 'Criar minha conta'}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: '#52525b' }}>
          Já é parceiro?{' '}
          <Link to="/indique/login" style={{ color: '#22d3ee' }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
