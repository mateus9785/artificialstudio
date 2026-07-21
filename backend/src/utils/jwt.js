import jwt from 'jsonwebtoken'

const ADMIN_AUDIENCE = 'admin-panel'
const AFFILIATE_AUDIENCE = 'affiliate-panel'
const REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || '30d'

export function signAdminToken(admin, { remember = false } = {}) {
  return jwt.sign({ sub: admin.id, username: admin.username, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: remember ? REMEMBER_EXPIRES_IN : process.env.JWT_EXPIRES_IN || '12h',
    audience: ADMIN_AUDIENCE,
  })
}

export function verifyAdminToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { audience: ADMIN_AUDIENCE })
  if (payload.role !== 'admin') {
    throw new Error('Token não é de um administrador.')
  }
  return payload
}

export function signAffiliateToken(affiliate, { remember = false } = {}) {
  return jwt.sign({ sub: affiliate.id, email: affiliate.email, role: 'affiliate' }, process.env.JWT_SECRET, {
    expiresIn: remember ? REMEMBER_EXPIRES_IN : process.env.JWT_EXPIRES_IN || '12h',
    audience: AFFILIATE_AUDIENCE,
  })
}

export function verifyAffiliateToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { audience: AFFILIATE_AUDIENCE })
  if (payload.role !== 'affiliate') {
    throw new Error('Token não é de um parceiro.')
  }
  return payload
}
