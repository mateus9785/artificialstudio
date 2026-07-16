import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { getAdminToken } from '../../lib/adminAuth'
import { useAdminGuard } from '../useAdminGuard'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function Affiliates() {
  const { handleError } = useAdminGuard()
  const [affiliates, setAffiliates] = useState([])
  const [status, setStatus] = useState('loading')
  const [page, setPage] = useState(1)

  function loadAffiliates() {
    setStatus('loading')
    api
      .get('/admin/affiliates', getAdminToken())
      .then((data) => {
        setAffiliates(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err)) setStatus('error')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadAffiliates, [])

  const totalPages = Math.max(1, Math.ceil(affiliates.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedAffiliates = affiliates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#f4f4f5' }}>
          Afiliados
        </h1>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-md"
          style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee' }}
        >
          {affiliates.length} cadastrado{affiliates.length === 1 ? '' : 's'}
        </span>
      </div>

      {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
      {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar os afiliados.</p>}

      {status === 'ready' && (
        <>
          {affiliates.length === 0 ? (
            <p style={{ color: '#52525b' }}>Nenhum afiliado cadastrado ainda.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                        Nome
                      </th>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                        E-mail
                      </th>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                        WhatsApp
                      </th>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                        Chave PIX
                      </th>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#a1a1aa' }}>
                        Cadastrado em
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAffiliates.map((affiliate) => (
                      <tr key={affiliate.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-5 py-3" style={{ color: '#e4e4e7' }}>
                          {affiliate.name}
                        </td>
                        <td className="px-5 py-3" style={{ color: '#d4d4d8' }}>
                          {affiliate.email}
                        </td>
                        <td className="px-5 py-3" style={{ color: '#d4d4d8' }}>
                          {affiliate.whatsapp}
                        </td>
                        <td className="px-5 py-3" style={{ color: '#d4d4d8' }}>
                          {affiliate.pixKey || '—'}
                        </td>
                        <td className="px-5 py-3" style={{ color: '#71717a' }}>
                          {formatDate(affiliate.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
