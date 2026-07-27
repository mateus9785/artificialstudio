import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import ChatWidget from './components/ChatWidget'
import CookieConsent from './components/CookieConsent'
import { getStoredConsent, initTrackingScripts } from './lib/analytics'

export default function Layout({ children }) {
  const [consent, setConsent] = useState(() => getStoredConsent())
  const { hash } = useLocation()

  useEffect(() => {
    if (!consent) return
    initTrackingScripts(consent)
  }, [consent])

  // Navegação para seções (ex: /servicos#ia-atendimento) renderiza o conteúdo
  // após o React montar, então o scroll automático do navegador para a hash
  // acontece cedo demais e não encontra o elemento — refazemos aqui.
  useEffect(() => {
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [hash])

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
      {!consent && <CookieConsent onDecision={setConsent} />}
    </div>
  )
}
