import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const kanbanRouter = Router()

const LABEL_NAME_REGEX = /^[A-Za-z0-9._-]+$/
const LABEL_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/
const DEFAULT_LABEL_COLOR = '#22d3ee'
const STATUSES = ['todo', 'doing', 'done', 'error']

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

  if (!title || !description || !labelId) {
    return res.status(400).json({ error: 'Preencha título, descrição e etiqueta.' })
  }

  const [labelRows] = await pool.query('SELECT id FROM kanban_labels WHERE id = ?', [labelId])
  if (labelRows.length === 0) {
    return res.status(400).json({ error: 'Etiqueta não encontrada.' })
  }

  const [result] = await pool.query(
    'INSERT INTO kanban_cards (title, description, label_id, run_immediately) VALUES (?, ?, ?, ?)',
    [title, description, labelId, Boolean(runImmediately)],
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
    res.status(409).json({ error: 'Só é possível editar ou excluir cards em "Para Fazer".' })
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

  await pool.query(
    `UPDATE kanban_cards SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       label_id = COALESCE(?, label_id),
       run_immediately = COALESCE(?, run_immediately)
     WHERE id = ?`,
    [title || null, description || null, labelId || null, runImmediately === undefined ? null : Boolean(runImmediately), card.id],
  )

  const [rows] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [card.id])
  res.json(serializeCard(rows[0]))
}))

kanbanRouter.delete('/admin/kanban/cards/:id', requireAdmin, asyncHandler(async (req, res) => {
  const card = await loadEditableCard(req, res)
  if (!card) return

  await pool.query('DELETE FROM kanban_cards WHERE id = ?', [card.id])
  res.status(204).end()
}))

kanbanRouter.post('/admin/kanban/cards/:id/arm', requireAdmin, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    "UPDATE kanban_cards SET run_immediately = 1 WHERE id = ? AND status = 'todo'",
    [req.params.id],
  )
  if (result.affectedRows === 0) {
    return res.status(409).json({ error: 'Card não encontrado ou não está em "Para Fazer".' })
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
    if (doingRows.length > 0) {
      await conn.rollback()
      return res.json({ card: null })
    }

    const [candidates] = await conn.query(
      `SELECT id FROM kanban_cards WHERE status = 'todo' AND run_immediately = 1
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
