import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import PostCard from './PostCard'

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
          <Link
            to="/blog"
            className="flex items-center gap-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap"
            style={{ color: '#52525b' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#22d3ee')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#52525b')}
          >
            Ver todos os posts
            <ArrowRight size={15} />
          </Link>
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
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}
