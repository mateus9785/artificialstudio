import { useNavigate } from 'react-router-dom'
import { clearAdminSession } from '../lib/adminAuth'
import type { ApiError } from '../lib/api'

// Centraliza o comportamento de logout automático quando o token expira/é inválido (401)
export function useAdminGuard() {
  const navigate = useNavigate()

  // Retorna true se o erro foi tratado (401 -> logout). Caso contrário, quem chamou deve tratar.
  function handleError(err: ApiError | unknown): boolean {
    if ((err as ApiError)?.status === 401) {
      clearAdminSession()
      navigate('/admin/login', { replace: true })
      return true
    }
    return false
  }

  return { handleError }
}
