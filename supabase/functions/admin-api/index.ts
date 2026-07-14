// Pack Admin API — Supabase Edge Function
// Deploy: supabase functions deploy admin-api
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// NEVER expose the service role key to the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Role = 'user' | 'support' | 'admin' | 'owner'

const ROLE_RANK: Record<Role, number> = {
  user: 0,
  support: 1,
  admin: 2,
  owner: 3,
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function can(role: Role, min: Role) {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** Count cloud people/places with service role (bypasses RLS). Never returns private fields. */
async function enrichDirectoryWithLiveCounts(
  adminClient: ReturnType<typeof createClient>,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  if (!rows.length) return rows

  const [{ data: peopleRows }, { data: placeRows }, { data: interactionRows }] = await Promise.all([
    adminClient.from('people').select('user_id').is('deleted_at', null),
    adminClient.from('places').select('user_id').is('deleted_at', null),
    adminClient.from('interactions').select('user_id'),
  ])

  const peopleCount = new Map<string, number>()
  const placesCount = new Map<string, number>()
  const interactionsCount = new Map<string, number>()

  for (const row of peopleRows ?? []) {
    const id = String(row.user_id)
    peopleCount.set(id, (peopleCount.get(id) ?? 0) + 1)
  }
  for (const row of placeRows ?? []) {
    const id = String(row.user_id)
    placesCount.set(id, (placesCount.get(id) ?? 0) + 1)
  }
  for (const row of interactionRows ?? []) {
    const id = String(row.user_id)
    interactionsCount.set(id, (interactionsCount.get(id) ?? 0) + 1)
  }

  return rows.map((row) => {
    const id = String(row.user_id)
    return {
      ...row,
      people_count: peopleCount.get(id) ?? 0,
      places_count: placesCount.get(id) ?? 0,
      interactions_count: interactionsCount.get(id) ?? 0,
    }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: 'Admin API is not configured on the server.' }, 503)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization.' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceKey)

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized.' }, 401)

    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const role = (roleRow?.role ?? 'user') as Role
    if (!can(role, 'support')) {
      return json({ error: 'Access denied.' }, 403)
    }

    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}))
    const action = (body.action ?? new URL(req.url).searchParams.get('action') ?? '') as string

    const audit = async (
      actionName: string,
      targetUserId: string | null,
      reason?: string,
      before?: unknown,
      after?: unknown,
    ) => {
      await adminClient.from('admin_audit_log').insert({
        admin_user_id: user.id,
        admin_role: role,
        action: actionName,
        target_user_id: targetUserId,
        reason: reason ?? null,
        before_status: before ?? null,
        after_status: after ?? null,
        user_agent: req.headers.get('user-agent'),
      })
    }

    switch (action) {
      case 'me': {
        return json({ userId: user.id, role, email: user.email })
      }

      case 'overview': {
        const [{ count: totalUsers }, { data: stats }, { data: errors }, { data: flags }] =
          await Promise.all([
            adminClient.from('profiles').select('*', { count: 'exact', head: true }),
            adminClient.from('user_pack_stats').select('account_status, pending_sync_count, last_sync_error'),
            adminClient
              .from('app_error_logs')
              .select('id, severity, error_message, created_at, resolved')
              .eq('resolved', false)
              .order('created_at', { ascending: false })
              .limit(10),
            adminClient.from('feature_flags').select('key, enabled'),
          ])

        const suspended = (stats ?? []).filter((s) => s.account_status === 'suspended').length
        const syncErrors = (stats ?? []).filter((s) => !!s.last_sync_error).length
        const pending = (stats ?? []).reduce((sum, s) => sum + (s.pending_sync_count ?? 0), 0)

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { count: newThisWeek } = await adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo)

        return json({
          totalUsers: totalUsers ?? 0,
          activeUsers: (totalUsers ?? 0) - suspended,
          suspendedUsers: suspended,
          newUsersThisWeek: newThisWeek ?? 0,
          usersWithSyncErrors: syncErrors,
          pendingSyncOperations: pending,
          recentErrors: errors ?? [],
          featureFlags: flags ?? [],
          appVersion: Deno.env.get('PACK_APP_VERSION') ?? '1.0.0',
        })
      }

      case 'listUsers': {
        // Prefer live counts via security-definer RPC; fall back to view + live count enrich.
        let rows: Array<Record<string, unknown>> | null = null
        const { data: rpcRows, error: rpcError } = await adminClient.rpc('get_admin_user_directory')
        if (!rpcError && rpcRows) {
          rows = rpcRows as Array<Record<string, unknown>>
        } else {
          const { data, error } = await adminClient
            .from('admin_user_directory')
            .select('*')
            .order('account_created_at', { ascending: false })
          if (error) return json({ error: error.message }, 400)
          rows = (data ?? []) as Array<Record<string, unknown>>
          rows = await enrichDirectoryWithLiveCounts(adminClient, rows)
        }

        // Enrich with auth metadata (no private Pack content)
        const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const byId = new Map((authList?.users ?? []).map((u) => [u.id, u]))

        const users = (rows ?? []).map((row) => {
          const authUser = byId.get(String(row.user_id))
          return {
            ...row,
            email_verified: !!authUser?.email_confirmed_at,
            last_sign_in_at: authUser?.last_sign_in_at ?? null,
          }
        })

        return json({ users })
      }

      case 'getUser': {
        const targetId = body.userId as string
        if (!targetId) return json({ error: 'userId required' }, 400)

        let directory: Record<string, unknown> | null = null
        const { data: rpcRows } = await adminClient.rpc('get_admin_user_directory')
        if (Array.isArray(rpcRows)) {
          directory = (rpcRows as Array<Record<string, unknown>>).find(
            (r) => String(r.user_id) === targetId,
          ) ?? null
        }
        if (!directory) {
          const { data } = await adminClient
            .from('admin_user_directory')
            .select('*')
            .eq('user_id', targetId)
            .maybeSingle()
          const enriched = await enrichDirectoryWithLiveCounts(
            adminClient,
            data ? [data as Record<string, unknown>] : [],
          )
          directory = enriched[0] ?? null
        }

        const { data: authData } = await adminClient.auth.admin.getUserById(targetId)
        const { data: notes } = await adminClient
          .from('support_notes')
          .select('id, note, author_role, created_at, author_user_id')
          .eq('target_user_id', targetId)
          .order('created_at', { ascending: false })
          .limit(50)

        const { data: auditRows } = await adminClient
          .from('admin_audit_log')
          .select('id, action, admin_role, reason, created_at')
          .eq('target_user_id', targetId)
          .order('created_at', { ascending: false })
          .limit(50)

        return json({
          user: directory,
          auth: {
            email: authData.user?.email,
            email_verified: !!authData.user?.email_confirmed_at,
            last_sign_in_at: authData.user?.last_sign_in_at,
            created_at: authData.user?.created_at,
            banned_until: authData.user?.banned_until ?? null,
          },
          supportNotes: notes ?? [],
          auditHistory: auditRows ?? [],
        })
      }

      case 'sendPasswordReset': {
        if (!can(role, 'support')) return json({ error: 'Forbidden' }, 403)
        const email = body.email as string
        if (!email) return json({ error: 'email required' }, 400)
        const redirectTo = body.redirectTo as string | undefined
        const { error } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        })
        if (error) return json({ error: error.message }, 400)
        await audit('password_reset_sent', body.userId ?? null, body.reason)
        return json({ ok: true })
      }

      case 'resendVerification': {
        if (!can(role, 'support')) return json({ error: 'Forbidden' }, 403)
        const email = body.email as string
        if (!email) return json({ error: 'email required' }, 400)
        // Invite/resend via generateLink + email is preferred; use admin generateLink
        const { data, error } = await adminClient.auth.admin.generateLink({
          type: 'signup',
          email,
        })
        if (error) return json({ error: error.message }, 400)
        await audit('verification_email_sent', body.userId ?? null, body.reason)
        return json({ ok: true, linkGenerated: !!data })
      }

      case 'suspendUser': {
        if (!can(role, 'admin')) return json({ error: 'Forbidden' }, 403)
        const targetId = body.userId as string
        if (!targetId) return json({ error: 'userId required' }, 400)
        if (targetId === user.id) return json({ error: 'Cannot suspend yourself.' }, 400)

        const { data: before } = await adminClient
          .from('user_pack_stats')
          .select('account_status')
          .eq('user_id', targetId)
          .maybeSingle()

        await adminClient.auth.admin.updateUserById(targetId, {
          ban_duration: '876600h',
        })
        await adminClient.from('user_pack_stats').upsert({
          user_id: targetId,
          account_status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        await audit('account_suspended', targetId, body.reason, before, { account_status: 'suspended' })
        return json({ ok: true })
      }

      case 'reactivateUser': {
        if (!can(role, 'admin')) return json({ error: 'Forbidden' }, 403)
        const targetId = body.userId as string
        if (!targetId) return json({ error: 'userId required' }, 400)

        const { data: before } = await adminClient
          .from('user_pack_stats')
          .select('account_status')
          .eq('user_id', targetId)
          .maybeSingle()

        await adminClient.auth.admin.updateUserById(targetId, { ban_duration: 'none' })
        await adminClient.from('user_pack_stats').upsert({
          user_id: targetId,
          account_status: 'active',
          updated_at: new Date().toISOString(),
        })
        await audit('account_reactivated', targetId, body.reason, before, { account_status: 'active' })
        return json({ ok: true })
      }

      case 'signOutAll': {
        if (!can(role, 'support')) return json({ error: 'Forbidden' }, 403)
        const targetId = body.userId as string
        if (!targetId) return json({ error: 'userId required' }, 400)
        const { error } = await adminClient.auth.admin.signOut(targetId, 'global')
        if (error) return json({ error: error.message }, 400)
        await audit('sessions_revoked', targetId, body.reason)
        return json({ ok: true })
      }

      case 'changeRole': {
        if (!can(role, 'owner')) return json({ error: 'Only owners can assign roles.' }, 403)
        const targetId = body.userId as string
        const nextRole = body.role as Role
        if (!targetId || !ROLE_RANK[nextRole]) return json({ error: 'Invalid role change.' }, 400)
        if (targetId === user.id && nextRole !== 'owner') {
          return json({ error: 'Owners cannot demote themselves.' }, 400)
        }

        const { data: before } = await adminClient
          .from('user_roles')
          .select('role')
          .eq('user_id', targetId)
          .maybeSingle()

        await adminClient.from('user_roles').upsert({
          user_id: targetId,
          role: nextRole,
          assigned_by: user.id,
          updated_at: new Date().toISOString(),
        })
        await audit('role_changed', targetId, body.reason, before, { role: nextRole })
        return json({ ok: true })
      }

      case 'deleteUser': {
        if (!can(role, 'owner')) return json({ error: 'Only owners can delete accounts.' }, 403)
        const targetId = body.userId as string
        if (!targetId) return json({ error: 'userId required' }, 400)
        if (targetId === user.id) return json({ error: 'Cannot delete yourself.' }, 400)
        if (!body.confirm) return json({ error: 'Confirmation required.' }, 400)

        await audit('user_account_deleted', targetId, body.reason)
        const { error } = await adminClient.auth.admin.deleteUser(targetId)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'addSupportNote': {
        if (!can(role, 'support')) return json({ error: 'Forbidden' }, 403)
        const targetId = body.userId as string
        const note = (body.note as string)?.trim()
        if (!targetId || !note) return json({ error: 'userId and note required' }, 400)

        const { error } = await adminClient.from('support_notes').insert({
          target_user_id: targetId,
          author_user_id: user.id,
          author_role: role,
          note,
        })
        if (error) return json({ error: error.message }, 400)
        await audit('support_note_added', targetId)
        return json({ ok: true })
      }

      case 'setFeatureFlag': {
        if (!can(role, 'admin')) return json({ error: 'Forbidden' }, 403)
        const key = body.key as string
        const enabled = !!body.enabled
        if (!key) return json({ error: 'key required' }, 400)

        const { data: before } = await adminClient
          .from('feature_flags')
          .select('enabled')
          .eq('key', key)
          .maybeSingle()

        const { error } = await adminClient
          .from('feature_flags')
          .update({
            enabled,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('key', key)

        if (error) return json({ error: error.message }, 400)
        await audit('feature_flag_changed', null, body.reason, before, { key, enabled })
        return json({ ok: true })
      }

      case 'setMaintenanceMode': {
        if (!can(role, 'owner')) return json({ error: 'Forbidden' }, 403)
        const mode = body.mode as string
        if (!['normal', 'read-only', 'maintenance'].includes(mode)) {
          return json({ error: 'Invalid mode' }, 400)
        }

        const { data: before } = await adminClient
          .from('admin_settings')
          .select('value')
          .eq('key', 'access')
          .maybeSingle()

        const next = {
          ...(before?.value ?? {}),
          maintenance_mode: mode,
          account_creation: mode === 'normal',
        }

        await adminClient.from('admin_settings').upsert({
          key: 'access',
          value: next,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })

        await adminClient.from('feature_flags').upsert([
          {
            key: 'maintenance_mode',
            enabled: mode === 'maintenance',
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          {
            key: 'read_only_mode',
            enabled: mode === 'read-only',
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
        ])

        await audit('maintenance_mode_changed', null, body.reason, before?.value, next)
        return json({ ok: true })
      }

      case 'listErrors': {
        const { data, error } = await adminClient
          .from('app_error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        if (error) return json({ error: error.message }, 400)
        return json({ errors: data ?? [] })
      }

      case 'resolveError': {
        if (!can(role, 'admin')) return json({ error: 'Forbidden' }, 403)
        const id = body.id as string
        if (!id) return json({ error: 'id required' }, 400)
        const { error } = await adminClient
          .from('app_error_logs')
          .update({
            resolved: true,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            internal_notes: body.notes ?? null,
          })
          .eq('id', id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'listAudit': {
        const { data, error } = await adminClient
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        if (error) return json({ error: error.message }, 400)
        return json({ audit: data ?? [] })
      }

      case 'refreshStats': {
        if (!can(role, 'admin')) return json({ error: 'Forbidden' }, 403)
        const targetId = body.userId as string | undefined
        if (targetId) {
          await adminClient.rpc('refresh_user_pack_stats', { target_user: targetId })
        } else {
          const { error: allErr } = await adminClient.rpc('refresh_all_user_pack_stats')
          if (allErr) {
            const { data: profiles } = await adminClient.from('profiles').select('id')
            for (const p of profiles ?? []) {
              await adminClient.rpc('refresh_user_pack_stats', { target_user: p.id })
            }
          }
        }
        await audit('refresh_pack_stats', targetId ?? null, body.reason)
        return json({ ok: true })
      }

      case 'runHealthChecks': {
        if (!can(role, 'admin')) return json({ error: 'Forbidden' }, 403)
        const started = Date.now()
        const checks: Array<Record<string, unknown>> = []

        // Auth
        const authStart = Date.now()
        const { error: authErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 })
        checks.push({
          service: 'supabase_auth',
          status: authErr ? 'degraded' : 'healthy',
          latency_ms: Date.now() - authStart,
          message: authErr?.message ?? 'Auth admin reachable',
        })

        // DB read
        const readStart = Date.now()
        const { error: readErr } = await adminClient.from('profiles').select('id').limit(1)
        checks.push({
          service: 'supabase_db_read',
          status: readErr ? 'offline' : 'healthy',
          latency_ms: Date.now() - readStart,
          message: readErr?.message ?? 'Database read OK',
        })

        // DB write (diagnostics ping)
        const writeStart = Date.now()
        const { error: writeErr } = await adminClient.from('admin_diagnostics_ping').insert({
          note: 'health-check',
          created_by: user.id,
        })
        checks.push({
          service: 'supabase_db_write',
          status: writeErr ? 'degraded' : 'healthy',
          latency_ms: Date.now() - writeStart,
          message: writeErr?.message ?? 'Database write OK',
        })

        for (const check of checks) {
          await adminClient.from('service_health_checks').insert({
            ...check,
            checked_by: user.id,
          })
        }

        return json({ checks, totalLatencyMs: Date.now() - started })
      }

      case 'clearPendingSyncMeta': {
        if (!can(role, 'support')) return json({ error: 'Forbidden' }, 403)
        const targetId = body.userId as string
        if (!targetId) return json({ error: 'userId required' }, 400)
        await adminClient.from('user_pack_stats').upsert({
          user_id: targetId,
          pending_sync_count: 0,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        })
        await audit('clear_stuck_sync_metadata', targetId, body.reason)
        return json({ ok: true })
      }

      case 'exportUserMeta': {
        if (!can(role, 'admin')) return json({ error: 'Forbidden' }, 403)
        const targetId = body.userId as string
        if (!targetId) return json({ error: 'userId required' }, 400)
        const { data } = await adminClient
          .from('admin_user_directory')
          .select('*')
          .eq('user_id', targetId)
          .maybeSingle()
        await audit('user_data_exported', targetId, body.reason)
        // Metadata-only export — never Pack Member content
        return json({ export: data })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected admin API error'
    return json({ error: message }, 500)
  }
})
