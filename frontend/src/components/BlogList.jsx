import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import PostCard from './PostCard'
import Pagination from './Pagination'

const PAGE_SIZE = 6
const SITE_URL = 'https://artificialstudio.com.br'
const PAGE_TITLE = 'Blog | Artificial Studio'
const PAGE_DESCRIPTION =
  'Artigos sobre inteligência artificial, marketing digital, performance web e desenvolvimento de software para impulsionar o seu negócio.'

function setMetaTag(selector, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

function useBlogListSeo() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = PAGE_TITLE

    setMetaTag('meta[name="description"]', { name: 'description', content: PAGE_DESCRIPTION })
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: PAGE_TITLE })
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: PAGE_DESCRIPTION })
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: `${SITE_URL}/blog` })

    let canonical = document.head.querySelector('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${SITE_URL}/blog`)

    return () => {
      document.title = previousTitle
      if (canonical && previousCanonical) canonical.setAttribute('href', previousCanonical)
    }
  }, [])
}

export default function BlogList() {
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [page, setPage] = useState(1)

  useBlogListSeo()

  useEffect(() => {
    let active = true
    api
      .get('/posts')
      .then((data) => {
        if (active) {
          setPosts(data)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  const paginatedPosts = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handlePageChange(nextPage) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="relative py-28 overflow-hidden" style={{ background: '#070707' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(168,85,247,0.10) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <header className="max-w-2xl mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-medium"
            style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)',
              color: '#a855f7',
            }}
          >
            Conteúdo Gratuito
          </div>
          <h1
            className="font-bold mb-5 leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#f4f4f5', letterSpacing: '-1px' }}
          >
            Blog
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#a1a1aa' }}>
            Artigos sobre inteligência artificial, marketing digital, performance web e desenvolvimento de
            software para impulsionar o seu negócio.
          </p>
        </header>

        {status === 'error' && (
          <p className="text-sm" style={{ color: '#52525b' }}>
            Não foi possível carregar os posts agora. Tente novamente mais tarde.
          </p>
        )}

        {status === 'ready' && posts.length === 0 && (
          <p className="text-sm" style={{ color: '#52525b' }}>
            Nenhum post publicado ainda.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {paginatedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>
    </section>
  )
}
