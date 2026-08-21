import type { Pool, PoolConnection } from 'mysql2/promise'

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

export function slugify(text: string | null | undefined): string {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Aceita tanto o pool quanto uma connection dedicada (seed/backfill rodam
// dentro de uma unica connection para poder reutiliza-la em varias queries).
export async function ensureUniqueSlug(db: Pool | PoolConnection, baseSlug: string, excludeId?: string): Promise<string> {
  const base = slugify(baseSlug) || 'post'
  let slug = base
  let attempt = 1

  while (true) {
    const [rows] = excludeId
      ? await db.query('SELECT id FROM posts WHERE slug = ? AND id != ?', [slug, excludeId])
      : await db.query('SELECT id FROM posts WHERE slug = ?', [slug])

    if ((rows as unknown[]).length === 0) return slug
    attempt += 1
    slug = `${base}-${attempt}`
  }
}
