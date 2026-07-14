import { useNavigate } from 'react-router-dom'
import { useSyncExternalStore } from 'react'
import packLogoSrc from '../../assets/pack-logo-transparent.png'
import {
  SettingsDetailCard,
  ToggleRow,
  InfoRow,
  ActionRow,
  SegmentPicker,
  LinkButton,
  SettingsButton,
} from '../../components/settings/SettingsPrimitives'
import { DB_VERSION } from '../../db/schema'
import {
  SETTINGS_KEYS,
  useBoolSetting,
  useStringSetting,
  type DefaultWorkspace,
} from '../../utils/settings'
import {
  useLocationPermissionStatus,
  useStorageSize,
  useDataActions,
  usePasscodeLock,
} from '../../hooks/useSettingsData'
import { openPackFeedbackEmail } from '../../utils/feedback'
import { createAutomaticBackup } from '../../services/export'
import type { SettingsSectionId } from '../../settings/sections'
import { AccountSettings } from './AccountSettings'
import {
  getMapRuntimeDiagnostics,
  subscribeMapRuntimeDiagnostics,
} from '../../services/mapbox/mapRuntimeDiagnostics'

const APP_VERSION = '1.0.0'

interface SettingsSectionContentProps {
  sectionId: SettingsSectionId
}

export function SettingsSectionContent({ sectionId }: SettingsSectionContentProps) {
  switch (sectionId) {
    case 'account':
      return <AccountSettings />
    case 'memory':
      return <MemorySettings />
    case 'quick-capture':
      return <QuickCaptureSettings />
    case 'location':
      return <LocationSettings />
    case 'notifications':
      return <NotificationSettings />
    case 'data':
      return <DataSettings />
    case 'privacy':
      return <PrivacySettings />
    case 'appearance':
      return <AppearanceSettings />
    case 'advanced':
      return <AdvancedSettings />
    case 'about':
      return <AboutSettings />
    default:
      return null
  }
}

function MemorySettings() {
  const [showOnThisDay, setShowOnThisDay] = useBoolSetting(SETTINGS_KEYS.showOnThisDay, true)
  const [recentFirst, setRecentFirst] = useBoolSetting(SETTINGS_KEYS.recentInteractionsFirst, true)
  const [prioritizeNearby, setPrioritizeNearby] = useBoolSetting(SETTINGS_KEYS.prioritizeNearby, false)

  return (
    <SettingsDetailCard>
      <ToggleRow
        label="On This Day"
        description="Surface memories from this date in past years"
        enabled={showOnThisDay}
        onChange={setShowOnThisDay}
        comingSoon
      />
      <ToggleRow
        label="Recent interactions first"
        description="Lead with your latest trail activity"
        enabled={recentFirst}
        onChange={setRecentFirst}
        comingSoon
      />
      <ToggleRow
        label="Nearby people priority"
        description="Highlight people connected to places near you"
        enabled={prioritizeNearby}
        onChange={setPrioritizeNearby}
        comingSoon
      />
    </SettingsDetailCard>
  )
}

