import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Lock, UserPlus, Handshake } from 'lucide-react'
import { api } from '../../lib/api'
import { setAffiliateSession, getAffiliateToken } from '../../lib/affiliateAuth'
import { inputStyle, formatWhatsapp } from '../formStyles'

const EMPTY_REGISTER_FORM = { name: '', email: '', whatsapp: '', pixKey: '', password: '', confirmPassword: '' }
const EMPTY_LOGIN_FORM = { email: '', password: '' }
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const PASSWORD_HINT = 'Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.'

export default function AuthModal({ mode, onClose, onSwitchMode, onForgotPassword }) {
  const navigate = useNavigate()
  const isLogin = mode === 'login'
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM)
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAffiliateToken()) navigate('/indique/dashboard', { replace: true })
  }, [navigate])

  useEffect(() => {
    setError('')
  }, [mode])

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

  function updateRegister(field, value) {
    setRegisterForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isLogin) {
      if (!PASSWORD_REGEX.test(registerForm.password)) {
        setError(PASSWORD_HINT)
        return
      }
      if (registerForm.password !== registerForm.confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }
    }

    setLoading(true)
    try {
      const data = isLogin
        ? await api.post('/affiliates/login', { ...loginForm, remember })
        : await api.post('/affiliates/register', (({ confirmPassword, ...rest }) => rest)(registerForm))
      setAffiliateSession(data.token, data.affiliate)
      navigate('/indique/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || (isLogin ? 'Não foi possível entrar.' : 'Não foi possível concluir o cadastro.'))
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
            {isLogin ? 'Área do Parceiro' : 'Cadastro de Parceiro'}
          </span>
        </div>
        {!isLogin && (
          <p className="text-sm mb-6" style={{ color: '#71717a' }}>
            Gratuito, sem compromisso. Leva menos de 1 minuto.
          </p>
        )}

        <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${isLogin ? 'mt-6' : ''}`}>
          {isLogin ? (
            <>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  id="affiliate-email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                  autoComplete="email"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: '#a1a1aa' }}>
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs cursor-pointer"
                    style={{ color: '#22d3ee', background: 'none', border: 'none', padding: 0 }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <input
                  type="password"
                  name="password"
                  id="affiliate-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                  style={inputStyle}
                />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: '#a1a1aa' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="cursor-pointer"
                />
                Manter conectado por 30 dias
              </label>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                  Nome completo
                </label>
                <input
                  name="name"
                  id="affiliate-register-name"
                  value={registerForm.name}
                  onChange={(e) => updateRegister('name', e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  id="affiliate-register-email"
                  value={registerForm.email}
                  onChange={(e) => updateRegister('email', e.target.value)}
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
                  name="whatsapp"
                  id="affiliate-register-whatsapp"
                  value={registerForm.whatsapp}
                  onChange={(e) => updateRegister('whatsapp', formatWhatsapp(e.target.value))}
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
                <input
                  name="pixKey"
                  id="affiliate-register-pix"
                  value={registerForm.pixKey}
                  onChange={(e) => updateRegister('pixKey', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                  Senha
                </label>
                <input
                  type="password"
                  name="new-password"
                  id="affiliate-register-password"
                  value={registerForm.password}
                  onChange={(e) => updateRegister('password', e.target.value)}
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
                  Confirmar senha
                </label>
                <input
                  type="password"
                  name="confirm-password"
                  id="affiliate-register-confirm-password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => updateRegister('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  style={inputStyle}
                />
              </div>
            </>
          )}

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
            {isLogin ? <Lock size={14} /> : <UserPlus size={14} />}
            {loading ? (isLogin ? 'Entrando...' : 'Criando conta...') : isLogin ? 'Entrar' : 'Criar minha conta'}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: '#52525b' }}>
          {isLogin ? (
            <>
              Ainda não é parceiro?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('register')}
                className="cursor-pointer"
                style={{ color: '#22d3ee', background: 'none', border: 'none', padding: 0 }}
              >
                Cadastre-se grátis
              </button>
            </>
          ) : (
            <>
              Já é parceiro?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className="cursor-pointer"
                style={{ color: '#22d3ee', background: 'none', border: 'none', padding: 0 }}
              >
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
