import { useCallback, useState } from 'react'
import type { Workspace } from '../types'

export const SETTINGS_KEYS = {
  showOnThisDay: 'pack_show_on_this_day',
  prioritizeNearby: 'pack_prioritize_nearby',
  recentInteractionsFirst: 'pack_recent_interactions_first',
  rememberWorkspace: 'pack_remember_workspace',
  openQuickCaptureOnLaunch: 'pack_open_quick_capture',
  defaultWorkspace: 'pack_default_workspace',
  rememberLastPlace: 'pack_remember_last_place',
  useGps: 'pack_use_gps',
  autoFillDate: 'pack_auto_fill_date',
  promptFollowUp: 'pack_prompt_follow_up',
  saveOnNameOnly: 'pack_save_on_name_only',
  nearbySuggestions: 'pack_nearby_suggestions',
  rememberLastLocation: 'pack_remember_last_location',
  reconnectReminders: 'pack_reconnect_reminders',
  followUpReminders: 'pack_follow_up_reminders',
  weeklySummary: 'pack_weekly_summary',
  onThisDayNotifications: 'pack_on_this_day_notifications',
  offlineFirst: 'pack_offline_first',
  analytics: 'pack_analytics',
  crashReports: 'pack_crash_reports',
  contactsImport: 'pack_contacts_import',
  debugMode: 'pack_debug_mode',
  onboardingComplete: 'pack_onboarding_complete',
} as const

export type DefaultWorkspace = Workspace | 'all'

function readBool(key: string, defaultValue: boolean): boolean {
  const raw = localStorage.getItem(key)
  if (raw === null) return defaultValue
  return raw === 'true'
}

function writeBool(key: string, value: boolean) {
  localStorage.setItem(key, String(value))
}

export function useBoolSetting(key: string, defaultValue = false) {
  const [value, setValue] = useState(() => readBool(key, defaultValue))

  const set = useCallback(
    (next: boolean) => {
      writeBool(key, next)
      setValue(next)
    },
    [key],
  )

  return [value, set] as const
}

export function useStringSetting<T extends string>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(
    () => (localStorage.getItem(key) as T | null) ?? defaultValue,
  )

  const set = useCallback(
    (next: T) => {
      localStorage.setItem(key, next)
      setValue(next)
    },
    [key],
  )

  return [value, set] as const
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
