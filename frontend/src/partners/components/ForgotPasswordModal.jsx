import { useEffect, useState } from 'react'
import { X, Mail, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { inputStyle } from '../formStyles'

export default function ForgotPasswordModal({ onClose, onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/affiliates/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o link de redefinição.')
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
            Esqueci minha senha
          </span>
        </div>

        {sent ? (
          <p className="text-sm mt-6" style={{ color: '#a1a1aa' }}>
            Se o e-mail <strong style={{ color: '#f4f4f5' }}>{email}</strong> estiver cadastrado, você vai receber um
            link para redefinir sua senha em instantes. Confira também a caixa de spam.
          </p>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: '#71717a' }}>
              Informe o e-mail da sua conta de parceiro para receber um link de redefinição de senha.
            </p>
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
                <Mail size={14} />
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
          </>
        )}

        <p className="text-xs text-center mt-6" style={{ color: '#52525b' }}>
          Lembrou a senha?{' '}
          <button
            type="button"
            onClick={onBackToLogin}
            className="cursor-pointer"
            style={{ color: '#22d3ee', background: 'none', border: 'none', padding: 0 }}
          >
            Entrar
          </button>
        </p>
      </div>
    </div>
  )
}
