const TOKEN_KEY = 'ac_admin_token'
const ADMIN_KEY = 'ac_admin_user'

export interface AdminUser {
  id: number
  username: string
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminSession(token: string, admin: AdminUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
}

export function getAdminUser(): AdminUser | null {
  try {
    // getItem() pode devolver null — JSON.parse(null) coerce pra "null" e devolve null,
    // mesmo comportamento que o JS fazia implicitamente antes da tipagem.
    return JSON.parse(localStorage.getItem(ADMIN_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function clearAdminSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
}
