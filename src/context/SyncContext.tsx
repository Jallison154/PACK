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
  getSyncDiagnostics,
  recordSyncAttempt,
  recordSyncError,
  testSupabaseConnection,
  type SyncDiagnostics,
  type SupabaseConnectionTest,
} from '../services/sync/diagnostics'
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
  diagnostics: SyncDiagnostics
  isOnline: boolean
  enableCloudSync: () => void
  useLocalOnly: () => void
  syncNow: () => Promise<void>
  refreshDiagnostics: () => Promise<void>
  testConnection: () => Promise<SupabaseConnectionTest>
}

const SyncContext = createContext<SyncContextValue | null>(null)

const EMPTY_DIAGNOSTICS: SyncDiagnostics = {
  supabaseConfigured: false,
  missingEnv: [],
  lastSyncAttempt: null,
  lastSyncSuccess: null,
  lastSyncError: null,
  pendingLocalChanges: 0,
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [syncMode, setSyncModeState] = useState<SyncMode>(() =>
    isCloudSyncEnabled() ? 'cloud' : 'local',
  )
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => getLastSyncTime())
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics>(EMPTY_DIAGNOSTICS)
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

  const refreshDiagnostics = useCallback(async () => {
    setDiagnostics(await getSyncDiagnostics())
    setLastSyncAt(getLastSyncTime())
  }, [])

  useEffect(() => {
    void refreshDiagnostics()
  }, [refreshDiagnostics])

  const syncNow = useCallback(async () => {
    if (!user || !isCloudSyncAvailable() || syncMode !== 'cloud') {
      await refreshDiagnostics()
      return
    }
    if (!navigator.onLine) {
      setSyncStatus('offline')
      recordSyncError(new Error('Network offline'), 'sync')
      await refreshDiagnostics()
      return
    }

    recordSyncAttempt()
    setSyncStatus('syncing')
    try {
      await runFullSync(user.id)
      setLastSyncAt(getLastSyncTime())
      setSyncStatus('idle')
    } catch (error) {
      recordSyncError(error, 'sync')
      setSyncStatus('error')
    } finally {
      await refreshDiagnostics()
    }
  }, [user, syncMode, refreshDiagnostics])

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

  const testConnection = useCallback(async () => {
    const result = await testSupabaseConnection(user?.id)
    await refreshDiagnostics()
    return result
  }, [user, refreshDiagnostics])

  const value = useMemo(
    () => ({
      syncMode,
      syncStatus,
      lastSyncAt,
      diagnostics,
      isOnline,
      enableCloudSync,
      useLocalOnly,
      syncNow,
      refreshDiagnostics,
      testConnection,
    }),
    [
      syncMode,
      syncStatus,
      lastSyncAt,
      diagnostics,
      isOnline,
      enableCloudSync,
      useLocalOnly,
      syncNow,
      refreshDiagnostics,
      testConnection,
    ],
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
