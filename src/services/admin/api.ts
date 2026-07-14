import { getSupabase } from '../../lib/supabase'
import type {
  AdminAuditEntry,
  AdminDirectoryUser,
  AdminOverview,
  AdminRole,
  AppErrorLog,
  FeatureFlag,
  MaintenanceMode,
} from '../../admin/types'

async function callAdminApi<T>(
  action: string,
  body: Record<string, unknown> = {},
): Promise<{ data: T | null; error: string | null }> {
  const supabase = getSupabase()
  if (!supabase) return { data: null, error: 'Cloud sync is not configured.' }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return { data: null, error: 'Not signed in.' }

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...body },
  })

  if (error) {
    return { data: null, error: error.message || 'Admin API request failed.' }
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return { data: null, error: String((data as { error: unknown }).error) }
  }

  return { data: data as T, error: null }
}

export async function fetchMyAdminRole(): Promise<{
  role: AdminRole
  userId: string | null
  error: string | null
}> {
  const supabase = getSupabase()
  if (!supabase) return { role: 'user', userId: null, error: 'Cloud not configured' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { role: 'user', userId: null, error: null }

  // Prefer local RLS-readable role first (works even if Edge Function is down)
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role) {
    return { role: roleRow.role as AdminRole, userId: user.id, error: null }
  }

  const remote = await callAdminApi<{ role: AdminRole; userId: string }>('me')
  if (remote.data?.role) {
    return { role: remote.data.role, userId: remote.data.userId, error: null }
  }

  return { role: 'user', userId: user.id, error: remote.error }
}

export async function fetchAdminOverview() {
  return callAdminApi<AdminOverview>('overview')
}

function mergeLiveCounts(
  users: AdminDirectoryUser[],
  live: AdminDirectoryUser[],
): AdminDirectoryUser[] {
  if (!live.length) return users
  const byId = new Map(live.map((u) => [u.user_id, u]))
  return users.map((u) => {
    const row = byId.get(u.user_id)
    if (!row) return u
    return {
      ...u,
      people_count: row.people_count,
      places_count: row.places_count,
      interactions_count: row.interactions_count,
      // Prefer live row for sync meta when present
      pending_sync_count: row.pending_sync_count ?? u.pending_sync_count,
      last_sync_at: row.last_sync_at ?? u.last_sync_at,
      last_sync_error: row.last_sync_error ?? u.last_sync_error,
      storage_bytes: row.storage_bytes ?? u.storage_bytes,
    }
  })
}

export async function fetchAdminUsers() {
  const remote = await callAdminApi<{ users: AdminDirectoryUser[] }>('listUsers')
  const live = await fetchAdminDirectoryLocal()

  if (remote.data?.users?.length) {
    return {
      data: { users: mergeLiveCounts(remote.data.users, live) },
      error: remote.error,
    }
  }

  if (live.length) {
    return { data: { users: live }, error: remote.error }
  }

  return { data: remote.data, error: remote.error }
}

export async function fetchAdminUser(userId: string) {
  const remote = await callAdminApi<{
    user: AdminDirectoryUser
    auth: Record<string, unknown>
    supportNotes: SupportNote[]
    auditHistory: AdminAuditEntry[]
  }>('getUser', { userId })

  const live = await fetchAdminDirectoryLocal()
  const liveUser = live.find((u) => u.user_id === userId)
  const localNotes = await fetchSupportNotesLocal(userId)

  if (remote.data?.user) {
    const user = liveUser
      ? mergeLiveCounts([remote.data.user], [liveUser])[0]
      : remote.data.user
    return {
      data: {
        ...remote.data,
        user,
        supportNotes:
          remote.data.supportNotes?.length > 0 ? remote.data.supportNotes : localNotes,
      },
      error: remote.error,
    }
  }

  if (liveUser) {
    return {
      data: {
        user: liveUser,
        auth: {},
        supportNotes: localNotes,
        auditHistory: [],
      },
      error: remote.error,
    }
  }

  return remote
}

export type SupportNote = {
  id: string
  note: string
  author_role: string
  created_at: string
}

export async function fetchSupportNotesLocal(userId: string): Promise<SupportNote[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('support_notes')
    .select('id, note, author_role, created_at')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []) as SupportNote[]
}

export async function adminSendPasswordReset(email: string, userId?: string, reason?: string) {
  return callAdminApi<{ ok: boolean }>('sendPasswordReset', { email, userId, reason })
}

export async function adminResendVerification(email: string, userId?: string, reason?: string) {
  return callAdminApi<{ ok: boolean }>('resendVerification', { email, userId, reason })
}

