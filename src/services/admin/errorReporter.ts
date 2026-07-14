import { getSupabase } from '../../lib/supabase'
import { getMapRuntimeDiagnostics } from '../mapbox/mapRuntimeDiagnostics'

/** Client-safe error reporter — strips secrets and private Pack fields. */
export async function reportAppError(input: {
  severity?: 'info' | 'warning' | 'error' | 'critical'
  route?: string
  service?: string
  operation?: string
  errorCode?: string
  errorMessage: string
  details?: Record<string, unknown>
}): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const map = getMapRuntimeDiagnostics()
  const sanitized = sanitizeDetails(input.details)

  await supabase.from('app_error_logs').insert({
    severity: input.severity ?? 'error',
    user_id: user?.id ?? null,
    app_version: map.appBuildVersion,
    device_browser: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : null,
    route: input.route ?? (typeof location !== 'undefined' ? location.pathname : null),
    service: input.service ?? null,
    operation: input.operation ?? null,
    error_code: input.errorCode ?? null,
    error_message: String(input.errorMessage).slice(0, 2000),
    sanitized_details: sanitized,
  })
}

const BLOCKED_KEYS = /password|token|secret|apikey|api_key|authorization|phone|note|notes|email/i

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | null {
  if (!details) return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(details)) {
    if (BLOCKED_KEYS.test(key)) continue
    if (typeof value === 'string') out[key] = value.slice(0, 500)
    else if (typeof value === 'number' || typeof value === 'boolean' || value == null) out[key] = value
    else out[key] = '[omitted]'
  }
  return out
}
