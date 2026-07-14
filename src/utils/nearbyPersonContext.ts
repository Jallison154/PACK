import type { PersonWithTags } from '../types'
import { formatRelative } from './format'

export type NearbyPersonMatchKind = 'met_at_place' | 'last_seen_at_place' | 'approximate_gps'

/** Best date for “how long ago” on a Near You match. */
export function nearbyOccurredAt(
  person: PersonWithTags,
  matchKind: NearbyPersonMatchKind,
  interactionDate?: string | null,
): string | null {
  if (matchKind === 'last_seen_at_place') {
    return interactionDate || person.lastSeenDate || person.dateMet || person.createdAt || null
  }
  if (matchKind === 'met_at_place') {
    return person.dateMet || person.whereMetCapturedAt || interactionDate || person.createdAt || null
  }
  return (
    person.dateMet ||
    person.whereMetCapturedAt ||
    person.lastSeenDate ||
    person.createdAt ||
    null
  )
}

export function nearbyEventName(
  person: PersonWithTags,
  interactionEvent?: string | null,
): string | null {
  const fromPerson = person.event?.trim()
  if (fromPerson) return fromPerson
  const fromInteraction = interactionEvent?.trim()
  return fromInteraction || null
}

export function buildNearbyContextLabel(input: {
  matchKind: NearbyPersonMatchKind
  placeName?: string | null
  areaLabel?: string | null
  eventName?: string | null
  occurredAt?: string | null
}): string {
  const { matchKind, placeName, areaLabel, eventName, occurredAt } = input

  let placePart: string
  if (matchKind === 'met_at_place' && placeName) {
    placePart = `Met at ${placeName}`
  } else if (matchKind === 'last_seen_at_place' && placeName) {
    placePart = `Last seen at ${placeName}`
  } else if (areaLabel) {
    placePart = `Met near ${areaLabel}`
  } else {
    placePart = 'Met nearby'
  }

  const parts = [placePart]
  if (eventName) parts.push(eventName)
  const relative = formatRelative(occurredAt)
  if (relative) parts.push(relative)
  return parts.join(' · ')
}
