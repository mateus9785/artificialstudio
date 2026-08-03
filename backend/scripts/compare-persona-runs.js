/**
 * Compara dois runs do test-personas-wa.js (baseline vs. iteração de prompt).
 *
 *   node scripts/compare-persona-runs.js tests/personas-wa/results-A.json tests/personas-wa/results-B.json
 *
 * Imprime o delta de média do judge e de violações de código por persona, e o agregado.
 * Personas que só existem em um dos runs são listadas à parte.
 */
import fs from 'node:fs'

const [fileA, fileB] = process.argv.slice(2)
if (!fileA || !fileB) {
  console.error('uso: node scripts/compare-persona-runs.js <baseline.json> <novo.json>')
  process.exit(1)
}

const a = JSON.parse(fs.readFileSync(fileA, 'utf-8'))
const b = JSON.parse(fs.readFileSync(fileB, 'utf-8'))

const fmt = (n) => (n === null || n === undefined ? '—' : n.toFixed(1))
const delta = (x, y) => {
  if (x === null || x === undefined || y === null || y === undefined) return '—'
  const d = y - x
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}`
}

console.log(`\nBaseline: ${a.label} (${a.data}, prompts ${a.fingerprint.slice(0, 8)})`)
console.log(`Novo:     ${b.label} (${b.data}, prompts ${b.fingerprint.slice(0, 8)})\n`)

const byId = (run) => new Map(run.personas.map((p) => [p.id, p]))
const mapA = byId(a)
const mapB = byId(b)

const rows = []
for (const [id, pa] of mapA) {
  const pb = mapB.get(id)
  if (!pb) continue
  rows.push({
    id,
    nome: pa.nome,
    mediaA: pa.mediaNotas,
    mediaB: pb.mediaNotas,
    violA: pa.violations.length,
    violB: pb.violations.length,
    aprovA: pa.judge?.aprovado,
    aprovB: pb.judge?.aprovado,
  })
}

const pad = (s, n) => String(s).padEnd(n)
console.log(pad('#', 4) + pad('Persona', 44) + pad('média', 14) + pad('Δ', 7) + pad('violações', 12) + 'aprovado')
console.log('-'.repeat(95))
for (const r of rows.sort((x, y) => x.id - y.id)) {
  console.log(
    pad(r.id, 4) +
      pad(r.nome.slice(0, 42), 44) +
      pad(`${fmt(r.mediaA)} -> ${fmt(r.mediaB)}`, 14) +
      pad(delta(r.mediaA, r.mediaB), 7) +
      pad(`${r.violA} -> ${r.violB}`, 12) +
      `${r.aprovA ? 'sim' : 'não'} -> ${r.aprovB ? 'sim' : 'não'}`,
  )
}

console.log('-'.repeat(95))
console.log(
  pad('', 4) +
    pad('AGREGADO', 44) +
    pad(`${fmt(a.resumo.mediaGeral)} -> ${fmt(b.resumo.mediaGeral)}`, 14) +
    pad(delta(a.resumo.mediaGeral, b.resumo.mediaGeral), 7) +
    pad(`${a.resumo.violacoesDeCodigo} -> ${b.resumo.violacoesDeCodigo}`, 12) +
    `${a.resumo.aprovadas}/${a.resumo.total} -> ${b.resumo.aprovadas}/${b.resumo.total}`,
)

const onlyA = [...mapA.keys()].filter((id) => !mapB.has(id))
const onlyB = [...mapB.keys()].filter((id) => !mapA.has(id))
if (onlyA.length) console.log(`\nSó no baseline: ${onlyA.join(', ')}`)
if (onlyB.length) console.log(`Só no novo: ${onlyB.join(', ')}`)
console.log('')
