import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { getOrCreateConversationByPhone } from '../services/whatsappClient.js'

export const scoutRunsRouter = Router()

const STATE_REGEX = /^[A-Za-z]{2}$/

// Espelha os limites de pegasus-scout/src/config/searchParams.ts — o worker local
// vai rejeitar um pedido fora desses limites de qualquer forma, então validar aqui
// também evita criar uma linha 'todo' que o worker nunca vai conseguir processar.
const RADIUS_KM_BOUNDS = [0.2, 100]
const MAX_RESULTS_BOUNDS = [1, 5000]

// Express 4 não encaminha rejeição de handler async para o middleware de erro
// sozinho.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

function serializeRun(row) {
  if (!row) return null
  return {
    id: row.id,
    niche: row.niche,
    city: row.city,
    state: row.state,
    radiusKm: Number(row.radius_km),
    maxResults: row.max_results,
    withLlm: Boolean(row.with_llm),
    status: row.status,
    result: row.result_json ?? null,
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  }
}

function serializeLead(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    state: row.state,
    website: row.website,
    phoneE164: row.phone_e164,
    whatsappPhoneE164: row.whatsapp_phone_e164,
    instagramUrl: row.instagram_url,
    chatWidget: row.chat_widget,
    ecommercePlatform: row.ecommerce_platform,
    rating: row.rating !== null ? Number(row.rating) : null,
    reviewsCount: row.reviews_count,
    fitScore: row.fit_score,
    automationVerdict: row.automation_verdict,
    pipelineStatus: row.pipeline_status,
    mapsUrl: row.maps_url,
    segmento: row.segmento,
    porte: row.porte,
    resumo: row.resumo,
    ganchoAbordagem: row.gancho_abordagem,
  }
}

// ---- Pedidos de execução (fila consultada pelo worker local do pegasus-scout) ----

