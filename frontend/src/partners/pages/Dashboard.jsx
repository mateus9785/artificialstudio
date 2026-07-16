import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, Handshake, Pencil, UserCog } from 'lucide-react'
import { api } from '../../lib/api'
import { getAffiliateToken, getAffiliateUser, clearAffiliateSession } from '../../lib/affiliateAuth'
import { STATUS_META } from '../../lib/referralMeta'
import { useAffiliateGuard } from '../useAffiliateGuard'
import NewReferralModal from '../components/NewReferralModal'
import EditReferralModal from '../components/EditReferralModal'
import EditProfileModal from '../components/EditProfileModal'
import NotificationBell from '../components/NotificationBell'

function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { handleError } = useAffiliateGuard()
  const [affiliate, setAffiliate] = useState(getAffiliateUser())

  const [referrals, setReferrals] = useState([])
  const [status, setStatus] = useState('loading')
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingReferral, setEditingReferral] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  function loadReferrals() {
    setStatus('loading')
    api
      .get('/affiliates/referrals', getAffiliateToken())
      .then((data) => {
        setReferrals(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!handleError(err)) setStatus('error')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReferrals, [])

  function handleLogout() {
    clearAffiliateSession()
    navigate('/indique', { replace: true, state: { openModal: 'login' } })
  }

  function handleCreated() {
    setShowNewModal(false)
    setSuccessMessage('Indicação enviada! Vamos entrar em contato em breve.')
    loadReferrals()
  }

  function handleReferralSaved() {
    setEditingReferral(null)
    setSuccessMessage('Indicação atualizada.')
    loadReferrals()
  }

  function handleReferralDeleted() {
    setEditingReferral(null)
    setSuccessMessage('Indicação excluída.')
    loadReferrals()
  }

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}>
            <Handshake size={16} color="white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
              {affiliate?.name || 'Parceiro'}
            </p>
            <p className="text-xs" style={{ color: '#52525b' }}>
              {affiliate?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell handleError={handleError} />
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: '#a1a1aa' }}
          >
            <UserCog size={15} />
            Meus dados
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: '#a1a1aa' }}
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-6">
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold mb-1" style={{ color: '#f4f4f5' }}>
              Minhas indicações
            </h1>
            <p className="text-sm" style={{ color: '#71717a' }}>
              Acompanhe o andamento de quem você já indicou.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccessMessage('')
              setShowNewModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }}
          >
            <Plus size={14} />
            Nova indicação
          </button>
        </section>

        {successMessage && (
          <p className="text-xs" style={{ color: '#4ade80' }}>
            {successMessage}
          </p>
        )}

        {status === 'loading' && <p style={{ color: '#52525b' }}>Carregando...</p>}
        {status === 'error' && <p style={{ color: '#f87171' }}>Não foi possível carregar suas indicações.</p>}

        {status === 'ready' && (
          <div className="flex flex-col gap-2">
            {referrals.length === 0 && <p style={{ color: '#52525b' }}>Você ainda não enviou nenhuma indicação.</p>}
            {referrals.map((referral) => {
              const meta = STATUS_META[referral.status]
              const canEdit = referral.status === 'novo'
              return (
                <div
                  key={referral.id}
                  className="flex flex-col gap-2 p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#e4e4e7' }}>
                        {referral.contactName}
                        {referral.companyName ? ` · ${referral.companyName}` : ''}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#52525b' }}>
                        {referral.serviceType} · {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {referral.status === 'fechado' && (
                        <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                          Provável comissão: {formatCurrency(referral.commissionValue)}
                        </span>
                      )}
                      {referral.status === 'finalizado' && (
                        <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                          Comissão: {formatCurrency(referral.commissionValue)}
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-md"
                        style={{ background: `${meta.color}14`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditingReferral(referral)}
                          className="p-1.5 rounded-lg cursor-pointer"
                          style={{ color: '#71717a' }}
                          aria-label="Editar indicação"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {referral.status === 'fechado' && (
                    <p className="text-xs" style={{ color: '#71717a' }}>
                      Projetos fechados ainda podem ser cancelados pelo cliente — o valor da comissão só é confirmado quando o projeto é finalizado.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showNewModal && (
        <NewReferralModal onClose={() => setShowNewModal(false)} onCreated={handleCreated} handleError={handleError} />
      )}

      {editingReferral && (
        <EditReferralModal
          referral={editingReferral}
          onClose={() => setEditingReferral(null)}
          onSaved={handleReferralSaved}
          onDeleted={handleReferralDeleted}
          handleError={handleError}
        />
      )}

      {showProfileModal && (
        <EditProfileModal
          affiliate={affiliate}
          onClose={() => setShowProfileModal(false)}
          onSaved={(updated) => {
            setAffiliate(updated)
            setShowProfileModal(false)
          }}
        />
      )}
    </div>
  )
}
