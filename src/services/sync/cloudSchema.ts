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

export function isSoftDeleteTable(table: string): table is 'people' | 'places' {
  return SOFT_DELETE_TABLES.has(table as CloudSchemaTable)
}

export function cloudColumnsFor(table: string): readonly string[] | null {
  if (table in CLOUD_TABLE_COLUMNS) {
    return CLOUD_TABLE_COLUMNS[table as CloudSchemaTable]
  }
  return null
}

/** Strip unknown keys and omit null soft-delete tombstones unless explicitly set. */
export function sanitizeCloudRow(
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = cloudColumnsFor(table)
  if (!allowed) return row

  const out: Record<string, unknown> = {}
  for (const key of allowed) {
    if (!(key in row)) continue
    const value = row[key]
    if (key === 'deleted_at' && (value === null || value === undefined || value === '')) {
      continue
    }
    out[key] = value
  }
  return out
}