function QuickCaptureSettings() {
  const [defaultWorkspace, setDefaultWorkspace] = useStringSetting<DefaultWorkspace>(
    SETTINGS_KEYS.defaultWorkspace,
    'all',
  )
  const [rememberPlace, setRememberPlace] = useBoolSetting(SETTINGS_KEYS.rememberLastPlace, true)
  const [useGps, setUseGps] = useBoolSetting(SETTINGS_KEYS.useGps, true)
  const [autoFillDate, setAutoFillDate] = useBoolSetting(SETTINGS_KEYS.autoFillDate, true)
  const [promptFollowUp, setPromptFollowUp] = useBoolSetting(SETTINGS_KEYS.promptFollowUp, true)
  const [saveOnName, setSaveOnName] = useBoolSetting(SETTINGS_KEYS.saveOnNameOnly, false)
  const [openOnLaunch, setOpenOnLaunch] = useBoolSetting(SETTINGS_KEYS.openQuickCaptureOnLaunch, false)

  return (
    <SettingsDetailCard>
      <div className="py-3.5">
        <p className="text-[15px] font-medium">Default workspace</p>
        <p className="text-pack-text-muted mt-0.5 mb-3 text-sm">
          Pre-select when adding someone new <span className="text-pack-text-muted/70">(coming soon)</span>
        </p>
        <SegmentPicker
          options={[
            { value: 'all', label: 'All' },
            { value: 'work', label: 'Work' },
            { value: 'personal', label: 'Personal' },
          ]}
          value={defaultWorkspace}
          onChange={setDefaultWorkspace}
          disabled
        />
      </div>
      <ToggleRow
        label="Remember last place"
        description="Carry over the most recent location"
        enabled={rememberPlace}
        onChange={setRememberPlace}
        comingSoon
      />
      <ToggleRow
        label="Use current GPS"
        description="Suggest places based on where you are"
        enabled={useGps}
        onChange={setUseGps}
        comingSoon
      />
      <ToggleRow
        label="Auto-fill today"
        description="Set the date to today when capturing"
        enabled={autoFillDate}
        onChange={setAutoFillDate}
        comingSoon
      />
      <ToggleRow
        label="Prompt for follow-up"
        description="Ask if you want to reconnect later"
        enabled={promptFollowUp}
        onChange={setPromptFollowUp}
        comingSoon
      />
      <ToggleRow
        label="Save immediately with name only"
        description="Skip extra steps for quick adds"
        enabled={saveOnName}
        onChange={setSaveOnName}
        comingSoon
      />
      <ToggleRow
        label="Open Quick Capture on launch"
        description="Start on Home with capture ready"
        enabled={openOnLaunch}
        onChange={setOpenOnLaunch}
        comingSoon
      />
    </SettingsDetailCard>
  )
}

function LocationSettings() {
  const locationStatus = useLocationPermissionStatus()
  const [nearbySuggestions, setNearbySuggestions] = useBoolSetting(SETTINGS_KEYS.nearbySuggestions, true)
  const [rememberLocation, setRememberLocation] = useBoolSetting(SETTINGS_KEYS.rememberLastLocation, true)

  return (
    <SettingsDetailCard>
      <InfoRow label="Location permission" value={locationStatus} />
      <ToggleRow
        label="Nearby place suggestions"
        description="Offer places close to your current location"
        enabled={nearbySuggestions}
        onChange={setNearbySuggestions}
        comingSoon
      />
      <ToggleRow
        label="Remember last seen location"
        description="Default to where you last logged someone"
        enabled={rememberLocation}
        onChange={setRememberLocation}
        comingSoon
      />
      <ActionRow
        label="Clear location history"
        description="Remove remembered places from this device"
        comingSoon
        action={<SettingsButton disabled>Clear</SettingsButton>}
      />
    </SettingsDetailCard>
  )
}

function NotificationSettings() {
  const [reconnectReminders, setReconnectReminders] = useBoolSetting(SETTINGS_KEYS.reconnectReminders, true)
  const [followUpReminders, setFollowUpReminders] = useBoolSetting(SETTINGS_KEYS.followUpReminders, true)
  const [weeklySummary, setWeeklySummary] = useBoolSetting(SETTINGS_KEYS.weeklySummary, false)
  const [onThisDayNotif, setOnThisDayNotif] = useBoolSetting(SETTINGS_KEYS.onThisDayNotifications, true)

  return (
    <SettingsDetailCard>
      <ToggleRow
        label="Reconnect reminders"
        description="Gentle nudges for people in Reconnect Soon"
        enabled={reconnectReminders}
        onChange={setReconnectReminders}
        comingSoon
      />
      <ToggleRow
        label="Follow-up reminders"
        description="Alert when a follow-up date arrives"
        enabled={followUpReminders}
        onChange={setFollowUpReminders}
        comingSoon
      />
      <ToggleRow
        label="Weekly Pack summary"
        description="A calm overview of your week in Pack"
        enabled={weeklySummary}
        onChange={setWeeklySummary}
        comingSoon
      />
      <ToggleRow
        label="On This Day reminders"
        description="A morning note when memories resurface"
        enabled={onThisDayNotif}
        onChange={setOnThisDayNotif}
        comingSoon
      />
    </SettingsDetailCard>
  )
}

