import { pool } from '../db/pool.js'

/**
 * `kanban_labels.name` é validado por `^[A-Za-z0-9._-]+$` em kanban.routes.js — nada de acento nem
 * espaço, senão a etiqueta criada aqui não seria editável pela tela de Produção Automatizada.
 */
const LABEL_NAME = (process.env.AI_CHAT_LABEL || 'cliente').replace(/[^A-Za-z0-9._-]/g, '-')
const LABEL_COLOR = '#a855f7'

async function ensureLabel() {
  const [existing] = await pool.query('SELECT id FROM kanban_labels WHERE name = ?', [LABEL_NAME])
  if (existing[0]) return existing[0].id

  const [result] = await pool.query('INSERT INTO kanban_labels (name, color) VALUES (?, ?)', [LABEL_NAME, LABEL_COLOR])
  return result.insertId
}

function money(value) {
  if (value === null || value === undefined) return null
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function priceLine(quote) {
  const min = money(quote.priceMin)
  const max = money(quote.priceMax)
  if (!min && !max) return 'não registrado'
  if (!max || min === max) return min || max
  return `${min} a ${max}`
}

function buildDescription(quote, conversation, originLabel) {
  const bloco = (titulo, corpo) => (corpo ? `## ${titulo}\n\n${corpo}\n` : '')
  const lista = (items) => (items?.length ? items.map((item) => `- ${item}`).join('\n') : '')

  const comercial = [
    `- Cliente: ${quote.clientName || 'não informado'}`,
    `- Empresa: ${quote.companyName || 'não informada'}`,
    `- Contato: ${quote.contact || 'não informado'}`,
    `- Tipo de serviço: ${quote.serviceType || 'não classificado'}`,
    `- Valor acordado: ${priceLine(quote)}`,
    quote.monthly ? `- Mensalidade: ${money(quote.monthly)}` : null,
    `- Prazo acordado: ${quote.timelineWeeks ? `${quote.timelineWeeks} semanas` : 'não definido'}`,
    `- Condições de pagamento: ${quote.paymentTerms || 'não definidas'}`,
    `- Conversa de origem: ${originLabel || `/admin/conversas-ia (conversa #${conversation.id})`}`,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    '> Card criado automaticamente pelo atendimento com IA do site. Revise o escopo com o cliente antes de armar a execução.',
    '',
    bloco('Dados comerciais', comercial),
    bloco('Contexto', quote.summary),
    bloco('Requisitos levantados', lista(quote.requirements)),
    bloco('Integrações', lista(quote.integrations)),
    bloco('Briefing', quote.briefing),
  ]
    .join('\n')
    .trim()
}

/**
 * Cria o card em Produção Automatizada a partir do orçamento confirmado.
 *
 * Escreve direto no banco em vez de chamar a própria API HTTP: é o mesmo processo, e passar por
 * `requireAdmin` exigiria o backend guardar uma credencial de admin para falar consigo mesmo.
 *
 * O card entra em `todo` com `run_immediately = 0` e `plan_status = 'none'` de propósito — um
 * "confirmo" digitado no chat por um visitante anônimo não pode disparar uma sessão de
 * desenvolvimento sozinha. Quem arma é o humano, pela tela.
 */
export async function createCardFromQuote(quote, conversation, { originLabel } = {}) {
  const labelId = await ensureLabel()
  const title = `${quote.projectName}${quote.companyName ? ` — ${quote.companyName}` : ''}`.slice(0, 255)

  const [result] = await pool.query(
    'INSERT INTO kanban_cards (title, description, label_id, run_immediately) VALUES (?, ?, ?, 0)',
    [title, buildDescription(quote, conversation, originLabel), labelId],
  )

  return result.insertId
}
