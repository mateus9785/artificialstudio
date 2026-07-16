import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'

function DotsBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const dots = []
    const spacing = 36
    const cols = Math.ceil(canvas.width / spacing) + 1
    const rows = Math.ceil(canvas.height / spacing) + 1

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push({
          x: i * spacing,
          y: j * spacing,
          opacity: Math.random() * 0.15 + 0.03,
          speed: Math.random() * 0.005 + 0.002,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    let animId
    let time = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.016

      dots.forEach((dot) => {
        const opacity = dot.opacity + Math.sin(time * dot.speed * 60 + dot.phase) * 0.06
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(34, 211, 238, ${Math.max(0.01, opacity)})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  )
}

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden scroll-mt-20"
      style={{ background: '#050505' }}
    >
      {/* Animated dot grid */}
      <DotsBackground />

      {/* Radial glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.10) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 85% 60%, rgba(168,85,247,0.07) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 30% at 10% 70%, rgba(34,211,238,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-20">
        {/* H1 */}
        <h1
          className="animate-fade-in-up delay-100 font-bold leading-tight mb-6"
          style={{
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            letterSpacing: '-1.5px',
            color: '#f4f4f5',
          }}
        >
          Desenvolver seu site ficou muito mais{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            barato na era das IAs
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-in-up delay-200 max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{
            color: '#71717a',
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          }}
        >
          Automatize seu atendimento e transforme visitantes em vendas.{' '}
          <span style={{ color: '#a1a1aa' }}>Reduza custos e multiplique sua conversão.</span>
        </p>

        {/* CTA buttons */}
        <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-300 cursor-pointer"
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
            Quero meu projeto agora
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>

          <a
            href="#portfolio"
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-medium text-base transition-all duration-300 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              color: '#a1a1aa',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'
              e.currentTarget.style.color = '#22d3ee'
              e.currentTarget.style.background = 'rgba(34,211,238,0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
              e.currentTarget.style.color = '#a1a1aa'
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            Ver portfólio
          </a>
        </div>

        {/* Social proof */}
        <div className="animate-fade-in-up delay-500 mt-14 flex flex-col sm:flex-row items-center justify-center gap-8">
          {[
            { value: '3×', label: 'mais conversão' },
            { value: '60%', label: 'menos custo' },
            { value: '24/7', label: 'atendimento automatizado' },
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

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, #050505)',
        }}
      />
    </section>
  )
}
