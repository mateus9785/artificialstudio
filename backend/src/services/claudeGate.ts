const MAX_CONCURRENT = Number(process.env.AI_CHAT_MAX_CONCURRENT) || 1
const MAX_QUEUE_DEPTH = Number(process.env.AI_CHAT_MAX_QUEUE_DEPTH) || 8

export class ClaudeQueueFullError extends Error {}

let running = 0
const queue: Array<() => void> = []

function tryRunNext(): void {
  if (running >= MAX_CONCURRENT || queue.length === 0) return
  running++
  // queue.length === 0 já foi descartado acima, então isto nunca é undefined.
  const next = queue.shift()!
  next()
}

function release(): void {
  running--
  tryRunNext()
}

/**
 * Garante no máximo `AI_CHAT_MAX_CONCURRENT` processos `claude` simultâneos. Cada subprocesso come
 * memória de verdade, e o backend divide a máquina com o MySQL — deixar dois turnos rodando junto na
 * Lightsail derruba os dois. Acima de `AI_CHAT_MAX_QUEUE_DEPTH` esperando, rejeita na hora em vez de
 * deixar a fila crescer sem limite (o visitante prefere um "estou ocupado" a esperar cinco minutos).
 */
export async function withClaudeGate<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT && queue.length >= MAX_QUEUE_DEPTH) {
    throw new ClaudeQueueFullError('Fila de atendimento cheia.')
  }

  await new Promise<void>((resolve) => {
    queue.push(resolve)
    tryRunNext()
  })

  try {
    return await task()
  } finally {
    release()
  }
}

export interface GateStats {
  running: number
  queued: number
  maxConcurrent: number
}

export function gateStats(): GateStats {
  return { running, queued: queue.length, maxConcurrent: MAX_CONCURRENT }
}
