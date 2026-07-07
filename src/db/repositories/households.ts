import { v4 as uuid } from 'uuid'
import { db } from '../database'
import type { Household, HouseholdInput, HouseholdWithMembers } from '../../types'
import { rowToPerson } from '../database'

function rowToHousehold(row: Record<string, unknown>): Household {
  return {
    id: row.id as string,
    name: row.name as string,
    address: (row.address as string) || null,
    sharedNotes: (row.shared_notes as string) || null,
    pets: (row.pets as string) || null,
    generalNotes: (row.general_notes as string) || null,
    createdAt: row.created_at as string,
    syncVersion: (row.sync_version as number) || 1,
  }
}

export async function createHousehold(input: HouseholdInput): Promise<Household> {
  const id = uuid()
  const now = new Date().toISOString()
  await db.run(
    `INSERT INTO households (id, name, address, shared_notes, pets, general_notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.address ?? null,
      input.sharedNotes ?? null,
      input.pets ?? null,
      input.generalNotes ?? null,
      now,
    ],
  )
  const rows = await db.query('SELECT * FROM households WHERE id = ?', [id])
  return rowToHousehold(rows[0])
}

export async function updateHousehold(id: string, input: HouseholdInput): Promise<Household> {
  await db.run(
    `UPDATE households SET name = ?, address = ?, shared_notes = ?, pets = ?, general_notes = ?
     WHERE id = ?`,
    [
      input.name,
      input.address ?? null,
      input.sharedNotes ?? null,
      input.pets ?? null,
      input.generalNotes ?? null,
      id,
    ],
  )
  const rows = await db.query('SELECT * FROM households WHERE id = ?', [id])
  return rowToHousehold(rows[0])
}

export async function getHouseholdById(id: string): Promise<Household | null> {
  const rows = await db.query('SELECT * FROM households WHERE id = ?', [id])
  if (rows.length === 0) return null
  return rowToHousehold(rows[0])
}

export async function getAllHouseholds(): Promise<HouseholdWithMembers[]> {
  const rows = await db.query(
    `SELECT h.*, COUNT(p.id) as member_count
     FROM households h
     LEFT JOIN people p ON p.household_id = h.id AND p.deleted_at IS NULL
     GROUP BY h.id
     ORDER BY h.name ASC`,
  )

  const households: HouseholdWithMembers[] = []
  for (const row of rows) {
    const household = rowToHousehold(row)
    const memberRows = await db.query(
      'SELECT * FROM people WHERE household_id = ? AND deleted_at IS NULL ORDER BY name',
      [household.id],
    )
    households.push({
      ...household,
      memberCount: (row.member_count as number) || 0,
      members: memberRows.map((r) => ({ ...rowToPerson(r), tags: [] })),
    })
  }
  return households
}

export async function getHouseholdNames(): Promise<{ id: string; name: string }[]> {
  const rows = await db.query<{ id: string; name: string }>(
    'SELECT id, name FROM households ORDER BY name',
  )
  return rows
}

export async function upsertHouseholdByName(name: string): Promise<string> {
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM households WHERE LOWER(name) = LOWER(?)',
    [name],
  )
  if (existing.length > 0) return existing[0].id

  const household = await createHousehold({ name })
  return household.id
}
