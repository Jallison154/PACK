import { v4 as uuid } from 'uuid'
import { db, rowToPerson } from '../database'
import type {
  Person,
  PersonInput,
  PersonWithTags,
  SearchFilters,
  Workspace,
} from '../../types'
import { randomProfileColor } from '../../utils/colors'
import {
  logPersonCreate,
  logPersonDelete,
  logPersonUpdate,
  warnUnexpectedPersonCountChange,
} from '../../utils/personLog'
import { upsertPlaceByName } from './places'

async function assertPersonExists(id: string): Promise<PersonWithTags> {
  const person = await getPersonById(id)
  if (!person) {
    throw new Error(`Pack member not found: ${id}`)
  }
  return person
}

async function upsertCompany(name: string): Promise<string> {
  const id = uuid()
  const now = new Date().toISOString()
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM companies WHERE LOWER(name) = LOWER(?)',
    [name],
  )
  if (existing.length > 0) return existing[0].id

  await db.run('INSERT INTO companies (id, name, created_at) VALUES (?, ?, ?)', [
    id,
    name,
    now,
  ])
  return id
}

async function resolvePlaceId(
  placeId?: string,
  placeName?: string,
  city?: string,
  state?: string,
): Promise<string | null> {
  if (placeId) return placeId
  if (placeName) return upsertPlaceByName(placeName, city, state)
  return null
}

async function getPlaceName(id: string | null): Promise<string | null> {
  if (!id) return null
  const rows = await db.query<{ name: string }>('SELECT name FROM places WHERE id = ?', [id])
  return rows[0]?.name ?? null
}
async function upsertTags(tagNames: string[]): Promise<string[]> {
  const tagIds: string[] = []
  const now = new Date().toISOString()

  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue

    const existing = await db.query<{ id: string }>(
      'SELECT id FROM tags WHERE LOWER(name) = LOWER(?)',
      [trimmed],
    )

    if (existing.length > 0) {
      tagIds.push(existing[0].id)
    } else {
      const id = uuid()
      await db.run('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)', [
        id,
        trimmed,
        now,
      ])
      tagIds.push(id)
    }
  }

  return tagIds
}

async function syncPersonTags(personId: string, tagNames: string[]): Promise<void> {
  await db.run('DELETE FROM person_tags WHERE person_id = ?', [personId])
  const tagIds = await upsertTags(tagNames)

  for (const tagId of tagIds) {
    await db.run('INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)', [
      personId,
      tagId,
    ])
  }
}

async function getTagsForPerson(personId: string): Promise<string[]> {
  const rows = await db.query<{ name: string }>(
    `SELECT t.name FROM tags t
     JOIN person_tags pt ON t.id = pt.tag_id
     WHERE pt.person_id = ?`,
    [personId],
  )
  return rows.map((r: { name: string }) => r.name)
}

async function enrichPerson(row: Record<string, unknown>): Promise<PersonWithTags> {
  const person = rowToPerson(row)
  const tags = await getTagsForPerson(person.id)
  let hhName: string | null = null
  if (person.householdId) {
    const h = await db.query<{ name: string }>(
      'SELECT name FROM households WHERE id = ?',
      [person.householdId],
    )
    hhName = h[0]?.name ?? null
  }
  const [whereMetPlaceName, lastSeenPlaceName] = await Promise.all([
    getPlaceName(person.whereMetPlaceId),
    getPlaceName(person.lastSeenPlaceId),
  ])
  return {
    ...person,
    tags,
    householdName: hhName,
    whereMetPlaceName,
    lastSeenPlaceName,
  }
}

export const enrichPersonFromRow = enrichPerson

function joinNotes(...parts: Array<string | null | undefined>): string | undefined {
  const merged = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
  return merged.length > 0 ? merged.join('\n\n') : undefined
}

