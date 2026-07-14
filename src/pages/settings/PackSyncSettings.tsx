import { useEffect, useState } from 'react'
import {
  SettingsSection,
  ActionRow,
  CollapsibleSection,
  InfoRow,
  SettingsButton,
  ToggleRow,
} from '../../components/settings/SettingsPrimitives'
import { AuthModal } from '../../components/auth/AuthModal'
import { useAuth } from '../../context/AuthContext'
import { useSync } from '../../context/SyncContext'
import { getSyncStatusLabel } from '../../services/sync/engine'
import { SYNC_STORAGE_KEYS } from '../../services/sync/types'
import { countPackMembers } from '../../db/repositories/people'
import { buildDiagnosticReport } from '../../services/sync/diagnostics'

export function PackSyncSettings() {
  const { isAuthenticated, user, cloudAvailable } = useAuth()
  const {
    syncMode,
    syncStatus,
    lastSyncAt,
    diagnostics,
    syncNow,
    enableCloudSync,
    switchToLocalOnly,
    refreshDiagnostics,
    testConnection,
    downloadCloudData,
    uploadLocalData,
  } = useSync()

  const [authOpen, setAuthOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [localCount, setLocalCount] = useState(0)

  const statusLabel = getSyncStatusLabel(syncStatus, lastSyncAt, isAuthenticated)
  const syncBusy =
    syncStatus === 'starting' ||
    syncStatus === 'restoring_session' ||
    syncStatus === 'downloading' ||
    syncStatus === 'uploading'

  useEffect(() => {
    countPackMembers().then(setLocalCount).catch(() => setLocalCount(0))
    void refreshDiagnostics()
  }, [refreshDiagnostics])

  const clearAlerts = () => {
    setMessage(null)
    setError(null)
  }

  const handleUploadLocalData = async () => {
    if (!user) return
    setLoading(true)
    clearAlerts()
    try {
      const n = await uploadLocalData()
      setMessage(`Uploaded ${n} records to your account.`)
      enableCloudSync()
      await refreshDiagnostics()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCloudData = async () => {
    setLoading(true)
    clearAlerts()
    try {
      await downloadCloudData()
      setMessage('Downloaded cloud data into this device.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyDiagnosticReport = async () => {
    const report = buildDiagnosticReport(diagnostics)
    try {
      await navigator.clipboard.writeText(report)
      setMessage('Diagnostic report copied to clipboard.')
    } catch {
      setError('Could not copy diagnostic report.')
    }
  }

  const handleEnableSync = async () => {
    clearAlerts()
    if (!isAuthenticated) {
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
    setMessage('Pack Sync enabled.')
  }

  const handleTestConnection = async () => {
    setLoading(true)
    clearAlerts()
    const result = await testConnection()
    setLoading(false)
    if (result.ok) setMessage(result.message)
    else setError(result.message)
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            error ? 'bg-pack-danger/10 text-pack-danger' : 'bg-pack-accent/10 text-pack-accent'
          }`}
        >
          {error ?? message}
        </div>
      )}

      <SettingsSection title="Pack Sync">
        <InfoRow label="Sync status" value={statusLabel} />
        <InfoRow
          label="Last synced"
          value={lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'}
        />
        <InfoRow label="Pending changes" value={diagnostics.pendingLocalChanges} />

        <ToggleRow
          label="Enable Pack Sync"
          description={
            !cloudAvailable
              ? 'Cloud sync is not configured on this server'
              : isAuthenticated
                ? 'Save your Pack to your account when online'
                : 'Sign in to enable cloud sync'
          }
          enabled={syncMode === 'cloud'}
          onChange={(enabled) => {
            if (enabled) void handleEnableSync()
            else switchToLocalOnly()
          }}
          disabled={!isAuthenticated || !cloudAvailable}
        />

        {isAuthenticated && (
          <>
            <ActionRow
              label="Sync now"
              description="Push local changes and pull updates"
              action={
                <SettingsButton
                  onClick={() => void syncNow()}
                  loading={syncBusy}
                  disabled={syncMode !== 'cloud'}
                >
                  Sync
                </SettingsButton>
              }
            />
            {syncMode === 'cloud' &&
              localCount > 0 &&
              localStorage.getItem(SYNC_STORAGE_KEYS.migrationDone) !== 'true' && (
                <div className="px-2 py-4">
                  <p className="text-[15px] leading-snug font-medium">
                    You have local Pack data. Sync it to your account?
                  </p>
                  <p className="text-pack-text-muted mt-1 text-sm leading-relaxed">
                    Existing cloud records with the same IDs are updated, not duplicated.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SettingsButton onClick={() => void handleUploadLocalData()} loading={loading}>
                      Sync Now
                    </SettingsButton>
                    <SettingsButton
                      onClick={() => setMessage('You can sync later from Data & Backup.')}
                    >
                      Later
                    </SettingsButton>
                    <SettingsButton onClick={switchToLocalOnly}>Keep Local Only</SettingsButton>
                  </div>
                </div>
              )}
          </>
        )}
      </SettingsSection>

      <CollapsibleSection
        title="Pack Sync Diagnostics"
        open={debugOpen}
        onToggle={() => setDebugOpen((value) => !value)}
      >
        <InfoRow label="App build version" value={diagnostics.appBuildVersion} />
        <InfoRow label="Build ID" value={diagnostics.buildId} />
        <InfoRow label="Map provider" value={diagnostics.mapProvider} />
        <InfoRow label="Mapbox configured" value={diagnostics.mapboxConfigured ? 'Yes' : 'No'} />
        <InfoRow label="Supabase configured" value={diagnostics.supabaseConfigured ? 'Yes' : 'No'} />
        <InfoRow label="Supabase project host" value={diagnostics.supabaseProjectHost ?? '—'} />
        {!diagnostics.supabaseConfigured && diagnostics.missingEnv.length > 0 && (
          <InfoRow label="Missing env" value={diagnostics.missingEnv.join(', ')} />
        )}
        <InfoRow label="Auth session restored" value={diagnostics.authSessionRestored ? 'Yes' : 'No'} />
        <InfoRow label="Logged in" value={diagnostics.loggedIn ? 'Yes' : 'No'} />
        {isAuthenticated && (
          <InfoRow label="Current user ID" value={diagnostics.userId ?? user?.id ?? '—'} />
        )}
        <InfoRow label="Access token expiration" value={diagnostics.accessTokenExpiresAt ?? '—'} />
        <InfoRow label="Online" value={diagnostics.online ? 'Yes' : 'No'} />
        <InfoRow label="Cloud sync enabled" value={diagnostics.cloudSyncEnabled ? 'Yes' : 'No'} />
        <InfoRow
          label="Initial cloud download"
          value={diagnostics.initialCloudDownloadCompleted ? 'Completed' : 'Not completed'}
        />
        <InfoRow
          label="Initial download time"
          value={
            diagnostics.initialCloudDownloadAt
              ? new Date(diagnostics.initialCloudDownloadAt).toLocaleString()
              : 'Never'
          }
        />
        <InfoRow label="Cloud people downloaded" value={diagnostics.cloudPeopleDownloaded} />
        <InfoRow label="Local people" value={diagnostics.localPeople} />
        <InfoRow label="Realtime connected" value={diagnostics.realtimeConnected ? 'Yes' : 'No'} />
        <InfoRow
          label="Last sync attempt"
          value={
            diagnostics.lastSyncAttempt
              ? new Date(diagnostics.lastSyncAttempt).toLocaleString()
              : 'Never'
          }
        />
        <InfoRow
          label="Last successful sync"
          value={
            diagnostics.lastSyncSuccess
              ? new Date(diagnostics.lastSyncSuccess).toLocaleString()
              : 'Never'
          }
        />
        <InfoRow label="Pending local changes" value={diagnostics.pendingLocalChanges} />
        <InfoRow label="Last sync error" value={diagnostics.lastSyncError ?? 'None'} />
        <ActionRow
          label="Test connection"
          description="Checks auth session and reads your Pack through RLS"
          action={
            <SettingsButton onClick={() => void handleTestConnection()} loading={loading}>
              Test
            </SettingsButton>
          }
        />
        {isAuthenticated && (
          <>
            <ActionRow
              label="Upload local data"
              description="Merge this device's Pack into your account"
              action={
                <SettingsButton onClick={() => void handleUploadLocalData()} loading={loading}>
                  Upload
                </SettingsButton>
              }
            />
            <ActionRow
              label="Download cloud data"
              description="Pull your account data into this device"
              action={
                <SettingsButton onClick={() => void handleDownloadCloudData()} loading={loading}>
                  Download
                </SettingsButton>
              }
            />
            <ActionRow
              label="Run full sync"
              description="Push pending changes, then pull updates"
              action={
                <SettingsButton
                  onClick={() => void syncNow()}
                  loading={syncBusy}
                  disabled={syncMode !== 'cloud'}
                >
                  Sync
                </SettingsButton>
              }
            />
            <ActionRow
              label="Copy diagnostic report"
              action={
                <SettingsButton onClick={() => void handleCopyDiagnosticReport()}>
                  Copy
                </SettingsButton>
              }
            />
          </>
        )}
      </CollapsibleSection>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView="login"
        onSuccess={() => void handleEnableSync()}
      />
    </div>
  )
}
