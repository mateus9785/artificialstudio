import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { API_URL } from '../lib/api'
import { hexToRgba } from '../lib/color'
import type { Post } from '../lib/types'

function resolveImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (/^https?:\/\//.test(imageUrl)) return imageUrl
  return `${new URL(API_URL).origin}${imageUrl}`
}

const TAG_ICONS: Record<string, string> = {
  'Inteligência Artificial': '🤖',
  'Marketing Digital': '📈',
  'Performance Web': '⚡',
  'Desenvolvimento de Software': '💻',
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date)
}

export default function PostCard({ post }: { post: Post }) {
  const gradient = `linear-gradient(135deg, ${hexToRgba(post.tagColor, 0.06)} 0%, ${hexToRgba(post.tagColor, 0.02)} 100%)`
  const image = resolveImageUrl(post.imageUrl)

  return (
    <article
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
                <div className="text-5xl opacity-20 select-none" style={{ filter: `drop-shadow(0 0 20px ${post.tagColor})` }}>
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
          <h3 className="font-semibold mb-3 leading-snug" style={{ color: '#d4d4d8', fontSize: '1rem', letterSpacing: '-0.2px' }}>
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
            <span className="text-xs font-medium transition-colors duration-200" style={{ color: post.tagColor }}>
              Ler artigo →
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
