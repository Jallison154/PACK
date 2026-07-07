import { db } from '../db/database'
import type { PersonWithTags } from '../types'

export async function exportToJSON(): Promise<string> {
  const [people, interactions, locations, companies, tags, personTags] = await Promise.all([
    db.query('SELECT * FROM people'),
    db.query('SELECT * FROM interactions'),
    db.query('SELECT * FROM locations'),
    db.query('SELECT * FROM companies'),
    db.query('SELECT * FROM tags'),
    db.query('SELECT * FROM person_tags'),
  ])

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { people, interactions, locations, companies, tags, personTags },
    },
    null,
    2,
  )
}

export async function exportToCSV(): Promise<string> {
  const people = await db.query('SELECT * FROM people WHERE deleted_at IS NULL')
  if (people.length === 0) return 'No data'

  const headers = [
    'name',
    'phone',
    'email',
    'company',
    'job_title',
    'where_met',
    'event',
    'city',
    'state',
    'date_met',
    'notes',
    'relationship_type',
    'is_favorite',
  ]

  const escape = (val: unknown) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = people.map((p: Record<string, unknown>) =>
    headers.map((h) => escape(p[h])).join(','),
  )

  return [headers.join(','), ...rows].join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromJSON(jsonStr: string): Promise<void> {
  const parsed = JSON.parse(jsonStr)
  const { data } = parsed

  if (!data) throw new Error('Invalid backup format')

  const tables = ['person_tags', 'interactions', 'people', 'tags', 'companies', 'locations']

  for (const table of tables) {
    await db.run(`DELETE FROM ${table}`)
  }

  for (const loc of data.locations ?? []) {
    await db.run(
      'INSERT INTO locations (id, name, city, state, type, created_at, sync_version) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [loc.id, loc.name, loc.city, loc.state, loc.type, loc.created_at, loc.sync_version ?? 1],
    )
  }

  for (const comp of data.companies ?? []) {
    await db.run(
      'INSERT INTO companies (id, name, created_at, sync_version) VALUES (?, ?, ?, ?)',
      [comp.id, comp.name, comp.created_at, comp.sync_version ?? 1],
    )
  }

  for (const tag of data.tags ?? []) {
    await db.run(
      'INSERT INTO tags (id, name, created_at, sync_version) VALUES (?, ?, ?, ?)',
      [tag.id, tag.name, tag.created_at, tag.sync_version ?? 1],
    )
  }

  for (const person of data.people ?? []) {
    await db.run(
      `INSERT INTO people (id, name, phone, email, company, company_id, job_title, where_met, event, city, state, location_id, date_met, notes, relationship_type, profile_color, is_favorite, created_at, updated_at, sync_version, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        person.id, person.name, person.phone, person.email, person.company,
        person.company_id, person.job_title, person.where_met, person.event,
        person.city, person.state, person.location_id, person.date_met,
        person.notes, person.relationship_type, person.profile_color,
        person.is_favorite, person.created_at, person.updated_at,
        person.sync_version ?? 1, person.deleted_at,
      ],
    )
  }

  for (const pt of data.personTags ?? []) {
    await db.run('INSERT INTO person_tags (person_id, tag_id) VALUES (?, ?)', [
      pt.person_id,
      pt.tag_id,
    ])
  }

  for (const interaction of data.interactions ?? []) {
    await db.run(
      `INSERT INTO interactions (id, person_id, date, location, notes, next_follow_up, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        interaction.id, interaction.person_id, interaction.date,
        interaction.location, interaction.notes, interaction.next_follow_up,
        interaction.created_at, interaction.updated_at, interaction.sync_version ?? 1,
      ],
    )
  }
}

export async function createAutomaticBackup(): Promise<void> {
  const json = await exportToJSON()
  const key = `pack_backup_${new Date().toISOString().split('T')[0]}`
  localStorage.setItem(key, json)

  const keys = Object.keys(localStorage)
    .filter((k) => k.startsWith('pack_backup_'))
    .sort()

  while (keys.length > 7) {
    localStorage.removeItem(keys.shift()!)
  }
}

export async function getAllPeopleForExport(): Promise<PersonWithTags[]> {
  const rows = await db.query('SELECT * FROM people WHERE deleted_at IS NULL ORDER BY name')
  return rows.map((row: Record<string, unknown>) => ({
    ...row,
    tags: [],
  })) as unknown as PersonWithTags[]
}
