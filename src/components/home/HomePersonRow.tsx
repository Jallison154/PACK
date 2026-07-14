import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { formatDate } from '../../utils/format'
import { getRelationshipLabel } from '../../types'
import type { PersonWithTags } from '../../types'

interface HomePersonRowProps {
  person: PersonWithTags
  compact?: boolean
}

export function HomePersonRow({ person, compact = false }: HomePersonRowProps) {
  const navigate = useNavigate()
  const relationship = getRelationshipLabel(person.relationshipType)
  const where =
    person.whereMetPlaceName ||
    person.whereMet ||
    person.lastSeenPlaceName ||
    person.lastSeenAt ||
    null
  const lastSeen = person.lastSeenDate || person.dateMet || person.createdAt.slice(0, 10)

  return (
    <button
      type="button"
      onClick={() => navigate(`/person/${person.id}`)}
      className="hover:bg-pack-card-hover/50 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors"
    >
      <Avatar
        name={person.name}
        color={person.profileColor}
        size={compact ? 'md' : 'lg'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-pack-text truncate text-[15px] font-medium">{person.name}</p>
          {person.isFavorite && (
            <Star className="text-pack-accent h-3.5 w-3.5 shrink-0 fill-current" aria-label="Core Pack" />
          )}
        </div>
        <p className="text-pack-text-muted mt-0.5 truncate text-xs">
          {[person.company || relationship, where].filter(Boolean).join(' · ') || 'In your Pack'}
        </p>
        {!compact && (
          <p className="text-pack-text-muted/70 mt-0.5 text-[11px]">
            Last seen {formatDate(lastSeen)}
          </p>
        )}
      </div>
    </button>
  )
}
