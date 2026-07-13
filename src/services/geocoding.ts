import { MAPBOX_GEOCODING_BASE, isMapboxConfigured, mapboxTokenOrThrow } from './mapbox/config'
import type { MapboxPlaceResult } from './mapbox/types'

/** Shared shape for Mapbox search/geocode results used across the app. */
export interface GeocodeResult {
  mapboxId: string
  name: string
  displayName: string
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  latitude: number
  longitude: number
  featureType: string | null
  poiCategories: string[]
  brand: string | null
}

/** @deprecated Use mapboxId */
export type GeocodeResultLegacy = GeocodeResult & { osmId?: string }

export function geocodeResultFromMapbox(result: MapboxPlaceResult): GeocodeResult {
  return {
    mapboxId: result.mapboxId,
    name: result.name,
    displayName: result.fullAddress ?? result.address ?? result.name,
    address: result.address,
    city: result.city,
    state: result.region,
    postalCode: result.postalCode,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
    featureType: result.featureType,
    poiCategories: result.poiCategories,
    brand: result.brand,
  }
}

interface MapboxGeocodeFeature {
  id: string
  place_name: string
  text: string
  place_type?: string[]
  address?: string
  center: [number, number]
  context?: Array<{ id: string; text: string; short_code?: string }>
  properties?: { category?: string }
}

function contextText(feature: MapboxGeocodeFeature, prefix: string): string | null {
  const match = feature.context?.find((item) => item.id.startsWith(prefix))
  return match?.text ?? null
}

function mapGeocodeFeature(feature: MapboxGeocodeFeature): GeocodeResult {
  return {
    mapboxId: feature.id,
    name: feature.text || feature.place_name.split(',')[0]?.trim() || 'Place',
    displayName: feature.place_name,
    address: feature.address ?? null,
    city: contextText(feature, 'place.') ?? contextText(feature, 'locality.'),
    state: contextText(feature, 'region.'),
    postalCode: contextText(feature, 'postcode.'),
    country: contextText(feature, 'country.'),
    longitude: feature.center[0],
    latitude: feature.center[1],
    featureType: feature.place_type?.[0] ?? null,
    poiCategories: feature.properties?.category ? [feature.properties.category] : [],
    brand: null,
  }
}

export async function searchPlacesMapbox(
  query: string,
  proximity?: { latitude: number; longitude: number },
): Promise<GeocodeResult[]> {
  if (!isMapboxConfigured()) return []

  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const token = mapboxTokenOrThrow()
  const params = new URLSearchParams({
    access_token: token,
    autocomplete: 'true',
    limit: '8',
    types: 'poi,address,place,locality,neighborhood',
    language: 'en',
  })

  if (proximity) {
    params.set('proximity', `${proximity.longitude},${proximity.latitude}`)
  }

  const response = await fetch(
    `${MAPBOX_GEOCODING_BASE}/${encodeURIComponent(trimmed)}.json?${params}`,
  )

  if (!response.ok) {
    throw new Error('Place search is temporarily unavailable.')
  }

  const data = (await response.json()) as { features?: MapboxGeocodeFeature[] }
  return (data.features ?? []).map(mapGeocodeFeature)
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodeResult | null> {
  if (!isMapboxConfigured()) return null

  const token = mapboxTokenOrThrow()
  const params = new URLSearchParams({
    access_token: token,
    types: 'poi,address,place,locality,neighborhood',
    language: 'en',
    limit: '1',
  })

  const response = await fetch(
    `${MAPBOX_GEOCODING_BASE}/${longitude},${latitude}.json?${params}`,
  )

  if (!response.ok) return null

  const data = (await response.json()) as { features?: MapboxGeocodeFeature[] }
  const feature = data.features?.[0]
  if (!feature) return null
  return mapGeocodeFeature(feature)
}

/** @deprecated Use searchPlacesMapbox */
export const searchPlacesNominatim = searchPlacesMapbox
