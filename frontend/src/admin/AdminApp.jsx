import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Posts from './pages/Posts'
import Chat from './pages/Chat'
import Referrals from './pages/Referrals'

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="posts" replace />} />
          <Route path="posts" element={<Posts />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="posts" replace />} />
    </Routes>
  )
}
