export interface PackUserProfile {
  id?: string
  email: string | null
  firstName: string | null
  lastName: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface PackUserProfileInput {
  firstName?: string
  lastName?: string
  displayName?: string
}

export const EMPTY_PROFILE: PackUserProfile = {
  email: null,
  firstName: null,
  lastName: null,
  displayName: null,
  avatarUrl: null,
  createdAt: null,
  updatedAt: null,
}
