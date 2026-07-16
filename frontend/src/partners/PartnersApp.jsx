import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import WhatsAppButton from '../components/WhatsAppButton'

export default function PartnersApp() {
  return (
    <>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="redefinir-senha" element={<Landing />} />
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/indique" replace />} />
      </Routes>
      <WhatsAppButton />
    </>
  )
}
