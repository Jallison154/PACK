import { db } from '../../db/database'
import { getSupabase } from '../../lib/supabase'
import { isCloudSyncAvailable } from '../../lib/env'
import {
  cloudTableForSync,
  localPersonToCloud,
  localPlaceToCloud,
  withUserId,
} from './mappers'
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

function rowToUpsertPayload(
  userId: string,
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (table === 'people') return localPersonToCloud(userId, row)
  if (table === 'places') return localPlaceToCloud(userId, row)
  if (table === 'person_tags') {
    return {
      user_id: userId,
      person_id: row.person_id,
      tag_id: row.tag_id,
    }
  }
  return withUserId(userId, row)
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
    'notes',
    'is_favorite',
    'created_at',
    'sync_version',
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
        const { error } = await supabase
          .from(cloudTable)
          .delete()
          .eq('user_id', userId)
          .eq(cloudTable === 'person_tags' ? 'person_id' : 'id', item.recordId)
        if (error) throw error
      } else {
        const payload = JSON.parse(item.payload) as Record<string, unknown>
        const row =
          Object.keys(payload).length > 1
            ? payload
            : ((await loadRowPayload(item.tableName, item.recordId)) ?? payload)
        const upsert = rowToUpsertPayload(userId, item.tableName, row)
        const { error } = await supabase.from(cloudTable).upsert(upsert)
        if (error) throw error
      }

      await removeSyncQueueItem(item.id)
      pushed++
    } catch (error) {
      firstError ??= error
      recordSyncError(error, `push ${item.tableName}.${item.recordId}`)
      await markSyncQueueAttempt(item.id)
    }
  }

  if (firstError) {
    throw new Error(`Some local changes did not sync: ${formatSyncError(firstError)}`)
  }

  return pushed
}

export async function pullRemoteChanges(userId: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  let merged = 0
  const tables = [
    'households',
    'companies',
    'places',
    'tags',
    'people',
    'interactions',
    'person_tags',
  ] as const

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
    if (error) {
      recordSyncError(error, `pull ${table}`)
      throw error
    }
    if (!data) continue

    for (const row of data) {
      await db.withoutSyncNotifications(() =>
        upsertLocalFromCloud(table, row as Record<string, unknown>),
      )
      merged++
    }
  }

  return merged
}

async function upsertLocalFromCloud(
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const local = { ...row }
  delete local.user_id

  if (table === 'people' || table === 'places') {
    if ('is_favorite' in local) local.is_favorite = local.is_favorite ? 1 : 0
  }

  if (table === 'person_tags') {
    await db.run(
      `INSERT OR REPLACE INTO person_tags (person_id, tag_id) VALUES (?, ?)`,
      [local.person_id, local.tag_id],
    )
    return
  }

  const allowed = LOCAL_COLUMNS[table]
  if (!allowed) return
  for (const key of Object.keys(local)) {
    if (!allowed.includes(key)) delete local[key]
  }

  const columns = Object.keys(local)
  if (columns.length === 0) return
  const placeholders = columns.map(() => '?').join(', ')
  const values = columns.map((c) => local[c])

  await db.run(
    `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values,
  )
}

export async function runFullSync(userId: string): Promise<{ pushed: number; pulled: number }> {
  if (!navigator.onLine) throw new Error('offline')
  const pushed = await pushSyncQueue(userId)
  const pulled = await pullRemoteChanges(userId)
  recordSyncSuccess()
  return { pushed, pulled }
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
    case 'syncing':
      return 'Syncing…'
    case 'offline':
      return 'Offline — changes queued'
    case 'error':
      return 'Sync error — will retry'
    case 'disabled':
      return 'Local only'
    default:
      return lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : 'Ready to sync'
  }
}

export async function uploadLocalDatabaseToCloud(userId: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Cloud sync is not configured')

  const tables = [
    'households',
    'companies',
    'places',
    'tags',
    'people',
    'person_tags',
    'interactions',
  ] as const

  let uploaded = 0

  for (const table of tables) {
    const rows = await db.query(`SELECT * FROM ${table}`)
    if (rows.length === 0) continue

    const payload = rows.map((row) =>
      rowToUpsertPayload(userId, table, row as Record<string, unknown>),
    )

    const { error } = await supabase.from(table).upsert(payload, {
      onConflict: table === 'person_tags' ? 'user_id,person_id,tag_id' : 'id',
    })
    if (error) {
      recordSyncError(error, `migration ${table}`)
      throw error
    }
    uploaded += payload.length
  }

  await clearSyncQueue()
  localStorage.setItem(SYNC_STORAGE_KEYS.migrationDone, 'true')
  recordSyncSuccess()
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
      recordSyncError(error, `delete account ${table}`)
      throw error
    }
  }
}
