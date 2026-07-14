import { useNavigate } from 'react-router-dom'
import { useSyncExternalStore } from 'react'
import packLogoSrc from '../../assets/pack-logo-transparent.png'
import { useAdminOptional } from '../../context/AdminContext'
import {
  SettingsDetailCard,
  ToggleRow,
  InfoRow,
  ActionRow,
  LinkButton,
  SettingsButton,
} from '../../components/settings/SettingsPrimitives'
import { DB_VERSION } from '../../db/schema'
import {
  useLocationPermissionStatus,
  useStorageSize,
  useDataActions,
  usePasscodeLock,
} from '../../hooks/useSettingsData'
import { openPackFeedbackEmail, openPackFeatureRequestEmail } from '../../utils/feedback'
import type { SettingsSectionId } from '../../settings/sections'
import { AccountSettings } from './AccountSettings'
import { PackSyncSettings } from './PackSyncSettings'
import {
  getMapRuntimeDiagnostics,
  subscribeMapRuntimeDiagnostics,
} from '../../services/mapbox/mapRuntimeDiagnostics'
import { useStandalonePwa } from '../../hooks/useStandalonePwa'

const APP_VERSION = '1.0.0'

interface SettingsSectionContentProps {
  sectionId: SettingsSectionId
}

export function SettingsSectionContent({ sectionId }: SettingsSectionContentProps) {
  switch (sectionId) {
    case 'account':
      return <AccountSettings />
    case 'data':
      return <DataSettings />
    case 'privacy':
      return <PrivacySettings />
    case 'advanced':
      return <AdvancedSettings />
    case 'about':
      return <AboutSettings />
    default:
      return null
  }
}

function DataSettings() {
  const storageUsed = useStorageSize(true)
  const {
    importing,
    backingUp,
    handleExportJSON,
    handleExportCSV,
    handleImport,
    handleExportDB,
    handleBackupNow,
  } = useDataActions()

  return (
    <div className="space-y-6">
      <PackSyncSettings />

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
    </div>
  )
}

function PrivacySettings() {
  const { passcodeLock, handlePasscode } = usePasscodeLock()
  const locationStatus = useLocationPermissionStatus()

  return (
    <SettingsDetailCard>
      <ToggleRow
        label="Passcode Lock"
        description="Require a passcode to open Pack"
        enabled={passcodeLock}
        onChange={handlePasscode}
      />
      <InfoRow label="Location permission" value={locationStatus} />
    </SettingsDetailCard>
  )
}

function AdvancedSettings() {
  const mapDiagnostics = useSyncExternalStore(
    subscribeMapRuntimeDiagnostics,
    getMapRuntimeDiagnostics,
    getMapRuntimeDiagnostics,
  )
  const isStandalone = useStandalonePwa()

  return (
    <SettingsDetailCard>
      <InfoRow label="Database version" value={String(DB_VERSION)} />
      <InfoRow label="App build version" value={mapDiagnostics.appBuildVersion} />
      <InfoRow label="Build ID" value={mapDiagnostics.buildId} />
      <InfoRow
        label="Launch mode"
        value={isStandalone ? 'Home Screen app' : 'Browser'}
      />

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
      <InfoRow label="Token length" value={String(mapDiagnostics.tokenLength)} />
      <InfoRow label="Active map component" value={mapDiagnostics.activeMapComponentName} />
      <InfoRow label="Map style URL" value={mapDiagnostics.mapStyleUrl} />
      <InfoRow label="Map initialized" value={mapDiagnostics.mapInitialized ? 'Yes' : 'No'} />
      <InfoRow label="Map load event fired" value={mapDiagnostics.mapLoadEventFired ? 'Yes' : 'No'} />
      <InfoRow label="Last Mapbox HTTP status" value={mapDiagnostics.lastHttpStatusCategory} />
      <InfoRow label="Last error category" value={mapDiagnostics.lastErrorCategory} />
      <InfoRow label="Last Mapbox error" value={mapDiagnostics.lastMapboxError ?? 'None'} />
      <InfoRow label="Last failed resource" value={mapDiagnostics.lastFailedResource ?? 'None'} />
    </SettingsDetailCard>
  )
}

function AboutSettings() {
  const navigate = useNavigate()
  const admin = useAdminOptional()

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
      {admin?.isStaff && (
        <ActionRow
          label="Admin Portal"
          description="Staff tools — not shown to regular users"
          action={<LinkButton onClick={() => navigate('/admin')}>Open</LinkButton>}
        />
      )}
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
        label="Feature Request"
        description="Suggest something you'd like Pack to do"
        action={
          <LinkButton onClick={() => openPackFeatureRequestEmail(APP_VERSION)}>Email</LinkButton>
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
