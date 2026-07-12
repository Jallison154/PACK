import { startOfWeek, endOfWeek, format } from 'date-fns'
import { db, rowToPerson, rowToInteraction } from '../database'
import type {
  Workspace,
  PersonWithTags,
  WorkDashboardStats,
  PersonalDashboardStats,
  InteractionWithPerson,
} from '../../types'

function weekRange() {
  const now = new Date()
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    end: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

async function enrichPeople(rows: Record<string, unknown>[]): Promise<PersonWithTags[]> {
  const people: PersonWithTags[] = []
  for (const row of rows) {
    const person = rowToPerson(row)
    const tagRows = await db.query<{ name: string }>(
      `SELECT t.name FROM tags t JOIN person_tags pt ON t.id = pt.tag_id WHERE pt.person_id = ?`,
      [person.id],
    )
    let householdName: string | null = null
    if (person.householdId) {
      const h = await db.query<{ name: string }>(
        'SELECT name FROM households WHERE id = ?',
        [person.householdId],
      )
      householdName = h[0]?.name ?? null
    }
    people.push({
      ...person,
      tags: tagRows.map((t) => t.name),
      householdName,
    })
  }
  return people
}

export async function getWorkDashboardStats(): Promise<WorkDashboardStats> {
  const { start } = weekRange()
  const [total, companies, events, locations, added] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM people WHERE workspace = 'work' AND deleted_at IS NULL`,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT company) as count FROM people
       WHERE workspace = 'work' AND company IS NOT NULL AND company != '' AND deleted_at IS NULL`,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT event) as count FROM people
       WHERE workspace = 'work' AND event IS NOT NULL AND event != '' AND deleted_at IS NULL`,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT COALESCE(where_met, event)) as count FROM people
       WHERE workspace = 'work' AND deleted_at IS NULL
       AND (where_met IS NOT NULL OR event IS NOT NULL)`,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM people
       WHERE workspace = 'work' AND created_at >= ? AND deleted_at IS NULL`,
      [start],
    ),
  ])

  return {
    totalContacts: total[0]?.count ?? 0,
    companies: companies[0]?.count ?? 0,
    events: events[0]?.count ?? 0,
    locations: locations[0]?.count ?? 0,
    addedThisWeek: added[0]?.count ?? 0,
  }
}

export async function getPersonalDashboardStats(): Promise<PersonalDashboardStats> {
  const [total, households, neighborhoods, favorites] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM people WHERE workspace = 'personal' AND deleted_at IS NULL`,
    ),
    db.query<{ count: number }>('SELECT COUNT(*) as count FROM households'),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT city) as count FROM people
       WHERE workspace = 'personal' AND city IS NOT NULL AND city != '' AND deleted_at IS NULL`,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM people
       WHERE workspace = 'personal' AND is_favorite = 1 AND deleted_at IS NULL`,
    ),
  ])

  return {
    totalContacts: total[0]?.count ?? 0,
    households: households[0]?.count ?? 0,
    neighborhoods: neighborhoods[0]?.count ?? 0,
    favorites: favorites[0]?.count ?? 0,
  }
}

export async function getPeopleMetThisWeek(workspace: Workspace): Promise<PersonWithTags[]> {
  const { start } = weekRange()
  const rows = await db.query(
    `SELECT * FROM people WHERE workspace = ? AND deleted_at IS NULL
     AND created_at >= ? ORDER BY created_at DESC LIMIT 10`,
    [workspace, start],
  )
  return enrichPeople(rows)
}

export async function getRecentCompanies(workspace: Workspace): Promise<string[]> {
  const rows = await db.query<{ company: string }>(
    `SELECT DISTINCT company FROM people
     WHERE workspace = ? AND company IS NOT NULL AND company != '' AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT 8`,
    [workspace],
  )
  return rows.map((r) => r.company)
}

export async function getRecentLocations(workspace: Workspace): Promise<string[]> {
  const rows = await db.query<{ loc: string }>(
    `SELECT DISTINCT COALESCE(where_met, event) as loc FROM people
     WHERE workspace = ? AND deleted_at IS NULL
     AND (where_met IS NOT NULL OR event IS NOT NULL)
     ORDER BY updated_at DESC LIMIT 8`,
    [workspace],
  )
  return rows.map((r) => r.loc).filter(Boolean)
}

export async function getUpcomingFollowUps(workspace?: Workspace): Promise<InteractionWithPerson[]> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const rows = workspace
    ? await db.query(
        `SELECT i.*, p.name as person_name, p.workspace
         FROM interactions i
         JOIN people p ON p.id = i.person_id
         WHERE p.workspace = ? AND p.deleted_at IS NULL
         AND i.next_follow_up IS NOT NULL AND i.next_follow_up >= ?
         ORDER BY i.next_follow_up ASC LIMIT 10`,
        [workspace, today],
      )
    : await db.query(
        `SELECT i.*, p.name as person_name, p.workspace
         FROM interactions i
         JOIN people p ON p.id = i.person_id
         WHERE p.deleted_at IS NULL
         AND i.next_follow_up IS NOT NULL AND i.next_follow_up >= ?
         ORDER BY i.next_follow_up ASC LIMIT 10`,
        [today],
      )
  return rows.map((row) => ({
    ...rowToInteraction(row),
    personName: row.person_name as string,
    workspace: row.workspace as Workspace,
  }))
}

