import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isCloudSyncAvailable } from '../lib/env'
import {
  pullCloudDataOnly,
  runFullSync,
  getLastSyncTime,
  uploadLocalDatabaseToCloud,
} from '../services/sync/engine'
import {
  getSyncDiagnostics,
  recordSyncAttempt,
  recordSyncError,
  testSupabaseConnection,
  type SyncDiagnostics,
  type SupabaseConnectionTest,
} from '../services/sync/diagnostics'
import { registerSyncTrigger, unregisterSyncTrigger } from '../services/sync/queue'
import { cancelDebouncedSync } from '../services/sync/debouncedSync'
import {
  subscribeToRealtimeChanges,
  unsubscribeFromRealtimeChanges,
  onRealtimeConnectionStateChange,
} from '../services/sync/realtime'
import {
  isCloudSyncEnabled,
  setSyncMode,
  SYNC_STORAGE_KEYS,
  type SyncMode,
  type SyncStatus,
} from '../services/sync/types'
import { useAuth } from './AuthContext'
import { countPackMembers } from '../db/repositories/people'

interface SyncContextValue {
  syncMode: SyncMode
  syncStatus: SyncStatus
  lastSyncAt: string | null
  diagnostics: SyncDiagnostics
  isOnline: boolean
  localNotice: string | null
  enableCloudSync: () => void
  useLocalOnly: () => void
  syncNow: () => Promise<void>
  downloadCloudData: () => Promise<void>
  uploadLocalData: () => Promise<number>
  refreshDiagnostics: () => Promise<void>
  testConnection: () => Promise<SupabaseConnectionTest>
  dismissLocalNotice: () => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

const EMPTY_DIAGNOSTICS: SyncDiagnostics = {
  supabaseConfigured: false,
  missingEnv: [],
  loggedIn: false,
  userId: null,
  cloudSyncEnabled: false,
  realtimeConnected: false,
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
  const [localNotice, setLocalNotice] = useState<string | null>(null)
  const syncInFlight = useRef(false)
  const initialLoginSyncDone = useRef<string | null>(null)

  const refreshDiagnostics = useCallback(async () => {
    setDiagnostics(await getSyncDiagnostics(user?.id, isAuthenticated))
    setLastSyncAt(getLastSyncTime())
  }, [user?.id, isAuthenticated])

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

  useEffect(() => {
    void refreshDiagnostics()
  }, [refreshDiagnostics])

  useEffect(() => {
    const unsubscribe = onRealtimeConnectionStateChange(() => {
      void refreshDiagnostics()
    })
    return unsubscribe
  }, [refreshDiagnostics])

  const syncNow = useCallback(async () => {
    if (!user || !isCloudSyncAvailable() || syncMode !== 'cloud') {
      await refreshDiagnostics()
      return
    }
    if (syncInFlight.current) return

    if (!navigator.onLine) {
      setSyncStatus('offline')
      setLocalNotice('Saved locally. Pack Sync will retry.')
      recordSyncError(new Error('Network offline'), 'sync')
      await refreshDiagnostics()
      return
    }

    syncInFlight.current = true
    recordSyncAttempt()
    setSyncStatus('syncing')
    try {
      await runFullSync(user.id)
      setLastSyncAt(getLastSyncTime())
      setSyncStatus('idle')
      setLocalNotice(null)
    } catch (error) {
      recordSyncError(error, 'sync')
      setSyncStatus('error')
      setLocalNotice('Saved locally. Pack Sync will retry.')
    } finally {
      syncInFlight.current = false
      await refreshDiagnostics()
    }
  }, [user, syncMode, refreshDiagnostics])

  const downloadCloudData = useCallback(async () => {
    if (!user || !isCloudSyncAvailable()) return
    if (!navigator.onLine) {
      setSyncStatus('offline')
      setLocalNotice('Saved locally. Pack Sync will retry.')
      return
    }

    recordSyncAttempt()
    setSyncStatus('syncing')
    try {
      await pullCloudDataOnly(user.id)
      setLastSyncAt(getLastSyncTime())
      setSyncStatus('idle')
      setLocalNotice(null)
    } catch (error) {
      recordSyncError(error, 'download cloud')
      setSyncStatus('error')
      setLocalNotice('Saved locally. Pack Sync will retry.')
    } finally {
      await refreshDiagnostics()
    }
  }, [user, refreshDiagnostics])

  const uploadLocalData = useCallback(async () => {
    if (!user) throw new Error('Not signed in')
    const uploaded = await uploadLocalDatabaseToCloud(user.id)
    await syncNow()
    return uploaded
  }, [user, syncNow])

  useEffect(() => {
    registerSyncTrigger(syncNow)
    return () => {
      unregisterSyncTrigger()
      cancelDebouncedSync()
    }
  }, [syncNow])

  useEffect(() => {
    if (!isAuthenticated) {
      initialLoginSyncDone.current = null
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && isCloudSyncAvailable()) {
      setSyncModeState(isCloudSyncEnabled() ? 'cloud' : 'local')
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user || !isCloudSyncAvailable()) {
      unsubscribeFromRealtimeChanges()
      initialLoginSyncDone.current = null
      return
    }

    if (syncMode !== 'cloud') {
      unsubscribeFromRealtimeChanges()
      return
    }

    subscribeToRealtimeChanges(user.id)

    return () => {
      unsubscribeFromRealtimeChanges()
    }
  }, [isAuthenticated, user, syncMode])

  useEffect(() => {
    if (!isAuthenticated || !user || !isCloudSyncAvailable() || syncMode !== 'cloud') return
    if (initialLoginSyncDone.current === user.id) return

    initialLoginSyncDone.current = user.id

    void syncNow()
  }, [isAuthenticated, user, syncMode, syncNow])

  useEffect(() => {
    if (!isAuthenticated || syncMode !== 'cloud' || !user) return

    const interval = window.setInterval(() => void syncNow(), 60_000)
    return () => window.clearInterval(interval)
  }, [isAuthenticated, syncMode, user, syncNow])

  useEffect(() => {
    if (isAuthenticated && syncMode === 'cloud' && isOnline && syncStatus === 'offline') {
      void syncNow()
    }
  }, [isOnline, isAuthenticated, syncMode, syncStatus, syncNow])

  useEffect(() => {
    if (!isAuthenticated || syncMode !== 'cloud') return

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncNow()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAuthenticated, syncMode, syncNow])

  const enableCloudSync = useCallback(() => {
    setSyncMode('cloud')
    setSyncModeState('cloud')
  }, [])

  const useLocalOnly = useCallback(() => {
    setSyncMode('local')
    setSyncModeState('local')
    setSyncStatus('disabled')
    unsubscribeFromRealtimeChanges()
    cancelDebouncedSync()
  }, [])

  const testConnection = useCallback(async () => {
    const result = await testSupabaseConnection(user?.id)
    await refreshDiagnostics()
    return result
  }, [user, refreshDiagnostics])

  const dismissLocalNotice = useCallback(() => {
    setLocalNotice(null)
  }, [])

  const value = useMemo(
    () => ({
      syncMode,
      syncStatus,
      lastSyncAt,
      diagnostics,
      isOnline,
      localNotice,
      enableCloudSync,
      useLocalOnly,
      syncNow,
      downloadCloudData,
      uploadLocalData,
      refreshDiagnostics,
      testConnection,
      dismissLocalNotice,
    }),
    [
      syncMode,
      syncStatus,
      lastSyncAt,
      diagnostics,
      isOnline,
      localNotice,
      enableCloudSync,
      useLocalOnly,
      syncNow,
      downloadCloudData,
      uploadLocalData,
      refreshDiagnostics,
      testConnection,
      dismissLocalNotice,
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

export async function shouldPromptLocalMigration(): Promise<boolean> {
  const migrationDone = localStorage.getItem(SYNC_STORAGE_KEYS.migrationDone) === 'true'
  if (migrationDone) return false
  const count = await countPackMembers()
  return count > 0
}