function DataSettings() {
  const storageUsed = useStorageSize(true)
  const [autoBackup, setAutoBackup] = useBoolSetting('pack_auto_backup', false)
  const {
    importing,
    backingUp,
    handleExportJSON,
    handleExportCSV,
    handleImport,
    handleExportDB,
    handleBackupNow,
  } = useDataActions()

  const handleAutoBackup = (enabled: boolean) => {
    setAutoBackup(enabled)
    if (enabled) createAutomaticBackup()
  }

  return (
    <SettingsDetailCard>
      <ActionRow
        label="Export CSV"
        description="Spreadsheet-friendly export"
        action={<SettingsButton onClick={handleExportCSV}>Export</SettingsButton>}
      />
      <ActionRow
        label="Export JSON"
        description="Full Pack backup"
        action={<SettingsButton onClick={handleExportJSON}>Export</SettingsButton>}
      />
      <ActionRow
        label="Import Database"
        description="Restore from a JSON backup"
        action={
          <SettingsButton onClick={handleImport} loading={importing}>
            Import
          </SettingsButton>
        }
      />
      <ActionRow
        label="Export SQLite"
        description="Raw database file"
        action={<SettingsButton onClick={handleExportDB}>Export</SettingsButton>}
      />
      <ToggleRow
        label="Automatic Backups"
        description="Keep the last 7 daily backups"
        enabled={autoBackup}
        onChange={handleAutoBackup}
        comingSoon
      />
      <ActionRow
        label="Backup Now"
        description="Save a backup to this device"
        action={
          <SettingsButton onClick={handleBackupNow} loading={backingUp}>
            Backup
          </SettingsButton>
        }
      />
      <InfoRow label="Database size" value={storageUsed ?? '—'} />
    </SettingsDetailCard>
  )
}

function PrivacySettings() {
  const { passcodeLock, handlePasscode } = usePasscodeLock()
  const [offlineFirst, setOfflineFirst] = useBoolSetting(SETTINGS_KEYS.offlineFirst, true)
  const [analytics, setAnalytics] = useBoolSetting(SETTINGS_KEYS.analytics, false)
  const [crashReports, setCrashReports] = useBoolSetting(SETTINGS_KEYS.crashReports, false)
  const [contactsImport, setContactsImport] = useBoolSetting(SETTINGS_KEYS.contactsImport, false)

  return (
    <SettingsDetailCard>
      <ToggleRow
        label="Passcode Lock"
        description="Require a passcode to open Pack"
        enabled={passcodeLock}
        onChange={handlePasscode}
      />
      <ToggleRow
        label="Biometric Unlock"
        description="Face ID or fingerprint on native builds"
        enabled={false}
        onChange={() => {}}
        comingSoon
      />
      <ToggleRow
        label="Offline-first mode"
        description="Keep your Pack on this device by default"
        enabled={offlineFirst}
        onChange={setOfflineFirst}
        comingSoon
      />
      <ToggleRow
        label="Analytics"
        description="Help improve Pack with anonymous usage"
        enabled={analytics}
        onChange={setAnalytics}
        comingSoon
      />
      <ToggleRow
        label="Crash reports"
        description="Send diagnostic reports when something breaks"
        enabled={crashReports}
        onChange={setCrashReports}
        comingSoon
      />
      <ToggleRow
        label="Contacts import"
        description="Allow importing from your address book"
        enabled={contactsImport}
        onChange={setContactsImport}
        comingSoon
      />
      <ActionRow
        label="Clear all local data"
        description="Erase your Pack from this device"
        destructive
        comingSoon
        action={<SettingsButton variant="danger" disabled>Clear</SettingsButton>}
      />
    </SettingsDetailCard>
  )
}

function AppearanceSettings() {
  return (
    <SettingsDetailCard>
      <ToggleRow
        label="Dark Mode"
        description="Pack uses the Okami dark theme"
        enabled
        onChange={() => {}}
        disabled
      />
      <ToggleRow
        label="Theme mode"
        description="System, light, or dark appearance"
        enabled={false}
        onChange={() => {}}
        comingSoon
      />
      <InfoRow
        label="Accent color"
        value={
          <span className="flex items-center gap-2">
            <span className="bg-pack-accent h-4 w-4 rounded-full" />
            #FF6A2D
          </span>
        }
      />
      <ActionRow
        label="App icon"
        description="Custom home screen icon"
        comingSoon
        action={<span className="text-pack-text-muted text-sm">Coming soon</span>}
      />
    </SettingsDetailCard>
  )
}

