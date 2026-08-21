import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeChildProcess } from '../support/fakeChildProcess.ts'

const spawnMock = vi.fn()
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

let claudeRunner: typeof import('../../src/services/claudeRunner.ts')

function respondWithEnvelope(child: FakeChildProcess, envelope: Record<string, unknown>): void {
  child.emitStdout(JSON.stringify(envelope))
  child.emitClose(0)
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

/**
 * Cada describe seta suas próprias env vars antes do import dinâmico (TIMEOUT_MS/MAX_RETRIES são
 * lidas uma vez, no carregamento do módulo) e reimporta do zero — evita um teste vazar timeout ou
 * política de retry pro próximo. TIMEOUT_MS fica alto (60s) em todo lugar que não testa timeout de
 * propósito, pra nunca competir de verdade com o relógio real.
 */
describe('runPrompt (sem retry, mapeamento de erro de uma tentativa)', () => {
  beforeEach(async () => {
    vi.resetModules()
    spawnMock.mockReset()
    process.env.AI_CHAT_MAX_RETRIES = '0'
    process.env.AI_CHAT_TIMEOUT_MS = '60000'
    claudeRunner = await import('../../src/services/claudeRunner.ts')
  })

  afterEach(() => {
    delete process.env.AI_CHAT_MAX_RETRIES
    delete process.env.AI_CHAT_TIMEOUT_MS
  })

  it('resolve com o result do envelope no caminho feliz e escreve o prompt no stdin', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await settle()
    respondWithEnvelope(child, { result: 'resposta do claude', session_id: 'abc123' })

    await expect(promise).resolves.toBe('resposta do claude')
    expect(child.stdinWritten).toEqual(['oi'])
    expect(child.stdinEnded).toBe(true)
  })

  it('rejeita com o stderr truncado quando claude sai com código != 0', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await settle()
    child.emitStderr('deu ruim')
    child.emitClose(1)

    await expect(promise).rejects.toThrow(/claude falhou \(código 1\): deu ruim/)
  })

  it('rejeita com ClaudeNotInstalledError quando o binário não existe (ENOENT)', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await settle()
    const err = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' })
    child.emitError(err)

    await expect(promise).rejects.toBeInstanceOf(claudeRunner.ClaudeNotInstalledError)
  })

  it('rejeita quando o envelope reporta is_error', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await settle()
    respondWithEnvelope(child, { is_error: true, result: 'algo deu errado' })

    await expect(promise).rejects.toThrow(/claude retornou erro: algo deu errado/)
  })
})

describe('runPrompt: timeout', () => {
  beforeEach(async () => {
    vi.resetModules()
    spawnMock.mockReset()
    process.env.AI_CHAT_MAX_RETRIES = '0'
    process.env.AI_CHAT_TIMEOUT_MS = '100'
    claudeRunner = await import('../../src/services/claudeRunner.ts')
  })

  afterEach(() => {
    delete process.env.AI_CHAT_MAX_RETRIES
    delete process.env.AI_CHAT_TIMEOUT_MS
  })

  it('mata o processo e rejeita por timeout', async () => {
    vi.useFakeTimers()
    try {
      const child = new FakeChildProcess()
      spawnMock.mockReturnValue(child)

      const promise = claudeRunner.runPrompt('oi')
      const assertion = expect(promise).rejects.toThrow(/excedeu o timeout de 100ms/)
      await vi.advanceTimersByTimeAsync(150)
      await assertion

      expect(child.killed).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('runClaudeProcess: retry com backoff', () => {
  beforeEach(async () => {
    vi.resetModules()
    spawnMock.mockReset()
    process.env.AI_CHAT_MAX_RETRIES = '2'
    process.env.AI_CHAT_RETRY_BASE_DELAY_MS = '1000'
    process.env.AI_CHAT_TIMEOUT_MS = '60000'
    claudeRunner = await import('../../src/services/claudeRunner.ts')
  })

  afterEach(() => {
    delete process.env.AI_CHAT_MAX_RETRIES
    delete process.env.AI_CHAT_RETRY_BASE_DELAY_MS
    delete process.env.AI_CHAT_TIMEOUT_MS
  })

  it('tenta de novo após falha transitória e resolve se a tentativa seguinte funcionar', async () => {
    vi.useFakeTimers()
    try {
      const children = [new FakeChildProcess(), new FakeChildProcess()]
      let call = 0
      spawnMock.mockImplementation(() => children[call++])

      const promise = claudeRunner.runPrompt('oi')

      await settle()
      children[0].emitStderr('falha transitória')
      children[0].emitClose(1)

      await vi.advanceTimersByTimeAsync(1000) // backoff da 1ª tentativa: 1000 * 2^0
      await settle()
      children[1].emitStdout(JSON.stringify({ result: 'ok na segunda tentativa' }))
      children[1].emitClose(0)

      await expect(promise).resolves.toBe('ok na segunda tentativa')
      expect(spawnMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('esgota as tentativas (original + MAX_RETRIES) e rejeita com o erro da última', async () => {
    vi.useFakeTimers()
    try {
      const children = [new FakeChildProcess(), new FakeChildProcess(), new FakeChildProcess()]
      let call = 0
      spawnMock.mockImplementation(() => children[call++])

      const promise = claudeRunner.runPrompt('oi')
      const assertion = expect(promise).rejects.toThrow(/código 1/)

      await settle()
      children[0].emitClose(1)
      await vi.advanceTimersByTimeAsync(1000) // backoff: 1000 * 2^0
      await settle()
      children[1].emitClose(1)
      await vi.advanceTimersByTimeAsync(2000) // backoff: 1000 * 2^1
      await settle()
      children[2].emitClose(1)

      await assertion
      expect(spawnMock).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('não tenta de novo quando o binário não está instalado (ENOENT não é retentável)', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await settle()
    const err = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' })
    child.emitError(err)

    await expect(promise).rejects.toBeInstanceOf(claudeRunner.ClaudeNotInstalledError)
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })
})

describe('runChatTurn', () => {
  beforeEach(async () => {
    vi.resetModules()
    spawnMock.mockReset()
    process.env.AI_CHAT_MAX_RETRIES = '0'
    process.env.AI_CHAT_TIMEOUT_MS = '60000'
    claudeRunner = await import('../../src/services/claudeRunner.ts')
  })

  afterEach(() => {
    delete process.env.AI_CHAT_MAX_RETRIES
    delete process.env.AI_CHAT_TIMEOUT_MS
  })

  it('sessão nova: não manda --resume e devolve o session_id do envelope', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runChatTurn({ sessionId: null, visitorText: 'oi', history: null })
    await settle()
    respondWithEnvelope(child, { result: 'ola', session_id: 'novo-id' })
    const turn = await promise

    expect(turn.reply).toBe('ola')
    expect(turn.sessionId).toBe('novo-id')
    const args = spawnMock.mock.calls[0][1] as string[]
    expect(args).not.toContain('--resume')
  })

  it('sessão existente: manda --resume com o sessionId', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runChatTurn({ sessionId: 'sessao-velha', visitorText: 'segue', history: 'oi\nolá' })
    await settle()
    respondWithEnvelope(child, { result: 'continuando', session_id: 'sessao-velha' })
    await promise

    const args = spawnMock.mock.calls[0][1] as string[]
    expect(args).toContain('--resume')
    expect(args[args.indexOf('--resume') + 1]).toBe('sessao-velha')
  })
})
