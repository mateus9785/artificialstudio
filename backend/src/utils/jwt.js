import jwt from 'jsonwebtoken'

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, username: admin.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  })
}

export function verifyAdminToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

export function signAffiliateToken(affiliate) {
  return jwt.sign({ sub: affiliate.id, email: affiliate.email, role: 'affiliate' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  })
}

export function verifyAffiliateToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  if (payload.role !== 'affiliate') {
    throw new Error('Token não é de um parceiro.')
  }
  return payload
}
