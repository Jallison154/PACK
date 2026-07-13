import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/database'
import { useAuth } from './AuthContext'
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen'

interface UserDatabaseContextValue {
  ready: boolean
  userId: string | null
}

const UserDatabaseContext = createContext<UserDatabaseContextValue>({
  ready: false,
  userId: null,
})

export function UserDatabaseProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setReady(false)
      setError(null)
      return
    }

    let cancelled = false
    setReady(false)
    setError(null)

    db.attachUser(user.id)
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Database init failed')
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <p className="text-pack-danger text-lg font-semibold">Failed to load your Pack</p>
          <p className="text-pack-text-secondary mt-2 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return <AuthLoadingScreen message="Loading your Pack…" />
  }

  return (
    <UserDatabaseContext.Provider value={{ ready, userId: user!.id }}>
      {children}
    </UserDatabaseContext.Provider>
  )
}

export function useUserDatabase() {
  return useContext(UserDatabaseContext)
}
