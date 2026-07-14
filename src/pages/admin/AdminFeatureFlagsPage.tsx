import { useCallback, useEffect, useState } from 'react'
import { adminSetFeatureFlag, fetchFeatureFlagsLocal } from '../../services/admin/api'
import type { FeatureFlag } from '../../admin/types'
import { useAdmin } from '../../context/AdminContext'
import { AdminCard } from '../../components/admin/AdminPrimitives'

const FLAG_LABELS: Record<string, string> = {
  pack_sync: 'Pack Sync enabled',
  realtime: 'Realtime enabled',
  mapbox: 'Mapbox enabled',
  nearby_pois: 'Nearby POIs enabled',
  account_creation: 'Account creation enabled',
  email_verification_required: 'Email verification required',
  new_user_onboarding: 'New user onboarding enabled',
  maintenance_mode: 'Maintenance mode',
  read_only_mode: 'Read-only mode',
  pwa_update_banner: 'PWA update banner enabled',
}

export function AdminFeatureFlagsPage() {
  const { isAdmin } = useAdmin()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFlags(await fetchFeatureFlagsLocal())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async (flag: FeatureFlag) => {
    if (!isAdmin) return
    if (!window.confirm(`${flag.enabled ? 'Disable' : 'Enable'} ${flag.key}?`)) return
    const result = await adminSetFeatureFlag(flag.key, !flag.enabled, 'admin toggle')
    setMessage(result.error ?? `Updated ${flag.key}`)
    await load()
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-pack-accent text-sm">{message}</p>}
      <div className="grid gap-3">
        {flags.map((flag) => (
          <AdminCard key={flag.key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-pack-text text-sm font-medium">
                {FLAG_LABELS[flag.key] ?? flag.key}
              </p>
              <p className="text-pack-text-muted mt-1 text-xs">
                {flag.description ?? flag.key}
              </p>
            </div>
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => void toggle(flag)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                flag.enabled ? 'bg-pack-accent' : 'bg-white/10'
              } disabled:opacity-50`}
              aria-label={`Toggle ${flag.key}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                  flag.enabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </AdminCard>
        ))}
      </div>
      <p className="text-pack-text-muted text-xs">
        Percentage rollout and per-user overrides are reserved for a later version. No secrets are
        stored in flags.
      </p>
    </div>
  )
}
