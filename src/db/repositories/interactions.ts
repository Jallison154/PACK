import { v4 as uuid } from 'uuid'
import { db, rowToInteraction } from '../database'
import { mergeTagsToPerson } from './people'
import { getPlaceById } from './places'
import type { Interaction, InteractionInput } from '../../types'

async function syncPersonLastSeen(personId: string, input: InteractionInput): Promise<void> {
  const now = new Date().toISOString()
  let locationText = input.location ?? null

  if (input.placeId) {
    const place = await getPlaceById(input.placeId)
    if (place) locationText = place.name
  }

  await db.run(
    `UPDATE people SET
      last_seen_at = ?,
      last_seen_date = ?,
      last_interaction_notes = ?,
      last_seen_place_id = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      locationText,
      input.date,
      input.notes ?? null,
      input.placeId ?? null,
      now,
      personId,
    ],
  )
}

export async function createInteraction(input: InteractionInput): Promise<Interaction> {
  const id = uuid()
  const now = new Date().toISOString()

  let locationText = input.location ?? null
  if (input.placeId) {
    const place = await getPlaceById(input.placeId)
    if (place) locationText = place.name
  }

  await db.run(
    `INSERT INTO interactions (id, person_id, date, location, place_id, interaction_type, notes, event, next_follow_up, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.personId,
      input.date,
      locationText,
      input.placeId ?? null,
      input.interactionType ?? null,
      input.notes ?? null,
      input.event ?? null,
      input.nextFollowUp ?? null,
      now,
      now,
    ],
  )

  if (input.tags?.length) {
    await mergeTagsToPerson(input.personId, input.tags)
  }

  await syncPersonLastSeen(input.personId, { ...input, location: locationText ?? undefined })

  const rows = await db.query('SELECT * FROM interactions WHERE id = ?', [id])
  return rowToInteraction(rows[0])
}

export async function getInteractionsForPerson(personId: string): Promise<Interaction[]> {
  const rows = await db.query(
    'SELECT * FROM interactions WHERE person_id = ? ORDER BY date DESC',
    [personId],
  )
  return rows.map(rowToInteraction)
}

export async function deleteInteraction(id: string): Promise<void> {
  await db.run('DELETE FROM interactions WHERE id = ?', [id])
}

export async function updateInteraction(
  id: string,
  input: Partial<InteractionInput>,
): Promise<Interaction> {
  const now = new Date().toISOString()
  const existing = await db.query('SELECT * FROM interactions WHERE id = ?', [id])
  if (existing.length === 0) throw new Error('Interaction not found')

  const current = rowToInteraction(existing[0])
  const placeId = input.placeId ?? current.placeId ?? undefined
  let locationText = input.location ?? current.location

  if (placeId) {
    const place = await getPlaceById(placeId)
    if (place) locationText = place.name
  }

  await db.run(
    `UPDATE interactions SET date = ?, location = ?, place_id = ?, interaction_type = ?, notes = ?, event = ?, next_follow_up = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.date ?? current.date,
      locationText,
      placeId ?? null,
      input.interactionType ?? current.interactionType,
      input.notes ?? current.notes,
      input.event ?? current.event,
      input.nextFollowUp ?? current.nextFollowUp,
      now,
      id,
    ],
  )

  const personId = current.personId
  await syncPersonLastSeen(personId, {
    personId,
    date: input.date ?? current.date,
    location: locationText ?? undefined,
    placeId: placeId ?? undefined,
    notes: input.notes ?? current.notes ?? undefined,
  })

  const rows = await db.query('SELECT * FROM interactions WHERE id = ?', [id])
  return rowToInteraction(rows[0])
}

export interface InteractionWithPlaceName extends Interaction {
  placeName?: string | null
}

export async function getInteractionsWithPlaces(personId: string): Promise<InteractionWithPlaceName[]> {
  const rows = await db.query(
    `SELECT i.*, pl.name as place_name FROM interactions i
     LEFT JOIN places pl ON pl.id = i.place_id
     WHERE i.person_id = ? ORDER BY i.date DESC`,
    [personId],
  )
  return rows.map((row) => ({
    ...rowToInteraction(row),
    placeName: (row.place_name as string) || null,
  }))
}
