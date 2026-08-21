import { useState, type CSSProperties, type FormEvent } from 'react'
import { X, Save, MessageSquarePlus } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'

const inputStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f4f4f5',
}

function nowForInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface AddManualMessageModalProps {
  conversationId: number
  onClose: () => void
  onAdded: () => void
}

/**
 * Registra no histórico uma mensagem que existiu de verdade no WhatsApp mas o
 * Baileys não capturou sozinho (ex: falha de sessão/criptografia) — o admin viu
 * ela no próprio WhatsApp e digita aqui pra manter o histórico e o contexto da
 * IA completos. Não envia nada, só grava.
 */
export default function AddManualMessageModal({ conversationId, onClose, onAdded }: AddManualMessageModalProps) {
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound')
  const [text, setText] = useState('')
  const [sentAt, setSentAt] = useState(nowForInput)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setError('')
    setSaving(true)
    try {
      await api.post(
        `/admin/whatsapp/conversations/${conversationId}/messages/manual`,
        { text: trimmed, direction, sentAt: new Date(sentAt).toISOString() },
        getAdminToken(),
      )
      onAdded()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Não foi possível adicionar a mensagem.')
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
        <button type="button" onClick={onClose} className="absolute top-5 right-5 p-1.5 rounded-lg cursor-pointer" style={{ color: '#71717a' }} aria-label="Fechar">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}>
            <MessageSquarePlus size={18} color="white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: '#f4f4f5' }}>
            Adicionar mensagem manualmente
          </span>
        </div>

        <p className="text-xs mb-5 leading-relaxed" style={{ color: '#71717a' }}>
          Use quando uma mensagem existiu de verdade no WhatsApp mas não apareceu aqui (ex: falha de
          sincronização). Isso só registra no histórico — não envia nada pro contato.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection('inbound')}
              className="flex-1 text-xs px-3 py-2 rounded-lg cursor-pointer"
              style={{
                background: direction === 'inbound' ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)',
                color: direction === 'inbound' ? '#22d3ee' : '#a1a1aa',
                border: `1px solid ${direction === 'inbound' ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              Cliente enviou
            </button>
            <button
              type="button"
              onClick={() => setDirection('outbound')}
              className="flex-1 text-xs px-3 py-2 rounded-lg cursor-pointer"
              style={{
                background: direction === 'outbound' ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)',
                color: direction === 'outbound' ? '#22d3ee' : '#a1a1aa',
                border: `1px solid ${direction === 'outbound' ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              Você enviou
            </button>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Texto da mensagem
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Quando foi enviada
            </label>
            <input
              type="datetime-local"
              value={sentAt}
              onChange={(e) => setSentAt(e.target.value)}
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
            disabled={saving || !text.trim()}
            className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
          >
            <Save size={14} />
            {saving ? 'Adicionando...' : 'Adicionar mensagem'}
          </button>
        </form>
      </div>
    </div>
  )
}
