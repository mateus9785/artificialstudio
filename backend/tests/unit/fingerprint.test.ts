import { statSync, utimesSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CONTENT_DIR, promptFingerprint } from '../../src/services/claudeRunner.ts'
import { SELLER_DIR, sellerFingerprint } from '../../src/services/waSellerRunner.js'

const HEX40 = /^[0-9a-f]{40}$/

/** Muda o mtime de um arquivo real do conteúdo versionado e agenda a restauração exata. */
function bumpMtime(filePath: string, restores: Array<() => void>): void {
  const original = statSync(filePath)
  utimesSync(filePath, new Date(), new Date(Date.now() + 60_000))
  restores.push(() => utimesSync(filePath, original.atime, original.mtime))
}

describe('promptFingerprint (claudeRunner.ts)', () => {
  const restores: Array<() => void> = []
  afterEach(() => {
    restores.splice(0).forEach((restore) => restore())
  })

  it('devolve um hex de 40 caracteres, estável sem mudança de arquivo', () => {
    const fp = promptFingerprint()
    expect(fp).toMatch(HEX40)
    expect(promptFingerprint()).toBe(fp)
  })

  it('muda quando o CLAUDE.md do atendimento é tocado', () => {
    const before = promptFingerprint()
    bumpMtime(path.join(CONTENT_DIR, 'CLAUDE.md'), restores)
    expect(promptFingerprint()).not.toBe(before)
  })
})

describe('sellerFingerprint (waSellerRunner.js)', () => {
  const restores: Array<() => void> = []
  afterEach(() => {
    restores.splice(0).forEach((restore) => restore())
  })

  it('devolve um hex de 40 caracteres, estável sem mudança de arquivo', () => {
    const fp = sellerFingerprint()
    expect(fp).toMatch(HEX40)
    expect(sellerFingerprint()).toBe(fp)
  })

  it('muda quando o CLAUDE.md do vendedor é tocado', () => {
    const before = sellerFingerprint()
    bumpMtime(path.join(SELLER_DIR, 'CLAUDE.md'), restores)
    expect(sellerFingerprint()).not.toBe(before)
  })

  it('tem fingerprint independente do promptFingerprint do atendimento (achado da auditoria: duas funções distintas)', () => {
    expect(sellerFingerprint()).not.toBe(promptFingerprint())
  })
})
