import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { api, API_URL } from '../lib/api'
import { hexToRgba } from '../lib/color'

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null
  if (/^https?:\/\//.test(imageUrl)) return imageUrl
  return `${new URL(API_URL).origin}${imageUrl}`
}

const TAG_ICONS = {
  'Inteligência Artificial': '🤖',
  'Marketing Digital': '📈',
  'Performance Web': '⚡',
  'Desenvolvimento de Software': '💻',
}

function formatDate(isoDate) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date)
}

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    api
      .get('/posts?limit=3')
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

  return (
    <section
      id="blog"
      className="relative py-28 overflow-hidden scroll-mt-20"
      style={{ background: '#070707' }}
    >
      {/* Top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(168,85,247,0.3), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
          <div>
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
            <h2
              className="font-bold"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                color: '#f4f4f5',
                letterSpacing: '-0.8px',
              }}
            >
              Insights que geram resultado
            </h2>
          </div>
          <a
            href="#"
            className="flex items-center gap-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap"
            style={{ color: '#52525b' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#22d3ee')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#52525b')}
          >
            Ver todos os posts
            <ArrowRight size={15} />
          </a>
        </div>

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

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => {
            const gradient = `linear-gradient(135deg, ${hexToRgba(post.tagColor, 0.06)} 0%, ${hexToRgba(post.tagColor, 0.02)} 100%)`
            const image = resolveImageUrl(post.imageUrl)
            return (
              <article
                key={post.id}
                className="blog-card rounded-2xl overflow-hidden"
                style={{
                  background: gradient,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
              <Link to={`/blog/${post.slug}`} className="block cursor-pointer">
                {/* Image */}
                <div
                  className="relative h-44 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3)), ${gradient}`,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={post.title}
                      loading="lazy"
                      decoding="async"
                      width="400"
                      height="176"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      {/* Decorative grid pattern */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `linear-gradient(${post.tagColor}15 1px, transparent 1px), linear-gradient(90deg, ${post.tagColor}15 1px, transparent 1px)`,
                          backgroundSize: '30px 30px',
                        }}
                      />
                      {/* Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="text-5xl opacity-20 select-none"
                          style={{ filter: `drop-shadow(0 0 20px ${post.tagColor})` }}
                        >
                          {TAG_ICONS[post.tag] || '📝'}
                        </div>
                      </div>
                    </>
                  )}
                  {post.trending && (
                    <div
                      className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: `1px solid ${post.tagColor}40`,
                        color: post.tagColor,
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <TrendingUp size={10} />
                      Trending
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Tag */}
                  <span
                    className="inline-block text-xs font-medium px-2.5 py-1 rounded-md mb-3"
                    style={{
                      background: `${post.tagColor}14`,
                      color: post.tagColor,
                      border: `1px solid ${post.tagColor}22`,
                    }}
                  >
                    {post.tag}
                  </span>

                  {/* Title */}
                  <h3
                    className="font-semibold mb-3 leading-snug"
                    style={{ color: '#d4d4d8', fontSize: '1rem', letterSpacing: '-0.2px' }}
                  >
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#52525b' }}>
                    {post.excerpt}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#3f3f46' }}>
                      {formatDate(post.publishedAt)}
                    </span>
                    <span
                      className="text-xs font-medium transition-colors duration-200"
                      style={{ color: post.tagColor }}
                    >
                      Ler artigo →
                    </span>
                  </div>
                </div>
              </Link>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
