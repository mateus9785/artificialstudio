import { useEffect } from 'react'
import { Bot, MessageCircleMore, LayoutDashboard, Rocket, ArrowRight, Check } from 'lucide-react'
import { WHATSAPP_NUMBER } from '../lib/whatsapp'

const SITE_URL = 'https://artificialstudio.com.br'
const PAGE_TITLE = 'Nossos Serviços | Artificial Studio'
const PAGE_DESCRIPTION =
  'Automações inteligentes, IA de atendimento, dashboards SaaS e landing pages de alta conversão. Conheça as soluções sob medida da Artificial Studio.'

const SERVICES = [
  {
    id: 'automacoes-web-scraping',
    icon: Bot,
    accent: '#22d3ee',
    title: 'Automações Inteligentes que simulam a navegação humana',
    intro:
      'Elimine tarefas repetitivas e conecte sistemas que não se conversam. Criamos robôs customizados que simulam a navegação humana para extrair dados, preencher formulários e mover informações de forma 100% autônoma.',
    resolve:
      'Perda de tempo com trabalho manual, erros humanos de digitação e dificuldade para extrair dados de sites sem API pública.',
    variants: [
      'Bots de preenchimento de formulários',
      'Extratores de relatórios',
      'Sincronizadores de estoque entre plataformas',
      'Monitoramento de concorrentes',
    ],
    example: {
      problem:
        'Imagine que sua equipe gasta 2 horas por dia entrando no site de 5 fornecedores diferentes, baixando planilhas de preços e atualizando manualmente o seu sistema.',
      solution:
        'Criamos um robô que roda todas as madrugadas, acessa esses sites, extrai os novos preços e atualiza o seu banco de dados automaticamente. Você acorda com tudo pronto.',
    },
  },
  {
    id: 'ia-atendimento',
    icon: MessageCircleMore,
    accent: '#a855f7',
    title: 'IA de Atendimento & Agentes Autônomos',
    intro:
      'Integre inteligência artificial generativa aos seus canais de comunicação para oferecer um atendimento humanizado, preciso e disponível 24 horas por dia, 7 dias por semana.',
    resolve:
      'Demora no atendimento ao cliente, perda de vendas fora do horário comercial e equipe de suporte sobrecarregada com dúvidas repetitivas.',
    variants: [
      'Chatbots inteligentes para WhatsApp/Telegram',
      'Assistentes de triagem de leads',
      'IA integrada ao seu banco de dados para responder sobre status de pedidos ou estoque',
    ],
    example: {
      problem:
        'Um cliente entra em contato no seu WhatsApp às 23h querendo saber se você tem um produto específico em estoque e qual o prazo de entrega.',
      solution:
        'Uma IA integrada ao seu sistema lê a mensagem, consulta o banco de dados em tempo real, responde se o item está disponível, calcula o frete e envia o link de pagamento — tudo sem nenhuma intervenção humana.',
    },
  },
  {
    id: 'saas-dashboards',
    icon: LayoutDashboard,
    accent: '#f59e0b',
    title: 'Desenvolvimento de Dashboards SaaS & Sistemas Web',
    intro:
      'Sistemas web robustos, escaláveis e sob medida para gerenciar seu negócio ou para colocar a sua própria startup de software (SaaS) no ar.',
    resolve:
      'Planilhas de Excel confusas que travam o tempo todo, falta de visão clara dos indicadores de desempenho (KPIs) e necessidade de um sistema próprio para operar seu modelo de negócios.',
    variants: [
      'Painéis de controle internos (Dashboards)',
      'Sistemas ERP/CRM customizados',
      'Plataformas de assinatura (SaaS)',
      'Portais de clientes',
    ],
    example: {
      problem:
        'Você precisa gerenciar uma rede de prestadores de serviço, onde cada um precisa lançar suas horas, anexar recibos e você precisa aprovar e gerar relatórios financeiros de faturamento.',
      solution:
        'Desenvolvemos uma plataforma web (SaaS) onde cada usuário tem seu login simplificado, o financeiro tem uma visão geral em gráficos intuitivos e os relatórios são gerados com um clique.',
    },
  },
  {
    id: 'landing-pages',
    icon: Rocket,
    accent: '#22c55e',
    title: 'Landing Pages de Alta Conversão',
    intro:
      'Páginas de vendas e captura ultravelozes, otimizadas para transformar visitantes casuais em clientes pagantes.',
    resolve: 'Baixo retorno em campanhas de anúncios patrocinados (Google Ads/Meta Ads) devido a sites lentos ou confusos.',
    variants: [
      'Páginas de venda de produtos/serviços',
      'Páginas de captura de leads (e-books, eventos)',
      'Páginas de obrigado',
      'Portfólios institucionais modernos',
    ],
    example: {
      problem:
        'Você está investindo dinheiro em anúncios no Instagram, mas as pessoas clicam, entram no seu site atual (que demora para carregar) e vão embora sem comprar.',
      solution:
        'Desenvolvemos uma Landing Page extremamente leve, focada em conversão, com copy persuasiva, carregamento instantâneo no celular e um botão direto para o seu WhatsApp ou checkout.',
    },
  },
]

