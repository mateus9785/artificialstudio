import { Router } from 'express'
import { pool } from '../db/pool.ts'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const kanbanRouter = Router()

const LABEL_NAME_REGEX = /^[A-Za-z0-9._-]+$/
const LABEL_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/
const DEFAULT_LABEL_COLOR = '#22d3ee'
const STATUSES = ['todo', 'doing', 'done', 'error']

// Quantos cards podem estar "doing" ao mesmo tempo — o worker local roda uma
// sessão tmux por card, então isso também limita quantas sessões `claude`
// concorrentes a máquina do worker sustenta.
const MAX_CONCURRENT_CARDS = Number(process.env.KANBAN_MAX_CONCURRENT_CARDS) || 3

// Express 4 não encaminha rejeições de handlers async para o middleware de erro
// sozinho — sem isso, qualquer erro (ex: deadlock do MySQL) derruba o processo inteiro.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

function serializeLabel(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

function serializeCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    label: { id: row.label_id, name: row.label_name, color: row.label_color },
    status: row.status,
    planStatus: row.plan_status,
    planError: row.plan_error,
    runImmediately: Boolean(row.run_immediately),
    tmuxSession: row.tmux_session,
    error: row.error,
    gitWatch: Boolean(row.git_watch),
    baseCommit: row.base_commit,
    autoCompleted: Boolean(row.auto_completed),
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

const CARD_SELECT = `
  SELECT c.*, l.name AS label_name, l.color AS label_color
  FROM kanban_cards c
  JOIN kanban_labels l ON l.id = c.label_id
`

// ---- Etiquetas ----

kanbanRouter.get('/admin/kanban/labels', requireAdmin, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM kanban_labels ORDER BY name ASC')
  res.json(rows.map(serializeLabel))
}))

kanbanRouter.post('/admin/kanban/labels', requireAdmin, asyncHandler(async (req, res) => {
  const { name, color } = req.body || {}

  if (!name || !LABEL_NAME_REGEX.test(name)) {
    return res.status(400).json({
      error: 'Nome de etiqueta inválido. Use apenas letras, números, ponto, hífen e underline.',
    })
  }

  if (color && !LABEL_COLOR_REGEX.test(color)) {
    return res.status(400).json({ error: 'Cor inválida. Use um hexadecimal no formato #RRGGBB.' })
  }

  const [existing] = await pool.query('SELECT id FROM kanban_labels WHERE name = ?', [name])
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Já existe uma etiqueta com esse nome.' })
  }

  const [result] = await pool.query('INSERT INTO kanban_labels (name, color) VALUES (?, ?)', [name, color || DEFAULT_LABEL_COLOR])
  const [rows] = await pool.query('SELECT * FROM kanban_labels WHERE id = ?', [result.insertId])
  res.status(201).json(serializeLabel(rows[0]))
}))

kanbanRouter.patch('/admin/kanban/labels/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { color } = req.body || {}

  if (!color || !LABEL_COLOR_REGEX.test(color)) {
    return res.status(400).json({ error: 'Cor inválida. Use um hexadecimal no formato #RRGGBB.' })
  }

  const [result] = await pool.query('UPDATE kanban_labels SET color = ? WHERE id = ?', [color, req.params.id])
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Etiqueta não encontrada.' })
  }

  const [rows] = await pool.query('SELECT * FROM kanban_labels WHERE id = ?', [req.params.id])
  res.json(serializeLabel(rows[0]))
}))

kanbanRouter.delete('/admin/kanban/labels/:id', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM kanban_labels WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Etiqueta não encontrada.' })
    }
    res.status(204).end()
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      const [[{ count }]] = await pool.query(
        'SELECT COUNT(*) AS count FROM kanban_cards WHERE label_id = ?',
        [req.params.id],
      )
      return res.status(409).json({ error: `Etiqueta em uso por ${count} card(s).` })
    }
    throw err
  }
}))

// ---- Cards (uso da tela de admin) ----

kanbanRouter.get('/admin/kanban/cards', requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.query
  const params = []
  let query = CARD_SELECT
  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' })
    }
    query += ' WHERE c.status = ?'
    params.push(status)
  }
  query += ' ORDER BY c.created_at ASC'

  const [rows] = await pool.query(query, params)
  res.json(rows.map(serializeCard))
}))

