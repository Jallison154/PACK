import { getSupabase } from '../../lib/supabase'
import { validateCloudEnv } from '../../lib/env'
import { listSyncQueue } from './queue'
import { SYNC_STORAGE_KEYS, getSyncMode } from './types'
import { classifySyncError, extractSupabaseError, logSupabaseError } from './errors'
import { getRealtimeConnectionState } from './realtime'

export interface SyncDiagnostics {
  supabaseConfigured: boolean
  missingEnv: string[]
  loggedIn: boolean
  userId: string | null
  cloudSyncEnabled: boolean
  realtimeConnected: boolean
  lastSyncAttempt: string | null
  lastSyncSuccess: string | null
  lastSyncError: string | null
  pendingLocalChanges: number
}

export interface SupabaseConnectionTest {
  ok: boolean
  message: string
  peopleCount?: number
}

export function getStoredSyncDiagnostics(
  userId?: string | null,
  isAuthenticated = false,
): Omit<SyncDiagnostics, 'pendingLocalChanges'> {
  const validation = validateCloudEnv()
  const realtimeState = getRealtimeConnectionState()

  return {
    supabaseConfigured: validation.configured,
    missingEnv: validation.missing,
    loggedIn: isAuthenticated,
    userId: userId ?? null,
    cloudSyncEnabled: getSyncMode() === 'cloud',
    realtimeConnected: realtimeState === 'connected',
    lastSyncAttempt: localStorage.getItem(SYNC_STORAGE_KEYS.lastSyncAttemptAt),
    lastSyncSuccess: localStorage.getItem(SYNC_STORAGE_KEYS.lastSyncSuccessAt),
    lastSyncError: localStorage.getItem(SYNC_STORAGE_KEYS.lastSyncError),
  }
}

export async function getSyncDiagnostics(
  userId?: string | null,
  isAuthenticated = false,
): Promise<SyncDiagnostics> {
  const stored = getStoredSyncDiagnostics(userId, isAuthenticated)
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
  return classifySyncError(error)
}

export function recordSyncError(error: unknown, context = 'sync') {
  const extracted = extractSupabaseError(error)
  const message = `${context}: ${formatSyncError(error)}`
  localStorage.setItem(SYNC_STORAGE_KEYS.lastSyncError, message)
  logSupabaseError({
    operation: context,
    code: extracted.code,
    message: extracted.message ?? message,
    details: extracted.details,
    hint: extracted.hint,
  })
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
    const { data, error, count } = await supabase
      .from('people')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', ownerId)
      .limit(5)

    if (error) throw error

    return {
      ok: true,
      message: `Supabase connection and RLS check succeeded (${count ?? data?.length ?? 0} people rows).`,
      peopleCount: count ?? data?.length ?? 0,
    }
  } catch (error) {
    recordSyncError(error, 'Supabase connection test')
    return { ok: false, message: formatSyncError(error) }
  }
}

export function buildDiagnosticReport(diagnostics: SyncDiagnostics): string {
  return [
    'Pack Sync Diagnostic Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Supabase configured: ${diagnostics.supabaseConfigured ? 'Yes' : 'No'}`,
    `Missing env: ${diagnostics.missingEnv.join(', ') || 'None'}`,
    `Logged in: ${diagnostics.loggedIn ? 'Yes' : 'No'}`,
    `User ID: ${diagnostics.userId ?? '—'}`,
    `Cloud sync enabled: ${diagnostics.cloudSyncEnabled ? 'Yes' : 'No'}`,
    `Realtime connected: ${diagnostics.realtimeConnected ? 'Yes' : 'No'}`,
    `Last sync attempt: ${diagnostics.lastSyncAttempt ?? 'Never'}`,
    `Last successful sync: ${diagnostics.lastSyncSuccess ?? 'Never'}`,
    `Pending local changes: ${diagnostics.pendingLocalChanges}`,
    `Last sync error: ${diagnostics.lastSyncError ?? 'None'}`,
  ].join('\n')
}
