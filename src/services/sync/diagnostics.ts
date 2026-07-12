import { getSupabase } from '../../lib/supabase'
import { getSupabaseUrl, validateCloudEnv } from '../../lib/env'
import { listSyncQueue } from './queue'
import { SYNC_STORAGE_KEYS, getSyncMode } from './types'
import { classifySyncError, extractSupabaseError, logSupabaseError } from './errors'
import { getRealtimeConnectionState } from './realtime'
import { db } from '../../db/database'

export interface SyncDiagnostics {
  supabaseConfigured: boolean
  missingEnv: string[]
  loggedIn: boolean
  userId: string | null
  appBuildVersion: string
  supabaseProjectHost: string | null
  authSessionRestored: boolean
  accessTokenExpiresAt: string | null
  cloudSyncEnabled: boolean
  online: boolean
  initialCloudDownloadCompleted: boolean
  initialCloudDownloadAt: string | null
  cloudPeopleDownloaded: number
  localPeople: number
  realtimeConnected: boolean
  lastSyncAttempt: string | null
  lastSyncSuccess: string | null
  lastSyncError: string | null
  pendingLocalChanges: number
}

export interface SupabaseConnectionTest {
  ok: boolean
  message: string
  failedStage?: string
  peopleCount?: number
  stages?: Array<{ stage: string; ok: boolean; message: string }>
}

