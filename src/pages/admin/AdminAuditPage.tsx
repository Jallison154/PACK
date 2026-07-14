import { useEffect, useState } from 'react'
import { adminListAudit } from '../../services/admin/api'
import type { AdminAuditEntry } from '../../admin/types'
import { getSupabase } from '../../lib/supabase'
import { AdminCard, AdminTable } from '../../components/admin/AdminPrimitives'

export function AdminAuditPage() {
  const [audit, setAudit] = useState<AdminAuditEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const remote = await adminListAudit()
      if (remote.data?.audit) {
        setAudit(remote.data.audit)
        return
      }
      const supabase = getSupabase()
      if (supabase) {
        const { data } = await supabase
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        setAudit((data ?? []) as AdminAuditEntry[])
      }
      if (remote.error) setError(remote.error)
    })()
  }, [])

  return (
    <div className="space-y-4">
      {error && <p className="text-pack-text-muted text-sm">{error}</p>}
      <AdminCard className="p-3 text-pack-text-muted text-xs">
        Audit records are immutable from the Admin UI. Writes only occur through the secure
        admin-api Edge Function.
      </AdminCard>
      <AdminTable headers={['Time', 'Admin', 'Role', 'Action', 'Target', 'Reason']}>
        {audit.map((entry) => (
          <tr key={entry.id}>
            <td className="text-pack-text-muted px-4 py-3 text-xs whitespace-nowrap">
              {new Date(entry.created_at).toLocaleString()}
            </td>
            <td className="text-pack-text-secondary px-4 py-3 font-mono text-xs">
              {entry.admin_user_id.slice(0, 8)}…
            </td>
            <td className="px-4 py-3 capitalize text-sm">{entry.admin_role}</td>
            <td className="text-pack-text px-4 py-3 text-sm">{entry.action}</td>
            <td className="text-pack-text-secondary px-4 py-3 font-mono text-xs">
              {entry.target_user_id ? `${entry.target_user_id.slice(0, 8)}…` : '—'}
            </td>
            <td className="text-pack-text-muted max-w-xs truncate px-4 py-3 text-xs">
              {entry.reason ?? '—'}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  )
}
