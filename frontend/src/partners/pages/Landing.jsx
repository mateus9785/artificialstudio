import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PartnerHero from '../components/PartnerHero'
import BenefitsGrid from '../components/BenefitsGrid'
import HowItWorks from '../components/HowItWorks'

export default function Landing() {
  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <PartnerHero />
      <BenefitsGrid />
      <HowItWorks />

      <section className="py-20 text-center px-6" style={{ background: '#050505' }}>
        <h2 className="font-bold mb-4" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#f4f4f5' }}>
          Pronto para começar a indicar?
        </h2>
        <p className="max-w-md mx-auto mb-8" style={{ color: '#71717a' }}>
          Cadastro gratuito, sem compromisso. Comece a indicar hoje mesmo.
        </p>
        <Link
          to="/indique/cadastro"
          className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
            color: 'white',
            border: '1px solid rgba(34,211,238,0.2)',
            boxShadow: '0 0 30px rgba(34,211,238,0.15)',
          }}
        >
          Quero ser parceiro
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
    </div>
  )
}
