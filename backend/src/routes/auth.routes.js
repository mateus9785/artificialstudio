import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { pool } from '../db/pool.js'
import { signAdminToken } from '../utils/jwt.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const authRouter = Router()

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { username, password, remember } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'Informe usuário e senha.' })
  }

  const [rows] = await pool.query('SELECT id, username, password_hash FROM admins WHERE username = ?', [username])
  const admin = rows[0]

  if (!admin) {
    return res.status(401).json({ error: 'Credenciais inválidas.' })
  }

  const passwordMatches = await bcrypt.compare(password, admin.password_hash)
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Credenciais inválidas.' })
  }

  const token = signAdminToken(admin, { remember: Boolean(remember) })
  res.json({ token, admin: { id: admin.id, username: admin.username } })
})

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: { id: req.admin.sub, username: req.admin.username } })
})

authRouter.put('/password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' })
  }
  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({
      error: 'A nova senha precisa ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.',
    })
  }

  const [rows] = await pool.query('SELECT id, password_hash FROM admins WHERE id = ?', [req.admin.sub])
  const admin = rows[0]
  if (!admin) {
    return res.status(404).json({ error: 'Administrador não encontrado.' })
  }

  const passwordMatches = await bcrypt.compare(currentPassword, admin.password_hash)
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Senha atual incorreta.' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [passwordHash, admin.id])

  res.json({ message: 'Senha alterada com sucesso.' })
})
