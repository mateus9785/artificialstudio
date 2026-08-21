import { beforeEach, describe, expect, it } from 'vitest'
import { getSessionId } from './session'

describe('getSessionId', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates and persists a new id on first call', () => {
    const id = getSessionId()
    expect(id).toBeTruthy()
    expect(localStorage.getItem('ac_session_id')).toBe(id)
  })

  it('returns the same id on subsequent calls instead of generating a new one', () => {
    const first = getSessionId()
    const second = getSessionId()
    expect(second).toBe(first)
  })

  it('reuses an id already present in localStorage', () => {
    localStorage.setItem('ac_session_id', 'existing-id')
    expect(getSessionId()).toBe('existing-id')
  })
})