function preferString(primary?: string | null, secondary?: string | null): string | undefined {
  const first = primary?.trim()
  if (first) return first
  const second = secondary?.trim()
  return second || undefined
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const id = uuid()
  const now = new Date().toISOString()
  const countBefore = await countPackMembers()

  const existingId = await db.query<{ id: string }>('SELECT id FROM people WHERE id = ?', [id])
  if (existingId.length > 0) {
    throw new Error(`Cannot create Pack member: ID already exists (${id})`)
  }

  let companyId: string | null = null
  let whereMetPlaceId: string | null = null
  let locationId: string | null = null

  if (input.company) {
    companyId = await upsertCompany(input.company)
  }

  whereMetPlaceId = await resolvePlaceId(
    input.whereMetPlaceId,
    input.whereMet || input.event,
    input.city,
    input.state,
  )
  locationId = whereMetPlaceId

  const lastSeenPlaceId = await resolvePlaceId(input.lastSeenPlaceId)

  await db.run(
    `INSERT INTO people (
      id, name, workspace, phone, email, company, company_id, job_title,
      where_met, event, city, state, location_id, where_met_place_id,
      date_met, notes, relationship_type, household_id, home_address, work_location,
      last_seen_at, last_seen_place_id, last_seen_date, last_interaction_notes,
      profile_color, is_favorite, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      input.name,
      input.workspace ?? 'work',
      input.phone ?? null,
      input.email ?? null,
      input.company ?? null,
      companyId,
      input.jobTitle ?? null,
      input.whereMet ?? null,
      input.event ?? null,
      input.city ?? null,
      input.state ?? null,
      locationId,
      whereMetPlaceId,
      input.dateMet ?? now.split('T')[0],
      input.notes ?? null,
      input.relationshipType ?? null,
      input.householdId ?? null,
      input.homeAddress ?? null,
      input.workLocation ?? null,
      input.lastSeenAt ?? null,
      lastSeenPlaceId,
      input.lastSeenDate ?? null,
      input.lastInteractionNotes ?? null,
      input.profileColor ?? randomProfileColor(),
      now,
      now,
    ],
  )

  if (input.tags?.length) {
    await syncPersonTags(id, input.tags)
  }

  const person = await getPersonById(id)
  if (!person || person.id !== id) {
    throw new Error(`Failed to reload Pack member after create: ${id}`)
  }

  const countAfter = await countPackMembers()
  logPersonCreate({
    personId: id,
    databaseId: id,
    countBefore,
    countAfter,
  })
  if (countAfter !== countBefore + 1) {
    warnUnexpectedPersonCountChange('CREATE', id, countBefore, countAfter)
  }

  return person
}

export async function updatePerson(id: string, input: PersonInput): Promise<Person> {
  const existing = await assertPersonExists(id)
  const countBefore = await countPackMembers()
  const now = new Date().toISOString()
  let companyId: string | null = existing.companyId
  let whereMetPlaceId: string | null = existing.whereMetPlaceId
  let locationId: string | null = existing.locationId

  if (input.company) {
    companyId = await upsertCompany(input.company)
  }

  whereMetPlaceId = await resolvePlaceId(
    input.whereMetPlaceId,
    input.whereMet || input.event,
    input.city,
    input.state,
  )
  locationId = whereMetPlaceId
  const lastSeenPlaceId = await resolvePlaceId(input.lastSeenPlaceId)

  const changes = await db.run(
    `UPDATE people SET
      name = ?, workspace = ?, phone = ?, email = ?, company = ?, company_id = ?,
      job_title = ?, where_met = ?, event = ?, city = ?, state = ?,
      location_id = ?, where_met_place_id = ?, date_met = ?, notes = ?, relationship_type = ?,
      household_id = ?, home_address = ?, work_location = ?,
      last_seen_at = ?, last_seen_place_id = ?, last_seen_date = ?, last_interaction_notes = ?,
      updated_at = ?
    WHERE id = ? AND deleted_at IS NULL`,
    [
      input.name,
      input.workspace ?? 'work',
      input.phone ?? null,
      input.email ?? null,
      input.company ?? null,
      companyId,
      input.jobTitle ?? null,
      input.whereMet ?? null,
      input.event ?? null,
      input.city ?? null,
      input.state ?? null,
      locationId,
      whereMetPlaceId,
      input.dateMet ?? null,
      input.notes ?? null,
      input.relationshipType ?? null,
      input.householdId ?? null,
      input.homeAddress ?? null,
      input.workLocation ?? null,
      input.lastSeenAt ?? null,
      lastSeenPlaceId,
      input.lastSeenDate ?? null,
      input.lastInteractionNotes ?? null,
      now,
      id,
    ],
  )

  if (changes === 0) {
    throw new Error(`Update failed: Pack member not found or already removed (${id})`)
  }

  if (input.tags) {
    await syncPersonTags(id, input.tags)
  }

  const person = await getPersonById(id)
  if (!person || person.id !== id) {
    throw new Error(`Failed to reload Pack member after update: ${id}`)
  }

  const countAfter = await countPackMembers()
  logPersonUpdate({
    personId: id,
    databaseId: id,
    countBefore,
    countAfter,
  })
  if (countAfter !== countBefore) {
    warnUnexpectedPersonCountChange('UPDATE', id, countBefore, countAfter)
  }

  return person
}

export async function deletePerson(id: string): Promise<void> {
  await assertPersonExists(id)
  const countBefore = await countPackMembers()

  await db.run('DELETE FROM interactions WHERE person_id = ?', [id])
  await db.run('DELETE FROM person_tags WHERE person_id = ?', [id])
  const changes = await db.run('DELETE FROM people WHERE id = ?', [id])

  if (changes === 0) {
    throw new Error(`Delete failed: Pack member not found (${id})`)
  }

  const countAfter = await countPackMembers()
  logPersonDelete({
    personId: id,
    databaseId: id,
    countBefore,
    countAfter,
  })
  if (countAfter !== countBefore - 1) {
    warnUnexpectedPersonCountChange('DELETE', id, countBefore, countAfter)
  }
}

export async function mergeDraftIntoPerson(
  keepId: string,
  draft: PersonInput,
): Promise<Person> {
  const keep = await assertPersonExists(keepId)
  return updatePerson(keepId, {
    name: preferString(keep.name, draft.name) ?? keep.name,
    workspace: draft.workspace ?? keep.workspace,
    phone: preferString(keep.phone, draft.phone),
    email: preferString(keep.email, draft.email),
    company: preferString(keep.company, draft.company),
    jobTitle: preferString(keep.jobTitle, draft.jobTitle),
    whereMet: preferString(keep.whereMet, draft.whereMet),
    event: preferString(keep.event, draft.event),
    city: preferString(keep.city, draft.city),
    state: preferString(keep.state, draft.state),
    dateMet: keep.dateMet ?? draft.dateMet,
    notes: joinNotes(keep.notes, draft.notes),
    relationshipType: keep.relationshipType ?? draft.relationshipType,
    householdId: keep.householdId ?? draft.householdId,
    homeAddress: preferString(keep.homeAddress, draft.homeAddress),
    workLocation: preferString(keep.workLocation, draft.workLocation),
    lastSeenAt: keep.lastSeenAt ?? draft.lastSeenAt,
    lastSeenPlaceId: keep.lastSeenPlaceId ?? draft.lastSeenPlaceId,
    lastSeenDate: keep.lastSeenDate ?? draft.lastSeenDate,
    lastInteractionNotes: joinNotes(keep.lastInteractionNotes, draft.lastInteractionNotes),
    tags: [...new Set([...keep.tags, ...(draft.tags ?? [])])],
  })
}

export async function mergePeople(keepId: string, mergeId: string): Promise<Person> {
  if (keepId === mergeId) {
    throw new Error('Cannot merge a Pack member with themselves')
  }

  const keep = await assertPersonExists(keepId)
  const merge = await assertPersonExists(mergeId)
  const countBefore = await countPackMembers()

  await db.withoutSyncNotifications(async () => {
    await db.run('UPDATE interactions SET person_id = ? WHERE person_id = ?', [keepId, mergeId])

    const mergeTagRows = await db.query<{ tag_id: string }>(
      'SELECT tag_id FROM person_tags WHERE person_id = ?',
      [mergeId],
    )
    for (const row of mergeTagRows) {
      await db.run('INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)', [
        keepId,
        row.tag_id,
      ])
    }

    await db.run(
      `UPDATE people SET
        phone = COALESCE(phone, ?),
        email = COALESCE(email, ?),
        company = COALESCE(company, ?),
        company_id = COALESCE(company_id, ?),
        job_title = COALESCE(job_title, ?),
        where_met = COALESCE(where_met, ?),
        event = COALESCE(event, ?),
        city = COALESCE(city, ?),
        state = COALESCE(state, ?),
        location_id = COALESCE(location_id, ?),
        where_met_place_id = COALESCE(where_met_place_id, ?),
        last_seen_place_id = COALESCE(last_seen_place_id, ?),
        home_address = COALESCE(home_address, ?),
        work_location = COALESCE(work_location, ?),
        notes = ?,
        last_interaction_notes = ?,
        is_favorite = CASE WHEN is_favorite = 1 OR ? = 1 THEN 1 ELSE 0 END,
        updated_at = ?
      WHERE id = ?`,
      [
        merge.phone,
        merge.email,
        merge.company,
        merge.companyId,
        merge.jobTitle,
        merge.whereMet,
        merge.event,
        merge.city,
        merge.state,
        merge.locationId,
        merge.whereMetPlaceId,
        merge.lastSeenPlaceId,
        merge.homeAddress,
        merge.workLocation,
        joinNotes(keep.notes, merge.notes) ?? null,
        joinNotes(keep.lastInteractionNotes, merge.lastInteractionNotes) ?? null,
        merge.isFavorite ? 1 : 0,
        new Date().toISOString(),
        keepId,
      ],
    )

    await syncPersonTags(keepId, [...new Set([...keep.tags, ...merge.tags])])
    await db.run('DELETE FROM person_tags WHERE person_id = ?', [mergeId])
    await db.run('DELETE FROM people WHERE id = ?', [mergeId])
  })

  const person = await getPersonById(keepId)
  if (!person) {
    throw new Error(`Failed to reload Pack member after merge: ${keepId}`)
  }

  const countAfter = await countPackMembers()
  logPersonUpdate({
    personId: keepId,
    databaseId: keepId,
    countBefore,
    countAfter,
  })
  if (countAfter !== countBefore - 1) {
    warnUnexpectedPersonCountChange('UPDATE', keepId, countBefore, countAfter)
  }

  if (await isCloudSyncEnabled()) {
    const { enqueueSyncChange } = await import('../../services/sync/queue')
    const keepRow = await db.query('SELECT * FROM people WHERE id = ?', [keepId])
    if (keepRow[0]) {
      await enqueueSyncChange('people', keepId, 'update', keepRow[0] as Record<string, unknown>)
    }
    await enqueueSyncChange('people', mergeId, 'delete', { id: mergeId })
  }

  return person
}

async function isCloudSyncEnabled(): Promise<boolean> {
  const { isCloudSyncEnabled: enabled } = await import('../../services/sync/types')
  return enabled()
}

export async function getPersonById(id: string): Promise<PersonWithTags | null> {
  const rows = await db.query('SELECT * FROM people WHERE id = ? AND deleted_at IS NULL', [id])
  if (rows.length === 0) return null
  return enrichPerson(rows[0])
}

export async function getRecentPeople(
  workspace?: Workspace,
  limit = 20,
): Promise<PersonWithTags[]> {
  let sql = `SELECT * FROM people WHERE deleted_at IS NULL`
  const params: unknown[] = []

  if (workspace) {
    sql += ' AND workspace = ?'
    params.push(workspace)
  }

  sql += ' ORDER BY is_favorite DESC, created_at DESC LIMIT ?'
  params.push(limit)

  const rows = await db.query(sql, params)
  const people: PersonWithTags[] = []
  for (const row of rows) {
    people.push(await enrichPerson(row))
  }
  return people
}

export async function getFavoritePeople(workspace?: Workspace): Promise<PersonWithTags[]> {
  let sql = `SELECT * FROM people WHERE is_favorite = 1 AND deleted_at IS NULL`
  const params: unknown[] = []

  if (workspace) {
    sql += ' AND workspace = ?'
    params.push(workspace)
  }

  sql += ' ORDER BY name ASC'

  const rows = await db.query(sql, params)
  const people: PersonWithTags[] = []
  for (const row of rows) {
    people.push(await enrichPerson(row))
  }
  return people
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const rows = await db.query<{ is_favorite: number }>(
    'SELECT is_favorite FROM people WHERE id = ?',
    [id],
  )
  if (rows.length === 0) return false

  const newVal = rows[0].is_favorite ? 0 : 1
  await db.run('UPDATE people SET is_favorite = ?, updated_at = ? WHERE id = ?', [
    newVal,
    new Date().toISOString(),
    id,
  ])
  return Boolean(newVal)
}

export async function searchPeople(
  query: string,
  filters: SearchFilters = {},
): Promise<PersonWithTags[]> {
  const trimmed = query.trim()
  let personIds: string[] = []

  if (trimmed) {
    const like = `%${trimmed}%`
    const likeRows = await db.query<{ id: string }>(
      `SELECT DISTINCT p.id FROM people p
       LEFT JOIN person_tags pt ON p.id = pt.person_id
       LEFT JOIN tags t ON pt.tag_id = t.id
       LEFT JOIN interactions i ON i.person_id = p.id
       LEFT JOIN places pl_met ON p.where_met_place_id = pl_met.id
       LEFT JOIN places pl_seen ON p.last_seen_place_id = pl_seen.id
       LEFT JOIN places pl_int ON i.place_id = pl_int.id
       LEFT JOIN households h ON p.household_id = h.id
       WHERE p.deleted_at IS NULL AND (
         p.name LIKE ? OR p.phone LIKE ? OR p.email LIKE ? OR
         p.company LIKE ? OR p.job_title LIKE ? OR p.where_met LIKE ? OR
         p.event LIKE ? OR p.city LIKE ? OR p.state LIKE ? OR
         p.notes LIKE ? OR p.relationship_type LIKE ? OR
         p.home_address LIKE ? OR p.work_location LIKE ? OR
         p.last_seen_at LIKE ? OR p.last_seen_date LIKE ? OR
         p.last_interaction_notes LIKE ? OR
         t.name LIKE ? OR i.notes LIKE ? OR i.location LIKE ? OR
         i.event LIKE ? OR
         i.interaction_type LIKE ? OR
         pl_met.name LIKE ? OR pl_met.address LIKE ? OR pl_met.city LIKE ? OR
         pl_met.state LIKE ? OR pl_met.notes LIKE ? OR
         pl_seen.name LIKE ? OR pl_seen.address LIKE ? OR pl_int.name LIKE ? OR
         pl_int.address LIKE ? OR pl_int.city LIKE ? OR
         h.name LIKE ? OR h.address LIKE ? OR h.pets LIKE ? OR
         h.shared_notes LIKE ? OR h.general_notes LIKE ?
       )`,
      Array(34).fill(like),
    )
    personIds = likeRows.map((r: { id: string }) => r.id)
    if (personIds.length === 0) return []
  }

  let sql = 'SELECT * FROM people WHERE deleted_at IS NULL'
  const params: unknown[] = []

  if (personIds.length > 0) {
    sql += ` AND id IN (${personIds.map(() => '?').join(',')})`
    params.push(...personIds)
  }

  if (filters.workspace) {
    sql += ' AND workspace = ?'
    params.push(filters.workspace)
  }
  if (filters.company) {
    sql += ' AND LOWER(company) = LOWER(?)'
    params.push(filters.company)
  }
  if (filters.location) {
    sql += ` AND (
      LOWER(where_met) = LOWER(?) OR LOWER(event) = LOWER(?) OR LOWER(city) = LOWER(?)
      OR LOWER(last_seen_at) = LOWER(?)
      OR where_met_place_id IN (SELECT id FROM places WHERE LOWER(name) = LOWER(?))
      OR last_seen_place_id IN (SELECT id FROM places WHERE LOWER(name) = LOWER(?))
      OR id IN (
        SELECT i.person_id FROM interactions i
        JOIN places pl ON i.place_id = pl.id
        WHERE LOWER(pl.name) = LOWER(?)
      )
    )`
    params.push(
      filters.location,
      filters.location,
      filters.location,
      filters.location,
      filters.location,
      filters.location,
      filters.location,
    )
  }
  if (filters.relationshipType) {
    sql += ' AND relationship_type = ?'
    params.push(filters.relationshipType)
  }
  if (filters.dateFrom) {
    sql += ' AND date_met >= ?'
    params.push(filters.dateFrom)
  }
  if (filters.dateTo) {
    sql += ' AND date_met <= ?'
    params.push(filters.dateTo)
  }
  if (filters.favoritesOnly) {
    sql += ' AND is_favorite = 1'
  }
  if (filters.tag) {
    sql += ` AND id IN (
      SELECT pt.person_id FROM person_tags pt
      JOIN tags t ON pt.tag_id = t.id
      WHERE LOWER(t.name) = LOWER(?)
    )`
    params.push(filters.tag)
  }

  if (!trimmed && Object.keys(filters).length === 0) {
    sql += ' ORDER BY is_favorite DESC, created_at DESC LIMIT 50'
  } else {
    sql += ' ORDER BY is_favorite DESC, name ASC'
  }

  const rows = await db.query(sql, params)
  const people: PersonWithTags[] = []
  for (const row of rows) {
    people.push(await enrichPerson(row))
  }
  return people
}

export async function mergeTagsToPerson(personId: string, tagNames: string[]): Promise<void> {
  const trimmed = tagNames.map((t) => t.trim()).filter(Boolean)
  if (trimmed.length === 0) return
  const existing = await getTagsForPerson(personId)
  const merged = [...new Set([...existing, ...trimmed])]
  await syncPersonTags(personId, merged)
}

export async function getAllTags(): Promise<string[]> {
  const rows = await db.query<{ name: string }>('SELECT name FROM tags ORDER BY name')
  return rows.map((r: { name: string }) => r.name)
}

export async function getAllCompanies(): Promise<string[]> {
  const rows = await db.query<{ name: string }>('SELECT name FROM companies ORDER BY name')
  return rows.map((r: { name: string }) => r.name)
}

export async function getHouseholdMembers(householdId: string): Promise<PersonWithTags[]> {
  const rows = await db.query(
    'SELECT * FROM people WHERE household_id = ? AND deleted_at IS NULL ORDER BY name',
    [householdId],
  )
  const people: PersonWithTags[] = []
  for (const row of rows) {
    people.push(await enrichPerson(row))
  }
  return people
}

async function getLastInteractionDatesByPersonIds(
  personIds: string[],
): Promise<Map<string, string>> {
  const dates = new Map<string, string>()
  if (personIds.length === 0) return dates

  const placeholders = personIds.map(() => '?').join(',')
  const rows = await db.query<{ person_id: string; last_date: string | null }>(
    `SELECT person_id, MAX(date) as last_date
     FROM interactions
     WHERE person_id IN (${placeholders})
     GROUP BY person_id`,
    personIds,
  )

  for (const row of rows) {
    if (row.last_date) dates.set(row.person_id, row.last_date)
  }
  return dates
}

export type PackMemberSort = 'name' | 'recently_added' | 'recently_seen' | 'last_interaction'
export type PackMemberView = 'all' | 'recent' | 'core'

export interface ListPackMembersOptions {
  query?: string
  workspace?: Workspace
  view?: PackMemberView
  sort?: PackMemberSort
}

export async function countPackMembers(workspace?: Workspace): Promise<number> {
  const rows = workspace
    ? await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL AND workspace = ?',
        [workspace],
      )
    : await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL',
      )
  return Number(rows[0]?.count ?? 0)
}

export async function listPackMembers(
  options: ListPackMembersOptions = {},
): Promise<PersonWithTags[]> {
  const { query, workspace, view = 'all', sort = 'name' } = options
  const trimmed = query?.trim()

  if (trimmed) {
    let people = await searchPeople(trimmed, {
      workspace,
      favoritesOnly: view === 'core',
    })
    if (view === 'recent') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const cutoffIso = cutoff.toISOString().split('T')[0]
      people = people.filter((p) => {
        const recentDate = p.lastSeenDate || p.dateMet || p.createdAt.split('T')[0]
        return recentDate >= cutoffIso
      })
    }
    return await sortPackMembers(people, sort)
  }

  let sql = 'SELECT p.* FROM people p WHERE p.deleted_at IS NULL'
  const params: unknown[] = []

  if (workspace) {
    sql += ' AND p.workspace = ?'
    params.push(workspace)
  }
  if (view === 'core') {
    sql += ' AND p.is_favorite = 1'
  }
  if (view === 'recent') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const cutoffIso = cutoff.toISOString().split('T')[0]
    sql += ` AND COALESCE(p.last_seen_date, p.date_met, substr(p.created_at, 1, 10)) >= ?`
    params.push(cutoffIso)
  }

  switch (sort) {
    case 'recently_added':
      sql += ' ORDER BY p.created_at DESC'
      break
    case 'recently_seen':
      sql +=
        " ORDER BY COALESCE(p.last_seen_date, p.date_met, '') DESC, p.updated_at DESC"
      break
    case 'last_interaction':
      sql += ` ORDER BY (
        SELECT MAX(i.date) FROM interactions i WHERE i.person_id = p.id
      ) DESC, p.updated_at DESC`
      break
    case 'name':
    default:
      sql += ' ORDER BY p.name COLLATE NOCASE ASC'
  }

  const rows = await db.query(sql, params)
  const people: PersonWithTags[] = []
  for (const row of rows) {
    people.push(await enrichPerson(row))
  }
  return people
}

export async function sortPackMembers(
  people: PersonWithTags[],
  sort: PackMemberSort,
): Promise<PersonWithTags[]> {
  const copy = [...people]
  switch (sort) {
    case 'recently_added':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'recently_seen':
      return copy.sort((a, b) => {
        const aDate = a.lastSeenDate || a.dateMet || ''
        const bDate = b.lastSeenDate || b.dateMet || ''
        return bDate.localeCompare(aDate) || b.updatedAt.localeCompare(a.updatedAt)
      })
    case 'last_interaction': {
      const dates = await getLastInteractionDatesByPersonIds(copy.map((p) => p.id))
      return copy.sort((a, b) => {
        const aDate = dates.get(a.id) ?? ''
        const bDate = dates.get(b.id) ?? ''
        return bDate.localeCompare(aDate) || b.updatedAt.localeCompare(a.updatedAt)
      })
    }
    case 'name':
    default:
      return copy.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
  }
}
