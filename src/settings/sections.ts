import type { LucideIcon } from 'lucide-react'
import { Database, Shield, Wrench, Info, UserCircle } from 'lucide-react'

export type SettingsSectionId = 'account' | 'data' | 'privacy' | 'advanced' | 'about'

export interface SettingsSectionMeta {
  id: SettingsSectionId
  title: string
  subtitle: string
  icon: LucideIcon
  secondary?: boolean
}

/** Active Settings sections — only ship what works today. */
export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: 'account',
    title: 'Account',
    subtitle: 'Profile, sign-in, and Pack Sync',
    icon: UserCircle,
  },
  {
    id: 'data',
    title: 'Data & Backup',
    subtitle: 'Export, import, and local storage',
    icon: Database,
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    subtitle: 'Passcode lock and permissions',
    icon: Shield,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'Diagnostics and build info',
    icon: Wrench,
    secondary: true,
  },
  {
    id: 'about',
    title: 'About Pack',
    subtitle: 'Version, legal, feedback, and support',
    icon: Info,
  },
]

export function getSettingsSection(id: string | undefined): SettingsSectionMeta | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id)
}
