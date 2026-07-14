import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminChangeRole,
  adminDeleteUser,
  adminExportUserMeta,
  adminReactivateUser,
  adminRefreshStats,
  adminResendVerification,
  adminSendPasswordReset,
  adminSignOutAll,
  adminSuspendUser,
  fetchAdminDirectoryLocal,
  fetchAdminUser,
  fetchAdminUsers,
} from '../../services/admin/api'
import type { AdminDirectoryUser, AdminRole } from '../../admin/types'
import { useAdmin } from '../../context/AdminContext'
import { useAuth } from '../../context/AuthContext'
import { useUserDatabase } from '../../context/UserDatabaseContext'
import { reportDevicePackStats } from '../../services/sync/reportStats'
import { formatBytes } from '../../utils/settings'
import {
  AdminButton,
  AdminCard,
  AdminTable,
  StatusBadge,
} from '../../components/admin/AdminPrimitives'

type Filter =
  | 'all'
  | 'active'
  | 'suspended'
  | 'unverified'
  | 'sync_errors'
  | 'admin_roles'
  | 'recent'

function adminUserName(u: {
  display_name: string | null
  first_name: string | null
  last_name: string | null
}) {
  const first = (u.first_name ?? '').trim()
  const last = (u.last_name ?? '').trim()
  if (first || last) return { first: first || '—', last: last || '—' }
  const display = (u.display_name ?? '').trim()
  if (display) {
    const parts = display.split(/\s+/)
    if (parts.length >= 2) {
      return { first: parts[0], last: parts.slice(1).join(' ') }
    }
    return { first: display, last: '—' }
  }
  return { first: '—', last: '—' }
}

function adminUserFullName(u: {
  display_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
}) {
  const { first, last } = adminUserName(u)
  if (first !== '—' || last !== '—') {
    return [first !== '—' ? first : null, last !== '—' ? last : null].filter(Boolean).join(' ')
  }
  return u.display_name || u.email || '—'
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '—'
}

