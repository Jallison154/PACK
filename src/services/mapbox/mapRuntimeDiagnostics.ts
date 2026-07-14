import {
  ACTIVE_MAP_COMPONENT,
  MAPBOX_STYLE,
  MAP_PROVIDER_REQUESTED,
  describeMapboxTokenState,
  getMapboxTokenLength,
  getMapboxTokenPrefixValid,
  mapboxConfigured,
} from './config'

export type MapboxErrorCategory =
  | 'none'
  | 'token_missing'
  | 'token_malformed'
  | 'token_unauthorized'
  | 'url_restriction'
  | 'style_not_found'
  | 'webgl_unavailable'
  | 'csp_blocked'
  | 'network_failure'
  | 'constructor_error'
  | 'map_error'
  | 'unknown'

export type MapHttpStatusCategory = 'none' | '200' | '401' | '403' | '404' | 'other'

export interface MapRuntimeDiagnostics {
  mapProviderRequested: typeof MAP_PROVIDER_REQUESTED
  mapboxGlJsInstalled: boolean
  mapboxTokenConfigured: boolean
  tokenPrefixValid: boolean
  tokenLength: number
  tokenState: ReturnType<typeof describeMapboxTokenState>
  activeMapComponentName: typeof ACTIVE_MAP_COMPONENT
  mapStyleUrl: string
  mapInitialized: boolean
  mapLoadEventFired: boolean
  lastMapboxError: string | null
  lastErrorCategory: MapboxErrorCategory
  lastHttpStatusCategory: MapHttpStatusCategory
  lastFailedResource: string | null
  appBuildVersion: string
  buildId: string
}

type Listener = () => void

const listeners = new Set<Listener>()

let mapboxGlJsInstalled = false

const baseState: MapRuntimeDiagnostics = {
  mapProviderRequested: MAP_PROVIDER_REQUESTED,
  mapboxGlJsInstalled: false,
  mapboxTokenConfigured: mapboxConfigured,
  tokenPrefixValid: getMapboxTokenPrefixValid(),
  tokenLength: getMapboxTokenLength(),
  tokenState: describeMapboxTokenState(),
  activeMapComponentName: ACTIVE_MAP_COMPONENT,
  mapStyleUrl: MAPBOX_STYLE,
  mapInitialized: false,
  mapLoadEventFired: false,
  lastMapboxError: null,
  lastErrorCategory: 'none',
  lastHttpStatusCategory: 'none',
  lastFailedResource: null,
  appBuildVersion: `${__APP_VERSION__} (${__BUILD_TIME__})`,
  buildId: typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : __BUILD_TIME__,
}

/** Stable snapshot for useSyncExternalStore — must keep identity until an emit. */
let snapshot: MapRuntimeDiagnostics = baseState
let state: MapRuntimeDiagnostics = baseState

function rebuildSnapshot(): MapRuntimeDiagnostics {
  return {
    ...state,
    mapboxTokenConfigured: mapboxConfigured,
    tokenPrefixValid: getMapboxTokenPrefixValid(),
    tokenLength: getMapboxTokenLength(),
    tokenState: describeMapboxTokenState(),
    mapboxGlJsInstalled,
  }
}

function emit() {
  snapshot = rebuildSnapshot()
  state = snapshot
  for (const listener of listeners) listener()
}

function sanitizeResourceUrl(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://pack.local')
    parsed.searchParams.delete('access_token')
    parsed.searchParams.delete('token')
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.replace(/access_token=[^&]+/gi, 'access_token=REDACTED')
  }
}

export function categorizeMapboxError(input: {
  message?: string
  status?: number
  url?: string | null
}): MapboxErrorCategory {
  const message = (input.message ?? '').toLowerCase()
  const status = input.status

  if (status === 401 || message.includes('unauthorized') || message.includes('not authorized')) {
    return 'token_unauthorized'
  }
  if (status === 403 || (message.includes('url') && message.includes('restrict'))) {
    return 'url_restriction'
  }
  if (status === 404 || (message.includes('style') && message.includes('not found'))) {
    return 'style_not_found'
  }
  if (message.includes('webgl') || message.includes('failed to create webgl')) {
    return 'webgl_unavailable'
  }
  if (message.includes('content security policy') || message.includes('csp')) {
    return 'csp_blocked'
  }
  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('offline') ||
    message.includes('network')
  ) {
    return 'network_failure'
  }
  if (message.includes('token') && (message.includes('missing') || message.includes('required'))) {
    return 'token_missing'
  }
  if (message.includes('token') && message.includes('invalid')) {
    return 'token_malformed'
  }
  if (message.includes('constructor')) {
    return 'constructor_error'
  }
  return 'map_error'
}

export function httpStatusCategory(status?: number): MapHttpStatusCategory {
  if (status == null) return 'none'
  if (status === 200) return '200'
  if (status === 401) return '401'
  if (status === 403) return '403'
  if (status === 404) return '404'
  return 'other'
}

export function getMapRuntimeDiagnostics(): MapRuntimeDiagnostics {
  return snapshot
}

export function subscribeMapRuntimeDiagnostics(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function markMapboxGlInstalled(installed: boolean) {
  mapboxGlJsInstalled = installed
  state = { ...state, mapboxGlJsInstalled: installed }
  emit()
}

export function markMapInitialized(componentName: typeof ACTIVE_MAP_COMPONENT = ACTIVE_MAP_COMPONENT) {
  state = {
    ...state,
    activeMapComponentName: componentName,
    mapInitialized: true,
  }
  emit()
}

export function markMapLoadFired() {
  state = {
    ...state,
    mapLoadEventFired: true,
  }
  emit()
}

export function recordMapboxRuntimeError(input: {
  message: string
  category?: MapboxErrorCategory
  status?: number
  url?: string | null
}) {
  const category = input.category ?? categorizeMapboxError(input)
  state = {
    ...state,
    lastMapboxError: input.message,
    lastErrorCategory: category,
    lastHttpStatusCategory: httpStatusCategory(input.status),
    lastFailedResource: sanitizeResourceUrl(input.url),
  }
  emit()
}

export function recordMapboxHttpStatus(status: number, url?: string | null) {
  state = {
    ...state,
    lastHttpStatusCategory: httpStatusCategory(status),
    lastFailedResource: status >= 400 ? sanitizeResourceUrl(url) : state.lastFailedResource,
  }
  if (status >= 400) {
    recordMapboxRuntimeError({
      message: `Mapbox request failed with HTTP ${status}`,
      status,
      url,
    })
    return
  }
  emit()
}

export function clearMapboxRuntimeError() {
  state = {
    ...state,
    lastMapboxError: null,
    lastErrorCategory: 'none',
    lastFailedResource: null,
  }
  emit()
}

export function resetMapSessionFlags() {
  state = {
    ...state,
    mapInitialized: false,
    mapLoadEventFired: false,
  }
  emit()
}
