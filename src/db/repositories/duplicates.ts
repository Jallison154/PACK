import { db, rowToPerson } from '../database'
import type { PersonWithTags } from '../../types'
import type { MatchStrength } from '../../utils/match'
import {
  normalizePhone,
  normalizeEmail,
  namesSimilar,
  textSimilar,
  STRENGTH_ORDER,
} from '../../utils/match'
import { getRelationshipLabel } from '../../types'

export interface DuplicateMatch {
  person: PersonWithTags
  strength: MatchStrength
  reasons: string[]
}

export interface DuplicateSearchInput {
  name?: string
  phone?: string
  email?: string
  company?: string
  whereMet?: string
  notes?: string
  tags?: string[]
}

async function enrichForMatch(row: Record<string, unknown>): Promise<PersonWithTags> {
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
  let whereMetPlaceName: string | null = null
  if (person.whereMetPlaceId) {
    const p = await db.query<{ name: string }>(
      'SELECT name FROM places WHERE id = ?',
      [person.whereMetPlaceId],
    )
    whereMetPlaceName = p[0]?.name ?? null
  }
  let lastSeenPlaceName: string | null = null
  if (person.lastSeenPlaceId) {
    const p = await db.query<{ name: string }>(
      'SELECT name FROM places WHERE id = ?',
      [person.lastSeenPlaceId],
    )
    lastSeenPlaceName = p[0]?.name ?? null
  }
  return {
    ...person,
    tags: tagRows.map((t) => t.name),
    householdName,
    whereMetPlaceName,
    lastSeenPlaceName,
  }
}

function scorePerson(
  person: PersonWithTags,
  input: DuplicateSearchInput,
): DuplicateMatch | null {
  const reasons: string[] = []
  let strength: MatchStrength = 'possible'

  const inPhone = input.phone ? normalizePhone(input.phone) : ''
  const pPhone = person.phone ? normalizePhone(person.phone) : ''
  if (inPhone.length >= 7 && pPhone && inPhone === pPhone) {
    reasons.push('Same phone number')
    strength = 'strong'
  }

  const inEmail = input.email ? normalizeEmail(input.email) : ''
  const pEmail = person.email ? normalizeEmail(person.email) : ''
  if (inEmail && pEmail && inEmail === pEmail) {
    reasons.push('Same email')
    strength = 'strong'
  }

  const nameMatch =
    input.name && input.name.trim().length >= 2 && namesSimilar(input.name, person.name)
  const companyMatch =
    input.company &&
    person.company &&
    textSimilar(input.company, person.company)
  const whereMetMatch =
    input.whereMet &&
    person.whereMet &&
    textSimilar(input.whereMet, person.whereMet)
  const householdMatch =
    input.company &&
    person.householdName &&
    textSimilar(input.company, person.householdName)

  if (nameMatch && companyMatch) {
    reasons.push('Similar name and same company')
    if (STRENGTH_ORDER[strength] < STRENGTH_ORDER.likely) strength = 'likely'
  }

  if (householdMatch) {
    reasons.push('Same household')
    if (STRENGTH_ORDER[strength] < STRENGTH_ORDER.likely) strength = 'likely'
  }

  if (nameMatch && whereMetMatch) {
    reasons.push('Similar name and same place met')
    if (STRENGTH_ORDER[strength] < STRENGTH_ORDER.likely) strength = 'likely'
  }

  if (input.notes && person.notes && textSimilar(input.notes, person.notes)) {
    reasons.push('Similar notes')
    if (strength === 'possible') reasons.push('note match')
  }

  if (input.tags?.length && person.tags.length) {
    const overlap = input.tags.filter((t) =>
      person.tags.some((pt) => pt.toLowerCase() === t.toLowerCase()),
    )
    if (overlap.length > 0) {
      reasons.push(`Shared tags: ${overlap.join(', ')}`)
    }
  }

  if (nameMatch && strength === 'possible' && reasons.length === 0) {
    reasons.push('Similar name')
  }

  if (reasons.length === 0) return null

  if (strength === 'possible' && !nameMatch && reasons.length === 0) return null

  return { person, strength, reasons }
}

