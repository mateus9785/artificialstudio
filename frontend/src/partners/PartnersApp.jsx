import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function PartnersApp() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="cadastro" element={<Register />} />
      <Route path="login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
