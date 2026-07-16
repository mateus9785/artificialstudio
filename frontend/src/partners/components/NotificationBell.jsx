import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { api } from '../../lib/api'
import { getAffiliateToken } from '../../lib/affiliateAuth'

const POLL_INTERVAL_MS = 30000

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

export default function NotificationBell({ handleError }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  function load() {
    api
      .get('/affiliates/notifications', getAffiliateToken())
      .then(setNotifications)
      .catch((err) => handleError(err))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleToggle() {
    setOpen((prev) => !prev)
  }

  async function markAllRead() {
    if (unreadCount === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.put('/affiliates/notifications/read-all', undefined, getAffiliateToken())
    } catch (err) {
      handleError(err)
    }
  }

  async function markOneRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await api.put(`/affiliates/notifications/${id}/read`, undefined, getAffiliateToken())
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-lg cursor-pointer"
        style={{ color: '#a1a1aa' }}
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex items-center justify-center text-[10px] font-semibold rounded-full"
            style={{ width: '16px', height: '16px', background: '#f87171', color: '#0a0a0a' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl z-50"
          style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
              Notificações
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs cursor-pointer"
                style={{ color: '#22d3ee', background: 'none', border: 'none', padding: 0 }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs px-4 py-6 text-center" style={{ color: '#52525b' }}>
              Você ainda não tem notificações.
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markOneRead(n.id)}
                  className="text-left px-4 py-3 cursor-pointer"
                  style={{
                    background: n.read ? 'transparent' : 'rgba(34,211,238,0.06)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <p className="text-xs" style={{ color: n.read ? '#a1a1aa' : '#e4e4e7' }}>
                    {n.message}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: '#52525b' }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
