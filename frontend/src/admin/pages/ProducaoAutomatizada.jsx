import { useEffect, useRef, useState } from 'react'
import { X, Tag, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import { STATUS_META, STATUS_ORDER, ALLOWED_DRAG_TRANSITIONS } from '../../lib/kanbanMeta'
import LabelsModal from '../components/LabelsModal'

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

function CardForm({ card, labels, onCancel, onSaved, onManageLabels, onDelete }) {
  const { handleError } = useAdminGuard()
  const isNew = !card
  const [title, setTitle] = useState(card?.title ?? '')
  const [description, setDescription] = useState(card?.description ?? '')
  const [labelId, setLabelId] = useState(card?.label?.id ?? labels[0]?.id ?? '')
  const [runImmediately, setRunImmediately] = useState(card?.runImmediately ?? false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !description.trim() || !labelId) {
      setError('Preencha título, descrição e etiqueta.')
      return
    }
    setSaving(true)
    try {
      const body = { title: title.trim(), description: description.trim(), labelId: Number(labelId), runImmediately }
      const saved = isNew
        ? await api.post('/admin/kanban/cards', body, getAdminToken())
        : await api.patch(`/admin/kanban/cards/${card.id}`, body, getAdminToken())
      onSaved(saved)
    } catch (err) {
      if (!handleError(err)) setError(err.message || 'Não foi possível salvar o card.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#f4f4f5' }}>
            {isNew ? 'Novo card' : 'Editar card'}
          </h3>
          <button onClick={onCancel} className="cursor-pointer" style={{ color: '#71717a' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Título
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
              Descrição (tarefa enviada para o Claude)
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} style={inputStyle} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: '#a1a1aa' }}>
                Etiqueta (pasta)
              </label>
              <button
                type="button"
                onClick={onManageLabels}
                className="text-xs cursor-pointer flex items-center gap-1"
                style={{ color: '#22d3ee' }}
              >
                <Tag size={12} /> Gerenciar etiquetas
              </button>
            </div>
            <select value={labelId} onChange={(e) => setLabelId(e.target.value)} style={inputStyle}>
              {labels.length === 0 && <option value="">Nenhuma etiqueta cadastrada</option>}
              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#d4d4d8' }}>
            <input type="checkbox" checked={runImmediately} onChange={(e) => setRunImmediately(e.target.checked)} />
            Executar imediatamente
          </label>

          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={saving || labels.length === 0}
              className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
            >
              Cancelar
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => onDelete(card)}
                className="ml-auto px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f87171' }}
              >
                Excluir
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function CardView({ card, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#f4f4f5' }}>
            {card.title}
          </h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: '#71717a' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 p-4 rounded-xl text-sm whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.03)', color: '#a1a1aa' }}>
          {card.description}
        </div>

        <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: '#71717a' }}>
          Etiqueta:
          <span className="inline-flex items-center gap-1.5" style={{ color: '#d4d4d8' }}>
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: card.label.color }} />
            {card.label.name}
          </span>
        </p>
        <p className="text-xs mb-1" style={{ color: '#71717a' }}>
          Status: <span style={{ color: STATUS_META[card.status].color }}>{STATUS_META[card.status].label}</span>
        </p>

        {card.status === 'error' && card.error && (
          <p className="text-xs mt-3 p-3 rounded-xl whitespace-pre-wrap" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}>
            {card.error}
          </p>
        )}

        {card.status !== 'doing' && (
          <div className="flex mt-5">
            <button
              type="button"
              onClick={() => onDelete(card)}
              className="ml-auto px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f87171' }}
            >
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanCard({ card, onOpen, onArm, onDelete, onDragStart, onDragEnd, isDragging }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(card)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(card)}
      className="relative p-3.5 rounded-xl cursor-grab"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {card.status !== 'doing' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(card)
          }}
          className="absolute top-2.5 right-2.5 cursor-pointer p-0.5"
          style={{ color: '#52525b' }}
          aria-label="Excluir card"
        >
          <Trash2 size={13} />
        </button>
      )}
      <p className="text-sm font-medium truncate pr-5" style={{ color: '#e4e4e7' }}>
        {card.title}
      </p>
      <span
        className="inline-block text-xs mt-1.5 px-1.5 py-0.5 rounded-md"
        style={{ background: `${card.label.color}22`, color: card.label.color }}
      >
        {card.label.name}
      </span>
      <p className="text-xs mt-1.5" style={{ color: '#52525b' }}>
        {new Date(card.createdAt).toLocaleDateString('pt-BR')}
      </p>
      {card.status === 'error' && card.error && (
        <p className="text-xs mt-1.5 truncate" style={{ color: '#f87171' }}>
          {card.error}
        </p>
      )}
      {card.status === 'todo' && card.runImmediately && (
        <p className="text-xs mt-1.5" style={{ color: '#f59e0b' }}>
          Aguardando o worker...
        </p>
      )}
      {card.status === 'todo' && !card.runImmediately && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onArm(card)
          }}
          className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#22d3ee' }}
        >
          Executar agora
        </button>
      )}
    </div>
  )
}

