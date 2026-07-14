import { mapboxConfigured } from '../../services/mapbox/config'
import { getMapRuntimeDiagnostics } from '../../services/mapbox/mapRuntimeDiagnostics'
import { isCloudSyncAvailable, validateCloudEnv } from '../../lib/env'
import { AdminCard, StatusBadge } from '../../components/admin/AdminPrimitives'

export function AdminServicesPage() {
  const env = validateCloudEnv()
  const map = getMapRuntimeDiagnostics()
  const supabaseOk = isCloudSyncAvailable()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminCard className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-pack-text font-medium">Supabase</h2>
          <StatusBadge status={supabaseOk ? 'healthy' : 'offline'} />
        </div>
        <Row label="Configured" value={env.configured ? 'Yes' : 'No'} />
        <Row label="Missing" value={env.missing.length ? env.missing.join(', ') : 'None'} />
        <Row label="Auth" value={supabaseOk ? 'Client ready' : 'Unavailable'} />
        <Row label="Realtime" value={supabaseOk ? 'Configured with project' : 'Unavailable'} />
        <p className="text-pack-text-muted text-xs">
          Service-role credentials are never shipped to the browser. Privileged ops use the
          admin-api Edge Function.
        </p>
      </AdminCard>

      <AdminCard className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-pack-text font-medium">Mapbox</h2>
          <StatusBadge
            status={
              mapboxConfigured
                ? map.lastErrorCategory === 'none'
                  ? 'healthy'
                  : 'warning'
                : 'offline'
            }
          />
        </div>
        <Row label="Token configured" value={mapboxConfigured ? 'Yes' : 'No'} />
        <Row label="Token prefix valid" value={map.tokenPrefixValid ? 'Yes' : 'No'} />
        <Row label="Token length" value={String(map.tokenLength)} />
        <Row label="Style URL" value={map.mapStyleUrl} />
        <Row label="Last error category" value={map.lastErrorCategory} />
        <Row label="HTTP status category" value={map.lastHttpStatusCategory} />
        <Row label="Restriction / fail resource" value={map.lastFailedResource ?? '—'} />
        <p className="text-pack-text-muted text-xs">
          Token value is never displayed — only length, prefix validity, and error categories.
        </p>
      </AdminCard>

      <AdminCard className="space-y-3 p-5 lg:col-span-2">
        <h2 className="text-pack-text font-medium">Email / Auth flows</h2>
        <Row
          label="Password reset"
          value={supabaseOk ? 'Available via Supabase Auth' : 'Unavailable'}
        />
        <Row
          label="Verification email"
          value={supabaseOk ? 'Available via Supabase Auth' : 'Unavailable'}
        />
        <Row label="Support email" value="contact@okamidesigns.com" />
        <Row label="Support link" value="https://ko-fi.com/okamidesigns" />
      </AdminCard>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-pack-text-muted shrink-0">{label}</span>
      <span className="text-pack-text text-right break-all">{value}</span>
    </div>
  )
}
