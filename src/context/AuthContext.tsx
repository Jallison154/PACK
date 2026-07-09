import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, getPasswordResetRedirectUrl } from '../lib/supabase'
import { isCloudSyncAvailable } from '../lib/env'
import { deleteCloudAccountData } from '../services/sync/engine'
import { setSyncMode, SYNC_STORAGE_KEYS } from '../services/sync/types'
import { recordSyncError } from '../services/sync/diagnostics'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  isEmailVerified: boolean
  cloudAvailable: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signOutAllDevices: () => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>
  updateEmail: (newEmail: string) => Promise<{ error: string | null; message?: string }>
  deleteAccount: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const cloudAvailable = isCloudSyncAvailable()

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          recordSyncError(error, 'auth getSession')
        }
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      .catch((error) => {
        recordSyncError(error, 'auth getSession')
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.info(`[Pack Auth] ${event}`, nextSession?.user?.email ?? 'no user')
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const supabase = getSupabase()
      if (!supabase) return { error: 'Cloud accounts are not configured.' }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName?.trim() || undefined },
          emailRedirectTo: getPasswordResetRedirectUrl(),
        },
      })
      if (error) recordSyncError(error, 'auth signUp')
      return { error: error?.message ?? null }
    },
    [],
  )

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'Cloud accounts are not configured.' }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) recordSyncError(error, 'auth signIn')
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    await supabase?.auth.signOut()
    setSyncMode('local')
    setSession(null)
    setUser(null)
  }, [])

  const signOutAllDevices = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'Cloud accounts are not configured.' }

    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      recordSyncError(error, 'auth signOutAll')
      return { error: error.message }
    }

    setSyncMode('local')
    setSession(null)
    setUser(null)
    return { error: null }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'Cloud accounts are not configured.' }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordResetRedirectUrl(),
    })
    if (error) recordSyncError(error, 'auth resetPassword')
    return { error: error?.message ?? null }
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const supabase = getSupabase()
      if (!supabase || !user?.email) return { error: 'Not signed in.' }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (verifyError) {
        return { error: 'Current password is incorrect.' }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) recordSyncError(error, 'auth changePassword')
      return { error: error?.message ?? null }
    },
    [user],
  )

  const updateEmail = useCallback(
    async (newEmail: string) => {
      const supabase = getSupabase()
      if (!supabase) return { error: 'Cloud accounts are not configured.' }

      const trimmed = newEmail.trim()
      if (!trimmed.includes('@')) return { error: 'Enter a valid email address.' }

      const { error } = await supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: getPasswordResetRedirectUrl() },
      )
      if (error) {
        recordSyncError(error, 'auth updateEmail')
        return { error: error.message }
      }

      return {
        error: null,
        message:
          'Check your inbox to confirm the new email address. Your sign-in email will update after verification.',
      }
    },
    [],
  )

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'Cloud accounts are not configured.' }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) recordSyncError(error, 'auth updatePassword')
    return { error: error?.message ?? null }
  }, [])

  const deleteAccount = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase || !user) return { error: 'Not signed in.' }

    try {
      await deleteCloudAccountData(user.id)
      localStorage.removeItem(SYNC_STORAGE_KEYS.migrationDone)
      localStorage.removeItem(SYNC_STORAGE_KEYS.lastSyncAt)
      setSyncMode('local')
      await supabase.auth.signOut()
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to delete account data.' }
    }
  }, [user])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(user),
      isEmailVerified: Boolean(user?.email_confirmed_at),
      cloudAvailable,
      signUp,
      signIn,
      signOut,
      signOutAllDevices,
      resetPassword,
      updatePassword,
      changePassword,
      updateEmail,
      deleteAccount,
    }),
    [
      user,
      session,
      loading,
      cloudAvailable,
      signUp,
      signIn,
      signOut,
      signOutAllDevices,
      resetPassword,
      updatePassword,
      changePassword,
      updateEmail,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useAuthOptional() {
  return useContext(AuthContext)
}