kanbanRouter.post('/admin/kanban/cards', requireAdmin, asyncHandler(async (req, res) => {
  const { title, description, labelId, runImmediately } = req.body || {}

  if (!title || !labelId) {
    return res.status(400).json({ error: 'Preencha título e etiqueta.' })
  }
  if (runImmediately && !description) {
    return res.status(400).json({ error: 'Descrição é obrigatória para executar imediatamente.' })
  }

  const [labelRows] = await pool.query('SELECT id FROM kanban_labels WHERE id = ?', [labelId])
  if (labelRows.length === 0) {
    return res.status(400).json({ error: 'Etiqueta não encontrada.' })
  }

  const [result] = await pool.query(
    'INSERT INTO kanban_cards (title, description, label_id, run_immediately) VALUES (?, ?, ?, ?)',
    [title, description || '', labelId, Boolean(runImmediately)],
  )

  const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [result.insertId])
  res.status(201).json(serializeCard(rows[0]))
}))

async function loadEditableCard(req, res) {
  const [rows] = await pool.query('SELECT * FROM kanban_cards WHERE id = ?', [req.params.id])
  const card = rows[0]
  if (!card) {
    res.status(404).json({ error: 'Card não encontrado.' })
    return null
  }
  if (card.status !== 'todo') {
    res.status(409).json({ error: 'Só é possível editar cards em "Para Fazer".' })
    return null
  }
  return card
}

const DELETABLE_STATUSES = ['todo', 'done', 'error']

async function loadDeletableCard(req, res) {
  const [rows] = await pool.query('SELECT * FROM kanban_cards WHERE id = ?', [req.params.id])
  const card = rows[0]
  if (!card) {
    res.status(404).json({ error: 'Card não encontrado.' })
    return null
  }
  if (!DELETABLE_STATUSES.includes(card.status)) {
    res.status(409).json({ error: 'Não é possível excluir um card em "Fazendo".' })
    return null
  }
  return card
}

kanbanRouter.patch('/admin/kanban/cards/:id', requireAdmin, asyncHandler(async (req, res) => {
  const card = await loadEditableCard(req, res)
  if (!card) return

  const { title, description, labelId, runImmediately } = req.body || {}

  if (labelId) {
    const [labelRows] = await pool.query('SELECT id FROM kanban_labels WHERE id = ?', [labelId])
    if (labelRows.length === 0) {
      return res.status(400).json({ error: 'Etiqueta não encontrada.' })
    }
  }

  const effectiveDescription = description === undefined ? card.description : description
  const effectiveRunImmediately = runImmediately === undefined ? Boolean(card.run_immediately) : Boolean(runImmediately)
  if (effectiveRunImmediately && !effectiveDescription) {
    return res.status(400).json({ error: 'Descrição é obrigatória para executar imediatamente.' })
  }

  await pool.query(
    `UPDATE kanban_cards SET
       title = COALESCE(?, title),
       description = ?,
       label_id = COALESCE(?, label_id),
       run_immediately = ?
     WHERE id = ?`,
    [title || null, effectiveDescription, labelId || null, effectiveRunImmediately, card.id],
  )

  const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [card.id])
  res.json(serializeCard(rows[0]))
}))

kanbanRouter.delete('/admin/kanban/cards/:id', requireAdmin, asyncHandler(async (req, res) => {
  const card = await loadDeletableCard(req, res)
  if (!card) return

  await pool.query('DELETE FROM kanban_cards WHERE id = ?', [card.id])
  res.status(204).end()
}))

kanbanRouter.post('/admin/kanban/cards/:id/arm', requireAdmin, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    "UPDATE kanban_cards SET run_immediately = 1 WHERE id = ? AND status = 'todo' AND description <> ''",
    [req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado, não está em "Para Fazer" ou não tem descrição.' })
  }
  const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [req.params.id])
  res.json(serializeCard(rows[0]))
}))

kanbanRouter.post('/admin/kanban/cards/:id/request-plan', requireAdmin, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    `UPDATE kanban_cards SET plan_status = 'requested', plan_error = NULL
     WHERE id = ? AND status = 'todo' AND plan_status IN ('none', 'error')`,
    [req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado, não está em "Para Fazer" ou já está sendo planejado.' })
  }
  const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [req.params.id])
  res.json(serializeCard(rows[0]))
}))

