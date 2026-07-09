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
import { useAuthOptional } from './AuthContext'

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
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const isAuthenticated = Boolean(user)

  const [profile, setProfile] = useState<PackUserProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    setLoading(true)
    try {
      if (isAuthenticated && user) {
        const cloud = await fetchCloudProfile(user.id, user.email ?? null)
        const merged = mergeProfileWithEmail(cloud, user.email ?? null, user.id)
        setProfile(merged)
        saveLocalProfile(merged)
        return
      }

      setProfile(loadLocalProfile(null))
    } catch {
      setProfile(loadLocalProfile(user?.email ?? null))
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const updateProfile = useCallback(
    async (input: PackUserProfileInput) => {
      try {
        if (isAuthenticated && user) {
          const updated = await updateCloudProfile(user.id, input)
          const merged = mergeProfileWithEmail(updated, user.email ?? null, user.id)
          setProfile(merged)
          saveLocalProfile(merged)
          return { error: null }
        }

        const next: PackUserProfile = {
          ...profile,
          firstName: input.firstName !== undefined ? input.firstName.trim() || null : profile.firstName,
          lastName: input.lastName !== undefined ? input.lastName.trim() || null : profile.lastName,
          displayName:
            input.displayName !== undefined ? input.displayName.trim() || null : profile.displayName,
          updatedAt: new Date().toISOString(),
        }
        setProfile(saveLocalProfile(next))
        return { error: null }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Failed to update profile.' }
      }
    },
    [isAuthenticated, user, profile],
  )

  const value = useMemo<ProfileContextValue>(() => {
    const effectiveName = getEffectiveDisplayName(profile)
    const personal = hasPersonalProfile(profile)

    return {
      profile,
      loading,
      headerLabel: isAuthenticated ? getHeaderLabel(profile) : 'Local Mode',
      displayName: effectiveName,
      greetingName: isAuthenticated || personal ? effectiveName : null,
      fullName: getDropdownFullName(profile),
      initials: getProfileInitials(profile),
      updateProfile,
      refreshProfile,
    }
  }, [profile, loading, isAuthenticated, updateProfile, refreshProfile])

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
