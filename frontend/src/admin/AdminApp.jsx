import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Posts from './pages/Posts'
import ConversasIA from './pages/ConversasIA'
import Referrals from './pages/Referrals'
import Affiliates from './pages/Affiliates'
import ProducaoAutomatizada from './pages/ProducaoAutomatizada'
import Financeiro from './pages/Financeiro'

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="posts" replace />} />
          <Route path="posts" element={<Posts />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="affiliates" element={<Affiliates />} />
          <Route path="conversas-ia" element={<ConversasIA />} />
          {/* A tela de conversas virou o painel da IA — o link antigo continua funcionando. */}
          <Route path="chat" element={<Navigate to="/admin/conversas-ia" replace />} />
          <Route path="producao-automatizada" element={<ProducaoAutomatizada />} />
          <Route path="financeiro" element={<Financeiro />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="posts" replace />} />
    </Routes>
  )
}
