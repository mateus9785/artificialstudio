import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? 'rgba(5, 5, 5, 0.85)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(255,255,255,0.05)'
          : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="Artificial Studio"
            width="32"
            height="32"
            decoding="async"
            fetchPriority="high"
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: '#f4f4f5', letterSpacing: '-0.3px' }}
          >
            Artificial<span className="gradient-text">Studio</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {['Home', 'Portfólio', 'Blog'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace('ó', 'o')}`}
              className="text-sm transition-colors duration-200"
              style={{ color: '#a1a1aa' }}
              onMouseEnter={(e) => (e.target.style.color = '#22d3ee')}
              onMouseLeave={(e) => (e.target.style.color = '#a1a1aa')}
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg transition-colors cursor-pointer"
          style={{ color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,5,0.95)' }}
        >
          {['Home', 'Portfólio', 'Blog'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace('ó', 'o')}`}
              className="text-sm py-2"
              style={{ color: '#a1a1aa' }}
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}
