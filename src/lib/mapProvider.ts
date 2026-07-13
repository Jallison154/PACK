import { isMapboxAvailable } from './env'

export const MAP_PROVIDER = 'Mapbox' as const

export interface MapDiagnostics {
  mapProvider: typeof MAP_PROVIDER
  mapboxConfigured: boolean
}

export function getMapDiagnostics(): MapDiagnostics {
  return {
    mapProvider: MAP_PROVIDER,
    mapboxConfigured: isMapboxAvailable(),
  }
}

let mapStartupLogged = false

/** Development-only — never logs the token. */
export function logMapProviderStartupCheck(): void {
  if (!import.meta.env.DEV || mapStartupLogged) return
  mapStartupLogged = true

  const { mapboxConfigured } = getMapDiagnostics()
  console.info('[Pack Map] Map provider: Mapbox')
  console.info('[Pack Map] Mapbox configured:', mapboxConfigured)
}
