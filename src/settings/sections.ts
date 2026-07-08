import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  Zap,
  MapPin,
  Bell,
  Database,
  Shield,
  Palette,
  Wrench,
  Info,
  UserCircle,
} from 'lucide-react'

export type SettingsSectionId =
  | 'account'
  | 'memory'
  | 'quick-capture'
  | 'location'
  | 'notifications'
  | 'data'
  | 'privacy'
  | 'appearance'
  | 'advanced'
  | 'about'

export interface SettingsSectionMeta {
  id: SettingsSectionId
  title: string
  subtitle: string
  icon: LucideIcon
  secondary?: boolean
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: 'account',
    title: 'Account',
    subtitle: 'Sign in, sync, and manage your Pack',
    icon: UserCircle,
  },
  {
    id: 'memory',
    title: 'Memory',
    subtitle: 'How Pack remembers people for you',
    icon: Brain,
  },
  {
    id: 'quick-capture',
    title: 'Quick Capture',
    subtitle: 'Defaults for adding someone fast',
    icon: Zap,
  },
  {
    id: 'location',
    title: 'Location',
    subtitle: 'Places, nearby suggestions, and last seen',
    icon: MapPin,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Reconnect reminders and Pack summaries',
    icon: Bell,
  },
  {
    id: 'data',
    title: 'Data & Backup',
    subtitle: 'Import, export, and local database',
    icon: Database,
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    subtitle: 'Lock, permissions, and local data',
    icon: Shield,
  },
  {
    id: 'appearance',
    title: 'Appearance',
    subtitle: 'Theme and Pack visual style',
    icon: Palette,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'Developer tools and maintenance',
    icon: Wrench,
    secondary: true,
  },
  {
    id: 'about',
    title: 'About Pack',
    subtitle: 'Version, Okami Designs, feedback, support',
    icon: Info,
  },
]

export function getSettingsSection(id: string | undefined): SettingsSectionMeta | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id)
}
