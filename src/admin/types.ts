export type AdminRole = 'user' | 'support' | 'admin' | 'owner'

export type HealthStatus = 'healthy' | 'warning' | 'degraded' | 'offline'

export type MaintenanceMode = 'normal' | 'read-only' | 'maintenance'

export const ROLE_RANK: Record<AdminRole, number> = {
  user: 0,
  support: 1,
  admin: 2,
  owner: 3,
}

export function roleAtLeast(role: AdminRole, minimum: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export function canAccessAdmin(role: AdminRole): boolean {
  return roleAtLeast(role, 'support')
}

export function canManageUsers(role: AdminRole): boolean {
  return roleAtLeast(role, 'admin')
}

export function canAssignRoles(role: AdminRole): boolean {
  return role === 'owner'
}

export function canDeleteUsers(role: AdminRole): boolean {
  return role === 'owner'
}

export function canViewPrivatePackContent(_role: AdminRole): boolean {
  // Version 1: never expose private Pack content in admin UI.
  return false
}

export interface AdminDirectoryUser {
  user_id: string
  email: string | null
  display_name: string | null
  first_name: string | null
  last_name: string | null
  role: AdminRole
  account_created_at: string
  profile_updated_at: string | null
  account_status: 'active' | 'suspended'
  people_count: number
  places_count: number
  interactions_count: number
  pending_sync_count: number
  last_sync_at: string | null
  last_sync_error: string | null
  sync_enabled: boolean
  storage_bytes: number
  email_verified?: boolean
  last_sign_in_at?: string | null
}

export interface AdminOverview {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  newUsersThisWeek: number
  usersWithSyncErrors: number
  pendingSyncOperations: number
  recentErrors: Array<{
    id: string
    severity: string
    error_message: string
    created_at: string
    resolved: boolean
  }>
  featureFlags: Array<{ key: string; enabled: boolean }>
  appVersion: string
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string | null
  updated_at?: string
}

export interface AdminAuditEntry {
  id: string
  admin_user_id: string
  admin_role: string
  action: string
  target_user_id: string | null
  reason: string | null
  before_status: unknown
  after_status: unknown
  created_at: string
}

export interface AppErrorLog {
  id: string
  severity: string
  user_id: string | null
  app_version: string | null
  device_browser: string | null
  route: string | null
  service: string | null
  operation: string | null
  error_code: string | null
  error_message: string
  sanitized_details: unknown
  resolved: boolean
  created_at: string
  internal_notes?: string | null
}

export type AdminSectionId =
  | 'overview'
  | 'users'
  | 'support'
  | 'system-health'
  | 'sync-health'
  | 'services'
  | 'errors'
  | 'feature-flags'
  | 'audit'
  | 'settings'
