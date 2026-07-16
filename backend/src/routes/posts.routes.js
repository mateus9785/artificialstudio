import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const postsRouter = Router()

function serializePost(row) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    tag: row.tag,
    tagColor: row.tag_color,
    readTime: row.read_time,
    trending: Boolean(row.trending),
    publishedAt: row.published_at,
  }
}

// Público: usado pela landing page
postsRouter.get('/posts', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM posts ORDER BY published_at DESC, id DESC')
  res.json(rows.map(serializePost))
})

// Admin: mesma listagem, protegida (mantida separada para futura divergência, ex. rascunhos)
postsRouter.get('/admin/posts', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM posts ORDER BY published_at DESC, id DESC')
  res.json(rows.map(serializePost))
})

function validatePostBody(body) {
  const { title, excerpt, tag, tagColor, readTime, publishedAt } = body || {}
  if (!title || !excerpt || !tag || !tagColor || !readTime || !publishedAt) {
    return 'Preencha título, resumo, tag, cor da tag, tempo de leitura e data de publicação.'
  }
  return null
}

postsRouter.post('/admin/posts', requireAdmin, async (req, res) => {
  const error = validatePostBody(req.body)
  if (error) return res.status(400).json({ error })

  const { title, excerpt, content, tag, tagColor, readTime, trending, publishedAt } = req.body
  const [result] = await pool.query(
    `INSERT INTO posts (title, excerpt, content, tag, tag_color, read_time, trending, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, excerpt, content || null, tag, tagColor, readTime, Boolean(trending), publishedAt],
  )

  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId])
  res.status(201).json(serializePost(rows[0]))
})

postsRouter.put('/admin/posts/:id', requireAdmin, async (req, res) => {
  const error = validatePostBody(req.body)
  if (error) return res.status(400).json({ error })

  const { title, excerpt, content, tag, tagColor, readTime, trending, publishedAt } = req.body
  const [result] = await pool.query(
    `UPDATE posts SET title = ?, excerpt = ?, content = ?, tag = ?, tag_color = ?, read_time = ?, trending = ?, published_at = ?
     WHERE id = ?`,
    [title, excerpt, content || null, tag, tagColor, readTime, Boolean(trending), publishedAt, req.params.id],
  )

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Post não encontrado.' })
  }

  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id])
  res.json(serializePost(rows[0]))
})

postsRouter.delete('/admin/posts/:id', requireAdmin, async (req, res) => {
  const [result] = await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id])
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Post não encontrado.' })
  }
  res.status(204).end()
})
