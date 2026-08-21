import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs/promises'
import { pool } from '../db/pool.ts'
import { requireAdmin } from '../middleware/requireAdmin.ts'
import { uploadPostImage, convertToWebp, resolveWebpFilename, UPLOADS_DIR } from '../middleware/upload.ts'
import { ensureUniqueSlug } from '../utils/slug.ts'

export const postsRouter = Router()

interface PostRow {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string | null
  image_url: string | null
  tag: string
  tag_color: string
  trending: number | boolean
  published_at: string
}

function serializePost(row: PostRow) {
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

// Público: usado pela landing page
postsRouter.get('/posts', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? ''), 10) || 0, 0), 50)
  const sql = `SELECT * FROM posts ORDER BY published_at DESC, id DESC${limit ? ' LIMIT ?' : ''}`
  const [rows] = await pool.query(sql, limit ? [limit] : [])
  res.json((rows as PostRow[]).map(serializePost))
})

// Público: usado pela página de artigo (URL amigável /blog/:slug)
postsRouter.get('/posts/:slug', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM posts WHERE slug = ?', [req.params.slug])
  const postRows = rows as PostRow[]
  if (postRows.length === 0) {
    return res.status(404).json({ error: 'Post não encontrado.' })
  }
  res.json(serializePost(postRows[0]))
})

// Admin: mesma listagem, protegida (mantida separada para futura divergência, ex. rascunhos)
postsRouter.get('/admin/posts', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM posts ORDER BY published_at DESC, id DESC')
  res.json((rows as PostRow[]).map(serializePost))
})

// Admin: upload de imagem de capa do post (convertida para .webp, máx. 150KB)
postsRouter.post('/admin/posts/upload', requireAdmin, (req, res) => {
  uploadPostImage.single('image')(req, res, async (err: unknown) => {
    if (err) return res.status(400).json({ error: (err as Error).message })
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

interface PostBody {
  title?: string
  excerpt?: string
  content?: string
  imageUrl?: string
  tag?: string
  tagColor?: string
  trending?: boolean
  publishedAt?: string
  slug?: string
}

function validatePostBody(body: PostBody | undefined): string | null {
  const { title, excerpt, tag, tagColor, publishedAt } = body || {}
  if (!title || !excerpt || !tag || !tagColor || !publishedAt) {
    return 'Preencha título, resumo, tag, cor da tag e data de publicação.'
  }
  return null
}

postsRouter.post('/admin/posts', requireAdmin, async (req, res) => {
  const error = validatePostBody(req.body)
  if (error) return res.status(400).json({ error })

  const { title, excerpt, content, imageUrl, tag, tagColor, trending, publishedAt, slug } = req.body as PostBody
  const finalSlug = await ensureUniqueSlug(pool, slug || title || '')

  const [result] = await pool.query(
    `INSERT INTO posts (title, slug, excerpt, content, image_url, tag, tag_color, trending, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, finalSlug, excerpt, content || null, imageUrl || null, tag, tagColor, Boolean(trending), publishedAt],
  )

  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [(result as { insertId: number }).insertId])
  res.status(201).json(serializePost((rows as PostRow[])[0]))
})

postsRouter.put('/admin/posts/:id', requireAdmin, async (req, res) => {
  const error = validatePostBody(req.body)
  if (error) return res.status(400).json({ error })

  const { title, excerpt, content, imageUrl, tag, tagColor, trending, publishedAt, slug } = req.body as PostBody
  const finalSlug = await ensureUniqueSlug(pool, slug || title || '', req.params.id)

  const [result] = await pool.query(
    `UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, image_url = ?, tag = ?, tag_color = ?, trending = ?, published_at = ?
     WHERE id = ?`,
    [title, finalSlug, excerpt, content || null, imageUrl || null, tag, tagColor, Boolean(trending), publishedAt, req.params.id],
  )

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return res.status(404).json({ error: 'Post não encontrado.' })
  }

  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id])
  res.json(serializePost((rows as PostRow[])[0]))
})

postsRouter.delete('/admin/posts/:id', requireAdmin, async (req, res) => {
  const [result] = await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id])
  if ((result as { affectedRows: number }).affectedRows === 0) {
    return res.status(404).json({ error: 'Post não encontrado.' })
  }
  res.status(204).end()
})
