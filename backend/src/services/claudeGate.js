const MAX_CONCURRENT = Number(process.env.AI_CHAT_MAX_CONCURRENT) || 1
const MAX_QUEUE_DEPTH = Number(process.env.AI_CHAT_MAX_QUEUE_DEPTH) || 8

export class ClaudeQueueFullError extends Error {}

let running = 0
const queue = []

function tryRunNext() {
  if (running >= MAX_CONCURRENT || queue.length === 0) return
  running++
  const next = queue.shift()
  next()
}

function release() {
  running--
  tryRunNext()
}

/**
 * Garante no máximo `AI_CHAT_MAX_CONCURRENT` processos `claude` simultâneos. Cada subprocesso come
 * memória de verdade, e o backend divide a máquina com o MySQL — deixar dois turnos rodando junto na
 * Lightsail derruba os dois. Acima de `AI_CHAT_MAX_QUEUE_DEPTH` esperando, rejeita na hora em vez de
 * deixar a fila crescer sem limite (o visitante prefere um "estou ocupado" a esperar cinco minutos).
 */
export async function withClaudeGate(task) {
  if (running >= MAX_CONCURRENT && queue.length >= MAX_QUEUE_DEPTH) {
    throw new ClaudeQueueFullError('Fila de atendimento cheia.')
  }

  await new Promise((resolve) => {
    queue.push(resolve)
    tryRunNext()
  })

  try {
    return await task()
  } finally {
    release()
  }
}

export function gateStats() {
  return { running, queued: queue.length, maxConcurrent: MAX_CONCURRENT }
}
