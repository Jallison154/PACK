import type { GeocodeResult } from '../services/geocoding'
import type { EncounterLocation, Person, PersonInput } from '../types'

export function formatApproximateAreaLabel(geocode: GeocodeResult | null): string | null {
  if (!geocode) return null

  const city = geocode.city?.trim()
  const state = geocode.state?.trim()
  const street = geocode.address?.trim()

  if (street && city) return `Near ${street}, ${city}`
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (geocode.name && geocode.name !== 'Place') return geocode.name

  return null
}

export function formatWhereMetDisplay(
  person: Pick<
    Person,
    | 'whereMet'
    | 'event'
    | 'whereMetIsApproximate'
    | 'whereMetAreaLabel'
    | 'whereMetPlaceId'
  >,
  whereMetPlaceName?: string | null,
): string | null {
  if (person.whereMetPlaceId && whereMetPlaceName) {
    return whereMetPlaceName
  }

  if (person.whereMetIsApproximate) {
    if (person.whereMetAreaLabel) return `Near ${person.whereMetAreaLabel}`
    return 'Current location captured'
  }

  return person.whereMet || person.event || null
}

export function formatEncounterLocationStatus(location: EncounterLocation | null): string | null {
  if (!location) return null

  if (location.kind === 'exact') {
    return 'Exact place selected'
  }

  if (location.label) {
    return `Using your current location · ${location.label}`
  }

  if (location.accuracy != null) {
    return `Current location · accuracy ${Math.round(location.accuracy)} m`
  }

  return 'Using your current location'
}

export function encounterLocationToPersonFields(
  location: EncounterLocation | null,
): Pick<
  PersonInput,
  | 'whereMet'
  | 'whereMetPlaceId'
  | 'whereMetLatitude'
  | 'whereMetLongitude'
  | 'whereMetLocationSource'
  | 'whereMetLocationAccuracy'
  | 'whereMetCapturedAt'
  | 'whereMetIsApproximate'
  | 'whereMetAreaLabel'
> {
  if (!location) {
    return {
      whereMet: undefined,
      whereMetPlaceId: null,
      whereMetLatitude: null,
      whereMetLongitude: null,
      whereMetLocationSource: null,
      whereMetLocationAccuracy: null,
      whereMetCapturedAt: null,
      whereMetIsApproximate: false,
      whereMetAreaLabel: null,
    }
  }

  if (location.kind === 'exact') {
    return {
      whereMet: location.placeName,
      whereMetPlaceId: location.placeId,
      whereMetLatitude: location.latitude ?? null,
      whereMetLongitude: location.longitude ?? null,
      whereMetLocationSource: location.source,
      whereMetLocationAccuracy: null,
      whereMetCapturedAt: null,
      whereMetIsApproximate: false,
      whereMetAreaLabel: null,
    }
  }

  return {
    whereMet: undefined,
    whereMetPlaceId: null,
    whereMetLatitude: location.latitude,
    whereMetLongitude: location.longitude,
    whereMetLocationSource: location.source,
    whereMetLocationAccuracy: location.accuracy ?? null,
    whereMetCapturedAt: location.capturedAt,
    whereMetIsApproximate: true,
    whereMetAreaLabel: location.label ?? null,
  }
}

export function personToEncounterLocation(
  person: Person,
  whereMetPlaceName?: string | null,
): EncounterLocation | null {
  if (person.whereMetPlaceId) {
    return {
      kind: 'exact',
      placeId: person.whereMetPlaceId,
      placeName: whereMetPlaceName || person.whereMet || 'Selected place',
      latitude: person.whereMetLatitude ?? undefined,
      longitude: person.whereMetLongitude ?? undefined,
      source: person.whereMetLocationSource === 'search_result' ? 'search_result' : 'saved_place',
    }
  }

  if (
    person.whereMetIsApproximate &&
    person.whereMetLatitude != null &&
    person.whereMetLongitude != null
  ) {
    return {
      kind: 'approximate',
      latitude: person.whereMetLatitude,
      longitude: person.whereMetLongitude,
      accuracy: person.whereMetLocationAccuracy ?? undefined,
      capturedAt: person.whereMetCapturedAt ?? person.createdAt,
      source: 'gps',
      label: person.whereMetAreaLabel ?? undefined,
    }
  }

  return null
}
