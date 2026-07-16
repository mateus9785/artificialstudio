import { useEffect, useState } from 'react'
import { Eye, Users, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'

function Card({ icon: Icon, label, value }) {
  return (
    <div
      className="flex items-center gap-4 p-5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-semibold" style={{ color: '#f4f4f5' }}>
          {value}
        </p>
        <p className="text-xs" style={{ color: '#71717a' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { handleError } = useAdminGuard()
  const [summary, setSummary] = useState(null)
  const [status, setStatus] = useState('loading')
  const [days, setDays] = useState(7)

  useEffect(() => {
    setStatus('loading')
    api
      .get(`/admin/analytics/summary?days=${days}`, getAdminToken())
      .then((data) => {
        setSummary(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err)) setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  const maxDayCount = summary?.eventsByDay?.length
    ? Math.max(...summary.eventsByDay.map((d) => d.count))
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#f4f4f5' }}>
          Analytics
        </h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
      {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar o analytics.</p>}

      {status === 'ready' && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card icon={Eye} label="Pageviews" value={summary.totalPageviews} />
            <Card icon={Users} label="Sessões únicas" value={summary.totalSessions} />
            <Card
              icon={ShieldCheck}
              label="Taxa de consentimento"
              value={
                summary.consentAcceptRate === null
                  ? '—'
                  : `${Math.round(summary.consentAcceptRate * 100)}%`
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="p-5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-sm font-medium mb-4" style={{ color: '#e4e4e7' }}>
                Eventos por dia
              </p>
              <div className="flex flex-col gap-2">
                {summary.eventsByDay.length === 0 && (
                  <p className="text-xs" style={{ color: '#52525b' }}>
                    Sem dados no período.
                  </p>
                )}
                {summary.eventsByDay.map((d) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="text-xs w-20 flex-shrink-0" style={{ color: '#71717a' }}>
                      {d.day?.slice(0, 10)}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: maxDayCount ? `${(d.count / maxDayCount) * 100}%` : '0%',
                          background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
                        }}
                      />
                    </div>
                    <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: '#a1a1aa' }}>
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="p-5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-sm font-medium mb-4" style={{ color: '#e4e4e7' }}>
                Páginas mais vistas
              </p>
              <div className="flex flex-col gap-2">
                {summary.topPages.length === 0 && (
                  <p className="text-xs" style={{ color: '#52525b' }}>
                    Sem dados no período.
                  </p>
                )}
                {summary.topPages.map((p) => (
                  <div key={p.pagePath} className="flex items-center justify-between text-sm">
                    <span className="truncate" style={{ color: '#d4d4d8' }}>
                      {p.pagePath}
                    </span>
                    <span style={{ color: '#71717a' }}>{p.views}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
