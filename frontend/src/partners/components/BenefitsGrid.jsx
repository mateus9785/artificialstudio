import { DollarSign, Smartphone, CheckCircle2, Wallet, Repeat } from 'lucide-react'

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'Comissões Altas',
    description: 'Projetos de tecnologia variam de R$ 2.000 a R$ 15.000+. Você fica com até 50% do valor fechado.',
    color: '#22d3ee',
  },
  {
    icon: Repeat,
    title: 'Mensalidades',
    description: 'Fechou um serviço recorrente? Você fica com 100% da primeira mensalidade.',
    color: '#a855f7',
  },
  {
    icon: Smartphone,
    title: '100% Remoto',
    description: 'Indique pelo celular ou computador, no seu ritmo, de onde estiver.',
    color: '#22d3ee',
  },
  {
    icon: CheckCircle2,
    title: 'Sem Burocracia',
    description: 'Não precisa vender, negociar ou entender de programação. O seu papel é só nos conectar.',
    color: '#a855f7',
  },
  {
    icon: Wallet,
    title: 'Pagamento via PIX',
    description: 'Assim que o cliente finalizar o pagamento do projeto, a comissão cai direto na sua chave PIX.',
    color: '#22d3ee',
  },
]

export default function BenefitsGrid() {
  return (
    <section className="relative py-20" style={{ background: '#050505' }}>
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-center font-bold mb-4" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#f4f4f5' }}>
          Por que ser um parceiro indicador?
        </h2>
        <p className="text-center max-w-xl mx-auto mb-12" style={{ color: '#71717a' }}>
          Diferenciais pensados para quem quer ganhar dinheiro extra sem sair da sua rotina.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="p-6 rounded-2xl transition-transform duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${color}14` }}
              >
                <Icon size={20} color={color} />
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
  )
}