const COMPARISON_ROWS = [
  {
    challenge: 'Perco muito tempo copiando e colando dados.',
    solution: 'Automação',
    benefit: 'Ganho de tempo e erro zero.',
  },
  {
    challenge: 'Meus clientes demoram para ser atendidos.',
    solution: 'IA de Atendimento',
    benefit: 'Suporte 24/7 instantâneo.',
  },
  {
    challenge: 'Preciso centralizar meus dados e gerenciar processos.',
    solution: 'SaaS / Dashboard',
    benefit: 'Controle total e decisões baseadas em dados.',
  },
  {
    challenge: 'Quero vender um produto específico na internet.',
    solution: 'Landing Page',
    benefit: 'Aumento imediato na taxa de vendas.',
  },
]

const PROCESS_STEPS = [
  {
    title: 'Imersão & Diagnóstico',
    description: 'Entendemos o gargalo do seu negócio.',
  },
  {
    title: 'Desenvolvimento Ágil',
    description: 'Criamos a solução focando na melhor experiência de uso e performance técnica.',
  },
  {
    title: 'Integração & Testes',
    description: 'Garantimos que tudo funcione perfeitamente com as ferramentas que você já usa.',
  },
  {
    title: 'Entrega & Suporte',
    description: 'Colocamos no ar e acompanhamos os resultados de perto.',
  },
]

function setMetaTag(selector, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

function useServicesSeo() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = PAGE_TITLE

    setMetaTag('meta[name="description"]', { name: 'description', content: PAGE_DESCRIPTION })
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: PAGE_TITLE })
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: PAGE_DESCRIPTION })
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: `${SITE_URL}/servicos` })

    let canonical = document.head.querySelector('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${SITE_URL}/servicos`)

    return () => {
      document.title = previousTitle
      if (canonical && previousCanonical) canonical.setAttribute('href', previousCanonical)
    }
  }, [])
}

function ServiceSection({ service, index }) {
  const Icon = service.icon
  return (
    <section
      id={service.id}
      className="relative py-20 scroll-mt-24"
      style={{
        borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${service.accent}14`, border: `1px solid ${service.accent}25` }}
          >
            <Icon size={22} style={{ color: service.accent }} />
          </div>
          <div>
            <span className="text-xs font-medium" style={{ color: service.accent }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2
              className="font-bold leading-tight"
              style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', color: '#f4f4f5', letterSpacing: '-0.4px' }}
            >
              {service.title}
            </h2>
          </div>
        </div>

        <p className="text-base leading-relaxed mb-8" style={{ color: '#a1a1aa' }}>
          {service.intro}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#e4e4e7' }}>
              O que resolve
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>
              {service.resolve}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#e4e4e7' }}>
              Variantes
            </h3>
            <ul className="flex flex-col gap-2">
              {service.variants.map((variant) => (
                <li key={variant} className="flex items-start gap-2 text-sm" style={{ color: '#71717a' }}>
                  <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: service.accent }} />
                  {variant}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: service.accent }}>
            Exemplo prático
          </h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#a1a1aa' }}>
            {service.example.problem}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#d4d4d8' }}>
            <span className="font-semibold" style={{ color: '#f4f4f5' }}>
              Nossa solução:{' '}
            </span>
            {service.example.solution}
          </p>
        </div>
      </div>
    </section>
  )
}

export default function Services() {
  useServicesSeo()

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
            Nossos Serviços
          </div>
          <h1
            className="font-bold mb-6 leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#f4f4f5', letterSpacing: '-1px' }}
          >
            Transformamos processos manuais em vantagens competitivas
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#a1a1aa', maxWidth: '640px', margin: '0 auto' }}>
            Desenvolvemos soluções sob medida — de automações inteligentes a sistemas web complexos — para que sua
            empresa ganhe escala, reduza custos e venda mais.
          </p>
        </div>
      </section>

      {/* Service sections */}
      {SERVICES.map((service, index) => (
        <ServiceSection key={service.id} service={service} index={index} />
      ))}

      {/* Comparison table */}
      <section
        id="comparativo"
        className="relative py-20 scroll-mt-24"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#070707' }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="font-bold mb-3 text-center"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: '#f4f4f5', letterSpacing: '-0.5px' }}
          >
            Qual solução você precisa hoje?
          </h2>
          <p className="text-sm text-center mb-10" style={{ color: '#71717a' }}>
            Compare o desafio do seu negócio com a solução ideal.
          </p>

          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th scope="col" className="px-5 py-4 font-semibold" style={{ color: '#e4e4e7' }}>
                    Se o seu desafio é...
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold" style={{ color: '#e4e4e7' }}>
                    A melhor solução é...
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold" style={{ color: '#e4e4e7' }}>
                    O principal benefício é...
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.solution} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-5 py-4" style={{ color: '#a1a1aa' }}>
                      {row.challenge}
                    </td>
                    <td className="px-5 py-4 font-medium" style={{ color: '#22d3ee' }}>
                      {row.solution}
                    </td>
                    <td className="px-5 py-4" style={{ color: '#a1a1aa' }}>
                      {row.benefit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How we work */}
      <section id="como-trabalhamos" className="relative py-20 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="font-bold mb-12 text-center"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: '#f4f4f5', letterSpacing: '-0.5px' }}
          >
            Como trabalhamos?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold mb-4"
                  style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}
                >
                  {i + 1}
                </span>
                <h3 className="text-base font-semibold mb-2" style={{ color: '#f4f4f5' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: '#f4f4f5', letterSpacing: '-0.5px' }}
          >
            Pronto para começar?
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