function usageBarColor(percent) {
  if (percent === null || percent === undefined) return '#3f3f46'
  if (percent >= 90) return '#f87171'
  if (percent >= 70) return '#f59e0b'
  return '#22d3ee'
}

function formatResetsAt(value) {
  if (!value) return null
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function UsageBar({ label, percent, resetsAt }) {
  const hasData = percent !== null && percent !== undefined
  const color = usageBarColor(percent)
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: '#a1a1aa' }}>
          {label}
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {hasData ? `${Math.round(percent)}%` : '—'}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${hasData ? Math.min(percent, 100) : 0}%`, background: color, transition: 'width 300ms ease' }}
        />
      </div>
      {resetsAt && (
        <p className="text-xs mt-1" style={{ color: '#52525b' }}>
          Reinicia em {formatResetsAt(resetsAt)}
        </p>
      )}
    </div>
  )
}

function ClaudeUsagePanel({ usage }) {
  if (!usage) {
    return (
      <div
        className="p-3.5 rounded-xl mb-6 flex-shrink-0 text-xs"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#52525b' }}
      >
        Uso do Claude Code ainda sem dados — aparece assim que o worker rodar o primeiro card.
      </div>
    )
  }

  return (
    <div
      className="p-3.5 rounded-xl mb-6 flex-shrink-0 flex items-center gap-6 flex-wrap"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <UsageBar label="Uso do Claude Code (sessão de 5h)" percent={usage.sessionUsedPercent} resetsAt={usage.sessionResetsAt} />
      <UsageBar label="Uso do Claude Code (semana)" percent={usage.weekUsedPercent} resetsAt={usage.weekResetsAt} />
    </div>
  )
}

const POLL_MS = 3000

export default function ProducaoAutomatizada() {
  const { handleError } = useAdminGuard()
  const [cards, setCards] = useState([])
  const [labels, setLabels] = useState([])
  const [usage, setUsage] = useState(null)
  const [status, setStatus] = useState('loading')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [managingLabels, setManagingLabels] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const pollRef = useRef(null)

  function loadAll({ silent } = {}) {
    if (!silent) setStatus('loading')
    Promise.all([
      api.get('/admin/kanban/cards', getAdminToken()),
      api.get('/admin/kanban/labels', getAdminToken()),
      api.get('/admin/kanban/claude-usage', getAdminToken()),
    ])
      .then(([cardsData, labelsData, usageData]) => {
        setCards(cardsData)
        setLabels(labelsData)
        setUsage(usageData)
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err) && !silent) setStatus('error')
      })
  }

  useEffect(() => {
    loadAll()
    pollRef.current = setInterval(() => loadAll({ silent: true }), POLL_MS)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSaved(saved) {
    setCreating(false)
    setViewing(null)
    setCards((prev) => (prev.some((c) => c.id === saved.id) ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]))
  }

  async function handleArm(card) {
    try {
      const saved = await api.post(`/admin/kanban/cards/${card.id}/arm`, {}, getAdminToken())
      setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
    } catch (err) {
      if (!handleError(err)) window.alert(err.message || 'Não foi possível armar o card.')
    }
  }

  async function handleDelete(card) {
    if (!window.confirm(`Excluir o card "${card.title}"?`)) return
    try {
      await api.del(`/admin/kanban/cards/${card.id}`, getAdminToken())
      setCards((prev) => prev.filter((c) => c.id !== card.id))
      setViewing(null)
    } catch (err) {
      if (!handleError(err)) window.alert(err.message || 'Não foi possível excluir o card.')
    }
  }

  async function moveCard(card, targetStatus) {
    const allowed = ALLOWED_DRAG_TRANSITIONS[card.status] || []
    if (!allowed.includes(targetStatus)) {
      window.alert('Só é possível mover cards de "Erro" para "Para Fazer", ou de "Fazendo" para "Concluído".')
      return
    }
    const previous = cards
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: targetStatus } : c)))
    try {
      const action = card.status === 'error' ? 'retry' : 'complete'
      const saved = await api.post(`/admin/kanban/cards/${card.id}/${action}`, {}, getAdminToken())
      setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
    } catch (err) {
      setCards(previous)
      if (!handleError(err)) window.alert(err.message || 'Não foi possível mover o card.')
    }
  }

  function handleDrop(columnStatus) {
    setDragOverColumn(null)
    if (dragging) moveCard(dragging, columnStatus)
    setDragging(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 flex-shrink-0">
        <h1 className="text-xl font-semibold" style={{ color: '#f4f4f5' }}>
          Produção Automatizada
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setManagingLabels(true)}
            className="px-3 py-2 rounded-xl text-sm font-medium cursor-pointer flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
          >
            <Tag size={14} /> Etiquetas
          </button>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
          >
            Novo card
          </button>
        </div>
      </div>

      <ClaudeUsagePanel usage={usage} />

      {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
      {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar os cards.</p>}

      {status === 'ready' && (
        <div className="flex gap-4 overflow-x-auto flex-1 min-h-0 pb-3">
          {STATUS_ORDER.map((columnStatus) => {
            const meta = STATUS_META[columnStatus]
            const columnCards = cards.filter((c) => c.status === columnStatus)
            return (
              <div
                key={columnStatus}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverColumn(columnStatus)
                }}
                onDragLeave={() => setDragOverColumn((prev) => (prev === columnStatus ? null : prev))}
                onDrop={() => handleDrop(columnStatus)}
                className="flex-shrink-0 w-72 h-full flex flex-col rounded-xl"
                style={{
                  background: dragOverColumn === columnStatus ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${dragOverColumn === columnStatus ? meta.color : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="flex items-center gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <span className="text-xs font-medium flex-1" style={{ color: '#d4d4d8' }}>
                    {meta.label}
                  </span>
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{ background: `${meta.color}14`, color: meta.color }}
                  >
                    {columnCards.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-0">
                  {columnCards.length === 0 && (
                    <p className="text-xs p-2" style={{ color: '#3f3f46' }}>
                      Nenhum card
                    </p>
                  )}
                  {columnCards.map((card) => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      onOpen={setViewing}
                      onArm={handleArm}
                      onDelete={handleDelete}
                      onDragStart={setDragging}
                      onDragEnd={() => setDragging(null)}
                      isDragging={dragging?.id === card.id}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <CardForm
          labels={labels}
          onCancel={() => setCreating(false)}
          onSaved={handleSaved}
          onManageLabels={() => setManagingLabels(true)}
        />
      )}

      {viewing && viewing.status === 'todo' && (
        <CardForm
          card={viewing}
          labels={labels}
          onCancel={() => setViewing(null)}
          onSaved={handleSaved}
          onManageLabels={() => setManagingLabels(true)}
          onDelete={handleDelete}
        />
      )}

      {viewing && viewing.status !== 'todo' && (
        <CardView card={viewing} onClose={() => setViewing(null)} onDelete={handleDelete} />
      )}

      {managingLabels && (
        <LabelsModal labels={labels} onClose={() => setManagingLabels(false)} onLabelsChanged={setLabels} />
      )}
    </div>
  )
}
