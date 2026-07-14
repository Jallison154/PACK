import { useEffect, useState } from 'react'
import {
  fetchAdminDirectoryLocal,
  fetchAdminOverview,
  fetchAdminUsers,
  fetchFeatureFlagsLocal,
} from '../../services/admin/api'
import type { AdminOverview } from '../../admin/types'
import { AdminCard, AdminStat, StatusBadge } from '../../components/admin/AdminPrimitives'
import { mapboxConfigured } from '../../services/mapbox/config'
import { isCloudSyncAvailable, validateCloudEnv } from '../../lib/env'
import { getMapRuntimeDiagnostics } from '../../services/mapbox/mapRuntimeDiagnostics'
import { formatBytes } from '../../utils/settings'
import { useAuth } from '../../context/AuthContext'
import { useUserDatabase } from '../../context/UserDatabaseContext'
import { readDevicePackStats } from '../../services/sync/reportStats'

export function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalStorageBytes, setTotalStorageBytes] = useState(0)
  const { user } = useAuth()
  const { ready: dbReady } = useUserDatabase()
  const env = validateCloudEnv()
  const map = getMapRuntimeDiagnostics()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)

      const [result, remote] = await Promise.all([fetchAdminOverview(), fetchAdminUsers()])
      if (cancelled) return
      if (result.error) setError(result.error)
      else setOverview(result.data)

      const users = remote.data?.users ?? (await fetchAdminDirectoryLocal())
      let sum = users.reduce((acc, u) => acc + (Number(u.storage_bytes) || 0), 0)

      // Prefer live device size for the signed-in staff member
      if (dbReady && user?.id) {
        const device = await readDevicePackStats().catch(() => null)
        if (device) {
          const others = users
            .filter((u) => u.user_id !== user.id)
            .reduce((acc, u) => acc + (Number(u.storage_bytes) || 0), 0)
          sum = others + device.storageBytes
        }
      }

      // If directory has no sizes yet, fall back to overview aggregate
      if (!sum && result.data?.totalStorageBytes) {
        sum = result.data.totalStorageBytes
      }

      setTotalStorageBytes(sum)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [dbReady, user?.id])

  useEffect(() => {
    void fetchFeatureFlagsLocal()
  }, [])

  const supabaseStatus = isCloudSyncAvailable() ? 'healthy' : 'offline'
  const mapboxStatus = mapboxConfigured
    ? map.lastErrorCategory === 'none'
      ? 'healthy'
      : 'warning'
    : 'offline'

  return (
    <div className="space-y-6">
      {error && (
        <AdminCard className="border-pack-danger/40 p-4 text-sm text-pack-danger">
          Admin API: {error}. Staff directory may still work via RLS when Edge Functions are
          unavailable.
        </AdminCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStat label="Total users" value={overview?.totalUsers ?? (loading ? '…' : 0)} />
        <AdminStat label="Active users" value={overview?.activeUsers ?? (loading ? '…' : 0)} />
        <AdminStat
          label="New this week"
          value={overview?.newUsersThisWeek ?? (loading ? '…' : 0)}
        />
        <AdminStat
          label="Sync errors"
          value={overview?.usersWithSyncErrors ?? (loading ? '…' : 0)}
          hint={`${overview?.pendingSyncOperations ?? 0} pending ops`}
        />
        <AdminStat
          label="Total device DB"
          value={loading ? '…' : formatBytes(totalStorageBytes)}
          hint="Sum of reported device database sizes"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard className="p-4">
          <p className="text-pack-text-muted text-xs uppercase tracking-wide">Supabase</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={supabaseStatus} />
            <span className="text-pack-text-secondary text-sm">
              {env.configured ? 'Configured' : env.missing.join(', ')}
            </span>
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-pack-text-muted text-xs uppercase tracking-wide">Mapbox</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={mapboxStatus} />
            <span className="text-pack-text-secondary text-sm">
              {mapboxConfigured ? 'Token present' : 'Not configured'}
            </span>
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-pack-text-muted text-xs uppercase tracking-wide">App version</p>
          <p className="text-pack-text mt-2 text-sm font-medium">
            {overview?.appVersion ?? map.appBuildVersion}
          </p>
          <p className="text-pack-text-muted mt-1 text-xs">Build {map.buildId}</p>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-pack-text-muted text-xs uppercase tracking-wide">Realtime</p>
          <div className="mt-2">
            <StatusBadge status={map.mapInitialized ? 'healthy' : 'warning'} />
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-4">
        <h2 className="text-pack-text text-sm font-medium">Recent critical errors</h2>
        <div className="mt-3 space-y-2">
          {(overview?.recentErrors ?? []).length === 0 ? (
            <p className="text-pack-text-muted text-sm">No unresolved errors reported.</p>
          ) : (
            overview?.recentErrors.map((err) => (
              <div
                key={err.id}
                className="border-pack-border flex items-start justify-between gap-3 rounded-xl border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-pack-text truncate text-sm">{err.error_message}</p>
                  <p className="text-pack-text-muted mt-0.5 text-xs">
                    {new Date(err.created_at).toLocaleString()} · {err.severity}
                  </p>
                </div>
                <StatusBadge status={err.resolved ? 'healthy' : 'degraded'} />
              </div>
            ))
          )}
        </div>
      </AdminCard>

      <p className="text-pack-text-muted text-xs leading-relaxed">
        Admin Overview shows counts and service health only. Private Pack Member content is never
        loaded here. Total device DB is the sum of each user’s reported local database size.
      </p>
    </div>
  )
}
