import { beforeEach, describe, expect, it } from 'vitest'
import { clearAdminSession, getAdminToken, getAdminUser, setAdminSession } from './adminAuth'

describe('adminAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has no token/user before any session is set', () => {
    expect(getAdminToken()).toBeNull()
    expect(getAdminUser()).toBeNull()
  })

  it('persists the token and admin user set by setAdminSession', () => {
    setAdminSession('abc.def.ghi', { id: 1, username: 'admin' })
    expect(getAdminToken()).toBe('abc.def.ghi')
    expect(getAdminUser()).toEqual({ id: 1, username: 'admin' })
  })

  it('clears both token and admin user on clearAdminSession', () => {
    setAdminSession('abc.def.ghi', { id: 1, username: 'admin' })
    clearAdminSession()
    expect(getAdminToken()).toBeNull()
    expect(getAdminUser()).toBeNull()
  })

  it('returns null from getAdminUser instead of throwing on malformed stored JSON', () => {
    localStorage.setItem('ac_admin_user', '{not valid json')
    expect(getAdminUser()).toBeNull()
  })
})
