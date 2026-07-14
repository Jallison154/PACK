import { useState } from 'react'
import { Cloud } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isCloudSyncAvailable } from '../../lib/env'
import { SYNC_STORAGE_KEYS } from '../../services/sync/types'
import { AuthModal } from './AuthModal'

export function SyncPromptBanner() {
  const { isAuthenticated, cloudAvailable } = useAuth()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(SYNC_STORAGE_KEYS.promptDismissed) === 'true',
  )
  const [authOpen, setAuthOpen] = useState(false)

  if (!isCloudSyncAvailable() || !cloudAvailable || isAuthenticated || dismissed) {
    return null
  }

  return (
    <>
      <div className="app-notice">
        <div className="app-notice-panel pack-surface flex min-w-0 items-start gap-3 rounded-2xl p-4">
          <Cloud className="text-pack-accent mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-pack-text text-sm font-medium">
              Create an account to sync your Pack across devices.
            </p>
            <p className="text-pack-text-muted mt-1 text-xs leading-relaxed">
              You can keep using Pack locally — signing up is optional.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="bg-pack-accent rounded-xl px-3 py-2 text-sm font-medium text-black"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="text-pack-text-secondary hover:text-pack-text rounded-xl px-3 py-2 text-sm"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(SYNC_STORAGE_KEYS.promptDismissed, 'true')
                  setDismissed(true)
                }}
                className="text-pack-text-muted hover:text-pack-text-secondary px-3 py-2 text-sm"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
