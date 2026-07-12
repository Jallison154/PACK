import { describe, expect, it } from 'vitest'
import { getGreeting } from './greeting'

describe('getGreeting', () => {
  it('includes the display name when provided', () => {
    expect(getGreeting('Jonathan')).toMatch(/Jonathan$/)
  })

  it('falls back to a time-based greeting without a name', () => {
    expect(getGreeting()).toMatch(/Good Morning|Good Afternoon|Good Evening|Welcome back/)
  })
})
