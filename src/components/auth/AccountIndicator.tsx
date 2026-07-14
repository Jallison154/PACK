import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CloudOff, Loader2, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import { useSync } from '../../context/SyncContext'
import { getSyncStatusLabel } from '../../services/sync/engine'
import { UserAvatar } from './UserAvatar'

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never'
}

export function AccountIndicator() {
  const navigate = useNavigate()
  const { user, isAuthenticated, signOut, cloudAvailable } = useAuth()
  const { profile, headerLabel, fullName } = useProfile()
  const { syncMode, syncStatus, lastSyncAt, diagnostics, switchToLocalOnly } = useSync()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const status = getSyncStatusLabel(syncStatus, lastSyncAt, isAuthenticated)
  const syncBusy =
    syncStatus === 'starting' ||
    syncStatus === 'restoring_session' ||
    syncStatus === 'downloading' ||
    syncStatus === 'uploading'

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const closeAndNavigate = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="hover:bg-pack-card-hover/60 flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {isAuthenticated ? (
          <UserAvatar profile={profile} size="sm" />
        ) : (
          <span className="bg-pack-card text-pack-text-muted flex h-8 w-8 items-center justify-center rounded-full">
            <UserCircle className="h-5 w-5" />
          </span>
        )}
        <span className="hidden items-center gap-1 text-sm font-medium xl:flex">
          <span className="max-w-[140px] truncate">{headerLabel}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
        {!isAuthenticated && (
          <CloudOff className="text-pack-text-muted h-4 w-4" aria-hidden />
        )}
        {syncBusy && isAuthenticated && (
          <Loader2 className="text-pack-accent h-4 w-4 animate-spin" aria-hidden />
        )}
      </button>

      {open && (
        <div className="pack-elevated absolute right-0 z-40 mt-2 w-80 rounded-2xl p-3 shadow-2xl">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <UserAvatar profile={profile} size="lg" />
              <div className="min-w-0">
                <p className="text-pack-text truncate text-sm font-semibold">{fullName}</p>
                <p className="text-pack-text-muted truncate text-xs">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2">
              <span className="bg-pack-card text-pack-text-muted flex h-14 w-14 items-center justify-center rounded-full">
                <UserCircle className="h-7 w-7" />
              </span>
              <div>
                <p className="text-pack-text text-sm font-semibold">Local Mode</p>
                <p className="text-pack-text-muted text-xs">Sign in to sync your Pack</p>
              </div>
            </div>
          )}

          <div className="border-pack-border my-2 border-t" />

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => closeAndNavigate('/settings/account')}
              className="hover:bg-pack-card-hover/60 w-full rounded-xl px-3 py-2 text-left text-sm"
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={() => closeAndNavigate('/settings/account')}
              className="hover:bg-pack-card-hover/60 w-full rounded-xl px-3 py-2 text-left text-sm"
            >
              Account Settings
            </button>
            <button
              type="button"
              onClick={() => closeAndNavigate('/settings/data')}
              className="hover:bg-pack-card-hover/60 w-full rounded-xl px-3 py-2 text-left text-sm"
            >
              <span className="flex items-center justify-between gap-3">
                <span>Pack Sync Status</span>
                <span className="text-pack-text-muted text-xs">{status}</span>
              </span>
            </button>
          </div>

          {isAuthenticated && diagnostics.lastSyncError && (
            <p className="text-pack-danger mt-2 px-3 text-xs">{diagnostics.lastSyncError}</p>
          )}

            {isAuthenticated && (
              <p className="text-pack-text-muted mt-2 px-3 text-xs">
                Realtime: {diagnostics.realtimeConnected ? 'Connected' : 'Disconnected'}
              </p>
            )}

            {isAuthenticated && (
              <p className="text-pack-text-muted mt-2 px-3 text-xs">
                Last synced {formatTime(lastSyncAt)}
              </p>
            )}

          <div className="border-pack-border my-2 border-t" />

          <div className="space-y-1">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => closeAndNavigate('/settings/account')}
                className="hover:bg-pack-card-hover/60 text-pack-accent w-full rounded-xl px-3 py-2 text-left text-sm"
              >
                Sign in to sync
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void signOut()
                  switchToLocalOnly()
                  setOpen(false)
                }}
                className="hover:bg-pack-card-hover/60 w-full rounded-xl px-3 py-2 text-left text-sm"
              >
                Sign Out
              </button>
            )}
            {!cloudAvailable && isAuthenticated && (
              <p className="text-pack-text-muted px-3 py-1 text-xs">Cloud sync is not configured.</p>
            )}
            {syncMode === 'local' && isAuthenticated && cloudAvailable && (
              <p className="text-pack-text-muted px-3 py-1 text-xs">Sync is paused on this device.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
