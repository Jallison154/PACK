/**
 * Authoritative Supabase (PostgreSQL) column lists — must match supabase/migrations/*.sql
 * Do not send SQLite-only or camelCase fields to PostgREST.
 */

export const CLOUD_TABLE_COLUMNS = {
  households: [
    'id',
    'user_id',
    'name',
    'address',
    'shared_notes',
    'pets',
    'general_notes',
    'created_at',
    'updated_at',
    'sync_version',
  ],
  companies: ['id', 'user_id', 'name', 'created_at', 'updated_at', 'sync_version'],
  places: [
    'id',
    'user_id',
    'name',
    'address',
    'city',
    'state',
    'latitude',
    'longitude',
    'category',
    'mapbox_id',
    'postal_code',
    'country',
    'poi_categories',
    'brand',
    'source',
    'feature_type',
    'notes',
    'is_favorite',
    'created_at',
    'updated_at',
    'sync_version',
    'deleted_at',
  ],
  tags: ['id', 'user_id', 'name', 'created_at', 'updated_at', 'sync_version'],
  people: [
    'id',
    'user_id',
    'name',
    'workspace',
    'phone',
    'email',
    'company',
    'company_id',
    'job_title',
    'where_met',
    'event',
    'city',
    'state',
    'location_id',
    'where_met_place_id',
    'where_met_latitude',
    'where_met_longitude',
    'where_met_location_source',
    'where_met_location_accuracy',
    'where_met_captured_at',
    'where_met_is_approximate',
    'where_met_area_label',
    'last_seen_place_id',
    'date_met',
    'notes',
    'relationship_type',
    'household_id',
    'home_address',
    'work_location',
    'last_seen_at',
    'last_seen_date',
    'last_interaction_notes',
    'profile_color',
    'is_favorite',
    'created_at',
    'updated_at',
    'sync_version',
    'deleted_at',
  ],
  person_tags: ['user_id', 'person_id', 'tag_id', 'id', 'created_at', 'updated_at'],
  interactions: [
    'id',
    'user_id',
    'person_id',
    'date',
    'location',
    'place_id',
    'interaction_type',
    'notes',
    'next_follow_up',
    'event',
    'created_at',
    'updated_at',
    'sync_version',
  ],
  profiles: [
    'id',
    'email',
    'display_name',
    'first_name',
    'last_name',
    'avatar_url',
    'created_at',
    'updated_at',
  ],
} as const

export type CloudSchemaTable = keyof typeof CLOUD_TABLE_COLUMNS

const SOFT_DELETE_TABLES = new Set<CloudSchemaTable>(['people', 'places'])

/** UUID / FK columns — empty strings from SQLite must become null for PostgREST. */
const UUID_LIKE_COLUMNS = new Set([
  'id',
  'user_id',
  'company_id',
  'household_id',
  'location_id',
  'where_met_place_id',
  'last_seen_place_id',
  'person_id',
  'tag_id',
  'place_id',
])

const BOOLEAN_COLUMNS = new Set(['is_favorite', 'where_met_is_approximate'])

const NUMERIC_COLUMNS = new Set([
  'latitude',
  'longitude',
  'where_met_latitude',
  'where_met_longitude',
  'where_met_location_accuracy',
  'sync_version',
])

export function isSoftDeleteTable(table: string): table is 'people' | 'places' {
  return SOFT_DELETE_TABLES.has(table as CloudSchemaTable)
}

export function cloudColumnsFor(table: string): readonly string[] | null {
  if (table in CLOUD_TABLE_COLUMNS) {
    return CLOUD_TABLE_COLUMNS[table as CloudSchemaTable]
  }
  return null
}

function coerceCloudValue(key: string, value: unknown): unknown {
  if (value === undefined) return undefined

  if (UUID_LIKE_COLUMNS.has(key)) {
    if (value === null || value === '') return null
    return value
  }

  if (BOOLEAN_COLUMNS.has(key)) {
    if (value === null || value === '') return null
    return value === true || value === 1 || value === '1'
  }

  if (NUMERIC_COLUMNS.has(key)) {
    if (value === null || value === '') return null
    if (typeof value === 'number') return value
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  if (value === '') return null
  return value
}

/** Strip unknown keys and coerce SQLite values for PostgREST. */
export function sanitizeCloudRow(
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = cloudColumnsFor(table)
  if (!allowed) return row

  const out: Record<string, unknown> = {}
  for (const key of allowed) {
    if (!(key in row)) continue
    const value = coerceCloudValue(key, row[key])
    if (value === undefined) continue
    if (key === 'deleted_at' && (value === null || value === '')) continue
    // Prefer omitting null FKs over sending null when column may be optional
    out[key] = value
  }
  return out
}

/** Parse PostgREST PGRST204 "Could not find the 'col' column of 'table'" messages. */
export function parseMissingCloudColumn(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const e = error as { code?: unknown; message?: unknown }
  const code = e.code != null ? String(e.code) : ''
  const message = e.message != null ? String(e.message) : ''
  if (code !== 'PGRST204' && !(message.includes('Could not find') && message.includes('column'))) {
    return null
  }
  const match =
    message.match(/Could not find the '([^']+)' column/i) ??
    message.match(/column ["`']([^"`']+)["`']/i)
  return match?.[1] ?? null
}
