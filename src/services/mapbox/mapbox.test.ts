import { describe, expect, it } from 'vitest'
import { nearbyCacheKey } from './nearbyCache'

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
