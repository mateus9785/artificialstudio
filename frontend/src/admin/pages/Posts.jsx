import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  content: '',
  tag: '',
  tagColor: '#22d3ee',
  readTime: '5 min',
  trending: false,
  publishedAt: new Date().toISOString().slice(0, 10),
}

function PostForm({ initial, onCancel, onSaved }) {
  const { handleError } = useAdminGuard()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const token = getAdminToken()
      const saved = form.id
        ? await api.put(`/admin/posts/${form.id}`, form, token)
        : await api.post('/admin/posts', form, token)
      onSaved(saved)
    } catch (err) {
      if (!handleError(err)) setError(err.message || 'Não foi possível salvar o post.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#f4f4f5' }}>
            {form.id ? 'Editar post' : 'Novo post'}
          </h3>
          <button onClick={onCancel} className="cursor-pointer" style={{ color: '#71717a' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Título">
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Resumo">
            <textarea
              value={form.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              required
              rows={3}
              style={inputStyle}
            />
          </Field>

          <Field label="Conteúdo (opcional)">
            <textarea
              value={form.content || ''}
              onChange={(e) => update('content', e.target.value)}
              rows={5}
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tag">
              <input value={form.tag} onChange={(e) => update('tag', e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="Cor da tag">
              <input
                type="color"
                value={form.tagColor}
                onChange={(e) => update('tagColor', e.target.value)}
                style={{ ...inputStyle, padding: '4px', height: '40px' }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tempo de leitura">
              <input
                value={form.readTime}
                onChange={(e) => update('readTime', e.target.value)}
                required
                style={inputStyle}
              />
            </Field>
            <Field label="Data de publicação">
              <input
                type="date"
                value={form.publishedAt?.slice(0, 10)}
                onChange={(e) => update('publishedAt', e.target.value)}
                required
                style={inputStyle}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: '#d4d4d8' }}>
            <input type="checkbox" checked={form.trending} onChange={(e) => update('trending', e.target.checked)} />
            Marcar como trending
          </label>

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

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: '#a1a1aa' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

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

export default function Posts() {
  const { handleError } = useAdminGuard()
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  function loadPosts() {
    setStatus('loading')
    api
      .get('/admin/posts', getAdminToken())
      .then((data) => {
        setPosts(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err)) setStatus('error')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadPosts, [])

  function openCreate() {
    setEditing(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(post) {
    setEditing(post)
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setEditing(null)
    loadPosts()
  }

  async function handleDelete(post) {
    if (!window.confirm(`Excluir o post "${post.title}"? Essa ação não pode ser desfeita.`)) return
    try {
      await api.del(`/admin/posts/${post.id}`, getAdminToken())
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } catch (err) {
      if (!handleError(err)) window.alert(err.message || 'Não foi possível excluir o post.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#f4f4f5' }}>
          Blog
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
        >
          <Plus size={15} />
          Novo post
        </button>
      </div>

      {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
      {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar os posts.</p>}

      {status === 'ready' && (
        <div className="flex flex-col gap-2">
          {posts.length === 0 && <p style={{ color: '#52525b' }}>Nenhum post cadastrado ainda.</p>}
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{ background: `${post.tagColor}14`, color: post.tagColor }}
                  >
                    {post.tag}
                  </span>
                  {post.trending && (
                    <span className="text-xs" style={{ color: '#f59e0b' }}>
                      Trending
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                  {post.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#52525b' }}>
                  {post.publishedAt?.slice(0, 10)} · {post.readTime}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(post)}
                  aria-label="Editar"
                  className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa' }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(post)}
                  aria-label="Excluir"
                  className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <PostForm
          initial={editing}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
