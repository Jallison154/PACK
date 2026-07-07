import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  parseISO,
  subDays,
  isAfter,
} from 'date-fns'
import type { InteractionWithPerson, PersonWithTags } from '../types'

export interface MemoryItem {
  id: string
  personId: string
  personName: string
  date: string
  verb: string
  place?: string
  detail?: string
}

export function getMemoryPeriodLabel(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, 'EEEE')
  const weekAgo = subDays(new Date(), 7)
  if (isAfter(date, weekAgo)) return 'Last Week'
  return format(date, 'MMM d')
}

function interactionVerb(type: string | null): string {
  switch (type) {
    case 'phone_call':
      return 'Called'
    case 'video_call':
      return 'Video call with'
    case 'text':
      return 'Texted'
    case 'email':
      return 'Emailed'
    case 'meeting':
      return 'Met with'
    case 'event':
      return 'Saw'
    default:
      return 'Met'
  }
}

export function buildMemoryFeed(
  interactions: InteractionWithPerson[],
  recentPeople: PersonWithTags[],
): MemoryItem[] {
  const items: MemoryItem[] = []
  const seenPersonDate = new Set<string>()

  for (const i of interactions) {
    items.push({
      id: i.id,
      personId: i.personId,
      personName: i.personName,
      date: i.date,
      verb: interactionVerb(i.interactionType),
      place: i.location ?? undefined,
      detail: i.notes ?? i.event ?? undefined,
    })
    seenPersonDate.add(`${i.personId}-${i.date}`)
  }

  for (const p of recentPeople) {
    const date = p.dateMet ?? p.lastSeenDate ?? p.createdAt.slice(0, 10)
    const key = `${p.id}-${date}`
    if (seenPersonDate.has(key)) continue
    items.push({
      id: `person-${p.id}`,
      personId: p.id,
      personName: p.name,
      date,
      verb: 'Met',
      place: p.whereMetPlaceName || p.whereMet || p.event || undefined,
      detail: p.company ?? undefined,
    })
  }

  items.sort((a, b) => b.date.localeCompare(a.date))
  return items.slice(0, 20)
}

export function groupMemoryFeed(items: MemoryItem[]): { label: string; items: MemoryItem[] }[] {
  const groups = new Map<string, MemoryItem[]>()
  for (const item of items) {
    const label = getMemoryPeriodLabel(item.date)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(item)
  }
  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    label,
    items: groupItems,
  }))
}

export function filterTodayTrail(items: MemoryItem[]): MemoryItem[] {
  return items.filter((item) => isToday(parseISO(item.date)))
}
