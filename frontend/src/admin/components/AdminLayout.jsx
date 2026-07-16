import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FileText, BarChart3, MessageSquare, LogOut, Zap, Handshake } from 'lucide-react'
import { clearAdminSession, getAdminUser } from '../../lib/adminAuth'

const NAV_ITEMS = [
  { to: '/admin/posts', label: 'Blog', icon: FileText },
  { to: '/admin/referrals', label: 'Indicações', icon: Handshake },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/chat', label: 'Conversas', icon: MessageSquare },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const admin = getAdminUser()

  function handleLogout() {
    clearAdminSession()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#050505' }}>
      <aside
        className="w-60 flex-shrink-0 flex flex-col p-4"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 px-2 mb-8 mt-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
          >
            <Zap size={16} fill="white" color="white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
            Admin
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={({ isActive }) => ({
                background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
                color: isActive ? '#22d3ee' : '#a1a1aa',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {admin?.username && (
            <p className="text-xs px-3 mb-2 truncate" style={{ color: '#52525b' }}>
              {admin.username}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors"
            style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
