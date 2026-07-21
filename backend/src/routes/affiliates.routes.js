import { Router } from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { pool } from '../db/pool.js'
import { signAffiliateToken } from '../utils/jwt.js'
import { requireAffiliate } from '../middleware/requireAffiliate.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { sendPasswordResetEmail } from '../utils/mailer.js'

export const affiliatesRouter = Router()

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

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
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      error: 'A senha precisa ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.',
    })
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
  const { email, password, remember } = req.body || {}

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

  const token = signAffiliateToken(affiliate, { remember: Boolean(remember) })
  res.json({ token, affiliate: serializeAffiliate(affiliate) })
})

affiliatesRouter.post('/affiliates/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body || {}
  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail.' })
  }

  const [rows] = await pool.query('SELECT id FROM affiliates WHERE email = ?', [email])
  const affiliate = rows[0]

  if (affiliate) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    await pool.query(
      'UPDATE affiliates SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [tokenHash, affiliate.id],
    )

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetUrl = `${frontendUrl}/indique/redefinir-senha?token=${rawToken}`
    try {
      await sendPasswordResetEmail(email, resetUrl)
    } catch (err) {
      console.error('Falha ao enviar e-mail de redefinição de senha:', err)
    }
  }

  res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição em instantes.' })
})

affiliatesRouter.post('/affiliates/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body || {}

  if (!token || !password) {
    return res.status(400).json({ error: 'Token e senha são obrigatórios.' })
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      error: 'A senha precisa ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.',
    })
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const [rows] = await pool.query(
    'SELECT id FROM affiliates WHERE reset_token = ? AND reset_token_expires > NOW()',
    [tokenHash],
  )
  const affiliate = rows[0]

  if (!affiliate) {
    return res.status(400).json({ error: 'Link inválido ou expirado. Solicite uma nova redefinição.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await pool.query(
    'UPDATE affiliates SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    [passwordHash, affiliate.id],
  )

  res.json({ message: 'Senha redefinida com sucesso.' })
})

affiliatesRouter.get('/affiliates/me', requireAffiliate, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM affiliates WHERE id = ?', [req.affiliate.sub])
  if (rows.length === 0) return res.status(404).json({ error: 'Parceiro não encontrado.' })
  res.json({ affiliate: serializeAffiliate(rows[0]) })
})

affiliatesRouter.put('/affiliates/me', requireAffiliate, async (req, res) => {
  const { name, email, whatsapp, pixKey } = req.body || {}

  if (!name || !email || !whatsapp) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e WhatsApp.' })
  }

  const [existing] = await pool.query('SELECT id FROM affiliates WHERE email = ? AND id != ?', [
    email,
    req.affiliate.sub,
  ])
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Já existe um cadastro com esse e-mail.' })
  }

  await pool.query('UPDATE affiliates SET name = ?, email = ?, whatsapp = ?, pix_key = ? WHERE id = ?', [
    name,
    email,
    whatsapp,
    pixKey || null,
    req.affiliate.sub,
  ])

  const [rows] = await pool.query('SELECT * FROM affiliates WHERE id = ?', [req.affiliate.sub])
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

async function loadOwnEditableReferral(req, res) {
  const [rows] = await pool.query('SELECT * FROM referrals WHERE id = ? AND affiliate_id = ?', [
    req.params.id,
    req.affiliate.sub,
  ])
  const referral = rows[0]
  if (!referral) {
    res.status(404).json({ error: 'Indicação não encontrada.' })
    return null
  }
  if (referral.status !== 'novo') {
    res.status(409).json({ error: 'Essa indicação já está em andamento e não pode mais ser editada ou excluída.' })
    return null
  }
  return referral
}

affiliatesRouter.put('/affiliates/referrals/:id', requireAffiliate, async (req, res) => {
  const referral = await loadOwnEditableReferral(req, res)
  if (!referral) return

  const error = validateReferralBody(req.body)
  if (error) return res.status(400).json({ error })

  const { contactName, companyName, contactInfo, serviceType, alreadyNotified } = req.body
  await pool.query(
    `UPDATE referrals SET
       contact_name = ?, company_name = ?, contact_info = ?, service_type = ?, already_notified = ?
     WHERE id = ?`,
    [contactName, companyName || null, contactInfo, serviceType, Boolean(alreadyNotified), referral.id],
  )

  const [rows] = await pool.query('SELECT * FROM referrals WHERE id = ?', [referral.id])
  res.json(serializeReferral(rows[0]))
})

affiliatesRouter.delete('/affiliates/referrals/:id', requireAffiliate, async (req, res) => {
  const referral = await loadOwnEditableReferral(req, res)
  if (!referral) return

  await pool.query('DELETE FROM referrals WHERE id = ?', [referral.id])
  res.status(204).end()
})

// ---- Notificações do parceiro ----

affiliatesRouter.get('/affiliates/notifications', requireAffiliate, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM affiliate_notifications WHERE affiliate_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.affiliate.sub],
  )
  res.json(
    rows.map((row) => ({
      id: row.id,
      referralId: row.referral_id,
      message: row.message,
      read: Boolean(row.is_read),
      createdAt: row.created_at,
    })),
  )
})

affiliatesRouter.put('/affiliates/notifications/read-all', requireAffiliate, async (req, res) => {
  await pool.query('UPDATE affiliate_notifications SET is_read = TRUE WHERE affiliate_id = ?', [req.affiliate.sub])
  res.status(204).end()
})

affiliatesRouter.put('/affiliates/notifications/:id/read', requireAffiliate, async (req, res) => {
  const [result] = await pool.query(
    'UPDATE affiliate_notifications SET is_read = TRUE WHERE id = ? AND affiliate_id = ?',
    [req.params.id, req.affiliate.sub],
  )
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Notificação não encontrada.' })
  res.status(204).end()
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

const REFERRAL_STATUSES = ['novo', 'contatado', 'negociando', 'fechado', 'finalizado', 'sem_interesse', 'cancelado']
const COMMISSION_TYPES = ['unico', 'mensalidade']
const STATUS_LABELS = {
  novo: 'Indicação Recebida',
  contatado: 'Entramos em contato (esperando retorno)',
  negociando: 'Em Negociação',
  fechado: 'Projeto fechado (sendo desenvolvido)',
  finalizado: 'Projeto finalizado (Comissão paga)',
  sem_interesse: 'Cliente sem interesse',
  cancelado: 'Cliente cancelou projeto',
}

affiliatesRouter.put('/admin/referrals/:id', requireAdmin, async (req, res) => {
  const { status, commissionType, closedValue, commissionValue, adminNotes } = req.body || {}

  if (status && !REFERRAL_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' })
  }
  if (commissionType && !COMMISSION_TYPES.includes(commissionType)) {
    return res.status(400).json({ error: 'Tipo de comissão inválido.' })
  }

  const [beforeRows] = await pool.query('SELECT affiliate_id, contact_name, status FROM referrals WHERE id = ?', [
    req.params.id,
  ])
  const before = beforeRows[0]
  if (!before) {
    return res.status(404).json({ error: 'Indicação não encontrada.' })
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

  if (status && status !== before.status) {
    const message = `Sua indicação de ${before.contact_name} mudou para "${STATUS_LABELS[status]}".`
    await pool.query(
      'INSERT INTO affiliate_notifications (affiliate_id, referral_id, message) VALUES (?, ?, ?)',
      [before.affiliate_id, req.params.id, message],
    )
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