export async function findPossibleDuplicates(
  input: DuplicateSearchInput,
  limit = 8,
): Promise<DuplicateMatch[]> {
  const hasQuery =
    (input.name && input.name.trim().length >= 2) ||
    (input.phone && normalizePhone(input.phone).length >= 3) ||
    (input.email && input.email.includes('@')) ||
    (input.company && input.company.trim().length >= 2) ||
    (input.whereMet && input.whereMet.trim().length >= 2) ||
    (input.notes && input.notes.trim().length >= 3)

  if (!hasQuery) return []

  const likeName = input.name ? `%${input.name.trim()}%` : null
  const likeCompany = input.company ? `%${input.company.trim()}%` : null
  const normPhone = input.phone ? normalizePhone(input.phone) : ''
  const normEmail = input.email ? normalizeEmail(input.email) : ''

  let sql = `SELECT DISTINCT p.* FROM people p
    LEFT JOIN person_tags pt ON p.id = pt.person_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    LEFT JOIN households h ON p.household_id = h.id
    WHERE p.deleted_at IS NULL AND (`
  const params: unknown[] = []
  const clauses: string[] = []

  if (likeName) {
    clauses.push('p.name LIKE ?')
    params.push(likeName)
  }
  if (normPhone.length >= 3) {
    clauses.push(`REPLACE(REPLACE(REPLACE(p.phone, '-', ''), ' ', ''), '.', '') LIKE ?`)
    params.push(`%${normPhone}%`)
  }
  if (normEmail) {
    clauses.push('LOWER(p.email) = ?')
    params.push(normEmail)
  }
  if (likeCompany) {
    clauses.push('(p.company LIKE ? OR h.name LIKE ?)')
    params.push(likeCompany, likeCompany)
  }
  if (input.whereMet?.trim()) {
    clauses.push('(p.where_met LIKE ? OR p.event LIKE ?)')
    const w = `%${input.whereMet.trim()}%`
    params.push(w, w)
  }
  if (input.notes?.trim()) {
    clauses.push('p.notes LIKE ?')
    params.push(`%${input.notes.trim()}%`)
  }

  if (clauses.length === 0) return []

  sql += clauses.join(' OR ') + ') LIMIT 40'

  const rows = await db.query(sql, params)
  const matches: DuplicateMatch[] = []

  for (const row of rows) {
    const person = await enrichForMatch(row)
    const scored = scorePerson(person, input)
    if (scored) matches.push(scored)
  }

  matches.sort(
    (a, b) =>
      STRENGTH_ORDER[b.strength] - STRENGTH_ORDER[a.strength] ||
      a.person.name.localeCompare(b.person.name),
  )

  const seen = new Set<string>()
  const unique: DuplicateMatch[] = []
  for (const m of matches) {
    if (seen.has(m.person.id)) continue
    seen.add(m.person.id)
    unique.push(m)
    if (unique.length >= limit) break
  }

  return unique
}

export function formatMatchSubtitle(person: PersonWithTags): string {
  const parts: string[] = []

  if (person.company) {
    parts.push(person.company)
  } else if (person.householdName) {
    parts.push(person.householdName)
  } else if (person.relationshipType) {
    parts.push(getRelationshipLabel(person.relationshipType))
  }

  if (person.whereMet || person.event || person.whereMetPlaceName) {
    parts.push(`Met at ${person.whereMetPlaceName || person.whereMet || person.event}`)
  } else if (person.lastSeenPlaceName || person.lastSeenAt) {
    parts.push(`Last seen at ${person.lastSeenPlaceName || person.lastSeenAt}`)
  } else if (person.city) {
    parts.push(person.city)
  }

  return parts.join(' — ')
}
