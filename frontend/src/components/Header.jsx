import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const NAV_ITEMS = ['Home', 'Blog']
const NAV_SECTION_IDS = ['home', 'blog']

export default function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const navRefs = useRef({})
  const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isHome) return
    const sections = NAV_SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isHome])

  useEffect(() => {
    const el = navRefs.current[activeSection]
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 })
    }
  }, [activeSection])

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
        <a href={isHome ? '#' : '/'} className="flex items-center gap-2 group">
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
        <nav className="hidden md:flex items-center gap-8 relative">
          {NAV_ITEMS.map((item, i) => {
            const id = NAV_SECTION_IDS[i]
            const isActive = activeSection === id
            return (
              <a
                key={item}
                ref={(el) => { navRefs.current[id] = el }}
                href={isHome ? `#${id}` : `/#${id}`}
                className="text-sm transition-colors duration-200"
                style={{ color: isActive ? '#22d3ee' : '#a1a1aa' }}
                onMouseEnter={(e) => (e.target.style.color = '#22d3ee')}
                onMouseLeave={(e) => (e.target.style.color = isActive ? '#22d3ee' : '#a1a1aa')}
              >
                {item}
              </a>
            )
          })}
          <span className="nav-indicator" style={indicatorStyle} />
          <a
            href="/sobre"
            className="text-sm transition-colors duration-200"
            style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => (e.target.style.color = '#22d3ee')}
            onMouseLeave={(e) => (e.target.style.color = '#a1a1aa')}
          >
            Sobre
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg transition-colors cursor-pointer"
          style={{ color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <span
            className="flex transition-transform duration-300"
            style={{ transform: menuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="mobile-menu-panel md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,5,0.95)' }}
        >
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item}
              href={isHome ? `#${NAV_SECTION_IDS[i]}` : `/#${NAV_SECTION_IDS[i]}`}
              className="animate-fade-in-up text-sm py-2"
              style={{ color: activeSection === NAV_SECTION_IDS[i] ? '#22d3ee' : '#a1a1aa', animationDelay: `${i * 0.06}s` }}
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <a
            href="/sobre"
            className="animate-fade-in-up text-sm py-2"
            style={{ color: '#a1a1aa', animationDelay: `${NAV_ITEMS.length * 0.06}s` }}
            onClick={() => setMenuOpen(false)}
          >
            Sobre
          </a>
        </div>
      )}
    </header>
  )
}
