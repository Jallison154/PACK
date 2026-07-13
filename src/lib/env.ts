/** Vite client environment (prefixed with VITE_). */
export interface CloudEnvValidation {
  configured: boolean
  missing: string[]
  supabaseUrl?: string
  supabaseAnonKey?: string
  appUrl?: string
}

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

export function validateCloudEnv(): CloudEnvValidation {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()
  const appUrl = import.meta.env.VITE_APP_URL
  const missing: string[] = []

  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!appUrl) missing.push('VITE_APP_URL')

  return {
    configured: missing.length === 0,
    missing,
    supabaseUrl,
    supabaseAnonKey,
    appUrl,
  }
}

let startupWarningLogged = false

/** Log once at startup when cloud sync env is incomplete. */
export function logCloudEnvStartupCheck(): void {
  if (startupWarningLogged) return
  startupWarningLogged = true

  const validation = validateCloudEnv()
  if (validation.configured) {
    console.info('[Pack Sync] Cloud sync configured.')
    return
  }

  console.warn(
    `[Pack Sync] Running in local-only mode. Pack Sync disabled until environment is set: ${validation.missing.join(', ')}`,
  )
}

export function getMapboxAccessToken(): string | undefined {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  return token && token.length > 0 ? token : undefined
}

export function isMapboxAvailable(): boolean {
  return Boolean(getMapboxAccessToken())
}

export function isCloudSyncAvailable(): boolean {
  return validateCloudEnv().configured
}
