import { getInitials, DEFAULT_PROFILE_COLOR } from '../../utils/colors'

interface AvatarProps {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
}

export function Avatar({ name, color = DEFAULT_PROFILE_COLOR, size = 'md' }: AvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${sizes[size]}`}
      style={{ backgroundColor: color }}
    >
      {getInitials(name)}
    </div>
  )
}
