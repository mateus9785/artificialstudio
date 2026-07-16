import { useState } from 'react'
import { Shield, X } from 'lucide-react'
import { storeConsent, initTrackingScripts } from '../lib/analytics'

export default function CookieConsent({ onDecision }) {
  const [showPreferences, setShowPreferences] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(true)

  function applyConsent(consent) {
    storeConsent(consent)
    initTrackingScripts(consent)
    onDecision(consent)
  }

  function acceptAll() {
    applyConsent({ analytics: true, marketing: true })
  }

  function rejectAll() {
    applyConsent({ analytics: false, marketing: false })
  }

  function savePreferences() {
    applyConsent({ analytics, marketing })
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:p-6"
      role="dialog"
      aria-label="Consentimento de cookies"
    >
      <div
        className="relative max-w-3xl mx-auto rounded-2xl overflow-hidden"
        style={{
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
            >
              <Shield size={16} color="white" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#f4f4f5' }}>
                Sua privacidade importa
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#a1a1aa' }}>
                Usamos cookies para medir audiência e otimizar nossos anúncios, em conformidade com a LGPD.
                Você pode aceitar todos, rejeitar os opcionais ou personalizar suas preferências.
              </p>
            </div>
          </div>

          {showPreferences && (
            <div
              className="mb-4 p-4 rounded-xl flex flex-col gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <label className="flex items-center justify-between gap-4 text-sm" style={{ color: '#d4d4d8' }}>
                <span>
                  Cookies necessários
                  <span className="block text-xs" style={{ color: '#52525b' }}>
                    Essenciais para o funcionamento do site. Sempre ativos.
                  </span>
                </span>
                <input type="checkbox" checked disabled />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm" style={{ color: '#d4d4d8' }}>
                <span>
                  Analytics (GA4 + Clarity)
                  <span className="block text-xs" style={{ color: '#52525b' }}>
                    Nos ajuda a entender como você navega pelo site.
                  </span>
                </span>
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm" style={{ color: '#d4d4d8' }}>
                <span>
                  Marketing (Meta Pixel)
                  <span className="block text-xs" style={{ color: '#52525b' }}>
                    Usado para otimizar nossos anúncios em outras plataformas.
                  </span>
                </span>
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={acceptAll}
              className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
            >
              Aceitar todos
            </button>
            <button
              onClick={rejectAll}
              className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
            >
              Rejeitar opcionais
            </button>
            {showPreferences ? (
              <button
                onClick={savePreferences}
                className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
              >
                Salvar preferências
              </button>
            ) : (
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                style={{ background: 'transparent', color: '#a1a1aa' }}
              >
                Personalizar
              </button>
            )}
          </div>
        </div>
        <button
          onClick={rejectAll}
          aria-label="Fechar (equivale a rejeitar opcionais)"
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
          style={{ color: '#71717a' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
