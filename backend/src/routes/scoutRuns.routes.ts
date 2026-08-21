import { Router } from 'express'
import { pool } from '../db/pool.ts'
import { requireAdmin } from '../middleware/requireAdmin.ts'
import { getOrCreateConversationByPhone } from '../services/whatsappClient.ts'
import { enqueueSuggestion } from '../services/waSuggestionWorker.ts'
import { asyncHandler } from '../middleware/asyncHandler.ts'

export const scoutRunsRouter = Router()

const STATE_REGEX = /^[A-Za-z]{2}$/

// Espelha os limites de pegasus-scout/src/config/searchParams.ts — o worker local
// vai rejeitar um pedido fora desses limites de qualquer forma, então validar aqui
// também evita criar uma linha 'todo' que o worker nunca vai conseguir processar.
const RADIUS_KM_BOUNDS = [0.2, 100]
const MAX_RESULTS_BOUNDS = [1, 5000]

interface RunRow {
  id: number
  niche: string
  city: string
  state: string | null
  radius_km: string
  max_results: number
  with_llm: number | boolean
  status: 'todo' | 'doing' | 'done' | 'error'
  result_json: unknown
  error: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

function serializeRun(row: RunRow | undefined) {
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

interface LeadRow {
  id: number
  name: string
  category: string | null
  city: string | null
  state: string | null
  website: string | null
  address: string | null
  email: string | null
  phone_e164: string | null
  whatsapp_phone_e164: string | null
  instagram_url: string | null
  instagram_followers: number | null
  facebook_url: string | null
  facebook_response_time: string | null
  chat_widget: string | null
  ecommerce_platform: string | null
  enrichment_status: string | null
  rating: string | null
  reviews_count: number | null
  fit_score: number | null
  automation_verdict: string | null
  pipeline_status: string | null
  maps_url: string | null
  segmento: string | null
  porte: string | null
  resumo: string | null
  gancho_abordagem: string | null
  catalogo: unknown
  vende_online: number | boolean | null
  atende_por_whatsapp: number | boolean | null
  vende_json: unknown
  sinais_automacao_json: unknown
  dores_json: unknown
  integracoes_json: unknown
  confianca: string | null
  site_fora_do_ar_motivo: string | null
}

// 'done' sem sinal `site_fora_do_ar` e o unico caso em que o site foi aberto
// com sucesso — ver pegasus-scout/src/enrichment/enrichmentService.ts, que
// grava esse sinal exatamente quando o dominio anunciado no Maps nao resolve
// mais (nao e falha do robo, e informacao de prospeccao).
function computeSiteStatus(row: LeadRow): string {
  if (!row.website) return 'sem_site'
  if (row.site_fora_do_ar_motivo) return 'fora_do_ar'
  if (row.enrichment_status === 'pending' || row.enrichment_status === 'running') return 'nao_verificado'
  if (row.enrichment_status === 'failed') return 'falha_temporaria'
  if (row.enrichment_status === 'skipped') return 'nao_verificado'
  return 'ok'
}

function serializeLead(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    state: row.state,
    website: row.website,
    address: row.address,
    email: row.email,
    phoneE164: row.phone_e164,
    whatsappPhoneE164: row.whatsapp_phone_e164,
    instagramUrl: row.instagram_url,
    instagramFollowers: row.instagram_followers,
    facebookUrl: row.facebook_url,
    facebookResponseTime: row.facebook_response_time,
    chatWidget: row.chat_widget,
    ecommercePlatform: row.ecommerce_platform,
    rating: row.rating !== null ? Number(row.rating) : null,
    reviewsCount: row.reviews_count,
    fitScore: row.fit_score,
    automationVerdict: row.automation_verdict,
    pipelineStatus: row.pipeline_status,
    mapsUrl: row.maps_url,
    siteStatus: computeSiteStatus(row),
    siteOfflineReason: row.site_fora_do_ar_motivo,
    segmento: row.segmento,
    porte: row.porte,
    catalogo: row.catalogo,
    vendeOnline: row.vende_online === null ? null : Boolean(row.vende_online),
    atendePorWhatsapp: row.atende_por_whatsapp === null ? null : Boolean(row.atende_por_whatsapp),
    vende: row.vende_json,
    sinaisAutomacao: row.sinais_automacao_json,
    dores: row.dores_json,
    integracoes: row.integracoes_json,
    confianca: row.confianca !== null ? Number(row.confianca) : null,
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

    const [rows] = await pool.query('SELECT * FROM scout_runs WHERE id = ?', [(result as { insertId: number }).insertId])
    res.status(201).json(serializeRun((rows as RunRow[])[0]))
  }),
)

scoutRunsRouter.get(
  '/admin/scout/runs',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const [rows] = await pool.query('SELECT * FROM scout_runs ORDER BY created_at DESC LIMIT ?', [limit])
    res.json((rows as RunRow[]).map(serializeRun))
  }),
)

