/** Map local SQLite snake_case rows to Supabase rows with user_id. */

function boolToDb(v: unknown): boolean {
  return Boolean(v)
}

function boolFromDb(v: unknown): number {
  return v === true || v === 1 || v === '1' ? 1 : 0
}

export function withUserId(
  userId: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { user_id: userId }

  for (const [key, value] of Object.entries(row)) {
    if (key === 'sync_version') {
      out.sync_version = value ?? 1
      continue
    }
    if (key === 'is_favorite') {
      out.is_favorite = boolToDb(value)
      continue
    }
    if (key === 'deleted_at' && value) {
      out.deleted_at = value
      continue
    }
    out[key] = value ?? null
  }

  return out
}

export function localPersonToCloud(userId: string, row: Record<string, unknown>) {
  return withUserId(userId, {
    ...row,
    is_favorite: boolToDb(row.is_favorite),
  })
}

export function cloudPersonToLocal(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    is_favorite: boolFromDb(row.is_favorite),
    user_id: undefined,
  }
}

export function localPlaceToCloud(userId: string, row: Record<string, unknown>) {
  return withUserId(userId, {
    ...row,
    is_favorite: boolToDb(row.is_favorite),
  })
}

export function cloudPlaceToLocal(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    is_favorite: boolFromDb(row.is_favorite),
  }
}

export const CLOUD_TABLES = [
  'households',
  'companies',
  'places',
  'tags',
  'people',
  'person_tags',
  'interactions',
] as const

export type CloudTable = (typeof CLOUD_TABLES)[number]

export function cloudTableForSync(table: string): CloudTable | null {
  if ((CLOUD_TABLES as readonly string[]).includes(table)) return table as CloudTable
  return null
}
