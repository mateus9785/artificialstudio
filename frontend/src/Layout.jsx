import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import CookieConsent from './components/CookieConsent'
import { getStoredConsent, initTrackingScripts } from './lib/analytics'

export default function Layout({ children }) {
  const [consent, setConsent] = useState(() => getStoredConsent())

  useEffect(() => {
    if (!consent) return
    initTrackingScripts(consent)
  }, [consent])

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
      {!consent && <CookieConsent onDecision={setConsent} />}
    </div>
  )
}
