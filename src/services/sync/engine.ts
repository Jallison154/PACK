import { db } from '../../db/database'
import { getSupabase } from '../../lib/supabase'
import { isCloudSyncAvailable } from '../../lib/env'
import {
  cloudTableForSync,
  localPersonToCloud,
  localPlaceToCloud,
  withUserId,
} from './mappers'
import { isSoftDeleteTable, sanitizeCloudRow } from './cloudSchema'
import {
  clearSyncQueue,
  listSyncQueue,
  loadRowPayload,
  markSyncQueueAttempt,
  removeSyncQueueItem,
} from './queue'
import { SYNC_STORAGE_KEYS, type SyncStatus } from './types'
import {
  formatSyncError,
  recordSyncError,
  recordSyncSuccess,
} from './diagnostics'
import { logSyncCreate, logSyncDelete, logSyncUpdate } from '../../utils/personLog'
import { classifySyncError, logSupabaseError } from './errors'
import { notifyDataChanged } from './dataEvents'

export type SyncTableName =
  | 'households'
  | 'companies'
  | 'places'
  | 'tags'
  | 'people'
  | 'interactions'
  | 'person_tags'

const SYNC_TABLES: SyncTableName[] = [
  'households',
  'companies',
  'places',
  'tags',
  'people',
  'interactions',
  'person_tags',
]

