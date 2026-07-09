import type { PackUserProfile } from '../../types/profile'
import { getProfileInitials } from '../../utils/profileDisplay'

interface UserAvatarProps {
  profile: Pick<PackUserProfile, 'firstName' | 'lastName' | 'displayName' | 'email' | 'avatarUrl'>
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
}

export function UserAvatar({ profile, size = 'sm', className = '' }: UserAvatarProps) {
  const initials = getProfileInitials(profile)

  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${sizes[size]} ${className}`}
      />
    )
  }

  return (
    <span
      className={`bg-pack-accent text-pack-bg-primary flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  )
}