function AdvancedSettings() {
  const [debugMode, setDebugMode] = useBoolSetting(SETTINGS_KEYS.debugMode, false)
  const mapDiagnostics = useSyncExternalStore(
    subscribeMapRuntimeDiagnostics,
    getMapRuntimeDiagnostics,
    getMapRuntimeDiagnostics,
  )

  return (
    <SettingsDetailCard>
      <InfoRow label="Database version" value={DB_VERSION} />
      <InfoRow label="App build version" value={mapDiagnostics.appBuildVersion} />
      <InfoRow label="Build ID" value={mapDiagnostics.buildId} />

      <div className="border-pack-border border-t px-4 py-3">
        <p className="text-pack-text text-sm font-medium">Map Diagnostics</p>
        <p className="text-pack-text-muted mt-1 text-xs leading-relaxed">
          Runtime map status. Token values are never shown in full.
        </p>
      </div>
      <InfoRow label="Map provider requested" value={mapDiagnostics.mapProviderRequested} />
      <InfoRow label="Mapbox GL JS installed" value={mapDiagnostics.mapboxGlJsInstalled ? 'Yes' : 'No'} />
      <InfoRow label="Mapbox token configured" value={mapDiagnostics.mapboxTokenConfigured ? 'Yes' : 'No'} />
      <InfoRow label="Token prefix valid" value={mapDiagnostics.tokenPrefixValid ? 'Yes' : 'No'} />
      <InfoRow label="Token length" value={mapDiagnostics.tokenLength} />
      <InfoRow label="Active map component" value={mapDiagnostics.activeMapComponentName} />
      <InfoRow label="Map style URL" value={mapDiagnostics.mapStyleUrl} />
      <InfoRow label="Map initialized" value={mapDiagnostics.mapInitialized ? 'Yes' : 'No'} />
      <InfoRow label="Map load event fired" value={mapDiagnostics.mapLoadEventFired ? 'Yes' : 'No'} />
      <InfoRow label="Last Mapbox HTTP status" value={mapDiagnostics.lastHttpStatusCategory} />
      <InfoRow label="Last error category" value={mapDiagnostics.lastErrorCategory} />
      <InfoRow label="Last Mapbox error" value={mapDiagnostics.lastMapboxError ?? 'None'} />
      <InfoRow label="Last failed resource" value={mapDiagnostics.lastFailedResource ?? 'None'} />

      <ActionRow
        label="Rebuild search index"
        description="Refresh Pack search if results look off"
        comingSoon
        action={<SettingsButton disabled>Rebuild</SettingsButton>}
      />
      <ActionRow
        label="Reset onboarding"
        description="Show the welcome flow again"
        comingSoon
        action={<SettingsButton disabled>Reset</SettingsButton>}
      />
      <ToggleRow
        label="Developer debug mode"
        description="Extra logging for troubleshooting"
        enabled={debugMode}
        onChange={setDebugMode}
        comingSoon
      />
    </SettingsDetailCard>
  )
}

function AboutSettings() {
  const navigate = useNavigate()

  return (
    <SettingsDetailCard>
      <div className="flex flex-col items-center gap-4 px-4 py-8">
        <img
          src={packLogoSrc}
          alt="Pack"
          className="h-auto w-full max-w-[180px] object-contain"
          draggable={false}
        />
        <div className="text-center">
          <p className="text-pack-text-muted text-sm">Version {APP_VERSION}</p>
          <p className="text-pack-text-muted mt-1 text-sm">Okami Designs</p>
        </div>
      </div>
      <ActionRow
        label="Website"
        action={
          <LinkButton href="https://okamidesigns.com" external>
            Visit
          </LinkButton>
        }
      />
      <ActionRow
        label="Privacy Policy"
        action={<LinkButton onClick={() => navigate('/privacy')}>View</LinkButton>}
      />
      <ActionRow
        label="Terms"
        action={<LinkButton onClick={() => navigate('/terms')}>View</LinkButton>}
      />
      <ActionRow
        label="Send Feedback"
        action={
          <LinkButton onClick={() => openPackFeedbackEmail(APP_VERSION)}>Email</LinkButton>
        }
      />
      <ActionRow
        label="Support Pack"
        description="Help fund future Pack features"
        action={
          <LinkButton href="https://ko-fi.com/okamidesigns" external>
            Support
          </LinkButton>
        }
      />
    </SettingsDetailCard>
  )
}
