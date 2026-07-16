import { verifyAffiliateToken } from '../utils/jwt.js'

export function requireAffiliate(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' })
  }

  try {
    req.affiliate = verifyAffiliateToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' })
  }
}
