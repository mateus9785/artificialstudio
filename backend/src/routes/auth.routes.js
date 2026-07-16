import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { pool } from '../db/pool.js'
import { signAdminToken } from '../utils/jwt.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {}

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

  const token = signAdminToken(admin)
  res.json({ token, admin: { id: admin.id, username: admin.username } })
})

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: { id: req.admin.sub, username: req.admin.username } })
})
