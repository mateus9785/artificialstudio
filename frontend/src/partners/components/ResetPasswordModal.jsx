import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, KeyRound, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { inputStyle } from '../formStyles'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const PASSWORD_HINT = 'Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.'

export default function ResetPasswordModal() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') navigate('/indique', { state: { openModal: 'login' } })
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Link inválido. Solicite uma nova redefinição de senha.')
      return
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_HINT)
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await api.post('/affiliates/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err.message || 'Não foi possível redefinir a senha.')
    } finally {
      setLoading(false)
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
          onClick={() => navigate('/indique', { state: { openModal: 'login' } })}
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
            Redefinir senha
          </span>
        </div>

        {done ? (
          <>
            <p className="text-sm mt-6 mb-6" style={{ color: '#a1a1aa' }}>
              Sua senha foi redefinida com sucesso. Agora você já pode entrar com a nova senha.
            </p>
            <button
              type="button"
              onClick={() => navigate('/indique', { replace: true, state: { openModal: 'login' } })}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-transform hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
            >
              Ir para o login
            </button>
          </>
        ) : (
          <>
            {!token && (
              <p className="text-xs mb-4" style={{ color: '#f87171' }}>
                Link inválido ou incompleto. Solicite uma nova redefinição de senha.
              </p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                  Nova senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  style={inputStyle}
                />
                <p className="text-xs mt-1.5" style={{ color: '#52525b' }}>
                  {PASSWORD_HINT}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
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
                <KeyRound size={14} />
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
