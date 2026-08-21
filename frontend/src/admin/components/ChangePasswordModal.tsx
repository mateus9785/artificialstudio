import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { X, Save, KeyRound } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'

const inputStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f4f4f5',
}

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.')
      return
    }

    setSaving(true)
    try {
      await api.put('/auth/password', { currentPassword, newPassword }, getAdminToken())
      setSuccess(true)
    } catch (err) {
      setError((err as Error).message || 'Não foi possível alterar a senha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-10 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-md p-8 rounded-2xl relative my-auto" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button type="button" onClick={onClose} className="absolute top-5 right-5 p-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: '#71717a' }} aria-label="Fechar">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}>
            <KeyRound size={18} color="white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Alterar senha
          </span>
        </div>

        {success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: '#a1a1aa' }}>
              Senha alterada com sucesso.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="self-start px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                Senha atual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
                Nova senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
              <p className="text-xs mt-1.5" style={{ color: '#52525b' }}>
                Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.
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
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
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
              disabled={saving}
              className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
            >
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
