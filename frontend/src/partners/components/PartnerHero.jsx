import { ArrowRight, LogIn } from 'lucide-react'
import PartnerHeader from './PartnerHeader'

export default function PartnerHero({ onLogin, onRegister }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: '#050505' }}>
      <PartnerHeader onLogin={onLogin} onRegister={onRegister} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 85% 60%, rgba(168,85,247,0.08) 0%, transparent 60%)' }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-20">
        <span
          className="inline-block text-xs font-medium px-3 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          Programa de Parceiros Indicadores
        </span>

        <h1
          className="font-bold leading-tight mb-6"
          style={{ fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', letterSpacing: '-1.5px', color: '#f4f4f5' }}
        >
          Indique. Nós fechamos.
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Você lucra.
          </span>
        </h1>

        <p
          className="max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: '#a1a1aa', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)' }}
        >
          Você conhece empresas ou pessoas que precisam de um site novo, um sistema personalizado,
          automações ou Inteligência Artificial para vender mais? Conecte-as a nós e ganhe até{' '}
          <span style={{ color: '#f4f4f5', fontWeight: 600 }}>50% de comissão</span>. Não precisa
          vender, negociar ou entender de programação — o seu papel é só nos conectar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={onRegister}
            className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-300 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
              color: 'white',
              border: '1px solid rgba(34,211,238,0.2)',
              boxShadow: '0 0 30px rgba(34,211,238,0.15)',
            }}
          >
            Quero ser parceiro
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            onClick={onLogin}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-medium text-base transition-all duration-300 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              color: '#a1a1aa',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            <LogIn size={16} />
            Já sou parceiro
          </button>
        </div>

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8">
          {[
            { value: '50%', label: 'de comissão por projeto' },
            { value: 'R$2k–15k+', label: 'valor médio dos projetos' },
            { value: '100%', label: 'remoto, sem burocracia' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className="text-2xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {value}
              </span>
              <span className="text-sm" style={{ color: '#52525b' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #050505)' }}
      />
    </section>
  )
}
