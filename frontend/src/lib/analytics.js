const CONSENT_KEY = 'ac_consent'

export function getStoredConsent() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY))
  } catch {
    return null
  }
}

export function storeConsent(consent) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
}

function loadGA4(measurementId) {
  if (!measurementId || document.getElementById('ga4-script')) return

  const script = document.createElement('script')
  script.id = 'ga4-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', measurementId, { anonymize_ip: true })
}

function loadClarity(projectId) {
  if (!projectId || window.clarity) return
  ;(function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        ;(c[a].q = c[a].q || []).push(arguments)
      }
    t = l.createElement(r)
    t.async = 1
    t.src = 'https://www.clarity.ms/tag/' + i
    y = l.getElementsByTagName(r)[0]
    y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', projectId)
}

function loadPixel(pixelId) {
  if (!pixelId || window.fbq) return
  ;(function (f, b, e, v) {
    if (f.fbq) return
    let n = (f.fbq = function () {
      if (n.callMethod) n.callMethod.apply(n, arguments)
      else n.queue.push(arguments)
    })
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = b.createElement(e)
    t.async = true
    t.src = v
    const s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
}

// Backstage invisível: só injeta os scripts de terceiros depois do consentimento LGPD
export function initTrackingScripts(consent) {
  if (consent?.analytics) {
    loadGA4(import.meta.env.VITE_GA4_ID)
    loadClarity(import.meta.env.VITE_CLARITY_ID)
  }
  if (consent?.marketing) {
    loadPixel(import.meta.env.VITE_PIXEL_ID)
  }
}
