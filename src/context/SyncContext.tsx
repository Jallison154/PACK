import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isCloudSyncAvailable } from '../lib/env'
import { runFullSync, getLastSyncTime } from '../services/sync/engine'
import {
  isCloudSyncEnabled,
  setSyncMode,
  type SyncMode,
  type SyncStatus,
} from '../services/sync/types'
import { useAuth } from './AuthContext'

interface SyncContextValue {
  syncMode: SyncMode
  syncStatus: SyncStatus
  lastSyncAt: string | null
  isOnline: boolean
  enableCloudSync: () => void
  useLocalOnly: () => void
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [syncMode, setSyncModeState] = useState<SyncMode>(() =>
    isCloudSyncEnabled() ? 'cloud' : 'local',
  )
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => getLastSyncTime())
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine,
  )

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!user || !isCloudSyncAvailable() || syncMode !== 'cloud') return
    if (!navigator.onLine) {
      setSyncStatus('offline')
      return
    }

    setSyncStatus('syncing')
    try {
      await runFullSync(user.id)
      setLastSyncAt(getLastSyncTime())
      setSyncStatus('idle')
    } catch {
      setSyncStatus('error')
    }
  }, [user, syncMode])

  useEffect(() => {
    if (!isAuthenticated || syncMode !== 'cloud' || !user) return
    void syncNow()
    const interval = window.setInterval(() => void syncNow(), 60_000)
    return () => window.clearInterval(interval)
  }, [isAuthenticated, syncMode, user, syncNow])

  useEffect(() => {
    if (isAuthenticated && syncMode === 'cloud' && isOnline && syncStatus === 'offline') {
      void syncNow()
    }
  }, [isOnline, isAuthenticated, syncMode, syncStatus, syncNow])

  const enableCloudSync = useCallback(() => {
    setSyncMode('cloud')
    setSyncModeState('cloud')
  }, [])

  const useLocalOnly = useCallback(() => {
    setSyncMode('local')
    setSyncModeState('local')
    setSyncStatus('disabled')
  }, [])

  const value = useMemo(
    () => ({
      syncMode,
      syncStatus,
      lastSyncAt,
      isOnline,
      enableCloudSync,
      useLocalOnly,
      syncNow,
    }),
    [syncMode, syncStatus, lastSyncAt, isOnline, enableCloudSync, useLocalOnly, syncNow],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}

export function useSyncOptional() {
  return useContext(SyncContext)
}