scoutRunsRouter.post(
  '/admin/scout/runs/:id/retry',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [result] = await pool.query("UPDATE scout_runs SET status = 'todo', error = NULL WHERE id = ? AND status = 'error'", [
      req.params.id,
    ])
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return res.status(409).json({ error: 'Execução não encontrada ou não está com erro.' })
    }
    const [rows] = await pool.query('SELECT * FROM scout_runs WHERE id = ?', [req.params.id])
    res.json(serializeRun((rows as RunRow[])[0]))
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
      if ((doingRows as unknown[]).length >= 1) {
        await conn.rollback()
        return res.json({ run: null })
      }

      const [candidates] = await conn.query("SELECT id FROM scout_runs WHERE status = 'todo' ORDER BY created_at ASC LIMIT 1 FOR UPDATE")
      const candidateRows = candidates as Array<{ id: number }>
      if (candidateRows.length === 0) {
        await conn.rollback()
        return res.json({ run: null })
      }

      const id = candidateRows[0].id
      await conn.query("UPDATE scout_runs SET status = 'doing', started_at = NOW(), error = NULL WHERE id = ? AND status = 'todo'", [id])
      await conn.commit()

      const [rows] = await pool.query('SELECT * FROM scout_runs WHERE id = ?', [id])
      res.json({ run: serializeRun((rows as RunRow[])[0]) })
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
    if ((updateResult as { affectedRows: number }).affectedRows === 0) {
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
    if ((updateResult as { affectedRows: number }).affectedRows === 0) {
      return res.status(409).json({ error: 'Execução não encontrada ou não está rodando.' })
    }
    res.status(204).end()
  }),
)

// ---- Leads encontrados (lidos direto das tabelas scout_* — mesmo schema/DB do pegasus-scout) ----

const LEADS_SELECT_SQL = `
  SELECT p.id, p.name, p.category, p.city, p.state, p.website, p.address, p.email,
         p.phone_e164, p.whatsapp_phone_e164, p.instagram_url, p.instagram_followers,
         p.facebook_url, p.facebook_response_time, p.chat_widget, p.ecommerce_platform,
         p.enrichment_status, p.rating, p.reviews_count, p.fit_score, p.automation_verdict,
         p.pipeline_status, p.maps_url,
         b.segmento, b.porte, b.resumo, b.gancho_abordagem, b.catalogo, b.vende_online,
         b.atende_por_whatsapp, b.vende_json, b.sinais_automacao_json, b.dores_json,
         b.integracoes_json, b.confianca,
         sig.signal_value AS site_fora_do_ar_motivo
    FROM scout_prospects p
    LEFT JOIN scout_prospect_briefs b ON b.prospect_id = p.id
    LEFT JOIN scout_blocklist bl
      ON bl.phone_e164 = COALESCE(p.whatsapp_phone_e164, p.phone_e164)
     OR bl.domain = p.domain
    LEFT JOIN scout_prospect_signals sig
      ON sig.prospect_id = p.id AND sig.stage = 'enrichment' AND sig.signal_key = 'site_fora_do_ar'
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
    res.json((rows as LeadRow[]).map(serializeLead))
  }),
)

scoutRunsRouter.post(
  '/admin/scout/leads/:id/start-conversation',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT id, name, domain, whatsapp_phone_e164, phone_e164 FROM scout_prospects WHERE id = ?', [
      req.params.id,
    ])
    interface ProspectRow {
      id: number
      name: string
      domain: string | null
      whatsapp_phone_e164: string | null
      phone_e164: string | null
    }
    const prospect = (rows as ProspectRow[])[0]
    if (!prospect) return res.status(404).json({ error: 'Lead não encontrado.' })

    const phone = prospect.whatsapp_phone_e164 || prospect.phone_e164
    if (!phone) {
      return res.status(422).json({ error: 'Este lead não tem telefone cadastrado.' })
    }

    // Opt-out é obrigação legal: número/domínio na blocklist não recebe abordagem, nem manual.
    const [blocked] = await pool.query('SELECT id FROM scout_blocklist WHERE phone_e164 = ? OR (domain IS NOT NULL AND domain = ?) LIMIT 1', [
      phone,
      prospect.domain,
    ])
    if ((blocked as unknown[]).length > 0) {
      return res.status(422).json({ error: 'Este lead pediu para não ser contatado (blocklist).' })
    }

    const [briefRows] = await pool.query('SELECT gancho_abordagem FROM scout_prospect_briefs WHERE prospect_id = ? ORDER BY updated_at DESC LIMIT 1', [
      req.params.id,
    ])
    const gancho = (briefRows as Array<{ gancho_abordagem: string | null }>)[0]?.gancho_abordagem

    const conversation = await getOrCreateConversationByPhone(phone, { displayName: prospect.name })

    // O gancho do brief fica como rascunho imediato; a IA gera a abordagem fria
    // personalizada em segundo plano (30s–2min) e a sugestão substitui o gancho
    // na tela quando ficar pronta. Nada é enviado sem o clique do admin.
    await enqueueSuggestion(conversation.id, 'cold_outreach', { prospectId: prospect.id })

    const draftText = gancho ? gancho : `Olá! Vi o ${prospect.name} e gostaria de conversar sobre como facilitar o atendimento por aqui.`

    res.json({ conversationId: conversation.id, draftText, suggestionQueued: true })
  }),
)
