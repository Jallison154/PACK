import { useState, useEffect, useCallback } from 'react'
import {
  exportToJSON,
  exportToCSV,
  importFromJSON,
  downloadFile,
  createAutomaticBackup,
} from '../services/export'
import { db } from '../db/database'
import { formatBytes } from '../utils/settings'

export function useLocationPermissionStatus() {
  const [status, setStatus] = useState('Checking…')

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setStatus('Unavailable')
      return
    }
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        const labels: Record<string, string> = {
          granted: 'Allowed',
          denied: 'Denied',
          prompt: 'Not set',
        }
        setStatus(labels[result.state] ?? result.state)
      })
      .catch(() => setStatus('Unavailable'))
  }, [])

  return status
}

export function useStorageSize(load = true) {
  const [storageUsed, setStorageUsed] = useState<string | null>(null)

  useEffect(() => {
    if (!load) return
    db.exportDatabase().then((data) => {
      setStorageUsed(data ? formatBytes(data.byteLength) : '—')
    })
  }, [load])

  return storageUsed
}

export function useDataActions() {
  const [importing, setImporting] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  const handleExportJSON = useCallback(async () => {
    const json = await exportToJSON()
    downloadFile(json, `pack-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
  }, [])

  const handleExportCSV = useCallback(async () => {
    const csv = await exportToCSV()
    downloadFile(csv, `pack-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
  }, [])

  const handleImport = useCallback(() => {
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
  }, [])

  const handleExportDB = useCallback(async () => {
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
  }, [])

  const handleBackupNow = useCallback(async () => {
    setBackingUp(true)
    try {
      await createAutomaticBackup()
    } finally {
      setBackingUp(false)
    }
  }, [])

  return {
    importing,
    backingUp,
    handleExportJSON,
    handleExportCSV,
    handleImport,
    handleExportDB,
    handleBackupNow,
  }
}

export function usePasscodeLock() {
  const [passcodeLock, setPasscodeLock] = useState(
    () => localStorage.getItem('pack_passcode') !== null,
  )

  const handlePasscode = useCallback((enabled: boolean) => {
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
  }, [])

  return { passcodeLock, handlePasscode }
}
