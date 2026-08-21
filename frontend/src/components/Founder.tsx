import { ArrowRight } from 'lucide-react'

export default function Founder() {
  return (
    <section className="relative py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          <img
            src="/ceo.webp"
            alt="Fundador da Artificial Studio"
            width="192"
            height="192"
            loading="lazy"
            decoding="async"
            className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-cover flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <div className="text-center sm:text-left">
            <span className="text-xs font-medium" style={{ color: '#22d3ee' }}>
              Quem está por trás do projeto
            </span>
            <h2
              className="font-bold mb-3 leading-tight"
              style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', color: '#f4f4f5', letterSpacing: '-0.4px' }}
            >
              Mais de 10 anos de experiência prática em programação
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#a1a1aa' }}>
              A Artificial Studio nasceu para descomplicar a tecnologia e impulsionar o crescimento do seu negócio.
              Por trás da agência está uma trajetória sólida construindo soluções digitais inteligentes, seguras e
              lucrativas — de migrações para nuvem AWS a chatbots com IA e integrações com VTEX e Nuvemshop.
            </p>
            <a
              href="/sobre"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200"
              style={{ color: '#22d3ee' }}
            >
              Conheça nossa história
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
