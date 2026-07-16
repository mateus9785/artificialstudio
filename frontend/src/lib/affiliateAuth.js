const TOKEN_KEY = 'ac_affiliate_token'
const AFFILIATE_KEY = 'ac_affiliate_user'

export function getAffiliateToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAffiliateSession(token, affiliate) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(AFFILIATE_KEY, JSON.stringify(affiliate))
}

export function getAffiliateUser() {
  try {
    return JSON.parse(localStorage.getItem(AFFILIATE_KEY))
  } catch {
    return null
  }
}

export function clearAffiliateSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AFFILIATE_KEY)
}
