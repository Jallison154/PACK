import { useState } from 'react'
import {
  SettingsDetailCard,
  ActionRow,
  InfoRow,
  SettingsButton,
} from '../../components/settings/SettingsPrimitives'
import { useAuth } from '../../context/AuthContext'
import { useSync } from '../../context/SyncContext'
import { AuthModal } from '../../components/auth/AuthModal'
import { getSyncStatusLabel, uploadLocalDatabaseToCloud } from '../../services/sync/engine'
import { SYNC_STORAGE_KEYS } from '../../services/sync/types'
import { useDataActions } from '../../hooks/useSettingsData'
import { countPackMembers } from '../../db/repositories/people'

export function AccountSettings() {
  const {
    isAuthenticated,
    user,
    signOut,
    updatePassword,
    deleteAccount,
    cloudAvailable,
  } = useAuth()
  const { syncMode, syncStatus, lastSyncAt, syncNow, enableCloudSync, useLocalOnly } = useSync()
  const { handleExportJSON } = useDataActions()
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statusLabel = getSyncStatusLabel(syncStatus, lastSyncAt, isAuthenticated)

  const handleEnableSync = async () => {
    if (!isAuthenticated) {
      setAuthView('login')
      setAuthOpen(true)
      return
    }
    enableCloudSync()

    const migrationDone = localStorage.getItem(SYNC_STORAGE_KEYS.migrationDone) === 'true'
    const localCount = await countPackMembers()
    if (!migrationDone && localCount > 0 && user) {
      const upload = window.confirm(
        `Upload ${localCount} local Pack Members to your account? Existing cloud records with the same IDs will be updated, not duplicated.`,
      )
      if (upload) {
        setLoading(true)
        try {
          const n = await uploadLocalDatabaseToCloud(user.id)
          setMessage(`Uploaded ${n} records to your account.`)
          await syncNow()
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Upload failed')
        } finally {
          setLoading(false)
        }
        return
      }
    }

    await syncNow()
    setMessage('Cloud sync enabled.')
  }

  const handleChangePassword = async () => {
    const next = window.prompt('Enter a new password (min 8 characters):')
    if (!next || next.length < 8) return
    const result = await updatePassword(next)
    if (result.error) setError(result.error)
    else setMessage('Password updated.')
  }

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Delete all Pack data linked to your account? This cannot be undone. Local data on this device will remain unless you clear it separately.',
      )
    ) {
      return
    }
    setLoading(true)
    const result = await deleteAccount()
    setLoading(false)
    if (result.error) setError(result.error)
    else setMessage('Account data deleted. You have been signed out.')
  }

  return (
    <>
      <SettingsDetailCard>
        {!cloudAvailable && (
          <InfoRow label="Cloud sync" value="Not configured on this server" />
        )}

        {cloudAvailable && !isAuthenticated && (
          <>
            <ActionRow
              label="Sign in"
              description="Access your Pack on any device"
              action={
                <SettingsButton
                  onClick={() => {
                    setAuthView('login')
                    setAuthOpen(true)
                  }}
                >
                  Sign in
                </SettingsButton>
              }
            />
            <ActionRow
              label="Create account"
              description="Sync your Pack across devices"
              action={
                <SettingsButton
                  onClick={() => {
                    setAuthView('signup')
                    setAuthOpen(true)
                  }}
                >
                  Sign up
                </SettingsButton>
              }
            />
          </>
        )}

        {isAuthenticated && (
          <>
            <InfoRow label="Signed in as" value={user?.email ?? '—'} />
            <InfoRow label="Sync mode" value={syncMode === 'cloud' ? 'Cloud + local cache' : 'Local only'} />
            <InfoRow label="Sync status" value={statusLabel} />
            <ActionRow
              label="Sync now"
              description="Push local changes and pull updates"
              action={
                <SettingsButton onClick={() => void syncNow()} loading={syncStatus === 'syncing'}>
                  Sync
                </SettingsButton>
              }
            />
            <ActionRow
              label="Enable cloud sync"
              description="Save to your account when online"
              action={<SettingsButton onClick={() => void handleEnableSync()} loading={loading}>Enable</SettingsButton>}
            />
            <ActionRow
              label="Use local only"
              description="Keep data on this device"
              action={<SettingsButton onClick={useLocalOnly}>Local</SettingsButton>}
            />
            <ActionRow
              label="Change password"
              action={<SettingsButton onClick={() => void handleChangePassword()}>Change</SettingsButton>}
            />
            <ActionRow
              label="Export my data"
              description="Download a JSON backup"
              action={<SettingsButton onClick={() => void handleExportJSON()}>Export</SettingsButton>}
            />
            <ActionRow
              label="Sign out"
              action={
                <SettingsButton
                  onClick={() => {
                    void signOut()
                    useLocalOnly()
                  }}
                >
                  Sign out
                </SettingsButton>
              }
            />
            <ActionRow
              label="Delete account"
              description="Remove cloud Pack data and sign out"
              action={
                <SettingsButton onClick={() => void handleDeleteAccount()} loading={loading}>
                  Delete
                </SettingsButton>
              }
            />
          </>
        )}

        {message && <p className="text-pack-text-secondary px-1 pt-2 text-sm">{message}</p>}
        {error && <p className="text-pack-danger px-1 pt-2 text-sm">{error}</p>}
      </SettingsDetailCard>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
        onSuccess={() => void handleEnableSync()}
      />
    </>
  )
}
