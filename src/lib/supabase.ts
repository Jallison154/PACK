import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  getAppUrl,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isCloudSyncAvailable,
  validateCloudEnv,
} from './env'

let client: SupabaseClient | null = null
let warnedAboutConfig = false

export function getSupabase(): SupabaseClient | null {
  if (!isCloudSyncAvailable()) {
    if (!warnedAboutConfig) {
      const validation = validateCloudEnv()
      console.warn(
        `[Pack Sync] Cloud sync disabled. Missing environment: ${validation.missing.join(', ')}`,
      )
      warnedAboutConfig = true
    }
    return null
  }
  if (!client) {
    client = createClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        flowType: 'pkce',
      },
      global: {
        headers: { 'X-Client-Info': 'pack-web' },
      },
    })
  }
  return client
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAppUrl()}/settings/account`
}
