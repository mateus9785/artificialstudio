import { useEffect } from 'react'
import { Cloud, Bot, Network, ShieldCheck, ArrowRight, type LucideIcon } from 'lucide-react'
import { WHATSAPP_NUMBER } from '../lib/whatsapp'

const SITE_URL = 'https://artificialstudio.com.br'
const PAGE_TITLE = 'Sobre Nós | Artificial Studio'
const PAGE_DESCRIPTION =
  'Mais de 10 anos de experiência prática em programação para descomplicar a tecnologia e impulsionar o crescimento do seu negócio.'

interface Pillar {
  icon: LucideIcon
  accent: string
  title: string
  description: string
}

const PILLARS: Pillar[] = [
  {
    icon: Cloud,
    accent: '#22d3ee',
    title: 'Economia Inteligente (Nuvem)',
    description:
      'Sabemos como otimizar seus custos com servidores. No passado, identificamos que uma empresa parceira estava gastando desnecessariamente com hospedagem tradicional; realizamos o planejamento e a migração completa para a nuvem da Amazon (AWS), gerando mais velocidade e uma economia real no bolso do cliente.',
  },
  {
    icon: Bot,
    accent: '#a855f7',
    title: 'Automação e Inteligência Artificial',
    description:
      'Chega de perder tempo com tarefas repetitivas. Desenvolvemos robôs de atendimento personalizados (Chatbots) integrados ao ChatGPT e criamos automações web inteligentes para coletar dados e realizar processos automáticos na internet, liberando sua equipe para focar no que realmente importa.',
  },
  {
    icon: Network,
    accent: '#f59e0b',
    title: 'Conexão com Grandes E-commerces',
    description:
      'Se você vende online, nós fazemos a sua loja conversar com o mundo. Temos vasta experiência em integrar sistemas com gigantes do comércio eletrônico, como VTEX e Nuvemshop.',
  },
  {
    icon: ShieldCheck,
    accent: '#22c55e',
    title: 'Segurança Máxima para Seus Dados',
    description:
      'Dominamos as tecnologias mais seguras do mercado para armazenar e organizar as informações mais valiosas da sua empresa (como dados de clientes e vendas), garantindo que nada se perca e tudo funcione rápido.',
  },
]

function setMetaTag(selector: string, attrs: Record<string, string>): void {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

function useAboutSeo() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = PAGE_TITLE

    setMetaTag('meta[name="description"]', { name: 'description', content: PAGE_DESCRIPTION })
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: PAGE_TITLE })
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: PAGE_DESCRIPTION })
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: `${SITE_URL}/sobre` })

    let canonical = document.head.querySelector('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${SITE_URL}/sobre`)

    return () => {
      document.title = previousTitle
      if (canonical && previousCanonical) canonical.setAttribute('href', previousCanonical)
    }
  }, [])
}

export default function About() {
  useAboutSeo()

  return (
    <>
      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden" style={{ background: '#050505' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.10) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-medium"
            style={{
              background: 'rgba(34,211,238,0.06)',
              border: '1px solid rgba(34,211,238,0.18)',
              color: '#22d3ee',
            }}
          >
            Sobre Nós
          </div>
          <h1
            className="font-bold mb-6 leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#f4f4f5', letterSpacing: '-1px' }}
          >
            Descomplicamos a tecnologia para impulsionar o seu negócio
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#a1a1aa', maxWidth: '640px', margin: '0 auto' }}>
            Bem-vindo à Artificial Studio. Nós nascemos com uma missão clara: descomplicar a tecnologia para
            impulsionar o crescimento do seu negócio.
          </p>
        </div>
      </section>

      {/* Founder */}
      <section className="relative py-16 scroll-mt-24" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <img
              src="/ceo.webp"
              alt="Fundador da Artificial Studio"
              width="176"
              height="176"
              loading="lazy"
              decoding="async"
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl object-cover flex-shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <div className="text-center sm:text-left">
              <h2
                className="font-bold mb-3 leading-tight"
                style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', color: '#f4f4f5', letterSpacing: '-0.4px' }}
              >
                Por trás da Artificial Studio
              </h2>
              <p className="text-base leading-relaxed" style={{ color: '#a1a1aa' }}>
                Por trás da nossa agência está uma trajetória de mais de 10 anos de experiência prática em
                programação, liderada por quem entende de verdade como construir soluções digitais inteligentes,
                seguras e lucrativas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* O que fazemos de diferente */}
      <section id="diferenciais" className="relative py-20 scroll-mt-24" style={{ background: '#070707' }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="font-bold mb-3 text-center"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: '#f4f4f5', letterSpacing: '-0.5px' }}
          >
            O Que Fazemos de Diferente?
          </h2>
          <p className="text-sm text-center mb-12" style={{ color: '#71717a' }}>
            (E como isso ajuda você) — Nós não criamos apenas linhas de código. Nós criamos soluções de negócios. A
            nossa experiência se traduz em quatro pilares fundamentais para a sua empresa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PILLARS.map(({ icon: Icon, accent, title, description }) => (
              <div
                key={title}
                className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${accent}14`, border: `1px solid ${accent}25` }}
                >
                  <Icon size={20} style={{ color: accent }} />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: '#f4f4f5' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por que escolher */}
      <section className="relative py-20 scroll-mt-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="font-bold mb-6"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: '#f4f4f5', letterSpacing: '-0.5px' }}
          >
            Por que escolher a Artificial Studio?
          </h2>
          <p className="text-base leading-relaxed mb-4" style={{ color: '#a1a1aa' }}>
            Porque nós falamos a sua língua. Sabemos que, no fim do dia, você não quer apenas um sistema bonito; você
            quer mais vendas, processos mais rápidos, custos reduzidos e clientes satisfeitos.
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#a1a1aa' }}>
            Unimos a solidez de 10 anos de mercado à inovação da Inteligência Artificial para entregar o futuro do
            desenvolvimento de software hoje.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: '#f4f4f5', letterSpacing: '-0.5px' }}
          >
            Vamos construir o futuro da sua empresa juntos?
          </h2>
          <p className="text-sm mb-8" style={{ color: '#71717a' }}>
            Fale com a gente e descubra qual solução se encaixa no seu negócio.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-300 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
              color: 'white',
              border: '1px solid rgba(34,211,238,0.2)',
              boxShadow: '0 0 30px rgba(34,211,238,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 50px rgba(34,211,238,0.3), 0 0 80px rgba(168,85,247,0.2)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.15)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Falar no WhatsApp
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </section>
    </>
  )
}
