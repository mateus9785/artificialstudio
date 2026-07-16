import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')

const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)

async function migrate() {
  const connection = await pool.getConnection()
  try {
    for (const statement of statements) {
      await connection.query(statement)
    }
    console.log(`Migração concluída: ${statements.length} statements aplicados.`)
  } finally {
    connection.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Falha na migração:', err)
  process.exit(1)
})
