export interface SupabaseErrorDetails {
  operation: string
  table?: string
  recordId?: string
  userId?: string
  code?: string
  message?: string
  details?: string
  hint?: string
}

export function extractSupabaseError(error: unknown): Omit<SupabaseErrorDetails, 'operation'> {
  if (error instanceof Error) {
    return { message: error.message }
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    return {
      code: e.code != null ? String(e.code) : undefined,
      message: e.message != null ? String(e.message) : undefined,
      details: e.details != null ? String(e.details) : undefined,
      hint: e.hint != null ? String(e.hint) : undefined,
    }
  }

  return { message: String(error) }
}

export function formatSupabaseError(error: unknown): string {
  const parts = Object.values(extractSupabaseError(error)).filter(Boolean)
  return parts.length > 0 ? parts.join(' | ') : 'Unknown error'
}

export function logSupabaseError(context: SupabaseErrorDetails): void {
  console.warn('[Pack Sync]', context)
}

export function classifySyncError(error: unknown): string {
  const { code, message = '' } = extractSupabaseError(error)
  const text = message.toLowerCase()

  if (text.includes('offline') || text.includes('network')) return 'Network offline'
  if (code === 'PGRST301' || text.includes('jwt')) return 'No session'
  if (code === '42501' || text.includes('row-level security')) return 'RLS violation'
  if (text.includes('does not exist') && text.includes('relation')) return 'Missing table'
  if (code === 'PGRST204' || (text.includes('could not find') && text.includes('column'))) {
    return 'Missing column — run Supabase migrations 006 + 007'
  }
  if (text.includes('column') && text.includes('does not exist')) return 'Missing column'
  if (code === '23505' || text.includes('duplicate key')) return 'Duplicate primary key'
  if (text.includes('invalid api key') || text.includes('invalid url')) return 'Invalid URL/key'
  if (text.includes('realtime')) return 'Realtime unavailable'

  return formatSupabaseError(error)
}
