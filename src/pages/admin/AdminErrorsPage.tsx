import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminListErrors, adminResolveError } from '../../services/admin/api'
import type { AppErrorLog } from '../../admin/types'
import { useAdmin } from '../../context/AdminContext'
import { getSupabase } from '../../lib/supabase'
import {
  AdminButton,
  AdminCard,
  AdminTable,
  StatusBadge,
} from '../../components/admin/AdminPrimitives'

export function AdminErrorsPage() {
  const { isAdmin } = useAdmin()
  const [errors, setErrors] = useState<AppErrorLog[]>([])
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState('all')
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const remote = await adminListErrors()
    if (remote.data?.errors) {
      setErrors(remote.data.errors)
      return
    }
    const supabase = getSupabase()
    if (!supabase) return
    const { data } = await supabase
      .from('app_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setErrors((data ?? []) as AppErrorLog[])
    if (remote.error) setMessage(remote.error)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return errors.filter((e) => {
      if (severity !== 'all' && e.severity !== severity) return false
      if (!q) return true
      return (
        e.error_message.toLowerCase().includes(q) ||
        (e.error_code ?? '').toLowerCase().includes(q) ||
        (e.route ?? '').toLowerCase().includes(q) ||
        (e.service ?? '').toLowerCase().includes(q) ||
        (e.user_id ?? '').toLowerCase().includes(q)
      )
    })
  }, [errors, query, severity])

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pack-error-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-pack-text-muted text-sm">{message}</p>}
      <div className="flex flex-col gap-2 lg:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search errors"
          className="border-pack-border bg-[#121212] text-pack-text flex-1 rounded-xl border px-3 py-2 text-sm"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="border-pack-border bg-[#121212] text-pack-text rounded-xl border px-3 py-2 text-sm"
        >
          <option value="all">All severities</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
          <option value="critical">critical</option>
        </select>
        <AdminButton onClick={() => void load()}>Refresh</AdminButton>
        <AdminButton onClick={exportLogs}>Export</AdminButton>
      </div>

      <AdminTable
        headers={['Time', 'Severity', 'Service', 'Message', 'Route', 'Resolved', 'Actions']}
      >
        {filtered.map((err) => (
          <tr key={err.id}>
            <td className="text-pack-text-muted px-4 py-3 text-xs whitespace-nowrap">
              {new Date(err.created_at).toLocaleString()}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={err.severity === 'critical' ? 'offline' : err.severity} />
            </td>
            <td className="text-pack-text-secondary px-4 py-3 text-xs">
              {err.service ?? '—'} / {err.operation ?? '—'}
            </td>
            <td className="text-pack-text max-w-sm truncate px-4 py-3 text-sm">
              {err.error_code ? `[${err.error_code}] ` : ''}
              {err.error_message}
            </td>
            <td className="text-pack-text-muted px-4 py-3 text-xs">{err.route ?? '—'}</td>
            <td className="px-4 py-3">
              <StatusBadge status={err.resolved ? 'healthy' : 'warning'} />
            </td>
            <td className="px-4 py-3">
              {isAdmin && !err.resolved && (
                <AdminButton
                  onClick={() =>
                    void adminResolveError(err.id).then(() => {
                      void load()
                    })
                  }
                >
                  Resolve
                </AdminButton>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>

      <AdminCard className="p-3 text-pack-text-muted text-xs">
        Logs exclude passwords, tokens, API keys, contact notes, phones, and full private records.
      </AdminCard>
    </div>
  )
}
