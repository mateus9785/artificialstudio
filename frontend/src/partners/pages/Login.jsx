import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { setAffiliateSession, getAffiliateToken } from '../../lib/affiliateAuth'
import { inputStyle } from '../formStyles'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAffiliateToken()) navigate('/indique/dashboard', { replace: true })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/affiliates/login', { email, password })
      setAffiliateSession(data.token, data.affiliate)
      navigate('/indique/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#050505' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}>
            <Handshake size={18} color="white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Área do Parceiro
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
            <Lock size={14} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: '#52525b' }}>
          Ainda não é parceiro?{' '}
          <Link to="/indique/cadastro" style={{ color: '#22d3ee' }}>
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
