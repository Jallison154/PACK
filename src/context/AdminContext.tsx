import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { fetchMyAdminRole } from '../services/admin/api'
import type { AdminRole } from '../admin/types'
import { canAccessAdmin, canAssignRoles, canDeleteUsers, canManageUsers } from '../admin/types'

interface AdminContextValue {
  role: AdminRole
  loading: boolean
  isStaff: boolean
  isAdmin: boolean
  isOwner: boolean
  canManageUsers: boolean
  canAssignRoles: boolean
  canDeleteUsers: boolean
  refreshRole: () => Promise<void>
  error: string | null
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [role, setRole] = useState<AdminRole>('user')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshRole = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setRole('user')
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    const result = await fetchMyAdminRole()
    setRole(result.role)
    setError(result.error)
    setLoading(false)
  }, [isAuthenticated, user])

  useEffect(() => {
    void refreshRole()
  }, [refreshRole])

  const value = useMemo<AdminContextValue>(
    () => ({
      role,
      loading,
      isStaff: canAccessAdmin(role),
      isAdmin: canManageUsers(role),
      isOwner: role === 'owner',
      canManageUsers: canManageUsers(role),
      canAssignRoles: canAssignRoles(role),
      canDeleteUsers: canDeleteUsers(role),
      refreshRole,
      error,
    }),
    [role, loading, refreshRole, error],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}

export function useAdminOptional() {
  return useContext(AdminContext)
}
