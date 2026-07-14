import { useState } from 'react'
import { adminRunHealthChecks } from '../../services/admin/api'
import { isCloudSyncAvailable, validateCloudEnv } from '../../lib/env'
import { getMapRuntimeDiagnostics } from '../../services/mapbox/mapRuntimeDiagnostics'
import { mapboxConfigured } from '../../services/mapbox/config'
import { getSupabase } from '../../lib/supabase'
import {
  AdminButton,
  AdminCard,
  StatusBadge,
} from '../../components/admin/AdminPrimitives'

type Check = {
  name: string
  status: string
  latencyMs?: number
  message?: string
}

export function AdminSystemHealthPage() {
  const [checks, setChecks] = useState<Check[]>([])
  const [remote, setRemote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const env = validateCloudEnv()
  const map = getMapRuntimeDiagnostics()

  const runLocal = async () => {
    setBusy(true)
    const started = performance.now()
    const next: Check[] = []

    next.push({
      name: 'Frontend',
      status: 'healthy',
      message: `Build ${map.buildId}`,
    })

    next.push({
      name: 'Service worker',
      status: 'serviceWorker' in navigator ? 'healthy' : 'warning',
      message:
        'serviceWorker' in navigator
          ? 'API available (version via PWA update flow)'
          : 'Not available in this browser',
    })

    const supabase = getSupabase()
    if (!supabase || !isCloudSyncAvailable()) {
      next.push({
        name: 'Supabase',
        status: 'offline',
        message: env.missing.join(', ') || 'Not configured',
      })
    } else {
      const t0 = performance.now()
      const { error: authErr } = await supabase.auth.getSession()
      next.push({
        name: 'Supabase Auth',
        status: authErr ? 'degraded' : 'healthy',
        latencyMs: Math.round(performance.now() - t0),
        message: authErr?.message,
      })

      const t1 = performance.now()
      const { error: readErr } = await supabase.from('feature_flags').select('key').limit(1)
      next.push({
        name: 'Database read',
        status: readErr ? 'degraded' : 'healthy',
        latencyMs: Math.round(performance.now() - t1),
        message: readErr?.message,
      })

      const t2 = performance.now()
      const { error: writeErr } = await supabase.from('admin_diagnostics_ping').insert({
        note: 'admin health ping',
      })
      next.push({
        name: 'Database write (diagnostics)',
        status: writeErr ? 'degraded' : 'healthy',
        latencyMs: Math.round(performance.now() - t2),
        message: writeErr?.message ?? 'Wrote to admin_diagnostics_ping',
      })
    }

    next.push({
      name: 'Mapbox token',
      status: mapboxConfigured
        ? map.tokenPrefixValid
          ? 'healthy'
          : 'warning'
        : 'offline',
      message: map.tokenState,
    })

    next.push({
      name: 'Map runtime',
      status:
        map.lastErrorCategory === 'none'
          ? map.mapInitialized
            ? 'healthy'
            : 'warning'
          : 'degraded',
      message: map.lastMapboxError ?? map.lastErrorCategory,
    })

    next.push({
      name: 'API latency (local suite)',
      status: 'healthy',
      latencyMs: Math.round(performance.now() - started),
    })

    setChecks(next)

    const remoteResult = await adminRunHealthChecks()
    if (remoteResult.error) setRemote(remoteResult.error)
    else if (remoteResult.data) {
      setRemote(`Server checks: ${remoteResult.data.totalLatencyMs}ms`)
      const mapped = (remoteResult.data.checks ?? []).map((c) => ({
        name: String(c.service ?? c.name ?? 'check'),
        status: String(c.status ?? 'warning'),
        latencyMs: typeof c.latency_ms === 'number' ? c.latency_ms : undefined,
        message: String(c.message ?? ''),
      }))
      if (mapped.length) setChecks((prev) => [...prev, ...mapped])
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-pack-text-muted text-sm">
          Application, Supabase, Mapbox, and diagnostics. Secrets are never displayed.
        </p>
        <AdminButton variant="primary" loading={busy} onClick={() => void runLocal()}>
          Run diagnostics
        </AdminButton>
      </div>

      {remote && <p className="text-pack-text-secondary text-xs">{remote}</p>}

      <div className="space-y-2">
        {checks.length === 0 ? (
          <AdminCard className="p-4 text-pack-text-muted text-sm">
            Run diagnostics to collect live health results.
          </AdminCard>
        ) : (
          checks.map((check, i) => (
            <AdminCard key={`${check.name}-${i}`} className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-pack-text text-sm font-medium">{check.name}</p>
                {check.message && (
                  <p className="text-pack-text-muted mt-1 text-xs break-all">{check.message}</p>
                )}
                {check.latencyMs != null && (
                  <p className="text-pack-text-muted mt-1 text-xs">{check.latencyMs} ms</p>
                )}
              </div>
              <StatusBadge status={check.status} />
            </AdminCard>
          ))
        )}
      </div>
    </div>
  )
}
