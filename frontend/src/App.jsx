import { useEffect, useState } from 'react'
import './index.css'
import Header from './components/Header'
import Hero from './components/Hero'
import Portfolio from './components/Portfolio'
import Blog from './components/Blog'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import CookieConsent from './components/CookieConsent'
import { getStoredConsent, initTrackingScripts, trackEvent } from './lib/analytics'

export default function App() {
  const [consent, setConsent] = useState(() => getStoredConsent())

  useEffect(() => {
    if (!consent) return
    initTrackingScripts(consent)
    if (consent.analytics) trackEvent('pageview')
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
      <ChatWidget />
      {!consent && <CookieConsent onDecision={setConsent} />}
    </div>
  )
}
