import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/database'
import { PackLogo } from '../components/brand/PackLogo'

interface DatabaseContextValue {
  ready: boolean
  error: string | null
}

const DatabaseContext = createContext<DatabaseContextValue>({
  ready: false,
  error: null,
})

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    db.init()
      .then(() => setReady(true))
      .catch((err) => setError(err instanceof Error ? err.message : 'Database init failed'))
  }, [])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <p className="text-pack-danger text-lg font-semibold">Failed to load Pack</p>
          <p className="text-pack-text-secondary mt-2 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <PackLogo size="sm" className="mx-auto mb-5" />
          <div className="border-pack-accent mx-auto h-10 w-10 animate-spin rounded-full border-3 border-t-transparent" />
          <p className="text-pack-text-secondary mt-4 text-sm">Loading Pack...</p>
        </div>
      </div>
    )
  }

  return (
    <DatabaseContext.Provider value={{ ready, error }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {
  return useContext(DatabaseContext)
}
