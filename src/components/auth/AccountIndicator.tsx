import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, CloudOff, Loader2, UserCircle, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSync } from '../../context/SyncContext'
import { getSyncStatusLabel } from '../../services/sync/engine'

function initials(email: string | null | undefined) {
  if (!email) return '?'
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never'
}

export function AccountIndicator() {
  const navigate = useNavigate()
  const { user, isAuthenticated, signOut, cloudAvailable } = useAuth()
  const { syncMode, syncStatus, lastSyncAt, diagnostics, useLocalOnly } = useSync()
  const [open, setOpen] = useState(false)

  const label = isAuthenticated ? user?.email ?? 'Account' : 'Local Mode'
  const status = getSyncStatusLabel(syncStatus, lastSyncAt, isAuthenticated)
  const avatarText = useMemo(() => initials(user?.email), [user?.email])

  const StatusIcon =
    !cloudAvailable || syncMode === 'local'
      ? CloudOff
      : syncStatus === 'syncing'
        ? Loader2
        : syncStatus === 'offline'
          ? WifiOff
          : syncStatus === 'error'
            ? AlertCircle
            : CheckCircle2

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-pack-card-hover/60 flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors"
        aria-label="Account menu"
      >
        <span className="bg-pack-accent text-pack-bg-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
          {isAuthenticated ? avatarText : <UserCircle className="h-5 w-5" />}
        </span>
        <span className="hidden max-w-[180px] truncate text-sm font-medium xl:block">
          {label}
        </span>
        <StatusIcon
          className={`h-4 w-4 ${
            syncStatus === 'error'
              ? 'text-pack-danger'
              : syncStatus === 'syncing'
                ? 'text-pack-accent animate-spin'
                : 'text-pack-text-muted'
          }`}
        />
      </button>

      {open && (
        <div className="pack-elevated absolute right-0 z-40 mt-2 w-80 rounded-2xl p-3 shadow-2xl">
          <div className="px-2 py-2">
            <p className="text-pack-text-muted text-xs">
              {isAuthenticated ? 'Signed in as' : 'Account'}
            </p>
            <p className="text-pack-text truncate text-sm font-semibold">
              {isAuthenticated ? user?.email : 'Local Mode'}
            </p>
          </div>

          <div className="border-pack-border my-2 border-t" />

          <div className="space-y-2 px-2 py-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-pack-text-muted">Sync status</span>
              <span className="text-pack-text-secondary text-right">{status}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-pack-text-muted">Last synced</span>
              <span className="text-pack-text-secondary text-right">{formatTime(lastSyncAt)}</span>
            </div>
            {diagnostics.lastSyncError && (
              <p className="text-pack-danger max-h-10 overflow-hidden text-xs">
                {diagnostics.lastSyncError}
              </p>
            )}
          </div>

          <div className="border-pack-border my-2 border-t" />

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/settings/account')
              }}
              className="hover:bg-pack-card-hover/60 w-full rounded-xl px-3 py-2 text-left text-sm"
            >
              Account settings
            </button>
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/settings/account')
                }}
                className="hover:bg-pack-card-hover/60 text-pack-accent w-full rounded-xl px-3 py-2 text-left text-sm"
              >
                Sign in to sync
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void signOut()
                  useLocalOnly()
                  setOpen(false)
                }}
                className="hover:bg-pack-card-hover/60 w-full rounded-xl px-3 py-2 text-left text-sm"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
