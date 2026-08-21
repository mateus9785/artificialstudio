import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeChildProcess } from '../support/fakeChildProcess.ts'

const spawnMock = vi.fn()
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

let claudeRunner: typeof import('../../src/services/claudeRunner.ts')

beforeEach(async () => {
  vi.resetModules()
  spawnMock.mockReset()
  claudeRunner = await import('../../src/services/claudeRunner.ts')
})

function respondWithEnvelope(child: FakeChildProcess, envelope: Record<string, unknown>): void {
  child.emitStdout(JSON.stringify(envelope))
  child.emitClose(0)
}

describe('runPrompt (claude subprocess mockado via node:child_process)', () => {
  it('resolve com o result do envelope no caminho feliz e escreve o prompt no stdin', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await Promise.resolve()
    await Promise.resolve()
    respondWithEnvelope(child, { result: 'resposta do claude', session_id: 'abc123' })

    await expect(promise).resolves.toBe('resposta do claude')
    expect(child.stdinWritten).toEqual(['oi'])
    expect(child.stdinEnded).toBe(true)
  })

  it('rejeita com o stderr truncado quando claude sai com código != 0', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await Promise.resolve()
    await Promise.resolve()
    child.emitStderr('deu ruim')
    child.emitClose(1)

    await expect(promise).rejects.toThrow(/claude falhou \(código 1\): deu ruim/)
  })

  it('rejeita com ClaudeNotInstalledError quando o binário não existe (ENOENT)', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await Promise.resolve()
    await Promise.resolve()
    const err = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' })
    child.emitError(err)

    await expect(promise).rejects.toBeInstanceOf(claudeRunner.ClaudeNotInstalledError)
  })

  it('rejeita quando o envelope reporta is_error', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runPrompt('oi')
    await Promise.resolve()
    await Promise.resolve()
    respondWithEnvelope(child, { is_error: true, result: 'algo deu errado' })

    await expect(promise).rejects.toThrow(/claude retornou erro: algo deu errado/)
  })

  it('mata o processo e rejeita por timeout (AI_CHAT_TIMEOUT_MS=100 no vitest.config)', async () => {
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

describe('runChatTurn', () => {
  it('sessão nova: não manda --resume e devolve o session_id do envelope', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const promise = claudeRunner.runChatTurn({ sessionId: null, visitorText: 'oi', history: null })
    await Promise.resolve()
    await Promise.resolve()
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
    await Promise.resolve()
    await Promise.resolve()
    respondWithEnvelope(child, { result: 'continuando', session_id: 'sessao-velha' })
    await promise

    const args = spawnMock.mock.calls[0][1] as string[]
    expect(args).toContain('--resume')
    expect(args[args.indexOf('--resume') + 1]).toBe('sessao-velha')
  })
})
