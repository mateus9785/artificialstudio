export const STATUS_META = {
  todo: { label: 'Para Fazer', color: '#22d3ee' },
  doing: { label: 'Fazendo', color: '#f59e0b' },
  done: { label: 'Concluído', color: '#4ade80' },
  error: { label: 'Erro', color: '#f87171' },
}

export const STATUS_ORDER = ['todo', 'doing', 'done', 'error']

// Only these column-to-column drags are meaningful actions in the UI — every other
// combination is either automatic (todo -> doing happens only via the local worker's
// claim-next) or a dead end (done is terminal).
export const ALLOWED_DRAG_TRANSITIONS = {
  error: ['todo'],
  doing: ['done'],
}
