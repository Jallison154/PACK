import { getSupabase } from '../../lib/supabase'
import { validateCloudEnv } from '../../lib/env'
import { listSyncQueue } from './queue'
import { SYNC_STORAGE_KEYS } from './types'

export interface SyncDiagnostics {
  supabaseConfigured: boolean
  missingEnv: string[]
  lastSyncAttempt: string | null
  lastSyncSuccess: string | null
  lastSyncError: string | null
  pendingLocalChanges: number
}

export interface SupabaseConnectionTest {
  ok: boolean
  message: string
}

export function getStoredSyncDiagnostics(): Omit<SyncDiagnostics, 'pendingLocalChanges'> {
  const validation = validateCloudEnv()
  return {
    supabaseConfigured: validation.configured,
    missingEnv: validation.missing,
    lastSyncAttempt: localStorage.getItem(SYNC_STORAGE_KEYS.lastSyncAttemptAt),
    lastSyncSuccess: localStorage.getItem(SYNC_STORAGE_KEYS.lastSyncSuccessAt),
    lastSyncError: localStorage.getItem(SYNC_STORAGE_KEYS.lastSyncError),
  }
}

export async function getSyncDiagnostics(): Promise<SyncDiagnostics> {
  const stored = getStoredSyncDiagnostics()
  let pendingLocalChanges = 0
  try {
    pendingLocalChanges = (await listSyncQueue()).length
  } catch {
    pendingLocalChanges = 0
  }
  return { ...stored, pendingLocalChanges }
}

export function recordSyncAttempt() {
  localStorage.setItem(SYNC_STORAGE_KEYS.lastSyncAttemptAt, new Date().toISOString())
}

export function recordSyncSuccess() {
  const now = new Date().toISOString()
  localStorage.setItem(SYNC_STORAGE_KEYS.lastSyncSuccessAt, now)
  localStorage.setItem(SYNC_STORAGE_KEYS.lastSyncAt, now)
  localStorage.removeItem(SYNC_STORAGE_KEYS.lastSyncError)
}

export function formatSyncError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
    const parts = [maybeError.message, maybeError.code, maybeError.details, maybeError.hint]
      .filter(Boolean)
      .map(String)
    if (parts.length > 0) return parts.join(' | ')
  }
  return String(error || 'Unknown sync error')
}

export function recordSyncError(error: unknown, context = 'sync') {
  const message = `${context}: ${formatSyncError(error)}`
  localStorage.setItem(SYNC_STORAGE_KEYS.lastSyncError, message)
  console.warn(`[Pack Sync] ${message}`, error)
}

export async function testSupabaseConnection(userId?: string): Promise<SupabaseConnectionTest> {
  const validation = validateCloudEnv()
  if (!validation.configured) {
    return {
      ok: false,
      message: `Missing environment: ${validation.missing.join(', ')}`,
    }
  }

  const supabase = getSupabase()
  if (!supabase) return { ok: false, message: 'Supabase client was not initialized.' }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    const sessionUserId = sessionData.session?.user.id
    if (!sessionUserId) return { ok: false, message: 'Not authenticated. Sign in first.' }

    const ownerId = userId ?? sessionUserId
    const { error } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', ownerId)
      .limit(1)

    if (error) throw error
    return { ok: true, message: 'Supabase connection and RLS check succeeded.' }
  } catch (error) {
    recordSyncError(error, 'Supabase connection test')
    return { ok: false, message: formatSyncError(error) }
  }
}
