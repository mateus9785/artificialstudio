import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Posts from './pages/Posts'
import ConversasIA from './pages/ConversasIA'
import ProducaoAutomatizada from './pages/ProducaoAutomatizada'
import Financeiro from './pages/Financeiro'
import WhatsApp from './pages/WhatsApp'

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="posts" replace />} />
          <Route path="posts" element={<Posts />} />
          <Route path="conversas-ia" element={<ConversasIA />} />
          <Route path="whatsapp" element={<WhatsApp />} />
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
