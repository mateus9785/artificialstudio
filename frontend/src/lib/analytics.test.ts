import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getStoredConsent, initTrackingScripts, storeConsent } from './analytics'

describe('consent storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null before any consent is stored', () => {
    expect(getStoredConsent()).toBeNull()
  })

  it('persists and reads back the consent preferences', () => {
    storeConsent({ analytics: true, marketing: false })
    expect(getStoredConsent()).toEqual({ analytics: true, marketing: false })
  })

  it('returns null instead of throwing on malformed stored JSON', () => {
    localStorage.setItem('ac_consent', '{not valid json')
    expect(getStoredConsent()).toBeNull()
  })
})

// LGPD-critical: os scripts de terceiros só podem ser injetados depois que o
// usuário consente — testar o gate em si, não os SDKs de terceiros.
describe('initTrackingScripts consent gating', () => {
  beforeEach(() => {
    document.querySelectorAll('#ga4-script').forEach((el) => el.remove())
    delete window.gtag
    delete window.dataLayer
    delete window.clarity
    delete window.fbq
    delete window._fbq
    vi.stubEnv('VITE_GA4_ID', 'G-TEST123')
    vi.stubEnv('VITE_CLARITY_ID', 'clarity-test')
    vi.stubEnv('VITE_PIXEL_ID', 'pixel-test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('injects nothing when consent is null/undefined', () => {
    initTrackingScripts(null)
    expect(document.getElementById('ga4-script')).toBeNull()
    expect(window.clarity).toBeUndefined()
    expect(window.fbq).toBeUndefined()
  })

  it('injects nothing when analytics and marketing are both declined, even with ids configured', () => {
    initTrackingScripts({ analytics: false, marketing: false })
    expect(document.getElementById('ga4-script')).toBeNull()
    expect(window.clarity).toBeUndefined()
    expect(window.fbq).toBeUndefined()
  })

  it('loads GA4/Clarity but not the Pixel when only analytics is accepted', () => {
    initTrackingScripts({ analytics: true, marketing: false })
    expect(document.getElementById('ga4-script')).not.toBeNull()
    expect(window.gtag).toBeTypeOf('function')
    expect(window.fbq).toBeUndefined()
  })

  it('loads the Pixel but not GA4/Clarity when only marketing is accepted', () => {
    initTrackingScripts({ analytics: false, marketing: true })
    expect(document.getElementById('ga4-script')).toBeNull()
    expect(window.fbq).toBeTypeOf('function')
  })
})
