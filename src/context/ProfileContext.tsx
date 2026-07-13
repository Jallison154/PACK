import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PackUserProfile, PackUserProfileInput } from '../types/profile'
import { EMPTY_PROFILE } from '../types/profile'
import {
  fetchCloudProfile,
  loadLocalProfile,
  mergeProfileWithEmail,
  saveLocalProfile,
  updateCloudProfile,
} from '../services/profile'
import {
  getDropdownFullName,
  getEffectiveDisplayName,
  getHeaderLabel,
  getProfileInitials,
  hasPersonalProfile,
} from '../utils/profileDisplay'
import { useAuth } from './AuthContext'

interface ProfileContextValue {
  profile: PackUserProfile
  loading: boolean
  headerLabel: string
  displayName: string
  greetingName: string | null
  fullName: string
  initials: string
  updateProfile: (input: PackUserProfileInput) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [profile, setProfile] = useState<PackUserProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const cloud = await fetchCloudProfile(user.id, user.email ?? null)
      const merged = mergeProfileWithEmail(cloud, user.email ?? null, user.id)
      setProfile(merged)
      saveLocalProfile(user.id, merged)
    } catch {
      setProfile(loadLocalProfile(user.id, user.email ?? null))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const updateProfile = useCallback(
    async (input: PackUserProfileInput) => {
      if (!user?.id) return { error: 'Not signed in.' }
      try {
        const updated = await updateCloudProfile(user.id, input)
        const merged = mergeProfileWithEmail(updated, user.email ?? null, user.id)
        setProfile(merged)
        saveLocalProfile(user.id, merged)
        return { error: null }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Failed to update profile.' }
      }
    },
    [user],
  )

  const value = useMemo<ProfileContextValue>(() => {
    const effectiveName = getEffectiveDisplayName(profile)
    const personal = hasPersonalProfile(profile)

    return {
      profile,
      loading,
      headerLabel: getHeaderLabel(profile),
      displayName: effectiveName,
      greetingName: personal ? effectiveName : null,
      fullName: getDropdownFullName(profile),
      initials: getProfileInitials(profile),
      updateProfile,
      refreshProfile,
    }
  }, [profile, loading, updateProfile, refreshProfile])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}

export function useProfileOptional() {
  return useContext(ProfileContext)
}
