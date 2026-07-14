import { useEffect, useState } from 'react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import {
  SettingsSection,
  ActionRow,
  CollapsibleSection,
  InfoRow,
  SettingsButton,
  ToggleRow,
} from '../../components/settings/SettingsPrimitives'
import { UserAvatar } from '../../components/auth/UserAvatar'
import { AuthModal } from '../../components/auth/AuthModal'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import { useSync } from '../../context/SyncContext'
import { getSyncStatusLabel } from '../../services/sync/engine'
import { SYNC_STORAGE_KEYS } from '../../services/sync/types'
import { useDataActions } from '../../hooks/useSettingsData'
import { countPackMembers } from '../../db/repositories/people'
import { validateCloudEnv } from '../../lib/env'
import { getEffectiveDisplayName } from '../../utils/profileDisplay'
import { buildDiagnosticReport } from '../../services/sync/diagnostics'

function StatusBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        verified
          ? 'bg-pack-accent/15 text-pack-accent'
          : 'bg-pack-border text-pack-text-muted'
      }`}
    >
      {verified ? 'Verified' : 'Not verified'}
    </span>
  )
}

function formatSessionTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : 'Unknown'
}

export function AccountSettings() {
  const {
    isAuthenticated,
    isEmailVerified,
    user,
    signOut,
    signOutAllDevices,
    changePassword,
    updateEmail,
    resetPassword,
    deleteAccount,
    cloudAvailable,
  } = useAuth()
  const { profile, updateProfile } = useProfile()
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
  const { handleExportJSON } = useDataActions()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [localCount, setLocalCount] = useState(0)

  const statusLabel = getSyncStatusLabel(syncStatus, lastSyncAt, isAuthenticated)
  const env = validateCloudEnv()
  const syncBusy =
    syncStatus === 'starting' ||
    syncStatus === 'restoring_session' ||
    syncStatus === 'downloading' ||
    syncStatus === 'uploading'

  const previewProfile = {
    ...profile,
    firstName: firstName || null,
    lastName: lastName || null,
    displayName: displayNameInput || null,
  }
  const previewName = getEffectiveDisplayName(previewProfile)

  useEffect(() => {
    setFirstName(profile.firstName ?? '')
    setLastName(profile.lastName ?? '')
    setDisplayNameInput(profile.displayName ?? '')
  }, [profile])

  useEffect(() => {
    countPackMembers().then(setLocalCount).catch(() => setLocalCount(0))
    void refreshDiagnostics()
  }, [refreshDiagnostics])

  const clearAlerts = () => {
    setMessage(null)
    setError(null)
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    clearAlerts()
    const result = await updateProfile({
      firstName,
      lastName,
      displayName: displayNameInput,
    })
    if (result.error) setError(result.error)
    else setMessage('Your Pack Profile was saved.')
    setProfileSaving(false)
  }

  const handleChangeEmail = async () => {
    if (
      !window.confirm(
        'Pack will send a confirmation link to your new email address. Continue?',
      )
    ) {
      return
    }
    setEmailSaving(true)
    clearAlerts()
    const result = await updateEmail(newEmail)
    if (result.error) setError(result.error)
    else {
      setMessage(result.message ?? 'Check your email to confirm the change.')
      setShowEmailForm(false)
      setNewEmail('')
    }
    setEmailSaving(false)
  }

  const handleChangePassword = async () => {
    clearAlerts()
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setPasswordSaving(true)
    const result = await changePassword(currentPassword, newPassword)
    if (result.error) setError(result.error)
    else {
      setMessage('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordSaving(false)
  }

  const handleForgotPassword = async () => {
    if (!user?.email) {
      setAuthView('forgot')
      setAuthOpen(true)
      return
    }
    clearAlerts()
    const result = await resetPassword(user.email)
    if (result.error) setError(result.error)
    else setMessage('Password reset link sent. Check your email.')
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
    setMessage('Pack Sync enabled.')
  }

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Delete all Pack data linked to your account? Export your data first if you want a backup. This cannot be undone.',
      )
    ) {
      return
    }
    setLoading(true)
    clearAlerts()
    const result = await deleteAccount()
    setLoading(false)
    if (result.error) setError(result.error)
    else setMessage('Account data deleted. You have been signed out.')
    await refreshDiagnostics()
  }

  const handleSignOutAll = async () => {
    if (!window.confirm('Sign out on all devices? You will need to sign in again here too.')) {
      return
    }
    clearAlerts()
    const result = await signOutAllDevices()
    if (result.error) setError(result.error)
    else setMessage('Signed out on all devices.')
    switchToLocalOnly()
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

      {/* 1. Profile */}
      <SettingsSection title="Profile">
        <div className="flex flex-col items-center gap-3 px-2 py-5 text-center">
          <UserAvatar profile={previewProfile} size="lg" />
          <div>
            <p className="text-pack-text text-lg font-semibold">{previewName}</p>
            <p className="text-pack-text-muted mt-1 text-sm">
              Used in your greeting, account menu, and across Pack.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-2 pb-4">
          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jonathan"
            autoComplete="given-name"
          />
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Allison"
            autoComplete="family-name"
          />
          <Input
            label="Display Name"
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            placeholder={previewName}
          />
          <p className="text-pack-text-muted -mt-2 text-xs leading-relaxed">
            Optional. Overrides your first and last name in greetings and the top-right menu.
          </p>

          {isAuthenticated && user?.email && (
            <InfoRow label="Email" value={user.email} />
          )}

          <div className="border-pack-border rounded-xl border border-dashed p-4">
            <p className="text-pack-text-secondary text-sm font-medium">Profile Picture</p>
            <p className="text-pack-text-muted mt-1 text-sm">Coming soon — initials are used for now.</p>
          </div>

          <Button className="w-full" onClick={() => void handleSaveProfile()} loading={profileSaving}>
            Save Profile
          </Button>
        </div>
      </SettingsSection>

      {/* Sign in prompt for local users */}
      {cloudAvailable && !isAuthenticated && (
        <SettingsSection title="Sign In">
          <InfoRow
            label="Local Mode"
            value="On"
            description="Create an account to sync your Pack across devices."
          />
          <ActionRow
            label="Sign in"
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
        </SettingsSection>
      )}

      {!cloudAvailable && (
        <SettingsSection title="Sign In">
          <InfoRow
            label="Cloud accounts"
            value="Not configured"
            description={`Missing: ${env.missing.join(', ') || 'environment variables'}`}
          />
        </SettingsSection>
      )}

      {/* 2. Email */}
      {isAuthenticated && (
        <SettingsSection title="Email">
          <InfoRow
            label="Current email"
            value={
              <span className="flex items-center gap-2">
                <span className="truncate">{user?.email ?? '—'}</span>
                <StatusBadge verified={isEmailVerified} />
              </span>
            }
          />
          {!showEmailForm ? (
            <ActionRow
              label="Change email"
              description="Requires confirmation via email verification"
              action={
                <SettingsButton onClick={() => setShowEmailForm(true)}>Change</SettingsButton>
              }
            />
          ) : (
            <div className="space-y-3 px-2 py-4">
              <Input
                label="New email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => void handleChangeEmail()}
                  loading={emailSaving}
                  disabled={!newEmail.trim()}
                >
                  Send confirmation
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowEmailForm(false)
                    setNewEmail('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SettingsSection>
      )}

      {/* 3. Password */}
      {isAuthenticated && (
        <SettingsSection title="Password">
          <div className="space-y-4 px-2 py-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button
              className="w-full"
              onClick={() => void handleChangePassword()}
              loading={passwordSaving}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Change password
            </Button>
            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              className="text-pack-accent hover:text-pack-accent/80 text-sm font-medium"
            >
              Forgot password?
            </button>
          </div>
        </SettingsSection>
      )}

      {/* 4. Pack Sync */}
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
            isAuthenticated
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
                      onClick={() => setMessage('You can sync later from Account settings.')}
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

      {/* 5. Session / Devices */}
      {isAuthenticated && (
        <SettingsSection title="Session / Devices">
          <InfoRow
            label="Current session"
            value="This device"
            description={`Last signed in ${formatSessionTime(user?.last_sign_in_at)}`}
          />
          <ActionRow
            label="Sign out"
            description="Sign out on this device only"
            action={
              <SettingsButton
                onClick={() => {
                  void signOut()
                  switchToLocalOnly()
                }}
              >
                Sign out
              </SettingsButton>
            }
          />
          <ActionRow
            label="Sign out of all devices"
            description="Ends every active Pack session"
            action={
              <SettingsButton onClick={() => void handleSignOutAll()}>Sign out all</SettingsButton>
            }
          />
        </SettingsSection>
      )}

      {/* 6. Danger Zone */}
      <SettingsSection title="Danger Zone">
        <ActionRow
          label="Export my data"
          description="Download a JSON backup before deleting"
          action={<SettingsButton onClick={() => void handleExportJSON()}>Export</SettingsButton>}
        />
        <ActionRow
          label="Clear local data"
          description="Erase your Pack from this device"
          destructive
          comingSoon
          action={<SettingsButton variant="danger" disabled>Clear</SettingsButton>}
        />
        {isAuthenticated && (
          <ActionRow
            label="Delete account"
            description="Remove cloud Pack data and sign out"
            destructive
            action={
              <SettingsButton
                variant="danger"
                onClick={() => void handleDeleteAccount()}
                loading={loading}
              >
                Delete
              </SettingsButton>
            }
          />
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
        initialView={authView}
        onSuccess={() => void handleEnableSync()}
      />
    </div>
  )
}
