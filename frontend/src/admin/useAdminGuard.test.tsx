import { act, render, renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { useAdminGuard } from './useAdminGuard'
import { setAdminSession, getAdminToken } from '../lib/adminAuth'
import type { ApiError } from '../lib/api'

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/admin/whatsapp']}>{children}</MemoryRouter>
}

function unauthorizedError(): ApiError {
  return Object.assign(new Error('unauthorized'), { status: 401 })
}

describe('useAdminGuard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('clears the session and reports handled on a 401', () => {
    setAdminSession('some-token', { id: 1, username: 'admin' })
    const { result } = renderHook(() => useAdminGuard(), { wrapper })

    let handled = false
    act(() => {
      handled = result.current.handleError(unauthorizedError())
    })

    expect(handled).toBe(true)
    expect(getAdminToken()).toBeNull()
  })

  it('navigates to /admin/login on a 401', () => {
    let currentPath = ''

    function LocationProbe() {
      currentPath = useLocation().pathname
      return null
    }

    function Harness() {
      const { handleError } = useAdminGuard()
      return (
        <>
          <button onClick={() => handleError(unauthorizedError())}>trigger</button>
          <Routes>
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </>
      )
    }

    const { getByText } = render(
      <MemoryRouter initialEntries={['/admin/whatsapp']}>
        <Harness />
      </MemoryRouter>,
    )

    act(() => {
      getByText('trigger').click()
    })

    expect(currentPath).toBe('/admin/login')
  })

  it('leaves the session intact and reports unhandled on non-401 errors', () => {
    setAdminSession('some-token', { id: 1, username: 'admin' })
    const { result } = renderHook(() => useAdminGuard(), { wrapper })

    let handled = true
    act(() => {
      const err: ApiError = Object.assign(new Error('server error'), { status: 500 })
      handled = result.current.handleError(err)
    })

    expect(handled).toBe(false)
    expect(getAdminToken()).toBe('some-token')
  })
})
