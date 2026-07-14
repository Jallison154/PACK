/**
 * Single source of truth for Mapbox client token + style.
 * Do not read VITE_MAPBOX_ACCESS_TOKEN elsewhere.
 */
export const mapboxToken =
  (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined)?.trim() ?? ''

export const mapboxConfigured =
  mapboxToken.startsWith('pk.') && mapboxToken.length > 20

export const MAP_PROVIDER_REQUESTED = 'Mapbox' as const
export const ACTIVE_MAP_COMPONENT = 'PackMap' as const
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11'
export const MAPBOX_SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1'
export const MAPBOX_GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

/** Default center — continental US when no GPS or saved places. */
export const MAPBOX_DEFAULT_CENTER = { longitude: -98.5795, latitude: 39.8283, zoom: 4 }
export const MAPBOX_USER_ZOOM = 15

export function isMapboxConfigured(): boolean {
  return mapboxConfigured
}

export function mapboxTokenOrThrow(): string {
  if (!mapboxConfigured) {
    throw new Error('Mapbox is not configured.')
  }
  return mapboxToken
}

export function getMapboxTokenPrefixValid(): boolean {
  return mapboxToken.length > 0 && mapboxToken.startsWith('pk.')
}

export function getMapboxTokenLength(): number {
  return mapboxToken.length
}

export function describeMapboxTokenState():
  | 'configured'
  | 'token_missing'
  | 'token_malformed' {
  if (!mapboxToken) return 'token_missing'
  if (!mapboxToken.startsWith('pk.') || mapboxToken.length <= 20) return 'token_malformed'
  return 'configured'
}
