import { distanceKm } from '../../utils/geo'
import { MAPBOX_SEARCH_BASE, isMapboxConfigured, mapboxTokenOrThrow } from './config'
import { readNearbyCache, writeNearbyCache } from './nearbyCache'
import {
  getMapboxSearchSessionToken,
  resetMapboxSearchSession,
} from './session'
import type { MapboxPlaceResult } from './types'

const NEARBY_CATEGORIES = [
  'restaurant',
  'cafe',
  'bar',
  'hotel',
  'entertainment',
  'theater',
  'park',
  'school',
  'church',
  'store',
  'landmark',
  'sports',
  'community_center',
  'office',
] as const

interface SuggestFeature {
  mapbox_id?: string
  name?: string
  feature_type?: string
  address?: string
  full_address?: string
  place_formatted?: string
  distance?: number
  context?: {
    place?: { name?: string }
    region?: { name?: string; region_code?: string }
    postcode?: { name?: string }
    country?: { name?: string; country_code?: string }
  }
  poi_category?: string[]
  poi_category_ids?: string[]
  brand?: string[]
}

interface RetrieveFeature {
  type: string
  geometry?: { coordinates?: [number, number] }
  properties?: {
    mapbox_id?: string
    name?: string
    feature_type?: string
    address?: string
    full_address?: string
    place_formatted?: string
    context?: SuggestFeature['context']
    poi_category?: string[]
    poi_category_ids?: string[]
    brand?: string[]
  }
}

function contextValue(
  context: SuggestFeature['context'] | undefined,
  key: keyof NonNullable<SuggestFeature['context']>,
): string | null {
  const entry = context?.[key]
  if (!entry || typeof entry !== 'object') return null
  if ('name' in entry && entry.name) return entry.name
  return null
}

function mapSuggestToResult(suggestion: SuggestFeature): MapboxPlaceResult | null {
  if (!suggestion.mapbox_id || !suggestion.name) return null

  return {
    mapboxId: suggestion.mapbox_id,
    name: suggestion.name,
    featureType: suggestion.feature_type ?? 'poi',
    address: suggestion.address ?? null,
    fullAddress: suggestion.full_address ?? suggestion.place_formatted ?? null,
    city: contextValue(suggestion.context, 'place'),
    region: contextValue(suggestion.context, 'region'),
    postalCode: contextValue(suggestion.context, 'postcode'),
    country: contextValue(suggestion.context, 'country'),
    latitude: 0,
    longitude: 0,
    category: suggestion.poi_category?.[0] ?? suggestion.feature_type ?? null,
    poiCategories: suggestion.poi_category ?? suggestion.poi_category_ids ?? [],
    brand: suggestion.brand?.[0] ?? null,
    distanceMeters: suggestion.distance,
  }
}

function mapRetrieveFeature(feature: RetrieveFeature): MapboxPlaceResult | null {
  const coords = feature.geometry?.coordinates
  const props = feature.properties
  if (!coords || !props?.mapbox_id || !props.name) return null

  return {
    mapboxId: props.mapbox_id,
    name: props.name,
    featureType: props.feature_type ?? 'poi',
    address: props.address ?? null,
    fullAddress: props.full_address ?? props.place_formatted ?? null,
    city: contextValue(props.context, 'place'),
    region: contextValue(props.context, 'region'),
    postalCode: contextValue(props.context, 'postcode'),
    country: contextValue(props.context, 'country'),
    longitude: coords[0],
    latitude: coords[1],
    category: props.poi_category?.[0] ?? props.feature_type ?? null,
    poiCategories: props.poi_category ?? props.poi_category_ids ?? [],
    brand: props.brand?.[0] ?? null,
  }
}

function sortByDistance(
  results: MapboxPlaceResult[],
  latitude: number,
  longitude: number,
): MapboxPlaceResult[] {
  return [...results]
    .map((result) => {
      if (result.latitude && result.longitude) {
        const km = distanceKm(latitude, longitude, result.latitude, result.longitude)
        return { ...result, distanceMeters: result.distanceMeters ?? km * 1000 }
      }
      return result
    })
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
}

async function mapboxFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = mapboxTokenOrThrow()
  const search = new URLSearchParams({ ...params, access_token: token })
  const response = await fetch(`${MAPBOX_SEARCH_BASE}${path}?${search}`)

  if (!response.ok) {
    throw new Error('Map search is temporarily unavailable.')
  }

  return response.json() as Promise<T>
}

export async function suggestMapboxPlaces(
  query: string,
  proximity?: { latitude: number; longitude: number },
): Promise<MapboxPlaceResult[]> {
  if (!isMapboxConfigured()) return []

  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params: Record<string, string> = {
    q: trimmed,
    session_token: getMapboxSearchSessionToken(),
    language: 'en',
    limit: '8',
    types: 'poi,address,place,locality,neighborhood',
  }

  if (proximity) {
    params.proximity = `${proximity.longitude},${proximity.latitude}`
  }

  const data = await mapboxFetch<{ suggestions?: SuggestFeature[] }>('/suggest', params)
  return (data.suggestions ?? [])
    .map(mapSuggestToResult)
    .filter((result): result is MapboxPlaceResult => result != null)
}

export async function retrieveMapboxPlace(mapboxId: string): Promise<MapboxPlaceResult | null> {
  if (!isMapboxConfigured()) return null

  const data = await mapboxFetch<{ features?: RetrieveFeature[] }>(
    `/retrieve/${encodeURIComponent(mapboxId)}`,
    { session_token: getMapboxSearchSessionToken() },
  )

  resetMapboxSearchSession()

  const feature = data.features?.[0]
  if (!feature) return null
  return mapRetrieveFeature(feature)
}

async function fetchCategoryNearby(
  category: string,
  latitude: number,
  longitude: number,
  limit: number,
): Promise<MapboxPlaceResult[]> {
  const data = await mapboxFetch<{ features?: RetrieveFeature[] }>(
    `/category/${encodeURIComponent(category)}`,
    {
      proximity: `${longitude},${latitude}`,
      language: 'en',
      limit: String(limit),
    },
  )

  return (data.features ?? [])
    .map(mapRetrieveFeature)
    .filter((result): result is MapboxPlaceResult => result != null)
}

export async function fetchNearbyMapboxPois(
  latitude: number,
  longitude: number,
  limit = 20,
): Promise<MapboxPlaceResult[]> {
  if (!isMapboxConfigured()) return []

  const cached = readNearbyCache(latitude, longitude)
  if (cached) return cached.slice(0, limit)

  const perCategory = Math.max(3, Math.ceil(limit / 4))
  const batches = await Promise.all(
    NEARBY_CATEGORIES.map((category) =>
      fetchCategoryNearby(category, latitude, longitude, perCategory).catch(() => []),
    ),
  )

  const deduped = new Map<string, MapboxPlaceResult>()
  for (const batch of batches) {
    for (const result of batch) {
      if (!deduped.has(result.mapboxId)) {
        deduped.set(result.mapboxId, result)
      }
    }
  }

  const sorted = sortByDistance([...deduped.values()], latitude, longitude).slice(0, limit)
  writeNearbyCache(latitude, longitude, sorted)
  return sorted
}

export async function selectMapboxSuggestion(
  suggestion: MapboxPlaceResult,
): Promise<MapboxPlaceResult> {
  if (suggestion.latitude && suggestion.longitude) {
    resetMapboxSearchSession()
    return suggestion
  }

  const retrieved = await retrieveMapboxPlace(suggestion.mapboxId)
  if (!retrieved) {
    throw new Error('Could not load the selected place.')
  }
  return retrieved
}
