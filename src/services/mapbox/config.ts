import { getMapboxAccessToken } from '../../lib/env'

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11'
export const MAPBOX_SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1'
export const MAPBOX_GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

export function isMapboxConfigured(): boolean {
  return Boolean(getMapboxAccessToken())
}

export function mapboxTokenOrThrow(): string {
  const token = getMapboxAccessToken()
  if (!token) {
    throw new Error('Mapbox is not configured.')
  }
  return token
}

/** Default center — continental US when no GPS or saved places. */
export const MAPBOX_DEFAULT_CENTER = { longitude: -98.5795, latitude: 39.8283, zoom: 4 }
export const MAPBOX_USER_ZOOM = 15
