export const SERVICE_TYPES = [
  'Site institucional',
  'E-commerce',
  'Sistema sob medida',
  'Automação',
  'Integração com IA',
  'Outro',
]

export const STATUS_META = {
  novo: { label: 'Novo', color: '#22d3ee' },
  contatado: { label: 'Contatado', color: '#a855f7' },
  negociando: { label: 'Negociando', color: '#f59e0b' },
  fechado: { label: 'Fechado', color: '#4ade80' },
  sem_interesse: { label: 'Sem interesse', color: '#f87171' },
}

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
