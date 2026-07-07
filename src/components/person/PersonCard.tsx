import { Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import type { PersonWithTags } from '../../types'

interface PersonCardProps {
  person: PersonWithTags
  index?: number
  compact?: boolean
}

export function PersonCard({ person, index = 0, compact }: PersonCardProps) {
  const navigate = useNavigate()
  const context =
    person.company ||
    person.lastSeenPlaceName ||
    person.lastSeenAt ||
    person.whereMetPlaceName ||
    person.whereMet ||
    person.event

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/person/${person.id}`)}
      className={`hover:bg-pack-card-hover/50 flex w-full items-center gap-3 rounded-xl text-left transition-colors ${
        compact ? 'px-1 py-2' : 'px-1 py-3'
      }`}
    >
      <Avatar name={person.name} color={person.profileColor} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-pack-text truncate text-base font-medium">{person.name}</h3>
          {person.isFavorite && (
            <Star className="text-pack-accent h-3 w-3 shrink-0 fill-current" />
          )}
        </div>
        {context && (
          <p className="text-pack-text-muted mt-0.5 truncate text-sm">{context}</p>
        )}
      </div>
    </motion.button>
  )
}