scoutRunsRouter.post(
  '/admin/scout/runs',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { niche, city, state, radiusKm, maxResults, withLlm } = req.body || {}

    if (!niche || !String(niche).trim()) {
      return res.status(400).json({ error: 'Informe o nicho.' })
    }
    if (!city || !String(city).trim()) {
      return res.status(400).json({ error: 'Informe a cidade.' })
    }
    if (state !== undefined && state !== null && state !== '' && !STATE_REGEX.test(state)) {
      return res.status(400).json({ error: 'UF precisa ter 2 letras (ex.: DF).' })
    }

    const radius = radiusKm === undefined || radiusKm === null || radiusKm === '' ? 5 : Number(radiusKm)
    if (!Number.isFinite(radius) || radius < RADIUS_KM_BOUNDS[0] || radius > RADIUS_KM_BOUNDS[1]) {
      return res.status(400).json({ error: `Raio precisa estar entre ${RADIUS_KM_BOUNDS[0]} e ${RADIUS_KM_BOUNDS[1]} km.` })
    }

    const max = maxResults === undefined || maxResults === null || maxResults === '' ? 60 : Number(maxResults)
    if (!Number.isInteger(max) || max < MAX_RESULTS_BOUNDS[0] || max > MAX_RESULTS_BOUNDS[1]) {
      return res.status(400).json({ error: `Máximo precisa ser um inteiro entre ${MAX_RESULTS_BOUNDS[0]} e ${MAX_RESULTS_BOUNDS[1]}.` })
    }

    const [result] = await pool.query(
      `INSERT INTO scout_runs (niche, city, state, radius_km, max_results, with_llm, requested_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(niche).trim(),
        String(city).trim(),
        state ? String(state).toUpperCase() : null,
        radius,
        max,
        withLlm === undefined ? true : Boolean(withLlm),
        req.admin?.sub ?? null,
      ],
    )

    const [rows] = await pool.query('SELECT * FROM scout_runs WHERE id = ?', [result.insertId])
    res.status(201).json(serializeRun(rows[0]))
  }),
)

scoutRunsRouter.get(
  '/admin/scout/runs',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const [rows] = await pool.query('SELECT * FROM scout_runs ORDER BY created_at DESC LIMIT ?', [limit])
    res.json(rows.map(serializeRun))
  }),
)

scoutRunsRouter.post(
  '/admin/scout/runs/:id/retry',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [result] = await pool.query(
      "UPDATE scout_runs SET status = 'todo', error = NULL WHERE id = ? AND status = 'error'",
      [req.params.id],
    )
    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'Execução não encontrada ou não está com erro.' })
    }
    const [rows] = await pool.query('SELECT * FROM scout_runs WHERE id = ?', [req.params.id])
    res.json(serializeRun(rows[0]))
  }),
)

// ---- Uso exclusivo do worker local (pegasus-scout) ----

scoutRunsRouter.post(
  '/admin/scout/runs/claim-next',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const conn = await pool.getConnection()
    try {
      // READ COMMITTED evita os gap locks que o REPEATABLE READ (padrão) tomaria nas
      // duas leituras FOR UPDATE abaixo — mesmo raciocínio de /admin/kanban/claim-next.
      await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
      await conn.beginTransaction()

      const [doingRows] = await conn.query("SELECT id FROM scout_runs WHERE status = 'doing' FOR UPDATE")
      if (doingRows.length >= 1) {
        await conn.rollback()
        return res.json({ run: null })
      }

      const [candidates] = await conn.query(
        "SELECT id FROM scout_runs WHERE status = 'todo' ORDER BY created_at ASC LIMIT 1 FOR UPDATE",
      )
      if (candidates.length === 0) {
        await conn.rollback()
        return res.json({ run: null })
      }

      const id = candidates[0].id
      await conn.query(
        "UPDATE scout_runs SET status = 'doing', started_at = NOW(), error = NULL WHERE id = ? AND status = 'todo'",
        [id],
      )
      await conn.commit()

      const [rows] = await pool.query('SELECT * FROM scout_runs WHERE id = ?', [id])
      res.json({ run: serializeRun(rows[0]) })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }),
)

scoutRunsRouter.post(
  '/admin/scout/runs/:id/mark-done',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { result } = req.body || {}
    const [updateResult] = await pool.query(
      "UPDATE scout_runs SET status = 'done', finished_at = NOW(), result_json = ? WHERE id = ? AND status = 'doing'",
      [result ? JSON.stringify(result) : null, req.params.id],
    )
    if (updateResult.affectedRows === 0) {
      return res.status(409).json({ error: 'Execução não encontrada ou não está rodando.' })
    }
    res.status(204).end()
  }),
)

scoutRunsRouter.post(
  '/admin/scout/runs/:id/mark-error',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { error } = req.body || {}
    const [updateResult] = await pool.query(
      "UPDATE scout_runs SET status = 'error', finished_at = NOW(), error = ? WHERE id = ? AND status = 'doing'",
      [error ? String(error).slice(0, 4000) : null, req.params.id],
    )
    if (updateResult.affectedRows === 0) {
      return res.status(409).json({ error: 'Execução não encontrada ou não está rodando.' })
    }
    res.status(204).end()
  }),
)

// ---- Leads encontrados (lidos direto das tabelas scout_* — mesmo schema/DB do pegasus-scout) ----

const LEADS_SELECT_SQL = `
  SELECT p.id, p.name, p.category, p.city, p.state, p.website, p.phone_e164,
         p.whatsapp_phone_e164, p.instagram_url, p.chat_widget, p.ecommerce_platform,
         p.rating, p.reviews_count, p.fit_score, p.automation_verdict, p.pipeline_status,
         p.maps_url, b.segmento, b.porte, b.resumo, b.gancho_abordagem
    FROM scout_prospects p
    LEFT JOIN scout_prospect_briefs b ON b.prospect_id = p.id
    LEFT JOIN scout_blocklist bl
      ON bl.phone_e164 = COALESCE(p.whatsapp_phone_e164, p.phone_e164)
     OR bl.domain = p.domain
   WHERE p.fit_score IS NOT NULL
     AND p.pipeline_status <> 'descartado'
     AND bl.id IS NULL
   ORDER BY p.fit_score DESC, p.reviews_count DESC
   LIMIT ?
`

scoutRunsRouter.get(
  '/admin/scout/leads',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 30))
    const [rows] = await pool.query(LEADS_SELECT_SQL, [limit])
    res.json(rows.map(serializeLead))
  }),
)

scoutRunsRouter.post(
  '/admin/scout/leads/:id/start-conversation',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT id, name, whatsapp_phone_e164, phone_e164 FROM scout_prospects WHERE id = ?',
      [req.params.id],
    )
    const prospect = rows[0]
    if (!prospect) return res.status(404).json({ error: 'Lead não encontrado.' })

    const phone = prospect.whatsapp_phone_e164 || prospect.phone_e164
    if (!phone) {
      return res.status(422).json({ error: 'Este lead não tem telefone cadastrado.' })
    }

    const [briefRows] = await pool.query(
      'SELECT gancho_abordagem FROM scout_prospect_briefs WHERE prospect_id = ? ORDER BY updated_at DESC LIMIT 1',
      [req.params.id],
    )
    const gancho = briefRows[0]?.gancho_abordagem

    const conversation = await getOrCreateConversationByPhone(phone, { displayName: prospect.name })

    const draftText = gancho
      ? gancho
      : `Olá! Vi o ${prospect.name} e gostaria de conversar sobre como facilitar o atendimento por aqui.`

    res.json({ conversationId: conversation.id, draftText })
  }),
)
