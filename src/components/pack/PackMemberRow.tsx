import { Star } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import type { PersonWithTags } from '../../types'

interface PackMemberRowProps {
  person: PersonWithTags
  showDivider?: boolean
  onSelect?: (person: PersonWithTags) => void
}

export function PackMemberRow({ person, showDivider = true, onSelect }: PackMemberRowProps) {
  const subtitle =
    person.company ||
    person.whereMetPlaceName ||
    person.whereMet ||
    person.event ||
    person.lastSeenPlaceName ||
    person.lastSeenAt

  return (
    <button
      type="button"
      onClick={() => onSelect?.(person)}
      className={`hover:bg-pack-card-hover/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        showDivider ? 'border-pack-border/20 border-b' : ''
      }`}
    >
      <Avatar name={person.name} color={person.profileColor} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-pack-text truncate text-base font-medium">{person.name}</p>
          {person.isFavorite && (
            <Star className="text-pack-accent h-3 w-3 shrink-0 fill-current" />
          )}
        </div>
        {subtitle && (
          <p className="text-pack-text-muted truncate text-sm">{subtitle}</p>
        )}
      </div>
    </button>
  )
}
