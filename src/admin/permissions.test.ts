import { describe, expect, it } from 'vitest'
import {
  canAccessAdmin,
  canAssignRoles,
  canDeleteUsers,
  canManageUsers,
  canViewPrivatePackContent,
  roleAtLeast,
  type AdminRole,
} from './types'
import { sectionsForRole } from './sections'

describe('admin permissions', () => {
  const roles: AdminRole[] = ['user', 'support', 'admin', 'owner']

  it('denies regular users from admin access', () => {
    expect(canAccessAdmin('user')).toBe(false)
    expect(canManageUsers('user')).toBe(false)
    expect(canAssignRoles('user')).toBe(false)
    expect(canDeleteUsers('user')).toBe(false)
    expect(sectionsForRole('user')).toHaveLength(0)
  })

  it('allows support to view but not manage destructive actions', () => {
    expect(canAccessAdmin('support')).toBe(true)
    expect(canManageUsers('support')).toBe(false)
    expect(canAssignRoles('support')).toBe(false)
    expect(canDeleteUsers('support')).toBe(false)
    const ids = sectionsForRole('support').map((s) => s.id)
    expect(ids).toContain('users')
    expect(ids).toContain('support')
    expect(ids).toContain('sync-health')
    expect(ids).not.toContain('feature-flags')
    expect(ids).not.toContain('settings')
  })

  it('allows admin to manage users but not assign roles or delete', () => {
    expect(canManageUsers('admin')).toBe(true)
    expect(canAssignRoles('admin')).toBe(false)
    expect(canDeleteUsers('admin')).toBe(false)
    const ids = sectionsForRole('admin').map((s) => s.id)
    expect(ids).toContain('system-health')
    expect(ids).toContain('feature-flags')
    expect(ids).not.toContain('settings')
  })

  it('allows owner full portal including settings and role assignment', () => {
    expect(canAssignRoles('owner')).toBe(true)
    expect(canDeleteUsers('owner')).toBe(true)
    expect(sectionsForRole('owner').map((s) => s.id)).toContain('settings')
  })

  it('never allows private Pack content in V1', () => {
    for (const role of roles) {
      expect(canViewPrivatePackContent(role)).toBe(false)
    }
  })

  it('ranks roles correctly', () => {
    expect(roleAtLeast('admin', 'support')).toBe(true)
    expect(roleAtLeast('support', 'admin')).toBe(false)
    expect(roleAtLeast('owner', 'admin')).toBe(true)
  })
})
