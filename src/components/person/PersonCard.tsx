import { Star, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { formatDate } from '../../utils/format'
import { WORKSPACES, type PersonWithTags } from '../../types'

interface PersonCardProps {
  person: PersonWithTags
  index?: number
  compact?: boolean
}

export function PersonCard({ person, index = 0, compact }: PersonCardProps) {
  const navigate = useNavigate()
  const ws = WORKSPACES.find((w) => w.value === person.workspace)
  const placeLine =
    person.lastSeenPlaceName ||
    person.lastSeenAt ||
    person.whereMetPlaceName ||
    person.whereMet ||
    person.event

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/person/${person.id}`)}
      className={`bg-pack-card border-pack-border/80 hover:bg-pack-card-hover flex w-full items-center gap-3 rounded-xl border text-left transition-colors ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <Avatar name={person.name} color={person.profileColor} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-pack-text truncate text-sm font-semibold">{person.name}</h3>
          {person.isFavorite && (
            <Star className="text-pack-accent h-3.5 w-3.5 shrink-0 fill-current" />
          )}
          <span className="bg-pack-surface text-pack-text-muted border-pack-border/60 ml-auto shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium">
            {ws?.label}
          </span>
        </div>
        <div className="text-pack-text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {person.dateMet && <span>Met {formatDate(person.dateMet)}</span>}
          {placeLine && (
            <span className="flex min-w-0 items-center gap-1 truncate">
              {person.dateMet && <span className="text-pack-border">·</span>}
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{placeLine}</span>
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}
