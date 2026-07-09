import { describe, expect, it } from 'vitest'
import {
  formatEmailLocalPart,
  getEffectiveDisplayName,
  getHeaderLabel,
  getProfileInitials,
} from './profileDisplay'

describe('profileDisplay', () => {
  it('uses first name in the header when available', () => {
    expect(
      getHeaderLabel({
        firstName: 'Jonathan',
        lastName: 'Allison',
        displayName: null,
        email: 'jallison154@gmail.com',
      }),
    ).toBe('Jonathan')
  })

  it('uses full name in the header when only names exist', () => {
    expect(
      getHeaderLabel({
        firstName: null,
        lastName: null,
        displayName: 'Jonathan Allison',
        email: 'jallison154@gmail.com',
      }),
    ).toBe('Jonathan Allison')
  })

  it('formats email local part when no profile name exists', () => {
    expect(formatEmailLocalPart('jallison154@gmail.com')).toBe('Jallison154')
    expect(
      getHeaderLabel({
        firstName: null,
        lastName: null,
        displayName: null,
        email: 'jallison154@gmail.com',
      }),
    ).toBe('Jallison154')
  })

  it('prefers display name across the app', () => {
    expect(
      getEffectiveDisplayName({
        firstName: 'Jonathan',
        lastName: 'Allison',
        displayName: 'Jon',
        email: 'jallison154@gmail.com',
      }),
    ).toBe('Jon')
  })

  it('builds initials from first and last name', () => {
    expect(
      getProfileInitials({
        firstName: 'Greg',
        lastName: 'McCall',
        displayName: null,
        email: null,
      }),
    ).toBe('GM')
  })
})
