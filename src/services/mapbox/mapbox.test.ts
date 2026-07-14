import { describe, expect, it } from 'vitest'
import { nearbyCacheKey } from './nearbyCache'
import { categorizeMapboxError, httpStatusCategory } from './mapRuntimeDiagnostics'

describe('nearbyCacheKey', () => {
  it('rounds coordinates for brief cache reuse', () => {
    expect(nearbyCacheKey(45.78331, -108.50071)).toBe('45.783,-108.501')
    expect(nearbyCacheKey(45.78339, -108.50079)).toBe('45.783,-108.501')
  })
})

describe('mapbox place dedup key', () => {
  it('normalizes names for duplicate detection', () => {
    const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')
    expect(normalize('  Pub   Station ')).toBe('pub station')
  })
})

describe('mapbox error categorization', () => {
  it('detects unauthorized tokens', () => {
    expect(categorizeMapboxError({ status: 401, message: 'Unauthorized' })).toBe('token_unauthorized')
  })

  it('detects style and network failures', () => {
    expect(categorizeMapboxError({ status: 404, message: 'style not found' })).toBe('style_not_found')
    expect(categorizeMapboxError({ message: 'Failed to fetch' })).toBe('network_failure')
    expect(categorizeMapboxError({ message: 'Failed to initialize WebGL' })).toBe('webgl_unavailable')
  })

  it('maps HTTP status categories', () => {
    expect(httpStatusCategory(200)).toBe('200')
    expect(httpStatusCategory(403)).toBe('403')
    expect(httpStatusCategory(500)).toBe('other')
  })
})
