import { useEffect, useMemo, useState } from 'react'
import { fetchAdminDirectoryLocal, fetchAdminUsers } from '../../services/admin/api'
import type { AdminDirectoryUser } from '../../admin/types'
import { getSupabase } from '../../lib/supabase'
import { AdminCard, AdminStat, AdminTable, StatusBadge } from '../../components/admin/AdminPrimitives'

const ERROR_CATEGORIES = [
  'Authentication',
  'RLS',
  'Missing column/schema mismatch',
  'Network',
  'Realtime',
  'Duplicate ID',
  'Update created duplicate',
  'Delete failure',
  'Local cache conflict',
] as const

function categorize(error: string | null): string {
  if (!error) return 'None'
  const e = error.toLowerCase()
  if (e.includes('jwt') || e.includes('auth') || e.includes('401')) return 'Authentication'
  if (e.includes('rls') || e.includes('42501') || e.includes('permission')) return 'RLS'
  if (e.includes('pgrst204') || e.includes('column') || e.includes('schema'))
    return 'Missing column/schema mismatch'
  if (e.includes('network') || e.includes('fetch') || e.includes('offline')) return 'Network'
  if (e.includes('realtime') || e.includes('channel')) return 'Realtime'
  if (e.includes('duplicate') && e.includes('update')) return 'Update created duplicate'
  if (e.includes('duplicate')) return 'Duplicate ID'
  if (e.includes('delete')) return 'Delete failure'
  if (e.includes('conflict') || e.includes('cache')) return 'Local cache conflict'
  return 'Other'
}

export function AdminSyncHealthPage() {
  const [users, setUsers] = useState<AdminDirectoryUser[]>([])
  const [diag, setDiag] = useState<Array<{ category: string; count: number }>>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    ;(async () => {
      const remote = await fetchAdminUsers()
      setUsers(remote.data?.users ?? (await fetchAdminDirectoryLocal()))

      const supabase = getSupabase()
      if (!supabase) return
      const { data } = await supabase
        .from('sync_diagnostics')
        .select('category')
        .order('created_at', { ascending: false })
        .limit(500)
      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1)
      }
      setDiag([...counts.entries()].map(([category, count]) => ({ category, count })))
    })()
  }, [])

  const metrics = useMemo(() => {
    const syncEnabled = users.filter((u) => u.sync_enabled).length
    const withPending = users.filter((u) => u.pending_sync_count > 0).length
    const withFailed = users.filter((u) => !!u.last_sync_error).length
    const pendingOps = users.reduce((sum, u) => sum + (u.pending_sync_count || 0), 0)
    const lastSync = users
      .map((u) => u.last_sync_at)
      .filter(Boolean)
      .sort()
      .at(-1)
    return { syncEnabled, withPending, withFailed, pendingOps, lastSync }
  }, [users])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const cat of ERROR_CATEGORIES) map.set(cat, 0)
    for (const u of users) {
      if (!u.last_sync_error) continue
      const cat = categorize(u.last_sync_error)
      map.set(cat, (map.get(cat) ?? 0) + 1)
    }
    return [...map.entries()]
  }, [users])

  const rows = users.filter((u) => {
    if (filter === 'pending') return u.pending_sync_count > 0
    if (filter === 'failed') return !!u.last_sync_error
    return true
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Sync enabled" value={metrics.syncEnabled} />
        <AdminStat label="Pending users" value={metrics.withPending} />
        <AdminStat label="Failed users" value={metrics.withFailed} />
        <AdminStat
          label="Pending operations"
          value={metrics.pendingOps}
          hint={metrics.lastSync ? `Last sync event ${new Date(metrics.lastSync).toLocaleString()}` : undefined}
        />
      </div>

      <AdminCard className="p-4">
        <h2 className="text-pack-text mb-3 text-sm font-medium">Errors by type</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {byCategory.map(([cat, count]) => (
            <div key={cat} className="border-pack-border flex justify-between rounded-xl border px-3 py-2 text-sm">
              <span className="text-pack-text-secondary">{cat}</span>
              <span className="text-pack-text tabular-nums">{count}</span>
            </div>
          ))}
        </div>
        {diag.length > 0 && (
          <div className="mt-4">
            <p className="text-pack-text-muted mb-2 text-xs uppercase tracking-wide">
              Logged sync diagnostics
            </p>
            {diag.map((d) => (
              <p key={d.category} className="text-pack-text-secondary text-xs">
                {d.category}: {d.count}
              </p>
            ))}
          </div>
        )}
      </AdminCard>

      <div className="flex gap-2">
        {(['all', 'pending', 'failed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs capitalize ${
              filter === f ? 'bg-pack-accent/15 text-pack-accent' : 'text-pack-text-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <AdminTable headers={['User', 'Pending', 'Last sync', 'Status', 'Sanitized error']}>
        {rows.slice(0, 100).map((u) => (
          <tr key={u.user_id}>
            <td className="text-pack-text px-4 py-3 text-sm">{u.email ?? u.user_id.slice(0, 8)}</td>
            <td className="px-4 py-3 tabular-nums">{u.pending_sync_count}</td>
            <td className="text-pack-text-muted px-4 py-3 text-xs">
              {u.last_sync_at ? new Date(u.last_sync_at).toLocaleString() : '—'}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={u.last_sync_error ? 'degraded' : 'healthy'} />
            </td>
            <td className="text-pack-text-secondary max-w-xs truncate px-4 py-3 text-xs">
              {u.last_sync_error
                ? `${categorize(u.last_sync_error)}: ${u.last_sync_error.slice(0, 120)}`
                : '—'}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  )
}
