import { EventEmitter } from 'node:events'

/**
 * Dublê mínimo de `ChildProcess` — só o que `runClaudeProcess` (claudeRunner.ts) realmente usa:
 * `.stdout`/`.stderr` como EventEmitter de `data`, `.on('error'|'close', ...)`, `.stdin.write/end`,
 * `.kill()`. Os testes disparam os eventos manualmente pra simular o `claude` real sem chamá-lo.
 */
export class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  stdinWritten: string[] = []
  stdinEnded = false
  killed = false

  stdin = {
    on: (_event: string, _cb: (err: Error) => void) => {},
    write: (chunk: string): void => {
      this.stdinWritten.push(chunk)
    },
    end: (): void => {
      this.stdinEnded = true
    },
  }

  kill(): void {
    this.killed = true
  }

  emitStdout(chunk: string): void {
    this.stdout.emit('data', chunk)
  }

  emitStderr(chunk: string): void {
    this.stderr.emit('data', chunk)
  }

  emitClose(code: number): void {
    this.emit('close', code)
  }

  emitError(err: NodeJS.ErrnoException): void {
    this.emit('error', err)
  }
}
