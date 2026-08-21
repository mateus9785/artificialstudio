import { useState, type CSSProperties, type FormEvent } from 'react'
import { X, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import type { KanbanLabel } from '../../lib/types'

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e4e4e7',
}

const DEFAULT_COLOR = '#22d3ee'

const COLOR_PRESETS = ['#22d3ee', '#7c3aed', '#f472b6', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#a1a1aa']

function ColorSwatchInput({ value, onChange, size = 20 }: { value: string; onChange: (value: string) => void; size?: number }) {
  return (
    <label
      className="relative rounded-full cursor-pointer flex-shrink-0"
      style={{ width: size, height: size, background: value, border: '1px solid rgba(255,255,255,0.2)' }}
    >
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
    </label>
  )
}

interface LabelsModalProps {
  labels: KanbanLabel[]
  onClose: () => void
  onLabelsChanged: (labels: KanbanLabel[]) => void
}

export default function LabelsModal({ labels, onClose, onLabelsChanged }: LabelsModalProps) {
  const { handleError } = useAdminGuard()
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return
    setSaving(true)
    try {
      const created = (await api.post('/admin/kanban/labels', { name: name.trim(), color }, getAdminToken())) as KanbanLabel
      onLabelsChanged([...labels, created])
      setName('')
      setColor(DEFAULT_COLOR)
    } catch (err) {
      if (!handleError(err)) setError((err as Error).message || 'Não foi possível criar a etiqueta.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(label: KanbanLabel) {
    setError('')
    try {
      await api.del(`/admin/kanban/labels/${label.id}`, getAdminToken())
      onLabelsChanged(labels.filter((l) => l.id !== label.id))
    } catch (err) {
      if (!handleError(err)) setError((err as Error).message || 'Não foi possível excluir a etiqueta.')
    }
  }

  async function handleColorChange(label: KanbanLabel, newColor: string) {
    setError('')
    onLabelsChanged(labels.map((l) => (l.id === label.id ? { ...l, color: newColor } : l)))
    try {
      const updated = (await api.patch(`/admin/kanban/labels/${label.id}`, { color: newColor }, getAdminToken())) as KanbanLabel
      onLabelsChanged(labels.map((l) => (l.id === label.id ? updated : l)))
    } catch (err) {
      onLabelsChanged(labels)
      if (!handleError(err)) setError((err as Error).message || 'Não foi possível atualizar a cor.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
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

        <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-4">
          <div className="flex gap-2">
            <ColorSwatchInput value={color} onChange={setColor} size={38} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="nome-da-pasta" style={{ ...inputStyle, flex: 1 }} />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
            >
              Adicionar
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                className="rounded-full cursor-pointer"
                style={{
                  width: 18,
                  height: 18,
                  background: preset,
                  border: color === preset ? '2px solid #f4f4f5' : '1px solid rgba(255,255,255,0.2)',
                }}
                aria-label={`Usar cor ${preset}`}
              />
            ))}
          </div>
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
            <div key={label.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <ColorSwatchInput value={label.color || DEFAULT_COLOR} onChange={(c) => handleColorChange(label, c)} />
                <span className="text-sm" style={{ color: '#d4d4d8' }}>
                  {label.name}
                </span>
              </div>
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
