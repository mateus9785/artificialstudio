import { UserPlus, Send, Handshake, Wallet } from 'lucide-react'

const STEPS = [
  {
    icon: UserPlus,
    title: 'Cadastre-se grátis',
    description: 'Crie sua conta de parceiro em menos de 1 minuto, sem custo nenhum.',
  },
  {
    icon: Send,
    title: 'Indique um contato',
    description: 'Conte quem precisa de site, sistema, automação ou Inteligência Artificial.',
  },
  {
    icon: Handshake,
    title: 'Nós assumimos a venda',
    description: 'Fazemos toda a abordagem, apresentação e fechamento do projeto por você.',
  },
  {
    icon: Wallet,
    title: 'Receba sua comissão',
    description: 'Projeto fechado e pago pelo cliente? Você recebe direto na sua chave PIX.',
  },
]

export default function HowItWorks() {
  return (
    <section className="relative py-20" style={{ background: '#080808' }}>
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-center font-bold mb-12" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#f4f4f5' }}>
          Como funciona
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <div key={title} className="relative flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(124,58,237,0.15))',
                  border: '1px solid rgba(34,211,238,0.2)',
                }}
              >
                <Icon size={22} color="#22d3ee" />
              </div>
              <span className="text-xs font-semibold mb-2" style={{ color: '#52525b' }}>
                PASSO {index + 1}
              </span>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#f4f4f5' }}>
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
  )
}
