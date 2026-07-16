import { Navigate, Outlet } from 'react-router-dom'
import { getAffiliateToken } from '../../lib/affiliateAuth'

export default function ProtectedRoute() {
  const token = getAffiliateToken()
  if (!token) {
    return <Navigate to="/indique" state={{ openModal: 'login' }} replace />
  }
  return <Outlet />
}
