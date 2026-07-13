import { describe, expect, it } from 'vitest'
import { applyQuickCaptureNameChange } from './quickCaptureName'

describe('applyQuickCaptureNameChange', () => {
  it('preserves every character when typing Jonathan', () => {
    let name = ''
    let expanded = false

    for (const character of 'Jonathan') {
      const next = applyQuickCaptureNameChange(name + character, expanded)
      name = next.name
      expanded = next.expanded
    }

    expect(name).toBe('Jonathan')
    expect(expanded).toBe(true)
  })

  it('never drops the first letter when expanding from collapsed', () => {
    const result = applyQuickCaptureNameChange('J', false)
    expect(result.name).toBe('J')
    expect(result.expanded).toBe(true)
  })

  it('keeps the full value when already expanded', () => {
    const result = applyQuickCaptureNameChange('Jonathan', true)
    expect(result.name).toBe('Jonathan')
    expect(result.expanded).toBe(true)
  })

  it('starts clean after reset semantics (empty value)', () => {
    const result = applyQuickCaptureNameChange('', false)
    expect(result.name).toBe('')
    expect(result.expanded).toBe(false)
  })
})
