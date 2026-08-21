const FOOTER_LINKS: Record<string, Array<{ label: string; href: string }>> = {
  Empresa: [
    { label: 'Sobre nós', href: '/sobre' },
    { label: 'Blog', href: '/#blog' },
  ],
  Serviços: [
    { label: 'Automações & Web Scraping', href: '/servicos#automacoes-web-scraping' },
    { label: 'IA de Atendimento', href: '/servicos#ia-atendimento' },
    { label: 'SaaS & Dashboards', href: '/servicos#saas-dashboards' },
    { label: 'Landing Pages', href: '/servicos#landing-pages' },
  ],
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <img
                src="/logo.png"
                alt="Artificial Studio"
                width="32"
                height="32"
                loading="lazy"
                decoding="async"
                className="w-8 h-8 object-contain flex-shrink-0"
              />
              <span className="text-lg font-semibold" style={{ color: '#f4f4f5', letterSpacing: '-0.3px' }}>
                Artificial
                <span
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Studio
                </span>
              </span>
            </a>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#52525b', maxWidth: '280px' }}>
              Transformamos ideias em sistemas de alta conversão com design premium e inteligência artificial.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h3
                className="text-sm font-semibold mb-4"
                style={{ color: '#a1a1aa', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '11px' }}
              >
                {group}
              </h3>
              <ul className="flex flex-col gap-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm transition-colors duration-200"
                      style={{ color: '#52525b' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#a1a1aa')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#52525b')}
                    >
                      {label}
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
            © {new Date().getFullYear()} Artificial Studio. Todos os direitos reservados.
          </p>
          <p className="text-xs" style={{ color: '#3f3f46' }}>
            Feito com ❤️ e inteligência artificial
          </p>
        </div>
      </div>
    </footer>
  )
}
