import { getInitials } from './colors'
import type { PackUserProfile } from '../types/profile'

function titleCaseWord(word: string): string {
  if (!word) return ''
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/** Turn `jallison154` into `Jallison154` for a friendlier fallback label. */
export function formatEmailLocalPart(email: string | null | undefined): string {
  if (!email) return 'Friend'
  const local = email.split('@')[0]?.trim()
  if (!local) return 'Friend'

  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return parts.map(titleCaseWord).join(' ')
  }

  const alpha = local.replace(/\d+$/, '')
  const digits = local.slice(alpha.length)
  if (alpha) {
    return `${titleCaseWord(alpha)}${digits}`
  }

  return titleCaseWord(local)
}

export function getFullName(profile: Pick<PackUserProfile, 'firstName' | 'lastName'>): string | null {
  const full = [profile.firstName?.trim(), profile.lastName?.trim()].filter(Boolean).join(' ')
  return full || null
}

/** Preferred name used across the app (greeting, cards, etc.). */
export function getEffectiveDisplayName(
  profile: Pick<PackUserProfile, 'firstName' | 'lastName' | 'displayName' | 'email'>,
): string {
  if (profile.displayName?.trim()) return profile.displayName.trim()

  const fullName = getFullName(profile)
  if (fullName) return fullName

  return formatEmailLocalPart(profile.email)
}

/** Short label for the navigation header — never the full email. */
export function getHeaderLabel(
  profile: Pick<PackUserProfile, 'firstName' | 'lastName' | 'displayName' | 'email'>,
): string {
  if (profile.displayName?.trim()) return profile.displayName.trim()
  if (profile.firstName?.trim()) return profile.firstName.trim()

  const fullName = getFullName(profile)
  if (fullName) {
    const firstWord = fullName.split(/\s+/)[0]
    if (firstWord) return firstWord
  }

  return formatEmailLocalPart(profile.email)
}

export function getProfileInitials(
  profile: Pick<PackUserProfile, 'firstName' | 'lastName' | 'displayName' | 'email'>,
): string {
  const fullName = getFullName(profile)
  if (fullName) return getInitials(fullName)

  if (profile.displayName?.trim()) return getInitials(profile.displayName)

  const emailName = formatEmailLocalPart(profile.email)
  return getInitials(emailName) || '?'
}

export function hasPersonalProfile(
  profile: Pick<PackUserProfile, 'firstName' | 'lastName' | 'displayName'>,
): boolean {
  return Boolean(
    profile.firstName?.trim() || profile.lastName?.trim() || profile.displayName?.trim(),
  )
}

export function getDropdownFullName(
  profile: Pick<PackUserProfile, 'firstName' | 'lastName' | 'displayName' | 'email'>,
): string {
  const fullName = getFullName(profile)
  if (fullName) return fullName

  if (profile.displayName?.trim()) return profile.displayName.trim()

  return formatEmailLocalPart(profile.email)
}
