/** Map local SQLite snake_case rows to Supabase rows with user_id. */

import { sanitizeCloudRow } from './cloudSchema'

function boolFromDb(v: unknown): number {
  return v === true || v === 1 || v === '1' ? 1 : 0
}

export function withUserId(
  userId: string,
  row: Record<string, unknown>,
  table?: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...row, user_id: userId }
  return table ? sanitizeCloudRow(table, merged) : merged
}

export function localPersonToCloud(userId: string, row: Record<string, unknown>) {
  return withUserId(userId, row, 'people')
}

export function cloudPersonToLocal(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    is_favorite: boolFromDb(row.is_favorite),
    where_met_is_approximate: boolFromDb(row.where_met_is_approximate),
    user_id: undefined,
  }
}

export function localPlaceToCloud(userId: string, row: Record<string, unknown>) {
  return withUserId(userId, row, 'places')
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
