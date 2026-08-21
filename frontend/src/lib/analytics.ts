const CONSENT_KEY = 'ac_consent'

export interface ConsentPreferences {
  analytics?: boolean
  marketing?: boolean
}

// Os três loaders abaixo são snippets de embed padrão dos provedores (GA4/Clarity/Meta
// Pixel), cada um com sua própria convenção de globals dinâmicos — tipados como
// `unknown`/funções variádicas em vez de modelar a API completa de cada SDK, que foge
// do escopo de um site que só dispara pageview.
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    clarity?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & Record<string, unknown>
    _fbq?: unknown
  }
}

export function getStoredConsent(): ConsentPreferences | null {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function storeConsent(consent: ConsentPreferences): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
}

function loadGA4(measurementId: string | undefined): void {
  if (!measurementId || document.getElementById('ga4-script')) return

  const script = document.createElement('script')
  script.id = 'ga4-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', measurementId, { anonymize_ip: true })
}

function loadClarity(projectId: string | undefined): void {
  if (!projectId || window.clarity) return
  ;(function (c, l, a, r, i) {
    const target = c as unknown as Record<string, { q?: unknown[] } & ((...args: unknown[]) => void)>
    target[a] =
      target[a] ||
      ((...args: unknown[]) => {
        const fn = target[a]
        ;(fn.q = fn.q || []).push(args)
      })
    const t = l.createElement(r) as HTMLScriptElement
    t.async = true
    t.src = 'https://www.clarity.ms/tag/' + i
    const y = l.getElementsByTagName(r)[0]
    y.parentNode?.insertBefore(t, y)
  })(window, document, 'clarity', 'script', projectId)
}

function loadPixel(pixelId: string | undefined): void {
  if (!pixelId || window.fbq) return
  ;(function (f, b, e, v) {
    if (f.fbq) return
    const n = Object.assign(
      (...args: unknown[]) => {
        if (n.callMethod) n.callMethod(...args)
        else (n.queue as unknown[]).push(args)
      },
      { loaded: true, version: '2.0', queue: [] as unknown[] },
    ) as unknown as Window['fbq'] & { callMethod?: (...args: unknown[]) => void; queue: unknown[] }
    f.fbq = n
    if (!f._fbq) f._fbq = n
    const t = b.createElement(e) as HTMLScriptElement
    t.async = true
    t.src = v
    const s = b.getElementsByTagName(e)[0]
    s.parentNode?.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

  // Lido de novo por fora do cast acima de propósito: o guard `if (!pixelId || window.fbq)
  // return` no topo da função faz o TS estreitar `window.fbq` pra `never` daqui pra baixo
  // (não enxerga que a IIFE atribuiu `f.fbq = n` no mesmo objeto `window`) — reler via
  // `unknown` evita carregar esse estreitamento indevido.
  const fbq = window.fbq as unknown as ((...args: unknown[]) => void) | undefined
  fbq?.('init', pixelId)
  fbq?.('track', 'PageView')
}

// Backstage invisível: só injeta os scripts de terceiros depois do consentimento LGPD
export function initTrackingScripts(consent: ConsentPreferences | null | undefined): void {
  if (consent?.analytics) {
    loadGA4(import.meta.env.VITE_GA4_ID)
    loadClarity(import.meta.env.VITE_CLARITY_ID)
  }
  if (consent?.marketing) {
    loadPixel(import.meta.env.VITE_PIXEL_ID)
  }
}
