import { Zap, Globe, Link, GitBranch, MessageCircle, Mail } from 'lucide-react'

const SOCIAL_LINKS = [
  { icon: GitBranch, href: '#', label: 'GitHub' },
  { icon: Link, href: '#', label: 'LinkedIn' },
  { icon: Globe, href: '#', label: 'Instagram' },
  { icon: MessageCircle, href: '#', label: 'Twitter' },
  { icon: Mail, href: '#', label: 'E-mail' },
]

const FOOTER_LINKS = {
  Empresa: ['Sobre nós', 'Equipe', 'Casos de uso', 'Blog'],
  Serviços: ['Landing Pages', 'SaaS & Dashboards', 'IA de Atendimento', 'Consultoria'],
  Legal: ['Privacidade', 'Termos de uso', 'Cookies'],
}

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: '#050505', borderTop: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(34,211,238,0.4), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
                  boxShadow: '0 0 16px rgba(34,211,238,0.25)',
                }}
              >
                <Zap size={16} fill="white" color="white" />
              </div>
              <span
                className="text-lg font-semibold"
                style={{ color: '#f4f4f5', letterSpacing: '-0.3px' }}
              >
                Artificial
                <span
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Code
                </span>
              </span>
            </a>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#52525b', maxWidth: '280px' }}>
              Transformamos ideias em sistemas de alta conversão com design premium e inteligência artificial.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#52525b',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'
                    e.currentTarget.style.color = '#22d3ee'
                    e.currentTarget.style.background = 'rgba(34,211,238,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.color = '#52525b'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4
                className="text-sm font-semibold mb-4"
                style={{ color: '#a1a1aa', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '11px' }}
              >
                {group}
              </h4>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors duration-200"
                      style={{ color: '#52525b' }}
                      onMouseEnter={(e) => (e.target.style.color = '#a1a1aa')}
                      onMouseLeave={(e) => (e.target.style.color = '#52525b')}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-xs" style={{ color: '#3f3f46' }}>
            © {new Date().getFullYear()} ArtificialCode. Todos os direitos reservados.
          </p>
          <p className="text-xs" style={{ color: '#3f3f46' }}>
            Feito com ❤️ e inteligência artificial
          </p>
        </div>
      </div>
    </footer>
  )
}
