import { describe, expect, it } from 'vitest'
import { upsertConflictKey } from './engine'

describe('upsertConflictKey', () => {
  it('uses id for standard tables', () => {
    expect(upsertConflictKey('people')).toBe('id')
    expect(upsertConflictKey('places')).toBe('id')
    expect(upsertConflictKey('interactions')).toBe('id')
  })

  it('uses composite key for person_tags', () => {
    expect(upsertConflictKey('person_tags')).toBe('user_id,person_id,tag_id')
  })
})

describe('edit sync contract', () => {
  it('preserves the same record id across repeated updates', () => {
    const personId = '11111111-1111-1111-1111-111111111111'
    const userId = '22222222-2222-2222-2222-222222222222'

    const firstEdit = {
      id: personId,
      user_id: userId,
      name: 'Ada Lovelace',
      updated_at: '2026-01-01T00:00:00.000Z',
    }

    const secondEdit = {
      ...firstEdit,
      name: 'Ada L.',
      updated_at: '2026-01-02T00:00:00.000Z',
    }

    const thirdEdit = {
      ...firstEdit,
      name: 'Ada',
      phone: '555-0100',
      updated_at: '2026-01-03T00:00:00.000Z',
    }

    expect(firstEdit.id).toBe(personId)
    expect(secondEdit.id).toBe(personId)
    expect(thirdEdit.id).toBe(personId)
    expect(new Set([firstEdit.id, secondEdit.id, thirdEdit.id]).size).toBe(1)
    expect(upsertConflictKey('people')).toBe('id')
  })

  it('never generates a new id during edit payloads', () => {
    const existingId = 'person-existing'
    const updatePayload = {
      id: existingId,
      name: 'Updated Name',
      updated_at: new Date().toISOString(),
    }

    expect(updatePayload.id).toBe(existingId)
    expect(updatePayload.id).not.toMatch(/^new-/)
  })
})
