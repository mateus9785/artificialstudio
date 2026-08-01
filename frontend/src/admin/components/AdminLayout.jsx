import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FileText, LogOut, ChevronsLeft, ChevronsRight, KeyRound, KanbanSquare, Wallet, Menu, X, Bot, MessageCircle } from 'lucide-react'
import { clearAdminSession } from '../../lib/adminAuth'
import ChangePasswordModal from './ChangePasswordModal'

const NAV_ITEMS = [
  { to: '/admin/posts', label: 'Blog', icon: FileText },
  { to: '/admin/conversas-ia', label: 'Conversas IA', icon: Bot },
  { to: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/admin/producao-automatizada', label: 'Produção Automatizada', icon: KanbanSquare },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
]

const COLLAPSE_KEY = 'admin_sidebar_collapsed'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isProducaoAutomatizada = location.pathname.startsWith('/admin/producao-automatizada')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  function handleLogout() {
    clearAdminSession()
    navigate('/admin/login', { replace: true })
  }

  const effectiveCollapsed = collapsed && !mobileOpen

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#050505' }}>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 flex-shrink-0 flex flex-col p-4 h-full ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{
          background: '#050505',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          width: effectiveCollapsed ? '76px' : '240px',
          transition: 'width 200ms, transform 200ms',
        }}
      >
        <div className={`flex items-center justify-between mb-8 mt-2 ${effectiveCollapsed ? 'justify-center' : 'px-2'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="Artificial Studio" className="w-8 h-8 object-contain flex-shrink-0" />
            {!effectiveCollapsed && (
              <span className="text-sm font-semibold truncate" style={{ color: '#f4f4f5' }}>
                Admin
              </span>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden cursor-pointer p-1"
            style={{ color: '#a1a1aa' }}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={effectiveCollapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                effectiveCollapsed ? 'justify-center px-0' : 'px-3'
              }`}
              style={({ isActive }) => ({
                background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
                color: isActive ? '#22d3ee' : '#a1a1aa',
              })}
            >
              <Icon size={16} />
              {!effectiveCollapsed && label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={`hidden md:flex w-full items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors mb-1 ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && 'Recolher'}
          </button>

          <button
            onClick={() => setShowChangePassword(true)}
            title={effectiveCollapsed ? 'Alterar senha' : undefined}
            className={`w-full flex items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors mb-1 ${
              effectiveCollapsed ? 'justify-center px-0' : 'px-3'
            }`}
            style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <KeyRound size={16} />
            {!effectiveCollapsed && 'Alterar senha'}
          </button>
          <button
            onClick={handleLogout}
            title={effectiveCollapsed ? 'Sair' : undefined}
            className={`w-full flex items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
              effectiveCollapsed ? 'justify-center px-0' : 'px-3'
            }`}
            style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={16} />
            {!effectiveCollapsed && 'Sair'}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div
          className="md:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="cursor-pointer p-1"
            style={{ color: '#a1a1aa' }}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <img src="/logo.png" alt="Artificial Studio" className="w-6 h-6 object-contain flex-shrink-0" />
          <span className="text-sm font-semibold truncate flex items-center gap-1.5 min-w-0" style={{ color: '#f4f4f5' }}>
            Admin
            {isProducaoAutomatizada && (
              <>
                <span className="flex-shrink-0" style={{ color: '#3f3f46' }}>/</span>
                <span className="truncate" style={{ color: '#a1a1aa' }}>Produção Automatizada</span>
              </>
            )}
          </span>
        </div>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  )
}
