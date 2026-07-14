import {
  ACTIVE_MAP_COMPONENT,
  MAP_PROVIDER_REQUESTED,
  mapboxConfigured,
} from '../services/mapbox/config'
import { getMapRuntimeDiagnostics } from '../services/mapbox/mapRuntimeDiagnostics'

export const MAP_PROVIDER = MAP_PROVIDER_REQUESTED

export interface MapDiagnostics {
  mapProvider: typeof MAP_PROVIDER_REQUESTED
  mapboxConfigured: boolean
  activeMapComponent: typeof ACTIVE_MAP_COMPONENT
}

export function getMapDiagnostics(): MapDiagnostics {
  return {
    mapProvider: MAP_PROVIDER_REQUESTED,
    mapboxConfigured,
    activeMapComponent: ACTIVE_MAP_COMPONENT,
  }
}

let mapStartupLogged = false

/** Development-only — never logs the token. */
export function logMapProviderStartupCheck(): void {
  if (!import.meta.env.DEV || mapStartupLogged) return
  mapStartupLogged = true

  const runtime = getMapRuntimeDiagnostics()
  console.info('Map provider: Mapbox')
  console.info('Mapbox configured:', mapboxConfigured)
  console.info('Active map component: PackMap')
  console.info('[Pack Map] token length:', runtime.tokenLength)
  console.info('[Pack Map] token prefix valid:', runtime.tokenPrefixValid)
}
