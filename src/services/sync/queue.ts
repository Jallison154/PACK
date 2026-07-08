import { v4 as uuid } from 'uuid'
import { db } from '../../db/database'
import type { SyncOperation, SyncQueueItem, SyncTable } from './types'
import { isCloudSyncEnabled } from './types'

const SYNC_TABLES: SyncTable[] = [
  'people',
  'places',
  'companies',
  'households',
  'interactions',
  'tags',
  'person_tags',
]

export function isSyncableTable(name: string): name is SyncTable {
  return SYNC_TABLES.includes(name as SyncTable)
}

export async function enqueueSyncChange(
  tableName: SyncTable,
  recordId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!isCloudSyncEnabled()) return

  const now = new Date().toISOString()
  await db.run(
    `INSERT OR REPLACE INTO sync_queue (id, table_name, record_id, operation, payload, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [uuid(), tableName, recordId, operation, JSON.stringify(payload), now],
  )
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  const rows = await db.query<{
    id: string
    table_name: string
    record_id: string
    operation: string
    payload: string
    created_at: string
    attempts: number
  }>('SELECT * FROM sync_queue ORDER BY created_at ASC')

  return rows.map((row) => ({
    id: row.id,
    tableName: row.table_name as SyncTable,
    recordId: row.record_id,
    operation: row.operation as SyncOperation,
    payload: row.payload,
    createdAt: row.created_at,
    attempts: row.attempts,
  }))
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await db.run('DELETE FROM sync_queue WHERE id = ?', [id])
}

export async function markSyncQueueAttempt(id: string): Promise<void> {
  await db.run('UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?', [id])
}

export async function clearSyncQueue(): Promise<void> {
  await db.run('DELETE FROM sync_queue')
}

const WRITE_RE =
  /^(INSERT(?:\s+OR\s+REPLACE)?\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-z_]+)/i

export function parseWriteForSync(
  sql: string,
  params: unknown[],
): { table: SyncTable; operation: SyncOperation; recordId: string } | null {
  const match = sql.trim().match(WRITE_RE)
  if (!match) return null

  const verb = match[1].toUpperCase()
  const table = match[2].toLowerCase()
  if (!isSyncableTable(table)) return null

  if (verb.startsWith('DELETE')) {
    const id = params[0]
    return typeof id === 'string'
      ? { table, operation: 'delete', recordId: id }
      : null
  }

  if (verb.startsWith('UPDATE')) {
    const id = params[params.length - 1]
    return typeof id === 'string'
      ? { table, operation: 'update', recordId: id }
      : null
  }

  // INSERT — first param is usually id
  const id = params[0]
  return typeof id === 'string'
    ? { table, operation: 'insert', recordId: id }
    : null
}

export async function loadRowPayload(
  table: SyncTable,
  recordId: string,
): Promise<Record<string, unknown> | null> {
  if (table === 'person_tags') {
    const rows = await db.query(
      'SELECT person_id, tag_id FROM person_tags WHERE person_id = ? OR tag_id = ? LIMIT 1',
      [recordId, recordId],
    )
    return (rows[0] as Record<string, unknown>) ?? null
  }

  const rows = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [recordId])
  return (rows[0] as Record<string, unknown>) ?? null
}
