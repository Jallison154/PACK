import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  Flag,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  ScrollText,
  Server,
  Settings2,
  Users,
} from 'lucide-react'
import type { AdminRole, AdminSectionId } from './types'
import { roleAtLeast } from './types'

export interface AdminSectionMeta {
  id: AdminSectionId
  title: string
  subtitle: string
  icon: LucideIcon
  minRole: AdminRole
}

export const ADMIN_SECTIONS: AdminSectionMeta[] = [
  {
    id: 'overview',
    title: 'Overview',
    subtitle: 'System snapshot',
    icon: LayoutDashboard,
    minRole: 'support',
  },
  {
    id: 'users',
    title: 'Users',
    subtitle: 'Accounts and roles',
    icon: Users,
    minRole: 'support',
  },
  {
    id: 'support',
    title: 'Support',
    subtitle: 'Recovery tools',
    icon: LifeBuoy,
    minRole: 'support',
  },
  {
    id: 'system-health',
    title: 'System Health',
    subtitle: 'Service checks',
    icon: HeartPulse,
    minRole: 'admin',
  },
  {
    id: 'sync-health',
    title: 'Sync Health',
    subtitle: 'Pack Sync metrics',
    icon: Activity,
    minRole: 'support',
  },
  {
    id: 'services',
    title: 'Services',
    subtitle: 'Supabase & Mapbox',
    icon: Server,
    minRole: 'admin',
  },
  {
    id: 'errors',
    title: 'Errors & Logs',
    subtitle: 'Application errors',
    icon: AlertTriangle,
    minRole: 'support',
  },
  {
    id: 'feature-flags',
    title: 'Feature Flags',
    subtitle: 'Runtime toggles',
    icon: Flag,
    minRole: 'admin',
  },
  {
    id: 'audit',
    title: 'Audit Log',
    subtitle: 'Admin actions',
    icon: ScrollText,
    minRole: 'support',
  },
  {
    id: 'settings',
    title: 'Admin Settings',
    subtitle: 'Portal configuration',
    icon: Settings2,
    minRole: 'owner',
  },
]

export function getAdminSection(id: string | undefined): AdminSectionMeta | undefined {
  return ADMIN_SECTIONS.find((section) => section.id === id)
}

export function sectionsForRole(role: AdminRole): AdminSectionMeta[] {
  return ADMIN_SECTIONS.filter((section) => roleAtLeast(role, section.minRole))
}
