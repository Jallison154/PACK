import { useEffect, useState } from 'react'
import {
  SettingsDetailCard,
  ActionRow,
  CollapsibleSection,
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
import { validateCloudEnv } from '../../lib/env'

export function AccountSettings() {
  const {
    isAuthenticated,
    user,
    signOut,
    updatePassword,
    deleteAccount,
    cloudAvailable,
  } = useAuth()
  const {
    syncMode,
    syncStatus,
    lastSyncAt,
    diagnostics,
    syncNow,
    enableCloudSync,
    useLocalOnly,
    refreshDiagnostics,
    testConnection,
  } = useSync()
  const { handleExportJSON } = useDataActions()
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [localCount, setLocalCount] = useState(0)

  const statusLabel = getSyncStatusLabel(syncStatus, lastSyncAt, isAuthenticated)
  const env = validateCloudEnv()

  useEffect(() => {
    countPackMembers().then(setLocalCount).catch(() => setLocalCount(0))
    void refreshDiagnostics()
  }, [refreshDiagnostics])

  const handleUploadLocalData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const n = await uploadLocalDatabaseToCloud(user.id)
      setMessage(`Uploaded ${n} records to your account.`)
      enableCloudSync()
      await syncNow()
      await refreshDiagnostics()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEnableSync = async () => {
    setError(null)
    setMessage(null)
    if (!isAuthenticated) {
      setAuthView('login')
      setAuthOpen(true)
      return
    }
    enableCloudSync()

    const migrationDone = localStorage.getItem(SYNC_STORAGE_KEYS.migrationDone) === 'true'
    if (!migrationDone && localCount > 0 && user) {
      setMessage('You have local Pack data. Choose Sync Now, Later, or Keep Local Only below.')
      return
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
    await refreshDiagnostics()
  }

  const handleTestConnection = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    const result = await testConnection()
    setLoading(false)
    if (result.ok) setMessage(result.message)
    else setError(result.message)
  }

  return (
    <>
      <SettingsDetailCard>
        <InfoRow label="Mode" value={isAuthenticated ? 'Signed in' : 'Local Mode'} />
        <InfoRow label="Cloud Sync" value={syncMode === 'cloud' ? 'On' : 'Off'} />
        <InfoRow label="Sync Status" value={statusLabel} />

        {cloudAvailable && !isAuthenticated && (
          <>
            <InfoRow
              label="Create an account to sync your Pack across devices."
              value=""
            />
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

        {!cloudAvailable && (
          <InfoRow
            label="Cloud sync"
            value="Not configured"
            description={`Missing: ${env.missing.join(', ') || 'unknown'}`}
          />
        )}

        {isAuthenticated && (
          <>
            <InfoRow label="Email" value={user?.email ?? '—'} />
            <InfoRow label="Last Sync Time" value={lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'} />
            <InfoRow label="Pending Local Changes" value={diagnostics.pendingLocalChanges} />
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
              action={
                <SettingsButton
                  onClick={() => void handleEnableSync()}
                  loading={loading}
                  disabled={!cloudAvailable}
                >
                  Enable
                </SettingsButton>
              }
            />
            {syncMode === 'cloud' &&
              localCount > 0 &&
              localStorage.getItem(SYNC_STORAGE_KEYS.migrationDone) !== 'true' && (
                <div className="py-3.5">
                  <p className="text-[15px] leading-snug font-medium">
                    You have local Pack data. Sync it to your account?
                  </p>
                  <p className="text-pack-text-muted mt-0.5 text-sm leading-relaxed">
                    Existing cloud records with the same IDs are updated, not duplicated.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SettingsButton onClick={() => void handleUploadLocalData()} loading={loading}>
                      Sync Now
                    </SettingsButton>
                    <SettingsButton onClick={() => setMessage('No problem. You can sync later from Account settings.')}>
                      Later
                    </SettingsButton>
                    <SettingsButton onClick={useLocalOnly}>
                      Keep Local Only
                    </SettingsButton>
                  </div>
                </div>
              )}
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
              destructive
              action={
                <SettingsButton variant="danger" onClick={() => void handleDeleteAccount()} loading={loading}>
                  Delete
                </SettingsButton>
              }
            />
          </>
        )}

        {message && <p className="text-pack-text-secondary px-1 pt-2 text-sm">{message}</p>}
        {error && <p className="text-pack-danger px-1 pt-2 text-sm">{error}</p>}
      </SettingsDetailCard>

      <div className="mt-4">
        <CollapsibleSection
          title="Sync Diagnostics"
          open={debugOpen}
          onToggle={() => setDebugOpen((v) => !v)}
        >
          <InfoRow label="Supabase Configured" value={diagnostics.supabaseConfigured ? 'Yes' : 'No'} />
          <InfoRow label="Logged In" value={isAuthenticated ? 'Yes' : 'No'} />
          <InfoRow label="Cloud Sync Enabled" value={syncMode === 'cloud' ? 'Yes' : 'No'} />
          <InfoRow label="Last Sync Attempt" value={diagnostics.lastSyncAttempt ? new Date(diagnostics.lastSyncAttempt).toLocaleString() : 'Never'} />
          <InfoRow label="Last Sync Success" value={diagnostics.lastSyncSuccess ? new Date(diagnostics.lastSyncSuccess).toLocaleString() : 'Never'} />
          <InfoRow label="Last Sync Error" value={diagnostics.lastSyncError ?? 'None'} />
          <InfoRow label="Pending Local Changes" value={diagnostics.pendingLocalChanges} />
          {isAuthenticated && <InfoRow label="User ID" value={<span className="font-mono text-xs">{user?.id}</span>} />}
          <ActionRow
            label="Test Supabase Connection"
            description="Checks auth session and reads your people table through RLS"
            action={
              <SettingsButton onClick={() => void handleTestConnection()} loading={loading}>
                Test
              </SettingsButton>
            }
          />
        </CollapsibleSection>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
        onSuccess={() => void handleEnableSync()}
      />
    </>
  )
}
