import type { NextFunction, Request, Response } from 'express'
import { verifyAdminToken, type AdminTokenPayload } from '../utils/jwt.ts'

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Token de autenticação ausente.' })
    return
  }

  try {
    req.admin = verifyAdminToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' })
  }
}
