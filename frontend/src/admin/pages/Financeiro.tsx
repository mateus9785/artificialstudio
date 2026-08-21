import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, Scale, type LucideIcon } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

type LancamentoType = 'entrada' | 'saida'

interface Lancamento {
  id: number
  type: LancamentoType
  description: string
  amount: number
  occurredOn: string
  createdAt: string
  updatedAt: string
}

interface LancamentoFormData {
  id?: number
  type: LancamentoType
  description: string
  amount: string | number
  occurredOn: string
}

const TYPE_LABELS: Record<LancamentoType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function emptyForm(month: string): LancamentoFormData {
  return {
    type: 'entrada',
    description: '',
    amount: '',
    occurredOn: month === currentMonth() ? new Date().toISOString().slice(0, 10) : `${month}-01`,
  }
}

function formatCurrency(value: number | string | null | undefined): string {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

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

const selectStyle: CSSProperties = { ...inputStyle, colorScheme: 'dark', cursor: 'pointer' }
const optionStyle: CSSProperties = { background: '#0a0a0a', color: '#e4e4e7' }

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function LancamentoCard({ lancamento, onEdit, onDelete }: { lancamento: Lancamento; onEdit: (l: Lancamento) => void; onDelete: (l: Lancamento) => void }) {
  const isEntrada = lancamento.type === 'entrada'
  const color = isEntrada ? '#4ade80' : '#f87171'
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-medium" style={{ color: '#e4e4e7' }}>
          {lancamento.description}
        </p>
        <span className="inline-block flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: `${color}14`, color, border: `1px solid ${color}22` }}>
          {TYPE_LABELS[lancamento.type]}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: '#71717a' }}>
            {formatDate(lancamento.occurredOn)}
          </p>
          <p className="font-semibold" style={{ color }}>
            {isEntrada ? '+' : '-'} {formatCurrency(lancamento.amount)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(lancamento)}
            aria-label="Editar lançamento"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(lancamento)}
            aria-label="Excluir lançamento"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
            style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}14`, color }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs mb-0.5 truncate" style={{ color: '#71717a' }}>
          {label}
        </p>
        <p className="text-lg font-semibold truncate" style={{ color }}>
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  )
}

function LancamentoForm({ initial, onCancel, onSaved }: { initial: LancamentoFormData; onCancel: () => void; onSaved: (l: Lancamento) => void }) {
  const { handleError } = useAdminGuard()
  const [form, setForm] = useState<LancamentoFormData>(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof LancamentoFormData>(field: K, value: LancamentoFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const token = getAdminToken()
      const payload = {
        type: form.type,
        description: form.description,
        amount: Number(form.amount),
        occurredOn: form.occurredOn,
      }
      const saved = (form.id ? await api.put(`/admin/financeiro/${form.id}`, payload, token) : await api.post('/admin/financeiro', payload, token)) as Lancamento
      onSaved(saved)
    } catch (err) {
      if (!handleError(err)) setError((err as Error).message || 'Não foi possível salvar o lançamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#f4f4f5' }}>
            {form.id ? 'Editar lançamento' : 'Novo lançamento'}
          </h3>
          <button onClick={onCancel} className="cursor-pointer" style={{ color: '#71717a' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Tipo">
            <select value={form.type} onChange={(e) => update('type', e.target.value as LancamentoType)} style={selectStyle}>
              <option value="entrada" style={optionStyle}>
                Entrada (ganho)
              </option>
              <option value="saida" style={optionStyle}>
                Saída (gasto)
              </option>
            </select>
          </Field>

          <Field label="Descrição">
            <input value={form.description} onChange={(e) => update('description', e.target.value)} required style={inputStyle} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Valor (R$)">
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="Data">
              <input type="date" value={form.occurredOn} onChange={(e) => update('occurredOn', e.target.value)} required style={inputStyle} />
            </Field>
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
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
          </div>
        </form>
      </div>
    </div>
  )
}

type Status = 'loading' | 'ready' | 'error'

export default function Financeiro() {
  const { handleError } = useAdminGuard()
  const [month, setMonth] = useState(currentMonth())
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [editing, setEditing] = useState<LancamentoFormData | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)

  function load() {
    setStatus('loading')
    api
      .get(`/admin/financeiro?month=${month}`, getAdminToken())
      .then((data) => {
        setLancamentos(data as Lancamento[])
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err)) setStatus('error')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [month])

  useEffect(() => {
    setPage(1)
  }, [month])

  const totalEntradas = lancamentos.filter((l) => l.type === 'entrada').reduce((sum, l) => sum + l.amount, 0)
  const totalSaidas = lancamentos.filter((l) => l.type === 'saida').reduce((sum, l) => sum + l.amount, 0)
  const saldo = totalEntradas - totalSaidas

  const totalPages = Math.max(1, Math.ceil(lancamentos.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginated = lancamentos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openCreate() {
    setEditing(emptyForm(month))
    setShowForm(true)
  }

  function openEdit(lancamento: Lancamento) {
    setEditing({ ...lancamento, occurredOn: lancamento.occurredOn?.slice(0, 10) })
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setEditing(null)
    load()
  }

  async function handleDelete(lancamento: Lancamento) {
    if (!window.confirm(`Excluir o lançamento "${lancamento.description}"? Essa ação não pode ser desfeita.`)) return
    try {
      await api.del(`/admin/financeiro/${lancamento.id}`, getAdminToken())
      setLancamentos((prev) => prev.filter((l) => l.id !== lancamento.id))
    } catch (err) {
      if (!handleError(err)) window.alert((err as Error).message || 'Não foi possível excluir o lançamento.')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#f4f4f5' }}>
          Financeiro
        </h1>
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
          >
            <Plus size={15} />
            Novo lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={TrendingUp} label="Entradas no mês" value={totalEntradas} color="#4ade80" />
        <SummaryCard icon={TrendingDown} label="Saídas no mês" value={totalSaidas} color="#f87171" />
        <SummaryCard icon={Scale} label="Saldo do mês" value={saldo} color={saldo >= 0 ? '#4ade80' : '#f87171'} />
      </div>

      {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
      {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar os lançamentos.</p>}

      {status === 'ready' && (
        <>
          {lancamentos.length === 0 ? (
            <p style={{ color: '#52525b' }}>Nenhum lançamento neste mês.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:hidden">
                {paginated.map((lancamento) => (
                  <LancamentoCard key={lancamento.id} lancamento={lancamento} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>

              <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                          Data
                        </th>
                        <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                          Descrição
                        </th>
                        <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                          Tipo
                        </th>
                        <th className="text-right font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                          Valor
                        </th>
                        <th className="text-right font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((lancamento) => {
                        const isEntrada = lancamento.type === 'entrada'
                        const color = isEntrada ? '#4ade80' : '#f87171'
                        return (
                          <tr key={lancamento.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-5 py-3 whitespace-nowrap" style={{ color: '#71717a' }}>
                              {formatDate(lancamento.occurredOn)}
                            </td>
                            <td className="px-5 py-3" style={{ color: '#e4e4e7' }}>
                              {lancamento.description}
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: `${color}14`, color, border: `1px solid ${color}22` }}>
                                {TYPE_LABELS[lancamento.type]}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-medium whitespace-nowrap" style={{ color }}>
                              {isEntrada ? '+' : '-'} {formatCurrency(lancamento.amount)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEdit(lancamento)}
                                  aria-label="Editar lançamento"
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDelete(lancamento)}
                                  aria-label="Excluir lançamento"
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                                  style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {showForm && editing && <LancamentoForm initial={editing} onCancel={() => setShowForm(false)} onSaved={handleSaved} />}
    </div>
  )
}
