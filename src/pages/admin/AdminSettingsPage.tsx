import { useCallback, useEffect, useState } from 'react'
import { adminSetMaintenanceMode, fetchFeatureFlagsLocal } from '../../services/admin/api'
import type { MaintenanceMode } from '../../admin/types'
import { getSupabase } from '../../lib/supabase'
import { useAdmin } from '../../context/AdminContext'
import { AdminButton, AdminCard } from '../../components/admin/AdminPrimitives'

interface SiteSettings {
  site_name?: string
  support_email?: string
  public_site_url?: string
  support_link?: string
}

interface AccessSettings {
  maintenance_mode?: MaintenanceMode
  account_creation?: boolean
  email_verification_required?: boolean
}

export function AdminSettingsPage() {
  const { isOwner } = useAdmin()
  const [site, setSite] = useState<SiteSettings>({})
  const [access, setAccess] = useState<AccessSettings>({ maintenance_mode: 'normal' })
  const [retention, setRetention] = useState<{ log_days?: number; backup_days?: number }>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data } = await supabase.from('admin_settings').select('key, value')
    for (const row of data ?? []) {
      if (row.key === 'site') setSite((row.value as SiteSettings) ?? {})
      if (row.key === 'access') setAccess((row.value as AccessSettings) ?? {})
      if (row.key === 'retention') setRetention((row.value as typeof retention) ?? {})
    }
    await fetchFeatureFlagsLocal()
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveSite = async () => {
    if (!isOwner) return
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('admin_settings').upsert({
      key: 'site',
      value: {
        site_name: site.site_name ?? 'Pack',
        support_email: site.support_email ?? 'contact@okamidesigns.com',
        public_site_url: site.public_site_url ?? '',
        support_link: site.support_link ?? 'https://ko-fi.com/okamidesigns',
      },
      updated_at: new Date().toISOString(),
    })
    setBusy(false)
    setMessage(error?.message ?? 'Site settings saved.')
  }

  const setMode = async (mode: MaintenanceMode) => {
    if (!isOwner) return
    if (!window.confirm(`Set maintenance mode to ${mode}?`)) return
    setBusy(true)
    const result = await adminSetMaintenanceMode(mode, 'owner settings')
    setBusy(false)
    setMessage(result.error ?? `Maintenance mode set to ${mode}.`)
    setAccess((prev) => ({ ...prev, maintenance_mode: mode }))
    await load()
  }

  return (
    <div className="space-y-4">
      {!isOwner && (
        <AdminCard className="p-4 text-sm text-amber-300">
          Owner role required to change Admin Settings.
        </AdminCard>
      )}
      {message && <p className="text-pack-accent text-sm">{message}</p>}

      <AdminCard className="space-y-3 p-5">
        <h2 className="text-pack-text font-medium">Site</h2>
        <Field
          label="Site name"
          value={site.site_name ?? 'Pack'}
          disabled={!isOwner}
          onChange={(v) => setSite((s) => ({ ...s, site_name: v }))}
        />
        <Field
          label="Support email"
          value={site.support_email ?? 'contact@okamidesigns.com'}
          disabled={!isOwner}
          onChange={(v) => setSite((s) => ({ ...s, support_email: v }))}
        />
        <Field
          label="Public site URL"
          value={site.public_site_url ?? ''}
          disabled={!isOwner}
          onChange={(v) => setSite((s) => ({ ...s, public_site_url: v }))}
        />
        <Field
          label="Support link"
          value={site.support_link ?? 'https://ko-fi.com/okamidesigns'}
          disabled={!isOwner}
          onChange={(v) => setSite((s) => ({ ...s, support_link: v }))}
        />
        <AdminButton variant="primary" disabled={!isOwner || busy} onClick={() => void saveSite()}>
          Save site settings
        </AdminButton>
      </AdminCard>

      <AdminCard className="space-y-3 p-5">
        <h2 className="text-pack-text font-medium">Maintenance mode</h2>
        <p className="text-pack-text-muted text-sm">
          Current: <span className="text-pack-text">{access.maintenance_mode ?? 'normal'}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {(['normal', 'read-only', 'maintenance'] as MaintenanceMode[]).map((mode) => (
            <AdminButton
              key={mode}
              disabled={!isOwner || busy}
              variant={access.maintenance_mode === mode ? 'primary' : 'secondary'}
              onClick={() => void setMode(mode)}
            >
              {mode}
            </AdminButton>
          ))}
        </div>
        <p className="text-pack-text-muted text-xs leading-relaxed">
          Read-only: users can view data; writes disabled. Maintenance: public maintenance page;
          staff can still open /admin.
        </p>
      </AdminCard>

      <AdminCard className="space-y-2 p-5">
        <h2 className="text-pack-text font-medium">Retention & policy</h2>
        <Row label="Log retention (days)" value={String(retention.log_days ?? 90)} />
        <Row label="Backup retention (days)" value={String(retention.backup_days ?? 30)} />
        <Row label="Support private data access" value="Disabled (V1 metadata-only)" />
        <Row label="Account creation" value={String(access.account_creation ?? true)} />
        <Row
          label="Email verification required"
          value={String(access.email_verification_required ?? true)}
        />
      </AdminCard>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-pack-text-muted text-xs uppercase tracking-wide">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="border-pack-border bg-[#121212] text-pack-text mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-60"
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-pack-text-muted">{label}</span>
      <span className="text-pack-text">{value}</span>
    </div>
  )
}
