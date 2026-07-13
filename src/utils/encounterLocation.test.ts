import { describe, expect, it } from 'vitest'
import {
  encounterLocationToPersonFields,
  formatWhereMetDisplay,
  personToEncounterLocation,
} from './encounterLocation'

describe('encounterLocationToPersonFields', () => {
  it('stores approximate GPS without creating a place or fake label', () => {
    const fields = encounterLocationToPersonFields({
      kind: 'approximate',
      latitude: 45.7833,
      longitude: -108.5007,
      accuracy: 35,
      capturedAt: '2026-07-13T12:00:00.000Z',
      source: 'gps',
      label: 'Billings, MT',
    })

    expect(fields.whereMetPlaceId).toBeNull()
    expect(fields.whereMet).toBeUndefined()
    expect(fields.whereMetIsApproximate).toBe(true)
    expect(fields.whereMetLatitude).toBe(45.7833)
    expect(fields.whereMetLongitude).toBe(-108.5007)
    expect(fields.whereMetLocationSource).toBe('gps')
    expect(fields.whereMetAreaLabel).toBe('Billings, MT')
  })

  it('stores exact place selections with place id', () => {
    const fields = encounterLocationToPersonFields({
      kind: 'exact',
      placeId: 'place-1',
      placeName: 'Pub Station',
      source: 'saved_place',
    })

    expect(fields.whereMetPlaceId).toBe('place-1')
    expect(fields.whereMet).toBe('Pub Station')
    expect(fields.whereMetIsApproximate).toBe(false)
  })
})

describe('formatWhereMetDisplay', () => {
  it('shows a broad area for approximate captures', () => {
    const label = formatWhereMetDisplay(
      {
        whereMet: null,
        event: null,
        whereMetIsApproximate: true,
        whereMetAreaLabel: 'Billings, MT',
        whereMetPlaceId: null,
      },
      null,
    )

    expect(label).toBe('Near Billings, MT')
  })

  it('shows exact place names when a place is linked', () => {
    const label = formatWhereMetDisplay(
      {
        whereMet: null,
        event: null,
        whereMetIsApproximate: false,
        whereMetAreaLabel: null,
        whereMetPlaceId: 'place-1',
      },
      'Pub Station',
    )

    expect(label).toBe('Pub Station')
  })
})

describe('personToEncounterLocation', () => {
  it('round-trips approximate GPS from stored person fields', () => {
    const location = personToEncounterLocation({
      id: 'p1',
      name: 'Ada',
      workspace: 'work',
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
      whereMetLatitude: 45.78,
      whereMetLongitude: -108.5,
      whereMetLocationSource: 'gps',
      whereMetLocationAccuracy: 40,
      whereMetCapturedAt: '2026-07-13T12:00:00.000Z',
      whereMetIsApproximate: true,
      whereMetAreaLabel: 'Billings, MT',
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
      profileColor: '#52525B',
      isFavorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      syncVersion: 1,
      deletedAt: null,
    })

    expect(location).toEqual({
      kind: 'approximate',
      latitude: 45.78,
      longitude: -108.5,
      accuracy: 40,
      capturedAt: '2026-07-13T12:00:00.000Z',
      source: 'gps',
      label: 'Billings, MT',
    })
  })
})