kanbanRouter.post('/admin/kanban/cards/:id/retry', requireAdmin, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    `UPDATE kanban_cards SET
       status = 'todo', tmux_session = NULL, error = NULL, started_at = NULL,
       git_watch = 0, base_commit = NULL, auto_completed = 0
     WHERE id = ? AND status = 'error'`,
    [req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado ou não está em "Erro".' })
  }
  const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [req.params.id])
  res.json(serializeCard(rows[0]))
}))

kanbanRouter.post('/admin/kanban/cards/:id/complete', requireAdmin, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    "UPDATE kanban_cards SET status = 'done', completed_at = NOW() WHERE id = ? AND status = 'doing'",
    [req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado ou não está em "Fazendo".' })
  }
  const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [req.params.id])
  res.json(serializeCard(rows[0]))
}))

// ---- Uso exclusivo do worker local (claude-kanban) ----

kanbanRouter.post('/admin/kanban/claim-next', requireAdmin, asyncHandler(async (req, res) => {
  const conn = await pool.getConnection()
  try {
    // READ COMMITTED evita os gap locks que o REPEATABLE READ (padrão) tomaria nas
    // duas leituras FOR UPDATE abaixo — sem isso, chamadas concorrentes a esta rota
    // podem se deadlockar mutuamente mesmo sem conflito real de dados.
    await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
    await conn.beginTransaction()

    const [doingRows] = await conn.query("SELECT id FROM kanban_cards WHERE status = 'doing' FOR UPDATE")
    if (doingRows.length >= MAX_CONCURRENT_CARDS) {
      await conn.rollback()
      return res.json({ card: null })
    }

    const [candidates] = await conn.query(
      `SELECT id FROM kanban_cards WHERE status = 'todo' AND run_immediately = 1
       AND plan_status IN ('none', 'error')
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
    )
    if (candidates.length === 0) {
      await conn.rollback()
      return res.json({ card: null })
    }

    const id = candidates[0].id
    const tmuxSession = `card-${id}`
    await conn.query(
      `UPDATE kanban_cards SET status = 'doing', started_at = NOW(), tmux_session = ?, error = NULL, auto_completed = 0
       WHERE id = ? AND status = 'todo'`,
      [tmuxSession, id],
    )
    await conn.commit()

    const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [id])
    res.json({ card: serializeCard(rows[0]) })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}))

// Reivindicação atômica análoga à de claim-next, mas para o botão "Planejar"
// (request-plan acima) — pega o card mais antigo com plan_status = 'requested'
// e marca como 'planning' para o worker rodar `claude -p` nele.
kanbanRouter.post('/admin/kanban/claim-next-to-plan', requireAdmin, asyncHandler(async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
    await conn.beginTransaction()

    const [candidates] = await conn.query(
      `SELECT id FROM kanban_cards WHERE status = 'todo' AND plan_status = 'requested'
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
    )
    if (candidates.length === 0) {
      await conn.rollback()
      return res.json({ card: null })
    }

    const id = candidates[0].id
    await conn.query("UPDATE kanban_cards SET plan_status = 'planning' WHERE id = ? AND status = 'todo'", [id])
    await conn.commit()

    const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [id])
    res.json({ card: serializeCard(rows[0]) })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}))

kanbanRouter.post('/admin/kanban/cards/:id/plan-result', requireAdmin, asyncHandler(async (req, res) => {
  const { description, error } = req.body || {}

  if (error) {
    const [result] = await pool.query(
      "UPDATE kanban_cards SET plan_status = 'error', plan_error = ? WHERE id = ? AND plan_status = 'planning'",
      [String(error).slice(0, 4000), req.params.id],
    )
    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'Card não encontrado ou não está planejando.' })
    }
    return res.status(204).end()
  }

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Descrição do plano vazia.' })
  }

  // status = 'todo' de novo aqui: se o card já tiver sido armado e reivindicado
  // por claim-next enquanto o plano rodava (não deveria — claim-next ignora
  // cards com plan_status pendente — mas por segurança), não sobrescreve a
  // descrição de um card que já começou a rodar.
  const [result] = await pool.query(
    `UPDATE kanban_cards SET description = ?, plan_status = 'none', plan_error = NULL
     WHERE id = ? AND plan_status = 'planning' AND status = 'todo'`,
    [description.trim(), req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado, não está planejando ou não está mais em "Para Fazer".' })
  }
  res.status(204).end()
}))

