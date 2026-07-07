import { useState } from 'react'
import {
  Download,
  Upload,
  Shield,
  Fingerprint,
  Database,
  Moon,
} from 'lucide-react'
import { Header } from '../components/layout/Header'
import { PackLogo } from '../components/brand/PackLogo'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import {
  exportToJSON,
  exportToCSV,
  importFromJSON,
  downloadFile,
  createAutomaticBackup,
} from '../services/export'
import { db } from '../db/database'

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ElementType
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <div className="bg-pack-accent-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="text-pack-accent h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          {description && (
            <p className="text-pack-text-muted text-sm">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        enabled ? 'bg-pack-accent' : 'bg-pack-border'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

export function SettingsPage() {
  const [autoBackup, setAutoBackup] = useState(
    () => localStorage.getItem('pack_auto_backup') === 'true',
  )
  const [passcodeLock, setPasscodeLock] = useState(
    () => localStorage.getItem('pack_passcode') !== null,
  )
  const [biometric, setBiometric] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExportJSON = async () => {
    const json = await exportToJSON()
    downloadFile(json, `pack-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
  }

  const handleExportCSV = async () => {
    const csv = await exportToCSV()
    downloadFile(csv, `pack-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        await importFromJSON(text)
        alert('Database imported successfully. Refresh to see changes.')
      } catch {
        alert('Import failed. Check the file format.')
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  const handleAutoBackup = (enabled: boolean) => {
    setAutoBackup(enabled)
    localStorage.setItem('pack_auto_backup', String(enabled))
    if (enabled) createAutomaticBackup()
  }

  const handlePasscode = (enabled: boolean) => {
    if (enabled) {
      const code = prompt('Set a 4-digit passcode:')
      if (code && code.length === 4) {
        localStorage.setItem('pack_passcode', code)
        setPasscodeLock(true)
      }
    } else {
      localStorage.removeItem('pack_passcode')
      setPasscodeLock(false)
    }
  }

  const handleExportDB = async () => {
    const data = await db.exportDatabase()
    if (data) {
      const blob = new Blob([new Uint8Array(data)], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pack.db'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="min-h-dvh">
      <Header title="Settings" />
      <div className="space-y-4 px-4 py-4">
        <Card>
          <SettingRow
            icon={Moon}
            label="Dark Mode"
            description="Pack uses the Okami dark theme"
          >
            <Toggle enabled disabled onChange={() => {}} />
          </SettingRow>
        </Card>

        <Card>
          <h3 className="text-pack-text-secondary mb-2 text-sm font-semibold tracking-wide uppercase">
            Data
          </h3>
          <div className="divide-pack-border divide-y">
            <SettingRow icon={Download} label="Export CSV" description="Spreadsheet format">
              <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                Export
              </Button>
            </SettingRow>
            <SettingRow icon={Download} label="Export JSON" description="Full backup">
              <Button variant="secondary" size="sm" onClick={handleExportJSON}>
                Export
              </Button>
            </SettingRow>
            <SettingRow icon={Upload} label="Import Database" description="Restore from backup">
              <Button variant="secondary" size="sm" onClick={handleImport} loading={importing}>
                Import
              </Button>
            </SettingRow>
            <SettingRow icon={Database} label="Export SQLite" description="Raw database file">
              <Button variant="secondary" size="sm" onClick={handleExportDB}>
                Export
              </Button>
            </SettingRow>
          </div>
        </Card>

        <Card>
          <h3 className="text-pack-text-secondary mb-2 text-sm font-semibold tracking-wide uppercase">
            Security
          </h3>
          <div className="divide-pack-border divide-y">
            <SettingRow
              icon={Shield}
              label="Passcode Lock"
              description="Require passcode to open"
            >
              <Toggle enabled={passcodeLock} onChange={handlePasscode} />
            </SettingRow>
            <SettingRow
              icon={Fingerprint}
              label="Biometric Unlock"
              description="Coming soon on native builds"
            >
              <Toggle enabled={biometric} onChange={setBiometric} disabled />
            </SettingRow>
          </div>
        </Card>

        <Card>
          <SettingRow
            icon={Database}
            label="Automatic Backups"
            description="Keep last 7 daily backups"
          >
            <Toggle enabled={autoBackup} onChange={handleAutoBackup} />
          </SettingRow>
        </Card>

        <div className="flex flex-col items-center gap-2 pb-4">
          <PackLogo size="sm" />
          <p className="text-pack-text-muted text-center text-xs">v1.0 · Okami Designs</p>
        </div>
      </div>
    </div>
  )
}
