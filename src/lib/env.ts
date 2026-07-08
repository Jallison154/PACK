/** Vite client environment (prefixed with VITE_). */
export function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL ?? window.location.origin
}

export function getSupabaseUrl(): string | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL
  return url && url.length > 0 ? url : undefined
}

export function getSupabaseAnonKey(): string | undefined {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return key && key.length > 0 ? key : undefined
}

export function isCloudSyncAvailable(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}
