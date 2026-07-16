import { useEffect, useState } from 'react'
import './index.css'
import Header from './components/Header'
import Hero from './components/Hero'
import Portfolio from './components/Portfolio'
import Blog from './components/Blog'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import CookieConsent from './components/CookieConsent'
import { getStoredConsent, initTrackingScripts } from './lib/analytics'

export default function App() {
  const [consent, setConsent] = useState(() => getStoredConsent())

  useEffect(() => {
    if (!consent) return
    initTrackingScripts(consent)
  }, [consent])

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <Header />
      <main>
        <Hero />
        <Portfolio />
        <Blog />
      </main>
      <Footer />
      <WhatsAppButton />
      {!consent && <CookieConsent onDecision={setConsent} />}
    </div>
  )
}
