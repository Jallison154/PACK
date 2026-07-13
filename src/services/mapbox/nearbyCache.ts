import type { MapboxPlaceResult } from './types'

interface CacheEntry {
  key: string
  fetchedAt: number
  results: MapboxPlaceResult[]
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cache: CacheEntry | null = null

/** Round to ~100 m grid for brief nearby-result caching. */
export function nearbyCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`
}

export function readNearbyCache(
  latitude: number,
  longitude: number,
): MapboxPlaceResult[] | null {
  if (!cache) return null
  const key = nearbyCacheKey(latitude, longitude)
  if (cache.key !== key) return null
  if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) return null
  return cache.results
}

export function writeNearbyCache(
  latitude: number,
  longitude: number,
  results: MapboxPlaceResult[],
): void {
  cache = {
    key: nearbyCacheKey(latitude, longitude),
    fetchedAt: Date.now(),
    results,
  }
}

export function clearNearbyCache(): void {
  cache = null
}