export function getStoredSyncDiagnostics(
  userId?: string | null,
  isAuthenticated = false,
): Omit<SyncDiagnostics, 'pendingLocalChanges'> {
  const validation = validateCloudEnv()
  const realtimeState = getRealtimeConnectionState()
  const sessionRestoredAt = localStorage.getItem(SYNC_STORAGE_KEYS.initialCloudDownloadAt)
  let projectHost: string | null = null
  try {
    projectHost = getSupabaseUrl() ? new URL(getSupabaseUrl()!).host : null
  } catch {
    projectHost = null
  }

  return {
    supabaseConfigured: validation.configured,
    missingEnv: validation.missing,
    loggedIn: isAuthenticated,
    userId: userId ?? null,
    appBuildVersion: `${__APP_VERSION__} (${__BUILD_TIME__})`,
    supabaseProjectHost: projectHost,
    authSessionRestored: isAuthenticated,
    accessTokenExpiresAt: null,
    cloudSyncEnabled: getSyncMode() === 'cloud',
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    initialCloudDownloadCompleted: Boolean(sessionRestoredAt),
    initialCloudDownloadAt: sessionRestoredAt,
    cloudPeopleDownloaded: Number(
      localStorage.getItem(SYNC_STORAGE_KEYS.initialCloudPeopleDownloaded) ?? 0,
    ),
    localPeople: 0,
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
  let localPeople = 0
  let accessTokenExpiresAt: string | null = null
  try {
    pendingLocalChanges = (await listSyncQueue()).length
  } catch {
    pendingLocalChanges = 0
  }

  try {
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL',
    )
    localPeople = Number(rows[0]?.count ?? 0)
  } catch {
    localPeople = 0
  }

  try {
    const supabase = getSupabase()
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
    if (data.session?.expires_at) {
      accessTokenExpiresAt = new Date(data.session.expires_at * 1000).toISOString()
    }
  } catch {
    accessTokenExpiresAt = null
  }

  return { ...stored, pendingLocalChanges, localPeople, accessTokenExpiresAt }
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
  const stages: SupabaseConnectionTest['stages'] = []
  let currentStage = 'Configuration'
  const fail = (stage: string, error: unknown): SupabaseConnectionTest => {
    const message = formatSyncError(error)
    stages.push({ stage, ok: false, message })
    recordSyncError(error, `Supabase connection test: ${stage}`)
    return { ok: false, failedStage: stage, message: `${stage} failed: ${message}`, stages }
  }

  const validation = validateCloudEnv()
  if (!validation.configured) {
    const message = `Missing environment: ${validation.missing.join(', ')}`
    stages.push({ stage: 'Configuration', ok: false, message })
    return {
      ok: false,
      failedStage: 'Configuration',
      message,
      stages,
    }
  }
  stages.push({ stage: 'Configuration', ok: true, message: 'Supabase URL and anon key are present.' })

  const supabase = getSupabase()
  if (!supabase) return fail('Configuration', new Error('Supabase client was not initialized.'))

  try {
    currentStage = 'Authentication'
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    const sessionUserId = sessionData.session?.user.id
    if (!sessionUserId) throw new Error('Not authenticated. Sign in first.')

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user?.id) throw new Error('Authenticated user ID is missing.')
    stages.push({ stage: 'Authentication', ok: true, message: `User ${userData.user.id}` })

    const ownerId = userId ?? sessionUserId
    currentStage = 'Read'
    const { data, error, count } = await supabase
      .from('people')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', ownerId)
      .limit(5)

    if (error) throw error
    const peopleCount = count ?? data?.length ?? 0
    stages.push({ stage: 'Read', ok: true, message: `${peopleCount} people rows returned.` })

    currentStage = 'Write'
    const diagnosticId = `diagnostic-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const { error: insertError } = await supabase.from('people').insert({
      id: diagnosticId,
      user_id: ownerId,
      name: 'Pack Sync Diagnostic',
      workspace: 'personal',
      created_at: now,
      updated_at: now,
    })
    if (insertError) throw insertError

    const { data: inserted, error: confirmError } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', ownerId)
      .eq('id', diagnosticId)
      .single()
    if (confirmError) throw confirmError
    if (inserted?.id !== diagnosticId) throw new Error('Diagnostic row was not confirmed.')

    const { error: deleteError } = await supabase
      .from('people')
      .delete()
      .eq('user_id', ownerId)
      .eq('id', diagnosticId)
    if (deleteError) throw deleteError
    stages.push({ stage: 'Write', ok: true, message: 'Temporary row insert/delete succeeded.' })

    currentStage = 'Realtime'
    const realtimeResult = await new Promise<string>((resolve) => {
      const channel = supabase.channel(`pack-diagnostic-${crypto.randomUUID()}`)
      const timeout = window.setTimeout(() => {
        void supabase.removeChannel(channel)
        resolve('TIMED_OUT')
      }, 8000)

      channel.subscribe((status) => {
        if (
          status === 'SUBSCRIBED' ||
          status === 'TIMED_OUT' ||
          status === 'CHANNEL_ERROR' ||
          status === 'CLOSED'
        ) {
          window.clearTimeout(timeout)
          void supabase.removeChannel(channel)
          resolve(status)
        }
      })
    })

    if (realtimeResult !== 'SUBSCRIBED') {
      throw new Error(`Realtime channel status: ${realtimeResult}`)
    }
    stages.push({ stage: 'Realtime', ok: true, message: realtimeResult })

    return {
      ok: true,
      message: `Supabase connection, RLS read/write, and Realtime succeeded (${peopleCount} people rows).`,
      peopleCount,
      stages,
    }
  } catch (error) {
    return fail(currentStage, error)
  }
}

export function buildDiagnosticReport(diagnostics: SyncDiagnostics): string {
  return [
    'Pack Sync Diagnostic Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    `App build version: ${diagnostics.appBuildVersion}`,
    `Supabase configured: ${diagnostics.supabaseConfigured ? 'Yes' : 'No'}`,
    `Supabase project host: ${diagnostics.supabaseProjectHost ?? 'None'}`,
    `Missing env: ${diagnostics.missingEnv.join(', ') || 'None'}`,
    `Auth session restored: ${diagnostics.authSessionRestored ? 'Yes' : 'No'}`,
    `Logged in: ${diagnostics.loggedIn ? 'Yes' : 'No'}`,
    `User ID: ${diagnostics.userId ?? '—'}`,
    `Access token expiration: ${diagnostics.accessTokenExpiresAt ?? 'None'}`,
    `Online: ${diagnostics.online ? 'Yes' : 'No'}`,
    `Cloud sync enabled: ${diagnostics.cloudSyncEnabled ? 'Yes' : 'No'}`,
    `Realtime connected: ${diagnostics.realtimeConnected ? 'Yes' : 'No'}`,
    `Initial cloud download completed: ${diagnostics.initialCloudDownloadCompleted ? 'Yes' : 'No'}`,
    `Initial cloud download at: ${diagnostics.initialCloudDownloadAt ?? 'Never'}`,
    `Cloud people downloaded: ${diagnostics.cloudPeopleDownloaded}`,
    `Local people: ${diagnostics.localPeople}`,
    `Last sync attempt: ${diagnostics.lastSyncAttempt ?? 'Never'}`,
    `Last successful sync: ${diagnostics.lastSyncSuccess ?? 'Never'}`,
    `Pending local changes: ${diagnostics.pendingLocalChanges}`,
    `Last sync error: ${diagnostics.lastSyncError ?? 'None'}`,
  ].join('\n')
}
