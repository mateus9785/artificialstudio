import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import { api, API_URL } from '../lib/api'
import type { Post } from '../lib/types'

const SITE_URL = 'https://artificialstudio.com.br'

type Status = 'loading' | 'ready' | 'error'

type ContentBlock = { type: 'h2' | 'h3' | 'p'; text: string } | { type: 'ul'; items: string[] }

function formatDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

function resolveImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (/^https?:\/\//.test(imageUrl)) return imageUrl
  return `${new URL(API_URL).origin}${imageUrl}`
}

// Suporta um subconjunto mínimo de markdown (## / ### / listas) para dar
// hierarquia semântica real (h2/h3) ao conteúdo de artigos longos.
function renderContent(content: string) {
  const blocks: ContentBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'ul', items: list })
      list = []
    }
  }

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
    } else if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h3', text: line.slice(4) })
    } else if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h2', text: line.slice(3) })
    } else if (line.startsWith('- ')) {
      flushParagraph()
      list.push(line.slice(2))
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()

  return blocks.map((block, i) => {
    if (block.type === 'h2') {
      return (
        <h2 key={i} className="font-bold mt-10 mb-4 leading-snug" style={{ fontSize: '1.5rem', color: '#f4f4f5', letterSpacing: '-0.3px' }}>
          {block.text}
        </h2>
      )
    }
    if (block.type === 'h3') {
      return (
        <h3 key={i} className="font-semibold mt-8 mb-3 leading-snug" style={{ fontSize: '1.15rem', color: '#e4e4e7' }}>
          {block.text}
        </h3>
      )
    }
    if (block.type === 'ul') {
      return (
        <ul key={i} className="list-disc pl-5 mb-6 flex flex-col gap-2">
          {block.items.map((item, j) => (
            <li key={j} className="leading-relaxed" style={{ color: '#d4d4d8' }}>
              {item}
            </li>
          ))}
        </ul>
      )
    }
    return (
      <p key={i} className="mb-5 leading-relaxed" style={{ color: '#d4d4d8' }}>
        {block.text}
      </p>
    )
  })
}

function setMetaTag(selector: string, attrs: Record<string, string>): void {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

function useBlogPostSeo(post: Post | null) {
  useEffect(() => {
    if (!post) return

    const previousTitle = document.title
    document.title = `${post.title} | Artificial Studio Blog`

    setMetaTag('meta[name="description"]', { name: 'description', content: post.excerpt })
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: post.title })
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: post.excerpt })
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'article' })
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: `${SITE_URL}/blog/${post.slug}` })

    const image = resolveImageUrl(post.imageUrl)
    if (image) {
      setMetaTag('meta[property="og:image"]', { property: 'og:image', content: image })
    }

    let canonical = document.head.querySelector('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${SITE_URL}/blog/${post.slug}`)

    return () => {
      document.title = previousTitle
      if (canonical && previousCanonical) canonical.setAttribute('href', previousCanonical)
    }
  }, [post])
}

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let active = true
    setStatus('loading')
    setPost(null)
    api
      .get(`/posts/${slug}`)
      .then((data) => {
        if (active) {
          setPost(data as Post)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [slug])

  useBlogPostSeo(post)

  if (status === 'loading') {
    return (
      <section className="py-32 px-6 text-center" style={{ color: '#52525b' }}>
        Carregando artigo...
      </section>
    )
  }

  if (status === 'error' || !post) {
    return (
      <section className="py-32 px-6 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#f4f4f5' }}>
          Artigo não encontrado
        </h1>
        <p className="text-sm mb-8" style={{ color: '#52525b' }}>
          O post que você procura não existe ou foi removido.
        </p>
        <Link to="/#blog" className="text-sm font-medium" style={{ color: '#22d3ee' }}>
          Voltar para o blog
        </Link>
      </section>
    )
  }

  const image = resolveImageUrl(post.imageUrl)

  return (
    <article className="relative py-28" style={{ background: '#070707' }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link to="/#blog" className="inline-flex items-center gap-2 text-sm font-medium flex-shrink-0" style={{ color: '#71717a' }}>
            <ArrowLeft size={15} />
            Voltar para o blog
          </Link>

          <span
            className="inline-block text-xs font-medium px-2.5 py-1 rounded-md flex-shrink-0"
            style={{
              background: `${post.tagColor}14`,
              color: post.tagColor,
              border: `1px solid ${post.tagColor}22`,
            }}
          >
            {post.tag}
          </span>
        </div>

        <h1
          className="font-bold mb-5 leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#f4f4f5', letterSpacing: '-0.8px' }}
        >
          {post.title}
        </h1>

        <div className="flex items-center gap-4 mb-8 text-xs" style={{ color: '#71717a' }}>
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
          </span>
        </div>

        {image && (
          <img
            src={image}
            alt={post.title}
            width="1200"
            height="630"
            className="w-full h-auto rounded-2xl mb-10 object-cover"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          />
        )}

        <p className="text-lg leading-relaxed mb-8" style={{ color: '#a1a1aa' }}>
          {post.excerpt}
        </p>

        {post.content && <div className="text-base">{renderContent(post.content)}</div>}
      </div>
    </article>
  )
}
