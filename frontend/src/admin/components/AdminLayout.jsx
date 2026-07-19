import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FileText, LogOut, Handshake, Users, ChevronsLeft, ChevronsRight, KeyRound, KanbanSquare } from 'lucide-react'
import { clearAdminSession } from '../../lib/adminAuth'
import ChangePasswordModal from './ChangePasswordModal'

const NAV_ITEMS = [
  { to: '/admin/posts', label: 'Blog', icon: FileText },
  { to: '/admin/referrals', label: 'Indicações', icon: Handshake },
  { to: '/admin/affiliates', label: 'Afiliados', icon: Users },
  { to: '/admin/producao-automatizada', label: 'Produção Automatizada', icon: KanbanSquare },
]

const COLLAPSE_KEY = 'admin_sidebar_collapsed'

export default function AdminLayout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [showChangePassword, setShowChangePassword] = useState(false)

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

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#050505' }}>
      <aside
        className="flex-shrink-0 flex flex-col p-4 transition-[width] duration-200"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)', width: collapsed ? '76px' : '240px' }}
      >
        <div className={`flex items-center mb-8 mt-2 ${collapsed ? 'justify-center' : 'gap-2 px-2'}`}>
          <img src="/logo.png" alt="Artificial Studio" className="w-8 h-8 object-contain flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold truncate" style={{ color: '#f4f4f5' }}>
              Admin
            </span>
          )}
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0' : 'px-3'
              }`}
              style={({ isActive }) => ({
                background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
                color: isActive ? '#22d3ee' : '#a1a1aa',
              })}
            >
              <Icon size={16} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={`w-full flex items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors mb-1 ${
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
            title={collapsed ? 'Alterar senha' : undefined}
            className={`w-full flex items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors mb-1 ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <KeyRound size={16} />
            {!collapsed && 'Alterar senha'}
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair' : undefined}
            className={`w-full flex items-center gap-2.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={16} />
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto p-8">
        <Outlet />
      </main>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  )
}
