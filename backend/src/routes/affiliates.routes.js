import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { pool } from '../db/pool.js'
import { signAffiliateToken } from '../utils/jwt.js'
import { requireAffiliate } from '../middleware/requireAffiliate.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const affiliatesRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

function serializeAffiliate(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    pixKey: row.pix_key,
    createdAt: row.created_at,
  }
}

function serializeReferral(row) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    contactName: row.contact_name,
    companyName: row.company_name,
    contactInfo: row.contact_info,
    serviceType: row.service_type,
    alreadyNotified: Boolean(row.already_notified),
    status: row.status,
    commissionType: row.commission_type,
    closedValue: row.closed_value === null ? null : Number(row.closed_value),
    commissionValue: row.commission_value === null ? null : Number(row.commission_value),
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.affiliate_name !== undefined && {
      affiliate: {
        name: row.affiliate_name,
        email: row.affiliate_email,
        whatsapp: row.affiliate_whatsapp,
        pixKey: row.affiliate_pix_key,
      },
    }),
  }
}

// ---- Autenticação do parceiro ----

affiliatesRouter.post('/affiliates/register', authLimiter, async (req, res) => {
  const { name, email, whatsapp, pixKey, password } = req.body || {}

  if (!name || !email || !whatsapp || !password) {
    return res.status(400).json({ error: 'Preencha nome, e-mail, WhatsApp e senha.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' })
  }

  const [existing] = await pool.query('SELECT id FROM affiliates WHERE email = ?', [email])
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Já existe um cadastro com esse e-mail.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const [result] = await pool.query(
    'INSERT INTO affiliates (name, email, whatsapp, pix_key, password_hash) VALUES (?, ?, ?, ?, ?)',
    [name, email, whatsapp, pixKey || null, passwordHash],
  )

  const [rows] = await pool.query('SELECT * FROM affiliates WHERE id = ?', [result.insertId])
  const affiliate = rows[0]
  const token = signAffiliateToken(affiliate)
  res.status(201).json({ token, affiliate: serializeAffiliate(affiliate) })
})

affiliatesRouter.post('/affiliates/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' })
  }

  const [rows] = await pool.query('SELECT * FROM affiliates WHERE email = ?', [email])
  const affiliate = rows[0]

  if (!affiliate) {
    return res.status(401).json({ error: 'Credenciais inválidas.' })
  }

  const passwordMatches = await bcrypt.compare(password, affiliate.password_hash)
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Credenciais inválidas.' })
  }

  const token = signAffiliateToken(affiliate)
  res.json({ token, affiliate: serializeAffiliate(affiliate) })
})

affiliatesRouter.get('/affiliates/me', requireAffiliate, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM affiliates WHERE id = ?', [req.affiliate.sub])
  if (rows.length === 0) return res.status(404).json({ error: 'Parceiro não encontrado.' })
  res.json({ affiliate: serializeAffiliate(rows[0]) })
})

// ---- Indicações do parceiro ----

function validateReferralBody(body) {
  const { contactName, contactInfo, serviceType } = body || {}
  if (!contactName || !contactInfo || !serviceType) {
    return 'Preencha nome do contato, WhatsApp/e-mail e o que ele precisa.'
  }
  return null
}

affiliatesRouter.post('/affiliates/referrals', requireAffiliate, async (req, res) => {
  const error = validateReferralBody(req.body)
  if (error) return res.status(400).json({ error })

  const { contactName, companyName, contactInfo, serviceType, alreadyNotified } = req.body
  const [result] = await pool.query(
    `INSERT INTO referrals (affiliate_id, contact_name, company_name, contact_info, service_type, already_notified)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.affiliate.sub, contactName, companyName || null, contactInfo, serviceType, Boolean(alreadyNotified)],
  )

  const [rows] = await pool.query('SELECT * FROM referrals WHERE id = ?', [result.insertId])
  res.status(201).json(serializeReferral(rows[0]))
})

affiliatesRouter.get('/affiliates/referrals', requireAffiliate, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM referrals WHERE affiliate_id = ? ORDER BY created_at DESC', [
    req.affiliate.sub,
  ])
  res.json(rows.map(serializeReferral))
})

// ---- Admin ----

affiliatesRouter.get('/admin/affiliates', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM affiliates ORDER BY created_at DESC')
  res.json(rows.map(serializeAffiliate))
})

affiliatesRouter.get('/admin/referrals', requireAdmin, async (req, res) => {
  const { status } = req.query
  const params = []
  let query = `
    SELECT r.*, a.name AS affiliate_name, a.email AS affiliate_email,
           a.whatsapp AS affiliate_whatsapp, a.pix_key AS affiliate_pix_key
    FROM referrals r
    JOIN affiliates a ON a.id = r.affiliate_id
  `
  if (status) {
    query += ' WHERE r.status = ?'
    params.push(status)
  }
  query += ' ORDER BY r.created_at DESC'

  const [rows] = await pool.query(query, params)
  res.json(rows.map(serializeReferral))
})

const REFERRAL_STATUSES = ['novo', 'contatado', 'negociando', 'fechado', 'sem_interesse']
const COMMISSION_TYPES = ['unico', 'mensalidade']

affiliatesRouter.put('/admin/referrals/:id', requireAdmin, async (req, res) => {
  const { status, commissionType, closedValue, commissionValue, adminNotes } = req.body || {}

  if (status && !REFERRAL_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' })
  }
  if (commissionType && !COMMISSION_TYPES.includes(commissionType)) {
    return res.status(400).json({ error: 'Tipo de comissão inválido.' })
  }

  const [result] = await pool.query(
    `UPDATE referrals SET
       status = COALESCE(?, status),
       commission_type = COALESCE(?, commission_type),
       closed_value = ?,
       commission_value = ?,
       admin_notes = ?
     WHERE id = ?`,
    [
      status || null,
      commissionType || null,
      closedValue === undefined ? null : closedValue,
      commissionValue === undefined ? null : commissionValue,
      adminNotes === undefined ? null : adminNotes,
      req.params.id,
    ],
  )

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Indicação não encontrada.' })
  }

  const [rows] = await pool.query(
    `SELECT r.*, a.name AS affiliate_name, a.email AS affiliate_email,
            a.whatsapp AS affiliate_whatsapp, a.pix_key AS affiliate_pix_key
     FROM referrals r
     JOIN affiliates a ON a.id = r.affiliate_id
     WHERE r.id = ?`,
    [req.params.id],
  )
  res.json(serializeReferral(rows[0]))
})
