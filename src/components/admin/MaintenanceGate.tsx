import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PackLogo } from '../brand/PackLogo'
import { fetchFeatureFlagsLocal } from '../../services/admin/api'
import { useAdminOptional } from '../../context/AdminContext'
import { getSupabase } from '../../lib/supabase'
import type { MaintenanceMode } from '../../admin/types'

/**
 * Blocks normal app use when maintenance_mode / read_only flags (or access settings) say so.
 * Staff can always reach /admin.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const admin = useAdminOptional()
  const [mode, setMode] = useState<MaintenanceMode>('normal')
  const [ready, setReady] = useState(false)

  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const flags = await fetchFeatureFlagsLocal()
        const maintenance = flags.find((f) => f.key === 'maintenance_mode')?.enabled
        const readOnly = flags.find((f) => f.key === 'read_only_mode')?.enabled

        const supabase = getSupabase()
        let accessMode: MaintenanceMode | null = null
        if (supabase) {
          const { data } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'access')
            .maybeSingle()
          const value = data?.value as { maintenance_mode?: MaintenanceMode } | undefined
          if (value?.maintenance_mode) accessMode = value.maintenance_mode
        }

        let next: MaintenanceMode = 'normal'
        if (accessMode) next = accessMode
        else if (maintenance) next = 'maintenance'
        else if (readOnly) next = 'read-only'

        if (!cancelled) setMode(next)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (!ready) return <>{children}</>

  if (isAdminRoute) return <>{children}</>

  if (mode === 'maintenance' && !admin?.isStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center">
        <PackLogo size="sm" />
        <h1 className="text-pack-text text-xl font-semibold">Pack is under maintenance</h1>
        <p className="text-pack-text-muted max-w-md text-sm leading-relaxed">
          We&apos;re making improvements. Please check back soon. For help, email{' '}
          <a className="text-pack-accent" href="mailto:contact@okamidesigns.com">
            contact@okamidesigns.com
          </a>
          .
        </p>
        <Link to="/admin" className="text-pack-text-muted text-xs underline">
          Staff access
        </Link>
      </div>
    )
  }

  if (mode === 'read-only') {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="bg-amber-500/15 text-amber-200 border-b border-amber-500/20 px-4 py-2 text-center text-sm">
          Pack is in read-only mode. You can view your data; writes are temporarily disabled.
        </div>
        <div className="flex-1">{children}</div>
      </div>
    )
  }

  return <>{children}</>
}
