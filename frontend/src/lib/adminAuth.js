const TOKEN_KEY = 'ac_admin_token'
const ADMIN_KEY = 'ac_admin_user'

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminSession(token, admin) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
}

export function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY))
  } catch {
    return null
  }
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
}
