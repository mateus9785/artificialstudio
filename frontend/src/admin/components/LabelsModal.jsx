import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e4e4e7',
}

export default function LabelsModal({ labels, onClose, onLabelsChanged }) {
  const { handleError } = useAdminGuard()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return
    setSaving(true)
    try {
      const created = await api.post('/admin/kanban/labels', { name: name.trim() }, getAdminToken())
      onLabelsChanged([...labels, created])
      setName('')
    } catch (err) {
      if (!handleError(err)) setError(err.message || 'Não foi possível criar a etiqueta.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(label) {
    setError('')
    try {
      await api.del(`/admin/kanban/labels/${label.id}`, getAdminToken())
      onLabelsChanged(labels.filter((l) => l.id !== label.id))
    } catch (err) {
      if (!handleError(err)) setError(err.message || 'Não foi possível excluir a etiqueta.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#f4f4f5' }}>
            Gerenciar etiquetas
          </h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: '#71717a' }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: '#71717a' }}>
          Cada etiqueta é o nome exato de uma pasta dentro de /home/bosca, usada pelo worker local
          para saber onde rodar o card.
        </p>

        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="nome-da-pasta"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
          >
            Adicionar
          </button>
        </form>

        {error && (
          <p className="text-xs mb-3" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {labels.length === 0 && (
            <p className="text-xs" style={{ color: '#3f3f46' }}>
              Nenhuma etiqueta cadastrada.
            </p>
          )}
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-sm" style={{ color: '#d4d4d8' }}>
                {label.name}
              </span>
              <button onClick={() => handleDelete(label)} className="cursor-pointer" style={{ color: '#71717a' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
