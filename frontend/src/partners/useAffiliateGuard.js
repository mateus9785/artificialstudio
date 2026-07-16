import { useNavigate } from 'react-router-dom'
import { clearAffiliateSession } from '../lib/affiliateAuth'

// Centraliza o comportamento de logout automático quando o token expira/é inválido (401)
export function useAffiliateGuard() {
  const navigate = useNavigate()

  function handleError(err) {
    if (err?.status === 401) {
      clearAffiliateSession()
      navigate('/indique/login', { replace: true })
      return true
    }
    return false
  }

  return { handleError }
}
