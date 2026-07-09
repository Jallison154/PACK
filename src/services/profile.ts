import { getSupabase } from '../lib/supabase'
import type { PackUserProfile, PackUserProfileInput } from '../types/profile'
import { EMPTY_PROFILE } from '../types/profile'

const LOCAL_PROFILE_KEY = 'pack_user_profile'

function rowToProfile(row: Record<string, unknown>): PackUserProfile {
  return {
    id: (row.id as string) ?? undefined,
    email: (row.email as string) ?? null,
    firstName: (row.first_name as string) ?? null,
    lastName: (row.last_name as string) ?? null,
    displayName: (row.display_name as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  }
}

function readLocalProfile(): PackUserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PackUserProfile
  } catch {
    return null
  }
}

function writeLocalProfile(profile: PackUserProfile): void {
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile))
}

export async function fetchCloudProfile(userId: string, email: string | null): Promise<PackUserProfile> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ...EMPTY_PROFILE, email }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return { ...EMPTY_PROFILE, id: userId, email }
  }

  return rowToProfile(data as Record<string, unknown>)
}

function isMissingProfileColumnError(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? ''
  return (
    error.code === 'PGRST204' ||
    /column.*does not exist/i.test(message) ||
    /Could not find the '.*' column of 'profiles'/i.test(message)
  )
}

function buildLegacyDisplayName(input: PackUserProfileInput): string | null {
  if (input.displayName?.trim()) return input.displayName.trim()
  const full = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(' ')
  return full || null
}

export async function updateCloudProfile(
  userId: string,
  input: PackUserProfileInput,
): Promise<PackUserProfile> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Cloud profile is not available.')

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (input.firstName !== undefined) payload.first_name = input.firstName.trim() || null
  if (input.lastName !== undefined) payload.last_name = input.lastName.trim() || null
  if (input.displayName !== undefined) payload.display_name = input.displayName.trim() || null

  let { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error && isMissingProfileColumnError(error)) {
    const legacyName = buildLegacyDisplayName(input)
    const legacyPayload: Record<string, string | null> = {
      id: userId,
      updated_at: new Date().toISOString(),
    }
    if (legacyName) legacyPayload.display_name = legacyName

    const retry = await supabase
      .from('profiles')
      .upsert(legacyPayload, { onConflict: 'id' })
      .select('*')
      .single()

    data = retry.data
    error = retry.error
  }

  if (error) throw error
  return rowToProfile(data as Record<string, unknown>)
}

export function loadLocalProfile(email: string | null): PackUserProfile {
  const stored = readLocalProfile()
  if (stored) {
    return { ...stored, email: email ?? stored.email }
  }
  return { ...EMPTY_PROFILE, email }
}

export function saveLocalProfile(profile: PackUserProfile): PackUserProfile {
  writeLocalProfile(profile)
  return profile
}

export function mergeProfileWithEmail(
  profile: PackUserProfile,
  email: string | null,
  userId?: string,
): PackUserProfile {
  return {
    ...profile,
    id: userId ?? profile.id,
    email: email ?? profile.email,
  }
}