export function AdminUsersPage() {
  const { canManageUsers, canAssignRoles, canDeleteUsers, isAdmin } = useAdmin()
  const { user } = useAuth()
  const { ready: dbReady } = useUserDatabase()
  const [users, setUsers] = useState<AdminDirectoryUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const remote = await fetchAdminUsers()
    let next = remote.data?.users ?? (await fetchAdminDirectoryLocal())
    if (!remote.data?.users && remote.error) setError(remote.error)

    // Your own row: use the same live device DB as Settings so numbers match immediately.
    if (dbReady && user?.id) {
      const device = await reportDevicePackStats()
      if (device) {
        next = next.map((u) =>
          u.user_id === user.id
            ? {
                ...u,
                storage_bytes: device.storageBytes,
                people_count: device.peopleCount,
                places_count: device.placesCount,
                pending_sync_count: device.pendingCount,
              }
            : u,
        )
      }
    }

    setUsers(next)
    setLoading(false)
  }, [dbReady, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return users.filter((u) => {
      if (filter === 'active' && u.account_status !== 'active') return false
      if (filter === 'suspended' && u.account_status !== 'suspended') return false
      if (filter === 'unverified' && u.email_verified !== false) return false
      if (filter === 'sync_errors' && !u.last_sync_error) return false
      if (filter === 'admin_roles' && u.role === 'user') return false
      if (filter === 'recent' && new Date(u.account_created_at).getTime() < weekAgo) return false
      if (!q) return true
      return (
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q) ||
        `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(q)
      )
    })
  }, [users, query, filter])

  const selected = users.find((u) => u.user_id === selectedId) ?? null

  return (
    <div className="space-y-4">
      {error && (
        <AdminCard className="border-amber-500/30 p-3 text-sm text-amber-300">
          Edge API: {error}. Showing RLS directory when available.
        </AdminCard>
      )}
      {message && (
        <AdminCard className="border-pack-accent/30 p-3 text-sm text-pack-accent">{message}</AdminCard>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, or user ID"
          className="border-pack-border bg-[#121212] text-pack-text placeholder:text-pack-text-muted flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-pack-accent"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="border-pack-border bg-[#121212] text-pack-text rounded-xl border px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="unverified">Unverified</option>
          <option value="sync_errors">Sync errors</option>
          <option value="admin_roles">Admin roles</option>
          <option value="recent">Recently created</option>
        </select>
        <AdminButton onClick={() => void load()}>Refresh</AdminButton>
        {isAdmin && (
          <AdminButton
            onClick={() =>
              void (async () => {
                const result = await adminRefreshStats()
                setMessage(result.error ?? 'Cached stats refreshed.')
                await load()
              })()
            }
          >
            Recount from cloud
          </AdminButton>
        )}
      </div>

      {loading ? (
        <p className="text-pack-text-muted text-sm">Loading users…</p>
      ) : (
        <AdminTable
          headers={[
            'First',
            'Last',
            'Email',
            'Role',
            'Status',
            'Sync',
            'Members',
            'Places',
            'Device DB',
            'Created',
          ]}
        >
          {filtered.map((u) => {
            const name = adminUserName(u)
            return (
            <tr
              key={u.user_id}
              className="hover:bg-white/5 cursor-pointer"
              onClick={() => setSelectedId(u.user_id)}
            >
              <td className="text-pack-text px-4 py-3">{name.first}</td>
              <td className="text-pack-text px-4 py-3">{name.last}</td>
              <td className="text-pack-text-secondary px-4 py-3">{u.email ?? '—'}</td>
              <td className="px-4 py-3 capitalize">{u.role}</td>
              <td className="px-4 py-3">
                <StatusBadge status={u.account_status} />
              </td>
              <td className="px-4 py-3">
                {u.last_sync_error ? (
                  <StatusBadge status="degraded" />
                ) : (
                  <StatusBadge status="healthy" />
                )}
              </td>
              <td className="px-4 py-3 tabular-nums">{u.people_count}</td>
              <td className="px-4 py-3 tabular-nums">{u.places_count}</td>
              <td className="px-4 py-3">{formatBytes(u.storage_bytes)}</td>
              <td className="text-pack-text-muted px-4 py-3 text-xs">
                {formatDate(u.account_created_at)}
              </td>
            </tr>
            )
          })}
        </AdminTable>
      )}

      {selected && (
        <UserDetailPanel
          user={selected}
          canManageUsers={canManageUsers}
          canAssignRoles={canAssignRoles}
          canDeleteUsers={canDeleteUsers}
          onClose={() => setSelectedId(null)}
          onMessage={(msg) => {
            setMessage(msg)
            void load()
          }}
        />
      )}

      <p className="text-pack-text-muted text-xs">
        Your own row uses live device values (same Database size as Settings). Other users show
        last-reported device size and cloud member/place counts. Private Pack content is never
        shown.
      </p>
    </div>
  )
}

function UserDetailPanel({
  user,
  canManageUsers,
  canAssignRoles,
  canDeleteUsers,
  onClose,
  onMessage,
}: {
  user: AdminDirectoryUser
  canManageUsers: boolean
  canAssignRoles: boolean
  canDeleteUsers: boolean
  onClose: () => void
  onMessage: (msg: string) => void
}) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchAdminUser>>['data']>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [role, setRole] = useState<AdminRole>(user.role)

  useEffect(() => {
    void fetchAdminUser(user.user_id).then((r) => setDetail(r.data))
  }, [user.user_id])

  const run = async (label: string, fn: () => Promise<{ error: string | null }>) => {
    if (!window.confirm(`${label}?`)) return
    setBusy(true)
    const result = await fn()
    setBusy(false)
    if (result.error) onMessage(result.error)
    else onMessage(`${label} completed.`)
  }

  return (
    <AdminCard className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-pack-text text-lg font-semibold">
            {adminUserFullName(user)}
          </h2>
          <p className="text-pack-text-muted mt-1 font-mono text-xs">{user.user_id}</p>
        </div>
        <AdminButton onClick={onClose}>Close</AdminButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="First name" value={adminUserName(user).first} />
        <Info label="Last name" value={adminUserName(user).last} />
        <Info label="Display name" value={user.display_name ?? '—'} />
        <Info label="Email" value={user.email ?? '—'} />
        <Info label="Role" value={user.role} />
        <Info label="Status" value={user.account_status} />
        <Info label="Created" value={formatDate(user.account_created_at)} />
        <Info label="Last sign-in" value={formatDate(user.last_sign_in_at)} />
        <Info label="Last sync" value={formatDate(user.last_sync_at)} />
        <Info label="Pending sync" value={String(user.pending_sync_count)} />
        <Info label="Pack Members" value={String(user.people_count)} />
        <Info label="Places" value={String(user.places_count)} />
        <Info
          label="Device DB size"
          value={formatBytes(user.storage_bytes)}
        />
        <Info label="Email verified" value={user.email_verified ? 'Yes' : 'Unknown / No'} />
        <Info label="Last sync error" value={user.last_sync_error ?? 'None'} />
      </div>

      <div>
        <label className="text-pack-text-muted text-xs uppercase tracking-wide">
          Reason (for audit)
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-pack-border bg-[#121212] text-pack-text mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="Optional reason"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {user.email && (
          <>
            <AdminButton
              disabled={busy}
              onClick={() =>
                void run('Send password reset', () =>
                  adminSendPasswordReset(user.email!, user.user_id, reason),
                )
              }
            >
              Password reset
            </AdminButton>
            <AdminButton
              disabled={busy}
              onClick={() =>
                void run('Resend verification', () =>
                  adminResendVerification(user.email!, user.user_id, reason),
                )
              }
            >
              Resend verification
            </AdminButton>
          </>
        )}
        {canManageUsers && (
          <>
            {user.account_status === 'active' ? (
              <AdminButton
                variant="danger"
                disabled={busy}
                onClick={() =>
                  void run('Suspend account', () => adminSuspendUser(user.user_id, reason))
                }
              >
                Suspend
              </AdminButton>
            ) : (
              <AdminButton
                disabled={busy}
                onClick={() =>
                  void run('Reactivate account', () => adminReactivateUser(user.user_id, reason))
                }
              >
                Reactivate
              </AdminButton>
            )}
            <AdminButton
              disabled={busy}
              onClick={() =>
                void run('Sign out all sessions', () => adminSignOutAll(user.user_id, reason))
              }
            >
              Sign out all
            </AdminButton>
            <AdminButton
              disabled={busy}
              onClick={() =>
                void run('Export metadata', () => adminExportUserMeta(user.user_id, reason))
              }
            >
              Export metadata
            </AdminButton>
          </>
        )}
        {canAssignRoles && (
          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="border-pack-border bg-[#121212] text-pack-text rounded-xl border px-2 py-2 text-sm"
            >
              <option value="user">user</option>
              <option value="support">support</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
            <AdminButton
              variant="primary"
              disabled={busy || role === user.role}
              onClick={() =>
                void run(`Change role to ${role}`, () =>
                  adminChangeRole(user.user_id, role, reason),
                )
              }
            >
              Change role
            </AdminButton>
          </div>
        )}
        {canDeleteUsers && (
          <AdminButton
            variant="danger"
            disabled={busy}
            onClick={() =>
              void run('DELETE account permanently', () =>
                adminDeleteUser(user.user_id, reason || 'Owner deletion'),
              )
            }
          >
            Delete account
          </AdminButton>
        )}
      </div>

      {detail?.supportNotes && detail.supportNotes.length > 0 && (
        <div>
          <h3 className="text-pack-text mb-2 text-sm font-medium">Support notes</h3>
          <div className="space-y-2">
            {detail.supportNotes.map((n) => (
              <div key={n.id} className="border-pack-border rounded-xl border px-3 py-2 text-sm">
                <p className="text-pack-text">{n.note}</p>
                <p className="text-pack-text-muted mt-1 text-xs">
                  {n.author_role} · {formatDate(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail?.auditHistory && detail.auditHistory.length > 0 && (
        <div>
          <h3 className="text-pack-text mb-2 text-sm font-medium">Audit history</h3>
          <div className="space-y-1">
            {detail.auditHistory.slice(0, 10).map((a) => (
              <p key={a.id} className="text-pack-text-muted text-xs">
                {formatDate(a.created_at)} · {a.action}
                {a.reason ? ` — ${a.reason}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </AdminCard>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-pack-border rounded-xl border px-3 py-2">
      <p className="text-pack-text-muted text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-pack-text mt-1 break-all text-sm">{value}</p>
    </div>
  )
}
