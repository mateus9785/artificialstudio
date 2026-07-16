import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs/promises'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { uploadPostImage, convertToWebp, resolveWebpFilename, UPLOADS_DIR } from '../middleware/upload.js'
import { slugify } from '../utils/slug.js'

export const postsRouter = Router()

function serializePost(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    imageUrl: row.image_url,
    tag: row.tag,
    tagColor: row.tag_color,
    trending: Boolean(row.trending),
    publishedAt: row.published_at,
  }
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  const base = slugify(baseSlug) || 'post'
  let slug = base
  let attempt = 1

  while (true) {
    const [rows] = excludeId
      ? await pool.query('SELECT id FROM posts WHERE slug = ? AND id != ?', [slug, excludeId])
      : await pool.query('SELECT id FROM posts WHERE slug = ?', [slug])

    if (rows.length === 0) return slug
    attempt += 1
    slug = `${base}-${attempt}`
  }
}

// Público: usado pela landing page
postsRouter.get('/posts', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 0, 0), 50)
  const sql = `SELECT * FROM posts ORDER BY published_at DESC, id DESC${limit ? ' LIMIT ?' : ''}`
  const [rows] = await pool.query(sql, limit ? [limit] : [])
  res.json(rows.map(serializePost))
})

// Público: usado pela página de artigo (URL amigável /blog/:slug)
postsRouter.get('/posts/:slug', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM posts WHERE slug = ?', [req.params.slug])
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Post não encontrado.' })
  }
  res.json(serializePost(rows[0]))
})

// Admin: mesma listagem, protegida (mantida separada para futura divergência, ex. rascunhos)
postsRouter.get('/admin/posts', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM posts ORDER BY published_at DESC, id DESC')
  res.json(rows.map(serializePost))
})

// Admin: upload de imagem de capa do post (convertida para .webp, máx. 150KB)
postsRouter.post('/admin/posts/upload', requireAdmin, (req, res) => {
  uploadPostImage.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' })

    try {
      const webpBuffer = await convertToWebp(req.file.buffer)
      const filename = resolveWebpFilename(req.body.title, req.file.originalname)
      await fs.writeFile(path.join(UPLOADS_DIR, filename), webpBuffer)
      res.status(201).json({ url: `/uploads/posts/${filename}` })
    } catch {
      res.status(500).json({ error: 'Falha ao processar a imagem.' })
    }
  })
})

function validatePostBody(body) {
  const { title, excerpt, tag, tagColor, publishedAt } = body || {}
  if (!title || !excerpt || !tag || !tagColor || !publishedAt) {
    return 'Preencha título, resumo, tag, cor da tag e data de publicação.'
  }
  return null
}

postsRouter.post('/admin/posts', requireAdmin, async (req, res) => {
  const error = validatePostBody(req.body)
  if (error) return res.status(400).json({ error })

  const { title, excerpt, content, imageUrl, tag, tagColor, trending, publishedAt, slug } = req.body
  const finalSlug = await ensureUniqueSlug(slug || title)

  const [result] = await pool.query(
    `INSERT INTO posts (title, slug, excerpt, content, image_url, tag, tag_color, trending, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, finalSlug, excerpt, content || null, imageUrl || null, tag, tagColor, Boolean(trending), publishedAt],
  )

  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId])
  res.status(201).json(serializePost(rows[0]))
})

postsRouter.put('/admin/posts/:id', requireAdmin, async (req, res) => {
  const error = validatePostBody(req.body)
  if (error) return res.status(400).json({ error })

  const { title, excerpt, content, imageUrl, tag, tagColor, trending, publishedAt, slug } = req.body
  const finalSlug = await ensureUniqueSlug(slug || title, req.params.id)

  const [result] = await pool.query(
    `UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, image_url = ?, tag = ?, tag_color = ?, trending = ?, published_at = ?
     WHERE id = ?`,
    [title, finalSlug, excerpt, content || null, imageUrl || null, tag, tagColor, Boolean(trending), publishedAt, req.params.id],
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
