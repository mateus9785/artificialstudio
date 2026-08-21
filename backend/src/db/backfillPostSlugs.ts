// Preenche o slug de posts que ficaram com slug NULL depois que a coluna foi
// adicionada por ALTER TABLE (schema.sql não faz backfill de dado existente,
// só de estrutura). Idempotente: sem posts com slug NULL, não faz nada.
import 'dotenv/config'
import { pool } from './pool.ts'
import { ensureUniqueSlug } from '../utils/slug.ts'

interface PostToFix {
  id: number
  title: string
}

async function backfillPostSlugs(): Promise<void> {
  const connection = await pool.getConnection()
  try {
    const [rows] = await connection.query("SELECT id, title FROM posts WHERE slug IS NULL OR slug = ''")
    const posts = rows as PostToFix[]

    if (posts.length === 0) {
      console.log('Nenhum post com slug pendente.')
      return
    }

    for (const post of posts) {
      const slug = await ensureUniqueSlug(connection, post.title)
      await connection.query('UPDATE posts SET slug = ? WHERE id = ?', [slug, post.id])
      console.log(`Post #${post.id} → slug "${slug}"`)
    }

    console.log(`${posts.length} post(s) corrigido(s).`)
  } finally {
    connection.release()
    await pool.end()
  }
}

backfillPostSlugs().catch((err) => {
  console.error('Falha no backfill de slugs:', err)
  process.exit(1)
})
