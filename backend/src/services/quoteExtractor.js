import { runOneShot } from './claudeRunner.js'

/**
 * Extração estruturada do orçamento a partir da transcrição.
 *
 * É uma segunda chamada, sem sessão, e não um bloco JSON pedido no meio da resposta ao cliente: o
 * atendimento e a extração querem coisas opostas do modelo (texto curto de WhatsApp vs objeto
 * completo e literal), e misturar os dois faz vazar JSON para o visitante. Mesma divisão que o
 * pegasus-scout usa no llmAnalyzer.
 */

/**
 * Corta em vez de rejeitar. Os limites existem para caber na coluna do banco, não para julgar a
 * resposta — descartar um orçamento inteiro, bom, porque o nome do projeto veio com 210 caracteres
 * em vez de 200 seria perder uma venda por uma decisão arbitrária nossa.
 */
function clip(value, max) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'null') return null
  return text.slice(0, max)
}

function clipList(value, maxItems, maxChars) {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, maxItems)
    .map((item) => clip(typeof item === 'object' ? JSON.stringify(item) : item, maxChars))
    .filter(Boolean)
}

/** Aceita 18000, "18000", "R$ 18.000,00" e "18.000" — o modelo alterna entre as quatro formas. */
function toMoney(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const cleaned = String(value)
    .replace(/[^\d,.]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const SCHEMA_HINT = `{
  "nome_do_projeto": "titulo curto e especifico em linguagem natural, ex: 'E-commerce de cosmeticos com integracao Bling'. Nao use kebab-case nem nome de pasta",
  "cliente": "nome da pessoa",
  "empresa": "nome da empresa",
  "contato": "whatsapp ou email que a pessoa passou",
  "tipo_de_servico": "landing page | site institucional | e-commerce | chatbot ia | automacao | dashboard | sistema web | erp | app mobile | outro",
  "resumo": "2 a 4 frases sobre o negocio do cliente e a dor que o projeto resolve",
  "requisitos": ["um requisito funcional por item, especifico o suficiente para virar tarefa"],
  "integracoes": ["cada integracao acordada, com o nome do sistema"],
  "valor_min": 18000,
  "valor_max": 18000,
  "mensalidade": 400,
  "prazo_semanas": "8 a 12",
  "condicoes_pagamento": "como ficou combinado",
  "briefing": "briefing tecnico em markdown para a equipe de desenvolvimento"
}`

function buildPrompt(transcript, retry) {
  return `Voce esta lendo a transcricao de um atendimento comercial da Artificial Studio em que o cliente CONFIRMOU o orcamento. Extraia o que foi acordado.

TRANSCRICAO
"""
${transcript}
"""

FORMATO DA RESPOSTA -- responda APENAS com este objeto JSON, sem cerca de codigo e sem texto antes ou depois:
${SCHEMA_HINT}

REGRAS
- Use somente o que esta na transcricao. Nao invente requisito, integracao, valor nem prazo que ninguem citou.
- Se algum campo nao aparecer na conversa, use null (ou lista vazia). Nao chute.
- "valor_min" e "valor_max" sao numeros em reais, sem simbolo e sem separador de milhar. Se foi um valor fechado, repita o mesmo numero nos dois.
- "mensalidade" e o valor mensal recorrente, se houver. Nunca some a mensalidade ao valor do projeto.
- "requisitos" deve ser exaustivo: e a unica coisa que a equipe de desenvolvimento vai receber. Prefira 8 a 20 itens especificos a 3 genericos.
- "briefing" e markdown com secoes de contexto do negocio, escopo funcional, integracoes, regras de negocio citadas pelo cliente e o que ficou explicitamente FORA do escopo.
- Escreva em portugues do Brasil.
- Nao use ferramentas. Tudo que voce precisa esta na transcricao acima.${
    retry
      ? `

ATENCAO: a resposta anterior nao era um JSON valido. Responda SOMENTE com o objeto JSON. Escape aspas duplas dentro das strings e nao use quebra de linha literal dentro de string -- use \\n.`
      : ''
  }`
}

/**
 * Duas camadas de tolerância, ambas por comportamento observado: o envelope do CLI traz o texto em
 * `result`, e esse texto às vezes vem embrulhado em cerca de código apesar da instrução. Recortar do
 * primeiro `{` ao último `}` resolve os dois casos.
 */
export function extractJson(raw) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error(`resposta do claude não contém JSON: ${raw.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

function normalize(parsed) {
  const min = toMoney(parsed.valor_min)
  const max = toMoney(parsed.valor_max)

  return {
    projectName: clip(parsed.nome_do_projeto, 200) || 'Projeto sem nome definido',
    clientName: clip(parsed.cliente, 150),
    companyName: clip(parsed.empresa, 150),
    contact: clip(parsed.contato, 200),
    serviceType: clip(parsed.tipo_de_servico, 100),
    summary: clip(parsed.resumo, 2000),
    requirements: clipList(parsed.requisitos, 40, 500),
    integrations: clipList(parsed.integracoes, 20, 200),
    // Se veio só um dos dois, o outro espelha — a coluna aceita null, mas um card com "de null a
    // 18000" é pior para quem lê do que um valor fechado.
    priceMin: min ?? max,
    priceMax: max ?? min,
    monthly: toMoney(parsed.mensalidade),
    timelineWeeks: clip(parsed.prazo_semanas, 40),
    // 1000, e não 255: o modelo descreve as três formas de pagamento com os valores de cada uma, e
    // no primeiro teste real isso chegou cortado no meio da frase dentro do card.
    paymentTerms: clip(parsed.condicoes_pagamento, 1000),
    briefing: clip(parsed.briefing, 20_000),
  }
}

/**
 * Uma retentativa com o lembrete de escapar aspas. Existe porque JSON sintaticamente inválido por
 * aspas não escapadas dentro de string longa é a falha mais comum aqui — e é muito mais barato
 * tentar de novo do que perder o card de um cliente que acabou de fechar.
 */
export async function extractQuote(transcript) {
  let lastError = null

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const raw = await runOneShot(buildPrompt(transcript, attempt > 1))
    try {
      return normalize(extractJson(raw))
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(`não foi possível extrair o orçamento: ${lastError?.message}`)
}
