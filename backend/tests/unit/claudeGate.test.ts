import { beforeEach, describe, expect, it, vi } from 'vitest'

// claudeGate.ts guarda `running`/`queue` em variáveis de módulo — sem resetModules() cada teste
// herdaria o estado do anterior. Reimportar do zero a cada `it` dá um gate limpo sempre.
let gate: typeof import('../../src/services/claudeGate.ts')

beforeEach(async () => {
  vi.resetModules()
  gate = await import('../../src/services/claudeGate.ts')
})

describe('gateStats', () => {
  it('starts empty, respeitando o limite padrão (MAX_CONCURRENT=1)', () => {
    expect(gate.gateStats()).toEqual({ running: 0, queued: 0, maxConcurrent: 1 })
  })
})

describe('withClaudeGate', () => {
  it('roda a task e devolve o resultado dela', async () => {
    const result = await gate.withClaudeGate(async () => 42)
    expect(result).toBe(42)
    expect(gate.gateStats()).toEqual({ running: 0, queued: 0, maxConcurrent: 1 })
  })

  it('libera o slot mesmo quando a task lança', async () => {
    await expect(
      gate.withClaudeGate(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(gate.gateStats().running).toBe(0)
  })

  it('serializa além de MAX_CONCURRENT (padrão 1) em vez de rodar em paralelo', async () => {
    const order: string[] = []
    let releaseFirst: () => void = () => {}

    const first = gate.withClaudeGate(async () => {
      order.push('first-start')
      await new Promise<void>((resolve) => {
        releaseFirst = resolve
      })
      order.push('first-end')
    })
    await Promise.resolve()
    await Promise.resolve()

    const second = gate.withClaudeGate(async () => {
      order.push('second-start')
    })
    await Promise.resolve()
    await Promise.resolve()

    // `second` ainda não pode ter começado — só `first` está rodando, `second` está na fila.
    expect(order).toEqual(['first-start'])
    expect(gate.gateStats()).toEqual({ running: 1, queued: 1, maxConcurrent: 1 })

    releaseFirst()
    await first
    await second

    expect(order).toEqual(['first-start', 'first-end', 'second-start'])
  })

  it('rejeita com ClaudeQueueFullError quando a fila está saturada', async () => {
    // O slot rodando fica ocupado por uma task controlada manualmente. As 8 da fila (limite padrão
    // de MAX_QUEUE_DEPTH) são no-ops — resolvem sozinhas assim que chega a vez delas, então não
    // precisam de um resolver externo (que só seria registrado quando cada uma De fato começasse a
    // rodar, não no momento em que é enfileirada — tentar liberar todas de uma vez de fora trava).
    let releaseFirst: () => void = () => {}
    const first = gate.withClaudeGate(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve
        }),
    )

    const queued = Array.from({ length: 8 }, () => gate.withClaudeGate(async () => {}))

    expect(gate.gateStats()).toEqual({ running: 1, queued: 8, maxConcurrent: 1 })
    await expect(gate.withClaudeGate(async () => {})).rejects.toBeInstanceOf(gate.ClaudeQueueFullError)

    releaseFirst()
    await first
    await Promise.all(queued)
    expect(gate.gateStats()).toEqual({ running: 0, queued: 0, maxConcurrent: 1 })
  })
})