kanbanRouter.patch('/admin/kanban/cards/:id/git-watch', requireAdmin, asyncHandler(async (req, res) => {
  const { gitWatch, baseCommit } = req.body || {}
  const [result] = await pool.query(
    "UPDATE kanban_cards SET git_watch = ?, base_commit = ? WHERE id = ? AND status = 'doing'",
    [Boolean(gitWatch), baseCommit || null, req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado ou não está em "Fazendo".' })
  }
  res.status(204).end()
}))

kanbanRouter.post('/admin/kanban/cards/:id/mark-done', requireAdmin, asyncHandler(async (req, res) => {
  const { autoCompleted } = req.body || {}
  const [result] = await pool.query(
    "UPDATE kanban_cards SET status = 'done', completed_at = NOW(), auto_completed = ? WHERE id = ? AND status = 'doing'",
    [Boolean(autoCompleted), req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado ou não está em "Fazendo".' })
  }
  res.status(204).end()
}))

kanbanRouter.post('/admin/kanban/cards/:id/mark-error', requireAdmin, asyncHandler(async (req, res) => {
  const { error } = req.body || {}
  const [result] = await pool.query(
    "UPDATE kanban_cards SET status = 'error', error = ? WHERE id = ? AND status = 'doing'",
    [error || null, req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado ou não está em "Fazendo".' })
  }
  res.status(204).end()
}))

// ---- Uso do Claude Code (sessão de 5h / semana), reportado pelo worker local ----

function serializeUsage(row) {
  if (!row) return null
  return {
    sessionUsedPercent: row.session_used_percent === null ? null : Number(row.session_used_percent),
    sessionResetsAt: row.session_resets_at,
    weekUsedPercent: row.week_used_percent === null ? null : Number(row.week_used_percent),
    weekResetsAt: row.week_resets_at,
    updatedAt: row.updated_at,
  }
}

function isValidPercent(value) {
  return value === null || value === undefined || (typeof value === 'number' && value >= 0 && value <= 100)
}

// Converte string ISO 8601 (ex: '2026-07-20T18:20:00.000Z') em Date, já que o
// driver mysql2 rejeita o formato com 'T'/'Z' passado direto como string
// (ER_TRUNCATED_WRONG_VALUE em modo estrito). Retorna undefined se inválida.
function toDateOrNull(value) {
  if (value === null || value === undefined) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

kanbanRouter.get('/admin/kanban/claude-usage', requireAdmin, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM claude_usage WHERE id = 1')
  res.json(serializeUsage(rows[0]))
}))

kanbanRouter.post('/admin/kanban/claude-usage', requireAdmin, asyncHandler(async (req, res) => {
  const { sessionUsedPercent, sessionResetsAt, weekUsedPercent, weekResetsAt } = req.body || {}

  if (!isValidPercent(sessionUsedPercent) || !isValidPercent(weekUsedPercent)) {
    return res.status(400).json({ error: 'Percentual de uso inválido.' })
  }

  const sessionResetsAtDate = toDateOrNull(sessionResetsAt)
  const weekResetsAtDate = toDateOrNull(weekResetsAt)
  if (sessionResetsAtDate === undefined || weekResetsAtDate === undefined) {
    return res.status(400).json({ error: 'Data de reset inválida.' })
  }

  await pool.query(
    `INSERT INTO claude_usage (id, session_used_percent, session_resets_at, week_used_percent, week_resets_at)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       session_used_percent = VALUES(session_used_percent),
       session_resets_at = VALUES(session_resets_at),
       week_used_percent = VALUES(week_used_percent),
       week_resets_at = VALUES(week_resets_at)`,
    [sessionUsedPercent ?? null, sessionResetsAtDate, weekUsedPercent ?? null, weekResetsAtDate],
  )
  res.status(204).end()
}))
