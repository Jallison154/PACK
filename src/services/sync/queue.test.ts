import { describe, expect, it } from 'vitest'
import { parseWriteForSync } from './queue'

describe('parseWriteForSync', () => {
  it('classifies plain INSERT as insert', () => {
    const parsed = parseWriteForSync(
      'INSERT INTO people (id, name) VALUES (?, ?)',
      ['person-1', 'Ada'],
    )
    expect(parsed).toEqual({
      table: 'people',
      operation: 'insert',
      recordId: 'person-1',
    })
  })

  it('classifies UPDATE as update using the last param as id', () => {
    const parsed = parseWriteForSync(
      'UPDATE people SET name = ?, updated_at = ? WHERE id = ?',
      ['Ada', '2026-01-01T00:00:00.000Z', 'person-1'],
    )
    expect(parsed).toEqual({
      table: 'people',
      operation: 'update',
      recordId: 'person-1',
    })
  })

  it('classifies INSERT OR REPLACE as update', () => {
    const parsed = parseWriteForSync(
      'INSERT OR REPLACE INTO people (id, name) VALUES (?, ?)',
      ['person-1', 'Ada'],
    )
    expect(parsed).toEqual({
      table: 'people',
      operation: 'update',
      recordId: 'person-1',
    })
  })

  it('ignores INSERT OR IGNORE', () => {
    const parsed = parseWriteForSync(
      'INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)',
      ['person-1', 'tag-1'],
    )
    expect(parsed).toBeNull()
  })

  it('classifies DELETE as delete', () => {
    const parsed = parseWriteForSync('DELETE FROM people WHERE id = ?', ['person-1'])
    expect(parsed).toEqual({
      table: 'people',
      operation: 'delete',
      recordId: 'person-1',
    })
  })
})
