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
  runInitialCloudSync,
  runFullSync,
  getLastSyncTime,
  uploadLocalDatabaseToCloud,
} from '../services/sync/engine'
import { getSupabase } from '../lib/supabase'
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
  getRealtimeConnectionState,
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
import { reportDevicePackStats } from '../services/sync/reportStats'
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
  switchToLocalOnly: () => void
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
  appBuildVersion: '',
  buildId: '',
  mapProvider: 'Mapbox',
  mapboxConfigured: false,
  supabaseProjectHost: null,
  authSessionRestored: false,
  accessTokenExpiresAt: null,
  cloudSyncEnabled: false,
  online: true,
  initialCloudDownloadCompleted: false,
  initialCloudDownloadAt: null,
  cloudPeopleDownloaded: 0,
  localPeople: 0,
  realtimeConnected: false,
  lastSyncAttempt: null,
  lastSyncSuccess: null,
  lastSyncError: null,
  pendingLocalChanges: 0,
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, sessionRestored } = useAuth()
  const [syncMode, setSyncModeState] = useState<SyncMode>(() =>
    isCloudSyncEnabled() ? 'cloud' : 'local',
  )
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    isCloudSyncAvailable() ? 'starting' : 'disabled',
  )
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => getLastSyncTime())
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics>(EMPTY_DIAGNOSTICS)
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine,
  )
  const [localNotice, setLocalNotice] = useState<string | null>(null)
  const syncInFlight = useRef(false)
  const initialLoginSyncDone = useRef<string | null>(null)
  const startupInFlight = useRef(false)

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
    setSyncStatus('uploading')
    try {
      await runFullSync(user.id)
      setLastSyncAt(getLastSyncTime())
      setSyncStatus('idle')
      setLocalNotice(null)
      await reportDevicePackStats()
    } catch (error) {
      recordSyncError(error, 'sync')
      setSyncStatus(navigator.onLine ? 'error' : 'offline')
      setLocalNotice('Saved locally. Pack Sync will retry.')
      await reportDevicePackStats({
        lastSyncError: error instanceof Error ? error.message.slice(0, 500) : 'sync failed',
      })
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
    setSyncStatus('downloading')
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

  const restoreCurrentUser = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return null

    setSyncStatus('restoring_session')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!sessionData.session?.user.id) return null

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    return userData.user
  }, [])

  const runStartupSync = useCallback(async () => {
    if (!sessionRestored || !isAuthenticated || !user || !isCloudSyncAvailable()) return
    if (syncMode !== 'cloud') return
    if (startupInFlight.current || initialLoginSyncDone.current === user.id) return

    startupInFlight.current = true
    unsubscribeFromRealtimeChanges()
    recordSyncAttempt()

    try {
      const currentUser = await restoreCurrentUser()
      if (!currentUser?.id) {
        setSyncStatus('error')
        recordSyncError(new Error('No session during startup sync'), 'startup sync')
        return
      }
      if (currentUser.id !== user.id) {
        throw new Error('Authenticated user changed during startup sync.')
      }

      if (!navigator.onLine) {
        setSyncStatus('offline')
        return
      }

      setSyncStatus('downloading')
      await runInitialCloudSync(currentUser.id)
      initialLoginSyncDone.current = currentUser.id
      subscribeToRealtimeChanges(currentUser.id)
      setSyncStatus('idle')
      setLocalNotice(null)
      await reportDevicePackStats()
    } catch (error) {
      recordSyncError(error, 'startup sync')
      setSyncStatus(navigator.onLine ? 'error' : 'offline')
      setLocalNotice('Saved locally. Pack Sync will retry.')
      await reportDevicePackStats({
        lastSyncError: error instanceof Error ? error.message.slice(0, 500) : 'startup sync failed',
      })
    } finally {
      startupInFlight.current = false
      await refreshDiagnostics()
    }
  }, [isAuthenticated, refreshDiagnostics, restoreCurrentUser, sessionRestored, syncMode, user])

  const recoverSync = useCallback(async () => {
    if (!sessionRestored || !isAuthenticated || !user || syncMode !== 'cloud') return
    try {
      const currentUser = await restoreCurrentUser()
      if (!currentUser?.id || currentUser.id !== user.id) return
      if (!navigator.onLine) {
        setSyncStatus('offline')
        return
      }
      setSyncStatus('downloading')
      await runInitialCloudSync(currentUser.id)
      if (getRealtimeConnectionState() !== 'connected') {
        subscribeToRealtimeChanges(currentUser.id)
      }
      setSyncStatus('idle')
    } catch (error) {
      recordSyncError(error, 'foreground recovery')
      setSyncStatus(navigator.onLine ? 'error' : 'offline')
    } finally {
      await refreshDiagnostics()
    }
  }, [isAuthenticated, refreshDiagnostics, restoreCurrentUser, sessionRestored, syncMode, user])

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
      setSyncStatus('disabled')
      setSyncModeState('local')
      unsubscribeFromRealtimeChanges()
      cancelDebouncedSync()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && isCloudSyncAvailable()) {
      setSyncModeState(isCloudSyncEnabled() ? 'cloud' : 'local')
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!isCloudSyncAvailable()) {
      unsubscribeFromRealtimeChanges()
      setSyncStatus('disabled')
      return
    }
    if (!isAuthenticated || !user || syncMode !== 'cloud') {
      unsubscribeFromRealtimeChanges()
      if (isAuthenticated && syncMode === 'local') {
        setSyncStatus('disabled')
      }
      return
    }
    void runStartupSync()
    return () => {
      unsubscribeFromRealtimeChanges()
    }
  }, [isAuthenticated, runStartupSync, syncMode, user])

  useEffect(() => {
    if (!isAuthenticated || syncMode !== 'cloud' || !user) return

    const interval = window.setInterval(() => void syncNow(), 60_000)
    return () => window.clearInterval(interval)
  }, [isAuthenticated, syncMode, user, syncNow])

  useEffect(() => {
    if (isAuthenticated && syncMode === 'cloud' && isOnline && syncStatus === 'offline') {
      void recoverSync()
    }
  }, [isOnline, isAuthenticated, recoverSync, syncMode, syncStatus])

  useEffect(() => {
    if (!isAuthenticated || syncMode !== 'cloud') return

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void recoverSync()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAuthenticated, recoverSync, syncMode])

  useEffect(() => {
    if (!isAuthenticated || syncMode !== 'cloud') return

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted || document.visibilityState === 'visible') {
        void recoverSync()
      }
    }

    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [isAuthenticated, recoverSync, syncMode])

  const enableCloudSync = useCallback(() => {
    setSyncMode('cloud')
    setSyncModeState('cloud')
  }, [])

  const switchToLocalOnly = useCallback(() => {
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
      switchToLocalOnly,
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
      switchToLocalOnly,
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
