export type SyncTable =
  | 'people'
  | 'places'
  | 'companies'
  | 'households'
  | 'interactions'
  | 'tags'
  | 'person_tags'

export type SyncOperation = 'insert' | 'update' | 'delete'

export interface SyncQueueItem {
  id: string
  tableName: SyncTable
  recordId: string
  operation: SyncOperation
  payload: string
  createdAt: string
  attempts: number
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'disabled'

export const SYNC_STORAGE_KEYS = {
  mode: 'pack_sync_mode',
  lastSyncAt: 'pack_last_sync_at',
  lastSyncAttemptAt: 'pack_last_sync_attempt_at',
  lastSyncSuccessAt: 'pack_last_sync_success_at',
  lastSyncError: 'pack_last_sync_error',
  promptDismissed: 'pack_sync_prompt_dismissed',
  migrationDone: 'pack_cloud_migration_done',
} as const

export type SyncMode = 'local' | 'cloud'

export function getSyncMode(): SyncMode {
  return localStorage.getItem(SYNC_STORAGE_KEYS.mode) === 'cloud' ? 'cloud' : 'local'
}

export function setSyncMode(mode: SyncMode) {
  localStorage.setItem(SYNC_STORAGE_KEYS.mode, mode)
}

export function isCloudSyncEnabled(): boolean {
  return getSyncMode() === 'cloud'
}
