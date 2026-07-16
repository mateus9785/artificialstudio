import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const trackRouter = Router()

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 64)
}

function isValidSessionId(sessionId) {
  return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 64
}

// Público: beacon de pageview/evento disparado pelo site
trackRouter.post('/track/event', async (req, res) => {
  const { sessionId, eventType, pagePath, referrer, utmSource, utmMedium, utmCampaign, meta } = req.body || {}

  if (!isValidSessionId(sessionId) || !eventType) {
    return res.status(400).json({ error: 'sessionId e eventType são obrigatórios.' })
  }

  await pool.query(
    `INSERT INTO analytics_events
      (session_id, event_type, page_path, referrer, utm_source, utm_medium, utm_campaign, meta, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      String(eventType).slice(0, 50),
      pagePath ? String(pagePath).slice(0, 255) : null,
      referrer ? String(referrer).slice(0, 255) : null,
      utmSource ? String(utmSource).slice(0, 100) : null,
      utmMedium ? String(utmMedium).slice(0, 100) : null,
      utmCampaign ? String(utmCampaign).slice(0, 100) : null,
      meta ? JSON.stringify(meta) : null,
      getClientIp(req),
      (req.headers['user-agent'] || '').slice(0, 255),
    ],
  )

  res.status(204).end()
})

// Público: registro de consentimento do banner LGPD
trackRouter.post('/track/consent', async (req, res) => {
  const { sessionId, analyticsConsent, marketingConsent } = req.body || {}

  if (!isValidSessionId(sessionId)) {
    return res.status(400).json({ error: 'sessionId é obrigatório.' })
  }

  await pool.query(
    `INSERT INTO consent_logs (session_id, analytics_consent, marketing_consent, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, Boolean(analyticsConsent), Boolean(marketingConsent), getClientIp(req), (req.headers['user-agent'] || '').slice(0, 255)],
  )

  res.status(204).end()
})

// Admin: resumo do analytics próprio para o painel
trackRouter.get('/admin/analytics/summary', requireAdmin, async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 90)

  const [[{ totalPageviews }]] = await pool.query(
    `SELECT COUNT(*) AS totalPageviews FROM analytics_events
     WHERE event_type = 'pageview' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  )

  const [[{ totalSessions }]] = await pool.query(
    `SELECT COUNT(DISTINCT session_id) AS totalSessions FROM analytics_events
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  )

  const [consentRows] = await pool.query(
    `SELECT analytics_consent, marketing_consent FROM consent_logs
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  )
  const consentTotal = consentRows.length
  const consentAccepted = consentRows.filter((r) => r.analytics_consent || r.marketing_consent).length
  const consentAcceptRate = consentTotal > 0 ? consentAccepted / consentTotal : null

  const [topPages] = await pool.query(
    `SELECT page_path AS pagePath, COUNT(*) AS views FROM analytics_events
     WHERE event_type = 'pageview' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND page_path IS NOT NULL
     GROUP BY page_path ORDER BY views DESC LIMIT 10`,
    [days],
  )

  const [eventsByDay] = await pool.query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM analytics_events
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(created_at) ORDER BY day ASC`,
    [days],
  )

  res.json({
    days,
    totalPageviews,
    totalSessions,
    consentAcceptRate,
    consentTotal,
    topPages,
    eventsByDay,
  })
})

trackRouter.get('/admin/analytics/events', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const [rows] = await pool.query(
    `SELECT id, session_id AS sessionId, event_type AS eventType, page_path AS pagePath,
            utm_source AS utmSource, utm_medium AS utmMedium, utm_campaign AS utmCampaign, created_at AS createdAt
     FROM analytics_events ORDER BY id DESC LIMIT ?`,
    [limit],
  )
  res.json(rows)
})
