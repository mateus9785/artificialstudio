import { Router } from 'express'
import { pool } from '../db/pool.ts'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const financeiroRouter = Router()

const TYPES = ['entrada', 'saida']
const MONTH_REGEX = /^\d{4}-\d{2}$/

// Express 4 não encaminha rejeições de handlers async para o middleware de erro
// sozinho — sem isso, qualquer erro do MySQL derruba o processo inteiro.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

function serializeLancamento(row) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amount: Number(row.amount),
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function validateBody(body) {
  const { type, description, amount, occurredOn } = body || {}

  if (!TYPES.includes(type)) {
    return 'Tipo inválido. Use "entrada" ou "saida".'
  }
  if (!description || !description.trim()) {
    return 'Preencha a descrição.'
  }
  if (amount === undefined || amount === null || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    return 'Informe um valor maior que zero.'
  }
  if (!occurredOn || Number.isNaN(new Date(occurredOn).getTime())) {
    return 'Informe uma data válida.'
  }
  return null
}

financeiroRouter.get('/admin/financeiro', requireAdmin, asyncHandler(async (req, res) => {
  const { month } = req.query
  const params = []
  let query = 'SELECT * FROM financeiro_lancamentos'

  if (month) {
    if (!MONTH_REGEX.test(month)) {
      return res.status(400).json({ error: 'Mês inválido. Use o formato AAAA-MM.' })
    }
    query += ' WHERE DATE_FORMAT(occurred_on, "%Y-%m") = ?'
    params.push(month)
  }

  query += ' ORDER BY occurred_on DESC, id DESC'

  const [rows] = await pool.query(query, params)
  res.json(rows.map(serializeLancamento))
}))

financeiroRouter.post('/admin/financeiro', requireAdmin, asyncHandler(async (req, res) => {
  const error = validateBody(req.body)
  if (error) return res.status(400).json({ error })

  const { type, description, amount, occurredOn } = req.body

  const [result] = await pool.query(
    'INSERT INTO financeiro_lancamentos (type, description, amount, occurred_on) VALUES (?, ?, ?, ?)',
    [type, description.trim(), Number(amount), occurredOn],
  )

  const [rows] = await pool.query('SELECT * FROM financeiro_lancamentos WHERE id = ?', [result.insertId])
  res.status(201).json(serializeLancamento(rows[0]))
}))

financeiroRouter.put('/admin/financeiro/:id', requireAdmin, asyncHandler(async (req, res) => {
  const error = validateBody(req.body)
  if (error) return res.status(400).json({ error })

  const { type, description, amount, occurredOn } = req.body

  const [result] = await pool.query(
    'UPDATE financeiro_lancamentos SET type = ?, description = ?, amount = ?, occurred_on = ? WHERE id = ?',
    [type, description.trim(), Number(amount), occurredOn, req.params.id],
  )

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Lançamento não encontrado.' })
  }

  const [rows] = await pool.query('SELECT * FROM financeiro_lancamentos WHERE id = ?', [req.params.id])
  res.json(serializeLancamento(rows[0]))
}))

financeiroRouter.delete('/admin/financeiro/:id', requireAdmin, asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM financeiro_lancamentos WHERE id = ?', [req.params.id])
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Lançamento não encontrado.' })
  }
  res.status(204).end()
}))
