import { useState } from 'react'
import {
  adminAddSupportNote,
  adminClearPendingSyncMeta,
  adminResendVerification,
  adminSendPasswordReset,
  adminSignOutAll,
  fetchAdminDirectoryLocal,
  fetchAdminUser,
  fetchAdminUsers,
} from '../../services/admin/api'
import type { AdminDirectoryUser } from '../../admin/types'
import { getMapRuntimeDiagnostics } from '../../services/mapbox/mapRuntimeDiagnostics'
import {
  AdminButton,
  AdminCard,
  StatusBadge,
} from '../../components/admin/AdminPrimitives'

export function AdminSupportPage() {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<AdminDirectoryUser[]>([])
  const [selected, setSelected] = useState<AdminDirectoryUser | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const map = getMapRuntimeDiagnostics()

  const search = async () => {
    setMessage(null)
    const remote = await fetchAdminUsers()
    const list = remote.data?.users ?? (await fetchAdminDirectoryLocal())
    const q = query.trim().toLowerCase()
    const found = list.filter(
      (u) =>
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q),
    )
    setMatches(found.slice(0, 20))
    setSelected(found[0] ?? null)
    if (!found.length) setMessage('No users matched.')
  }

  const run = async (label: string, fn: () => Promise<{ error: string | null }>) => {
    if (!selected) return
    if (!window.confirm(`${label}?`)) return
    setBusy(true)
    const result = await fn()
    setBusy(false)
    setMessage(result.error ?? `${label} completed.`)
  }

  const loadDetail = async (user: AdminDirectoryUser) => {
    setSelected(user)
    await fetchAdminUser(user.user_id)
  }

  return (
    <div className="space-y-4">
      <AdminCard className="space-y-3 p-4">
        <p className="text-pack-text-muted text-sm">
          Metadata-only support tools. Private Pack Member content is never loaded.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user by email, name, or ID"
            className="border-pack-border bg-[#121212] text-pack-text flex-1 rounded-xl border px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void search()
            }}
          />
          <AdminButton variant="primary" onClick={() => void search()}>
            Search
          </AdminButton>
        </div>
        {message && <p className="text-pack-accent text-sm">{message}</p>}
      </AdminCard>

      {matches.length > 0 && (
        <AdminCard className="divide-pack-border divide-y">
          {matches.map((u) => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => void loadDetail(u)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                selected?.user_id === u.user_id ? 'bg-pack-accent/10' : 'hover:bg-white/5'
              }`}
            >
              <span className="text-pack-text">
                {[u.first_name, u.last_name].filter(Boolean).join(' ') ||
                  u.display_name ||
                  u.email ||
                  u.user_id}
              </span>
              <StatusBadge status={u.account_status} />
            </button>
          ))}
        </AdminCard>
      )}

      {selected && (
        <AdminCard className="space-y-4 p-4">
          <div>
            <h2 className="text-pack-text font-semibold">
              {[selected.first_name, selected.last_name].filter(Boolean).join(' ') ||
                selected.display_name ||
                selected.email}
            </h2>
            <p className="text-pack-text-muted font-mono text-xs">{selected.user_id}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Meta label="Auth / account" value={selected.account_status} />
            <Meta label="Role" value={selected.role} />
            <Meta label="Last sync" value={selected.last_sync_at ?? '—'} />
            <Meta label="Last error" value={selected.last_sync_error ?? 'None'} />
            <Meta label="Pending ops" value={String(selected.pending_sync_count)} />
            <Meta label="Build / app" value={map.appBuildVersion} />
            <Meta label="Browser" value={navigator.userAgent.slice(0, 80)} />
            <Meta
              label="Data counts"
              value={`${selected.people_count} members · ${selected.places_count} places`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {selected.email && (
              <>
                <AdminButton
                  disabled={busy}
                  onClick={() =>
                    void run('Send password reset', () =>
                      adminSendPasswordReset(selected.email!, selected.user_id, 'support'),
                    )
                  }
                >
                  Password reset
                </AdminButton>
                <AdminButton
                  disabled={busy}
                  onClick={() =>
                    void run('Resend verification', () =>
                      adminResendVerification(selected.email!, selected.user_id, 'support'),
                    )
                  }
                >
                  Resend verification
                </AdminButton>
              </>
            )}
            <AdminButton
              disabled={busy}
              onClick={() =>
                void run('Force sign-out', () => adminSignOutAll(selected.user_id, 'support'))
              }
            >
              Force sign-out
            </AdminButton>
            <AdminButton
              disabled={busy}
              onClick={() =>
                void run('Clear stuck sync metadata', () =>
                  adminClearPendingSyncMeta(selected.user_id, 'support clear queue meta'),
                )
              }
            >
              Clear sync queue meta
            </AdminButton>
            <AdminButton
              disabled={busy}
              onClick={() => {
                const report = {
                  userId: selected.user_id,
                  email: selected.email,
                  status: selected.account_status,
                  role: selected.role,
                  pending: selected.pending_sync_count,
                  lastError: selected.last_sync_error,
                  counts: {
                    people: selected.people_count,
                    places: selected.places_count,
                  },
                  app: map.appBuildVersion,
                  generatedAt: new Date().toISOString(),
                }
                void navigator.clipboard.writeText(JSON.stringify(report, null, 2))
                setMessage('Diagnostic report copied (metadata only).')
              }}
            >
              Copy diagnostic report
            </AdminButton>
          </div>

          <div className="space-y-2">
            <label className="text-pack-text-muted text-xs uppercase tracking-wide">
              Internal support note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="border-pack-border bg-[#121212] text-pack-text w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Internal only — never shown to the user"
            />
            <AdminButton
              disabled={busy || !note.trim()}
              onClick={() =>
                void run('Add support note', async () => {
                  const result = await adminAddSupportNote(selected.user_id, note.trim())
                  if (!result.error) setNote('')
                  return result
                })
              }
            >
              Add note
            </AdminButton>
          </div>
        </AdminCard>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-pack-border rounded-xl border px-3 py-2">
      <p className="text-pack-text-muted text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-pack-text mt-1 break-all text-sm">{value}</p>
    </div>
  )
}