export async function getRecentInteractions(
  workspace?: Workspace,
  limit = 10,
): Promise<InteractionWithPerson[]> {
  const rows = workspace
    ? await db.query(
        `SELECT i.*, p.name as person_name, p.workspace
         FROM interactions i
         JOIN people p ON p.id = i.person_id
         WHERE p.workspace = ? AND p.deleted_at IS NULL
         ORDER BY i.date DESC LIMIT ?`,
        [workspace, limit],
      )
    : await db.query(
        `SELECT i.*, p.name as person_name, p.workspace
         FROM interactions i
         JOIN people p ON p.id = i.person_id
         WHERE p.deleted_at IS NULL
         ORDER BY i.date DESC LIMIT ?`,
        [limit],
      )
  return rows.map((row) => ({
    ...rowToInteraction(row),
    personName: row.person_name as string,
    workspace: row.workspace as Workspace,
  }))
}

export async function getFavoriteByWorkspace(workspace: Workspace): Promise<PersonWithTags[]> {
  const rows = await db.query(
    `SELECT * FROM people WHERE workspace = ? AND is_favorite = 1 AND deleted_at IS NULL
     ORDER BY name ASC LIMIT 10`,
    [workspace],
  )
  return enrichPeople(rows)
}

export async function getRecentlyAdded(workspace?: Workspace): Promise<PersonWithTags[]> {
  const rows = workspace
    ? await db.query(
        `SELECT * FROM people WHERE workspace = ? AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 10`,
        [workspace],
      )
    : await db.query(
        `SELECT * FROM people WHERE deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 10`,
      )
  return enrichPeople(rows)
}

export async function getHomeStats(): Promise<{
  people: number
  companies: number
  followUps: number
  places: number
}> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [people, companies, followUps, places] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL`,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT company) as count FROM people
       WHERE company IS NOT NULL AND company != '' AND deleted_at IS NULL`,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM interactions i
       JOIN people p ON p.id = i.person_id
       WHERE p.deleted_at IS NULL
       AND i.next_follow_up IS NOT NULL AND i.next_follow_up >= ?`,
      [today],
    ),
    db.query<{ count: number }>(`SELECT COUNT(*) as count FROM places`),
  ])

  return {
    people: people[0]?.count ?? 0,
    companies: companies[0]?.count ?? 0,
    followUps: followUps[0]?.count ?? 0,
    places: places[0]?.count ?? 0,
  }
}

export async function getPeopleByRelationship(
  workspace: Workspace,
  relationshipType: string,
): Promise<PersonWithTags[]> {
  const rows = await db.query(
    `SELECT * FROM people WHERE workspace = ? AND relationship_type = ?
     AND deleted_at IS NULL ORDER BY name ASC LIMIT 10`,
    [workspace, relationshipType],
  )
  return enrichPeople(rows)
}

export async function getRecentNotes(workspace: Workspace): Promise<
  { personId: string; personName: string; note: string; date: string }[]
> {
  const rows = await db.query(
    `SELECT id, name, notes, updated_at FROM people
     WHERE workspace = ? AND notes IS NOT NULL AND notes != '' AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT 8`,
    [workspace],
  )
  return rows.map((r) => ({
    personId: r.id as string,
    personName: r.name as string,
    note: r.notes as string,
    date: r.updated_at as string,
  }))
}

export async function getWeeklySummary(workspace: Workspace) {
  const { start, startDate } = weekRange()
  const [added, companies, locations, events] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM people
       WHERE workspace = ? AND created_at >= ? AND deleted_at IS NULL`,
      [workspace, start],
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT company) as count FROM people
       WHERE workspace = ? AND created_at >= ? AND company IS NOT NULL AND deleted_at IS NULL`,
      [workspace, start],
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT COALESCE(where_met, event)) as count FROM people
       WHERE workspace = ? AND created_at >= ? AND deleted_at IS NULL
       AND (where_met IS NOT NULL OR event IS NOT NULL)`,
      [workspace, start],
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT event) as count FROM people
       WHERE workspace = ? AND created_at >= ? AND event IS NOT NULL AND deleted_at IS NULL`,
      [workspace, start],
    ),
  ])

  return {
    weekStart: startDate,
    peopleAdded: added[0]?.count ?? 0,
    newCompanies: companies[0]?.count ?? 0,
    newLocations: locations[0]?.count ?? 0,
    newEvents: events[0]?.count ?? 0,
  }
}
