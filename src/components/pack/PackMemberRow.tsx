import { Star } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { formatDate } from '../../utils/format'
import { getRelationshipLabel } from '../../types'
import type { PersonWithTags } from '../../types'

interface PackMemberRowProps {
  person: PersonWithTags
  showDivider?: boolean
  selected?: boolean
  variant?: 'row' | 'card'
  onSelect?: (person: PersonWithTags) => void
}

export function PackMemberRow({
  person,
  showDivider = true,
  selected = false,
  variant = 'row',
  onSelect,
}: PackMemberRowProps) {
  const relationship = getRelationshipLabel(person.relationshipType)
  const where =
    person.whereMetPlaceName ||
    person.whereMet ||
    person.lastSeenPlaceName ||
    person.lastSeenAt ||
    person.event
  const lastSeen = person.lastSeenDate || person.dateMet
  const subtitle =
    person.company || relationship || where || undefined

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(person)}
        className={`border-pack-border flex h-full w-full flex-col rounded-2xl border bg-[#171717] p-4 text-left transition-colors ${
          selected
            ? 'border-pack-accent/50 bg-pack-accent/10'
            : 'hover:bg-pack-card-hover/40'
        }`}
      >
        <div className="flex items-start gap-3">
          <Avatar name={person.name} color={person.profileColor} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-pack-text truncate text-base font-medium">{person.name}</p>
              {person.isFavorite && (
                <Star className="text-pack-accent h-3.5 w-3.5 shrink-0 fill-current" />
              )}
            </div>
            {subtitle && (
              <p className="text-pack-text-muted mt-0.5 truncate text-sm">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="text-pack-text-muted mt-3 space-y-1 text-xs">
          {person.company && relationship && (
            <p className="truncate">{relationship}</p>
          )}
          {where && (
            <p className="truncate">
              {person.whereMetPlaceName || person.whereMet ? 'Met' : 'Last seen'} · {where}
            </p>
          )}
          {lastSeen && <p>Last trail {formatDate(lastSeen)}</p>}
          {!where && !lastSeen && !person.company && !relationship && (
            <p>In your Pack</p>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(person)}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        selected ? 'bg-pack-accent/10' : 'hover:bg-pack-card-hover/50'
      } ${showDivider ? 'border-pack-border/20 border-b' : ''}`}
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