function rowToUpsertPayload(
  userId: string,
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (table === 'person_tags') {
    return sanitizeCloudRow('person_tags', {
      user_id: userId,
      person_id: row.person_id,
      tag_id: row.tag_id,
      id: row.id ?? `${row.person_id}:${row.tag_id}`,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
  if (table === 'people') return localPersonToCloud(userId, row)
  if (table === 'places') return localPlaceToCloud(userId, row)
  return withUserId(userId, row, table)
}

export function upsertConflictKey(table: string): string {
  return table === 'person_tags' ? 'user_id,person_id,tag_id' : 'id'
}

const LOCAL_COLUMNS: Record<string, string[]> = {
  households: ['id', 'name', 'address', 'shared_notes', 'pets', 'general_notes', 'created_at', 'sync_version'],
  companies: ['id', 'name', 'created_at', 'sync_version'],
  places: [
    'id',
    'name',
    'address',
    'city',
    'state',
    'latitude',
    'longitude',
    'category',
    'mapbox_id',
    'postal_code',
    'country',
    'poi_categories',
    'brand',
    'source',
    'feature_type',
    'notes',
    'is_favorite',
    'created_at',
    'updated_at',
    'sync_version',
    'deleted_at',
  ],
  tags: ['id', 'name', 'created_at', 'sync_version'],
  people: [
    'id',
    'name',
    'workspace',
    'phone',
    'email',
    'company',
    'company_id',
    'job_title',
    'where_met',
    'event',
    'city',
    'state',
    'location_id',
    'where_met_place_id',
    'where_met_latitude',
    'where_met_longitude',
    'where_met_location_source',
    'where_met_location_accuracy',
    'where_met_captured_at',
    'where_met_is_approximate',
    'where_met_area_label',
    'last_seen_place_id',
    'date_met',
    'notes',
    'relationship_type',
    'household_id',
    'home_address',
    'work_location',
    'last_seen_at',
    'last_seen_date',
    'last_interaction_notes',
    'profile_color',
    'is_favorite',
    'created_at',
    'updated_at',
    'sync_version',
    'deleted_at',
  ],
  interactions: [
    'id',
    'person_id',
    'date',
    'location',
    'place_id',
    'interaction_type',
    'notes',
    'next_follow_up',
    'event',
    'created_at',
    'updated_at',
    'sync_version',
  ],
}

function logPushError(
  error: unknown,
  table: string,
  recordId: string,
  userId: string,
  operation: string,
): void {
  logSupabaseError({
    operation: `push ${operation}`,
    table,
    recordId,
    userId,
    ...extractErrorFields(error),
  })
  recordSyncError(error, `push ${table}.${recordId}`)
}

function extractErrorFields(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    return {
      code: e.code != null ? String(e.code) : undefined,
      message: e.message != null ? String(e.message) : undefined,
      details: e.details != null ? String(e.details) : undefined,
      hint: e.hint != null ? String(e.hint) : undefined,
    }
  }
  return { message: String(error) }
}

async function softDeleteRemoteRow(
  userId: string,
  table: 'people' | 'places',
  recordId: string,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const now = new Date().toISOString()
  const { error } = await supabase
    .from(table)
    .update(sanitizeCloudRow(table, { deleted_at: now, updated_at: now }))
    .eq('user_id', userId)
    .eq('id', recordId)

  if (error) throw error
}

async function pushPersonTagsForPerson(userId: string, personId: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const localTags = await db.query<{ person_id: string; tag_id: string }>(
    'SELECT person_id, tag_id FROM person_tags WHERE person_id = ?',
    [personId],
  )

  const { error: deleteError } = await supabase
    .from('person_tags')
    .delete()
    .eq('user_id', userId)
    .eq('person_id', personId)

  if (deleteError) throw deleteError

  if (localTags.length === 0) return

  const now = new Date().toISOString()
  const payload = localTags.map((row) =>
    sanitizeCloudRow('person_tags', {
      user_id: userId,
      person_id: row.person_id,
      tag_id: row.tag_id,
      id: `${row.person_id}:${row.tag_id}`,
      created_at: now,
      updated_at: now,
    }),
  )

  const { error } = await supabase.from('person_tags').upsert(payload, {
    onConflict: upsertConflictKey('person_tags'),
  })

  if (error) throw error
}

export async function enqueuePersonTagsCloudSync(personId: string): Promise<void> {
  const { isCloudSyncEnabled } = await import('./types')
  if (!isCloudSyncEnabled()) return

  const { enqueueSyncChange } = await import('./queue')
  await enqueueSyncChange('person_tags', personId, 'update', {
    person_id: personId,
    sync_all_tags: true,
  })
}

export async function pushSyncQueue(userId: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  const queue = await listSyncQueue()
  let pushed = 0
  let firstError: unknown = null

  for (const item of queue) {
    const cloudTable = cloudTableForSync(item.tableName)
    if (!cloudTable) {
      await removeSyncQueueItem(item.id)
      continue
    }

    try {
      if (item.operation === 'delete') {
        if (item.tableName === 'person_tags') {
          const { error } = await supabase
            .from('person_tags')
            .delete()
            .eq('user_id', userId)
            .eq('person_id', item.recordId)
          if (error) throw error
        } else if (isSoftDeleteTable(item.tableName)) {
          await softDeleteRemoteRow(userId, item.tableName, item.recordId)
        } else {
          const { error } = await supabase
            .from(cloudTable)
            .delete()
            .eq('user_id', userId)
            .eq('id', item.recordId)
          if (error) throw error
        }
        logSyncDelete(item.tableName, item.recordId, 'pushed')
      } else if (item.tableName === 'person_tags') {
        const payload = JSON.parse(item.payload) as Record<string, unknown>
        if (payload.sync_all_tags) {
          await pushPersonTagsForPerson(userId, item.recordId)
          logSyncUpdate(item.tableName, item.recordId, 'pushed-tags')
        } else {
          const row =
            Object.keys(payload).length > 1
              ? payload
              : ((await loadRowPayload(item.tableName, item.recordId)) ?? payload)
          const upsert = rowToUpsertPayload(userId, item.tableName, row)
          const { error } = await supabase.from('person_tags').upsert(upsert, {
            onConflict: upsertConflictKey('person_tags'),
          })
          if (error) throw error
          logSyncUpdate(item.tableName, item.recordId, 'pushed')
        }
      } else {
        const payload = JSON.parse(item.payload) as Record<string, unknown>
        const row =
          Object.keys(payload).length > 1 && !payload.sync_all_tags
            ? payload
            : ((await loadRowPayload(item.tableName, item.recordId)) ?? payload)

        const upsert = rowToUpsertPayload(userId, item.tableName, row)

        if (!upsert.id || typeof upsert.id !== 'string') {
          throw new Error(`Missing record id for ${item.tableName}.${item.recordId}`)
        }

        const { error } = await supabase.from(cloudTable).upsert(upsert, {
          onConflict: upsertConflictKey(item.tableName),
        })

        if (error) throw error

        if (item.operation === 'insert') {
          logSyncCreate(item.tableName, item.recordId, 'pushed')
        } else {
          logSyncUpdate(item.tableName, item.recordId, 'pushed')
        }
      }

      await removeSyncQueueItem(item.id)
      pushed++
    } catch (error) {
      firstError ??= error
      logPushError(error, item.tableName, item.recordId, userId, item.operation)
      await markSyncQueueAttempt(item.id)
    }
  }

  if (firstError) {
    throw new Error(`Some local changes did not sync: ${classifySyncError(firstError)}`)
  }

  return pushed
}

export async function applyRemoteRow(
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const local = { ...row }
  delete local.user_id

  if (table === 'people' || table === 'places') {
    if ('is_favorite' in local) local.is_favorite = local.is_favorite ? 1 : 0
  }

  if (table === 'person_tags') {
    await db.run(`INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)`, [
      local.person_id,
      local.tag_id,
    ])
    return
  }

  const allowed = LOCAL_COLUMNS[table]
  if (!allowed) return

  for (const key of Object.keys(local)) {
    if (!allowed.includes(key)) delete local[key]
  }

  const recordId = local.id
  if (typeof recordId !== 'string' || !recordId) return

  const columns = Object.keys(local)
  if (columns.length === 0) return

  const existingRows = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [recordId])

  if (existingRows.length > 0) {
    const existing = existingRows[0] as Record<string, unknown>
    const localUpdated = String(existing.updated_at ?? existing.created_at ?? '')
    const cloudUpdated = String(local.updated_at ?? local.created_at ?? '')

    if (localUpdated && cloudUpdated && localUpdated > cloudUpdated) {
      return
    }

    local.created_at = existing.created_at

    const setColumns = columns.filter((column) => column !== 'id' && column !== 'created_at')
    if (setColumns.length === 0) return

    const setClause = setColumns.map((column) => `${column} = ?`).join(', ')
    const values = [...setColumns.map((column) => local[column]), recordId]

    await db.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values)
    return
  }

  const placeholders = columns.map(() => '?').join(', ')
  const values = columns.map((column) => local[column])
  await db.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values)
}

