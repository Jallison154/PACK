import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getAppUrl, getSupabaseAnonKey, getSupabaseUrl, isCloudSyncAvailable } from './env'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isCloudSyncAvailable()) return null
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
