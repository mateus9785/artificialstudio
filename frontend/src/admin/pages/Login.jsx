import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { api } from '../../lib/api'
import { setAdminSession, getAdminToken } from '../../lib/adminAuth'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAdminToken()) navigate('/admin/posts', { replace: true })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/auth/login', { username, password })
      setAdminSession(data.token, data.admin)
      navigate('/admin/posts', { replace: true })
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: '#050505' }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 mb-8">
          <img src="/logo.png" alt="Artificial Studio" className="w-9 h-9 object-contain flex-shrink-0" />
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Painel administrativo
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
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
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
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
            style={{
              background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
              color: 'white',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Lock size={14} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
