import { describe, expect, it } from 'vitest'
import { sanitizeCloudRow } from './cloudSchema'
import { localPersonToCloud, localPlaceToCloud } from './mappers'

describe('sanitizeCloudRow', () => {
  it('strips unknown columns that cause PGRST204', () => {
    const row = sanitizeCloudRow('places', {
      id: 'p1',
      user_id: 'u1',
      name: 'Cafe',
      deleted: true,
      is_deleted: false,
      deletedAt: '2026-01-01',
      extra_field: 'nope',
    })

    expect(row).toEqual({
      id: 'p1',
      user_id: 'u1',
      name: 'Cafe',
    })
    expect(row).not.toHaveProperty('deleted')
    expect(row).not.toHaveProperty('is_deleted')
    expect(row).not.toHaveProperty('deletedAt')
    expect(row).not.toHaveProperty('extra_field')
  })

  it('omits null deleted_at from upsert payloads', () => {
    const row = sanitizeCloudRow('people', {
      id: 'person-1',
      user_id: 'user-1',
      name: 'Ada',
      deleted_at: null,
    })

    expect(row).not.toHaveProperty('deleted_at')
  })

  it('keeps non-null deleted_at for soft-delete tombstones', () => {
    const tombstone = '2026-07-13T12:00:00.000Z'
    const row = sanitizeCloudRow('people', {
      id: 'person-1',
      user_id: 'user-1',
      name: 'Ada',
      deleted_at: tombstone,
      updated_at: tombstone,
    })

    expect(row.deleted_at).toBe(tombstone)
  })
})

describe('cloud mappers', () => {
  const userId = '22222222-2222-2222-2222-222222222222'

  it('maps local person rows using only cloud columns', () => {
    const cloud = localPersonToCloud(userId, {
      id: 'person-1',
      name: 'Ada',
      workspace: 'work',
      is_favorite: 1,
      where_met_is_approximate: 0,
      company_id: '',
      deleted_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      deletedAt: 'should-not-sync',
    })

    expect(cloud.user_id).toBe(userId)
    expect(cloud.is_favorite).toBe(true)
    expect(cloud.where_met_is_approximate).toBe(false)
    expect(cloud.company_id).toBeNull()
    expect(cloud).not.toHaveProperty('deleted_at')
    expect(cloud).not.toHaveProperty('deletedAt')
  })

  it('maps soft-deleted places with deleted_at only', () => {
    const deletedAt = '2026-07-13T12:00:00.000Z'
    const cloud = localPlaceToCloud(userId, {
      id: 'place-1',
      name: 'Park',
      is_favorite: 0,
      mapbox_id: 'poi.123',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: deletedAt,
      deleted_at: deletedAt,
    })

    expect(cloud.deleted_at).toBe(deletedAt)
    expect(cloud.is_favorite).toBe(false)
    expect(cloud.mapbox_id).toBe('poi.123')
    expect(cloud).not.toHaveProperty('deleted')
  })
})

describe('parseMissingCloudColumn', () => {
  it('extracts column names from PGRST204 messages', async () => {
    const { parseMissingCloudColumn } = await import('./cloudSchema')
    expect(
      parseMissingCloudColumn({
        code: 'PGRST204',
        message: "Could not find the 'mapbox_id' column of 'places' in the schema cache",
      }),
    ).toBe('mapbox_id')
  })
})
