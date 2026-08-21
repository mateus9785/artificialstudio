// Espelha o shape de serializePost() em backend/src/routes/posts.routes.ts.
export interface Post {
  id: number
  title: string
  slug: string | null
  excerpt: string
  content: string | null
  imageUrl: string | null
  tag: string
  tagColor: string
  trending: boolean
  publishedAt: string
}
