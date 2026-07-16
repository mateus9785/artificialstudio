export const SERVICE_TYPES = [
  'Site institucional',
  'E-commerce',
  'Sistema sob medida',
  'Automação',
  'Integração com IA',
  'Outro',
]

export const STATUS_META = {
  novo: { label: 'Indicação Recebida', color: '#22d3ee' },
  contatado: { label: 'Entramos em contato (esperando retorno)', color: '#a855f7' },
  negociando: { label: 'Em Negociação', color: '#f59e0b' },
  fechado: { label: 'Projeto fechado (sendo desenvolvido)', color: '#3b82f6' },
  finalizado: { label: 'Projeto finalizado (Comissão paga)', color: '#4ade80' },
  sem_interesse: { label: 'Cliente sem interesse', color: '#a1a1aa' },
  cancelado: { label: 'Cliente cancelou projeto', color: '#f87171' },
}

export const STATUS_ORDER = ['novo', 'contatado', 'negociando', 'fechado', 'finalizado', 'sem_interesse', 'cancelado']

export const COMMISSION_TYPE_LABELS = {
  unico: 'Projeto único (50%)',
  mensalidade: 'Mensalidade (100% da 1ª)',
}

export function suggestCommission(commissionType, closedValue) {
  const value = Number(closedValue)
  if (!closedValue || Number.isNaN(value)) return ''
  const rate = commissionType === 'mensalidade' ? 1 : 0.5
  return (value * rate).toFixed(2)
}