export async function adminSuspendUser(userId: string, reason?: string) {
  return callAdminApi<{ ok: boolean }>('suspendUser', { userId, reason })
}

export async function adminReactivateUser(userId: string, reason?: string) {
  return callAdminApi<{ ok: boolean }>('reactivateUser', { userId, reason })
}

export async function adminSignOutAll(userId: string, reason?: string) {
  return callAdminApi<{ ok: boolean }>('signOutAll', { userId, reason })
}

export async function adminChangeRole(userId: string, role: AdminRole, reason?: string) {
  return callAdminApi<{ ok: boolean }>('changeRole', { userId, role, reason })
}

export async function adminDeleteUser(userId: string, reason?: string) {
  return callAdminApi<{ ok: boolean }>('deleteUser', { userId, reason, confirm: true })
}

export async function adminUpdateUserProfile(input: {
  userId: string
  firstName?: string
  lastName?: string
  displayName?: string
  reason?: string
}) {
  return callAdminApi<{ ok: boolean }>('updateUserProfile', input)
}

export async function adminUpdateUserEmail(input: {
  userId: string
  email: string
  emailConfirmed?: boolean
  reason?: string
}) {
  return callAdminApi<{ ok: boolean }>('updateUserEmail', input)
}

export async function adminSetUserPassword(input: {
  userId: string
  password: string
  reason?: string
}) {
  return callAdminApi<{ ok: boolean }>('setUserPassword', input)
}

export async function adminCreateUser(input: {
  email: string
  password: string
  firstName?: string
  lastName?: string
  displayName?: string
  role?: AdminRole
  emailConfirmed?: boolean
  reason?: string
}) {
  return callAdminApi<{ ok: boolean; userId: string; email: string; role: AdminRole }>(
    'createUser',
    { ...input },
  )
}

export async function adminAddSupportNote(userId: string, note: string) {
  const remote = await callAdminApi<{ ok: boolean }>('addSupportNote', { userId, note })
  if (!remote.error) return remote

  // RLS fallback when Edge Function is unavailable
  const supabase = getSupabase()
  if (!supabase) return remote
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return remote

  const roleResult = await fetchMyAdminRole()
  const { error } = await supabase.from('support_notes').insert({
    target_user_id: userId,
    author_user_id: user.id,
    author_role: roleResult.role,
    note,
  })
  if (error) return { data: null, error: error.message }
  return { data: { ok: true }, error: null }
}

export async function adminSetFeatureFlag(key: string, enabled: boolean, reason?: string) {
  return callAdminApi<{ ok: boolean }>('setFeatureFlag', { key, enabled, reason })
}

export async function adminSetMaintenanceMode(mode: MaintenanceMode, reason?: string) {
  return callAdminApi<{ ok: boolean }>('setMaintenanceMode', { mode, reason })
}

export async function adminListErrors() {
  return callAdminApi<{ errors: AppErrorLog[] }>('listErrors')
}

export async function adminResolveError(id: string, notes?: string) {
  return callAdminApi<{ ok: boolean }>('resolveError', { id, notes })
}

export async function adminListAudit() {
  return callAdminApi<{ audit: AdminAuditEntry[] }>('listAudit')
}

export async function adminRunHealthChecks() {
  return callAdminApi<{ checks: Array<Record<string, unknown>>; totalLatencyMs: number }>(
    'runHealthChecks',
  )
}

export async function adminClearPendingSyncMeta(userId: string, reason?: string) {
  return callAdminApi<{ ok: boolean }>('clearPendingSyncMeta', { userId, reason })
}

export async function adminExportUserMeta(userId: string, reason?: string) {
  return callAdminApi<{ export: AdminDirectoryUser }>('exportUserMeta', { userId, reason })
}

export async function adminRefreshStats(userId?: string) {
  return callAdminApi<{ ok: boolean }>('refreshStats', { userId })
}

/** Client-readable feature flags via RLS (no service role). */
export async function fetchFeatureFlagsLocal(): Promise<FeatureFlag[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data } = await supabase.from('feature_flags').select('key, enabled, description, updated_at')
  return (data ?? []) as FeatureFlag[]
}

export async function fetchAdminDirectoryLocal(): Promise<AdminDirectoryUser[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  // Live counts (security definer) — preferred over stale user_pack_stats view
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_user_directory')
  if (!rpcError && rpcData) {
    return rpcData as AdminDirectoryUser[]
  }

  const { data, error } = await supabase
    .from('admin_user_directory')
    .select('*')
    .order('account_created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as AdminDirectoryUser[]
}
