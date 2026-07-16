import { Link } from 'react-router-dom'

export default function PartnerHeader({ onLogin, onRegister }) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between gap-2 sm:gap-4">
      <Link to="/" className="inline-flex items-center gap-2 group w-fit flex-shrink-0">
        <img src="/logo.png" alt="Artificial Studio" className="w-7 h-7 sm:w-8 sm:h-8 object-contain flex-shrink-0" />
        <span
          className="text-base sm:text-lg font-semibold tracking-tight whitespace-nowrap"
          style={{ color: '#f4f4f5', letterSpacing: '-0.3px' }}
        >
          Artificial<span className="gradient-text">Studio</span>
        </span>
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onLogin}
          className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap cursor-pointer"
          style={{ color: '#a1a1aa' }}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(8,145,178,0.9), rgba(124,58,237,0.9))',
            color: 'white',
            border: '1px solid rgba(34,211,238,0.2)',
            boxShadow: '0 0 20px rgba(34,211,238,0.1)',
          }}
        >
          Cadastre-se
        </button>
      </div>
    </header>
  )
}
