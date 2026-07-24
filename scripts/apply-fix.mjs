#!/usr/bin/env node
/**
 * Applies pending Supabase SQL migrations (0008+).
 *
 * Set SUPABASE_DB_URL in .env (Dashboard → Project Settings → Database → URI).
 * Then run: npm run db:fix
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const migrationsDir = path.join(root, 'supabase/migrations')

function loadEnv() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

loadEnv()

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
if (!dbUrl) {
  console.error(`
Missing SUPABASE_DB_URL in .env

Run the SQL files manually in Supabase Dashboard → SQL Editor:
  - supabase/migrations/0008_fix_rls_recursion.sql
  - supabase/migrations/0009_username_choice.sql
  - supabase/migrations/0010_username_duplicates.sql
  Or paste the combined file: supabase/APPLY_NOW.sql
`)
  process.exit(1)
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => /^000[89]_/.test(f) || /^00[1-9][0-9]_/.test(f))
  .sort()

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`Applying ${file} …`)
    await client.query(sql)
  }
  console.log('Done. Restart the dev server.')
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await client.end()
}
