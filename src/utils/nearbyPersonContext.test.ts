import { describe, expect, it } from 'vitest'
import {
  buildNearbyContextLabel,
  nearbyEventName,
  nearbyOccurredAt,
} from './nearbyPersonContext'
import type { PersonWithTags } from '../types'

function person(overrides: Partial<PersonWithTags> = {}): PersonWithTags {
  return {
    id: 'p1',
    name: 'Alex',
    workspace: 'personal',
    phone: null,
    email: null,
    company: null,
    companyId: null,
    jobTitle: null,
    whereMet: null,
    event: null,
    city: null,
    state: null,
    locationId: null,
    whereMetPlaceId: null,
    whereMetLatitude: null,
    whereMetLongitude: null,
    whereMetLocationSource: null,
    whereMetLocationAccuracy: null,
    whereMetCapturedAt: null,
    whereMetIsApproximate: false,
    whereMetAreaLabel: null,
    lastSeenPlaceId: null,
    dateMet: null,
    notes: null,
    relationshipType: null,
    householdId: null,
    homeAddress: null,
    workLocation: null,
    lastSeenAt: null,
    lastSeenDate: null,
    lastInteractionNotes: null,
    profileColor: '#000',
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    syncVersion: 1,
    deletedAt: null,
    tags: [],
    ...overrides,
  }
}

describe('nearbyPersonContext', () => {
  it('prefers person event, then interaction event', () => {
    expect(nearbyEventName(person({ event: 'SXSW' }), 'Mixer')).toBe('SXSW')
    expect(nearbyEventName(person(), 'Mixer')).toBe('Mixer')
    expect(nearbyEventName(person(), null)).toBeNull()
  })

  it('picks occurred-at by match kind', () => {
    const p = person({
      dateMet: '2025-06-01',
      lastSeenDate: '2026-01-15',
      whereMetCapturedAt: '2025-06-02T12:00:00.000Z',
    })
    expect(nearbyOccurredAt(p, 'met_at_place', '2026-02-01')).toBe('2025-06-01')
    expect(nearbyOccurredAt(p, 'last_seen_at_place', '2026-02-01')).toBe('2026-02-01')
    expect(nearbyOccurredAt(p, 'last_seen_at_place')).toBe('2026-01-15')
    expect(nearbyOccurredAt(p, 'approximate_gps')).toBe('2025-06-01')
  })

  it('builds label with place, event, and relative time', () => {
    const label = buildNearbyContextLabel({
      matchKind: 'met_at_place',
      placeName: 'Pub Station',
      eventName: 'SXSW',
      occurredAt: '2020-01-01',
    })
    expect(label.startsWith('Met at Pub Station · SXSW ·')).toBe(true)
    expect(label.includes('ago')).toBe(true)
  })
})