export interface PullRemoteResult {
  merged: number
  peopleDownloaded: number
}

export async function pullRemoteChanges(userId: string): Promise<PullRemoteResult> {
  const supabase = getSupabase()
  if (!supabase) return { merged: 0, peopleDownloaded: 0 }

  let merged = 0
  let peopleDownloaded = 0

  for (const table of SYNC_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
    if (error) {
      logSupabaseError({
        operation: 'pull',
        table,
        userId,
        ...extractErrorFields(error),
      })
      throw error
    }
    if (!data) continue
    if (table === 'people') peopleDownloaded = data.length

    for (const row of data) {
      await db.withoutSyncNotifications(() =>
        applyRemoteRow(table, row as Record<string, unknown>),
      )
      merged++
    }
  }

  notifyDataChanged('sync', [...SYNC_TABLES])
  localStorage.setItem(SYNC_STORAGE_KEYS.initialCloudDownloadAt, new Date().toISOString())
  localStorage.setItem(SYNC_STORAGE_KEYS.initialCloudPeopleDownloaded, String(peopleDownloaded))
  return { merged, peopleDownloaded }
}

export async function pullCloudDataOnly(userId: string): Promise<PullRemoteResult> {
  return pullRemoteChanges(userId)
}

export async function runFullSync(userId: string): Promise<{ pushed: number; pulled: number }> {
  if (!navigator.onLine) throw new Error('Network offline')
  const pushed = await pushSyncQueue(userId)
  const { merged } = await pullRemoteChanges(userId)
  recordSyncSuccess()
  return { pushed, pulled: merged }
}

export async function runInitialCloudSync(userId: string): Promise<{
  pushed: number
  pulled: number
  peopleDownloaded: number
}> {
  if (!navigator.onLine) throw new Error('Network offline')
  const { merged, peopleDownloaded } = await pullRemoteChanges(userId)
  const pushed = await pushSyncQueue(userId)
  recordSyncSuccess()
  return { pushed, pulled: merged, peopleDownloaded }
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(SYNC_STORAGE_KEYS.lastSyncSuccessAt)
}

export function getSyncStatusLabel(
  status: SyncStatus,
  lastSync: string | null,
  isLoggedIn: boolean,
): string {
  if (!isCloudSyncAvailable()) return 'Cloud sync not configured'
  if (!isLoggedIn) return 'Local only — sign in to sync'
  switch (status) {
    case 'starting':
      return 'Syncing…'
    case 'restoring_session':
      return 'Restoring session…'
    case 'downloading':
      return 'Downloading your Pack…'
    case 'uploading':
      return 'Uploading changes…'
    case 'offline':
      return 'Offline — changes queued'
    case 'saved_locally':
      return 'Saved locally. Pack Sync will retry.'
    case 'error':
      return 'Saved locally. Pack Sync will retry.'
    case 'disabled':
      return 'Local only'
    default:
      return lastSync ? `Up to date ${new Date(lastSync).toLocaleString()}` : 'Starting'
  }
}

export async function uploadLocalDatabaseToCloud(userId: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Cloud sync is not configured')

  let uploaded = 0

  for (const table of SYNC_TABLES) {
    if (table === 'person_tags') continue

    const rows = await db.query(`SELECT * FROM ${table}`)
    if (rows.length === 0) continue

    const payload = rows.map((row) =>
      rowToUpsertPayload(userId, table, row as Record<string, unknown>),
    )

    const { error } = await supabase.from(table).upsert(payload, {
      onConflict: upsertConflictKey(table),
    })
    if (error) {
      logSupabaseError({
        operation: 'migration upload',
        table,
        userId,
        ...extractErrorFields(error),
      })
      throw error
    }
    uploaded += payload.length
  }

  const people = await db.query<{ id: string }>('SELECT id FROM people')
  for (const person of people) {
    await pushPersonTagsForPerson(userId, person.id)
  }

  await clearSyncQueue()
  localStorage.setItem(SYNC_STORAGE_KEYS.migrationDone, 'true')
  recordSyncSuccess()
  notifyDataChanged('sync')
  return uploaded
}

export async function deleteCloudAccountData(userId: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const tables = [
    'interactions',
    'person_tags',
    'people',
    'tags',
    'places',
    'companies',
    'households',
    'user_settings',
    'backups',
    'profiles',
  ] as const

  for (const table of tables) {
    const query = supabase.from(table).delete()
    const { error } =
      table === 'profiles' ? await query.eq('id', userId) : await query.eq('user_id', userId)
    if (error) {
      logSupabaseError({
        operation: 'delete account',
        table,
        userId,
        ...extractErrorFields(error),
      })
      throw error
    }
  }
}

export { formatSyncError }
