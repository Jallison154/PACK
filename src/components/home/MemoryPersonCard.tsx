import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Avatar } from '../ui/Avatar'
import type { PersonWithTags } from '../../types'

interface MemoryPersonCardProps {
  person: PersonWithTags
  index?: number
}

function personContext(person: PersonWithTags): string | undefined {
  return (
    person.company ||
    person.lastSeenPlaceName ||
    person.lastSeenAt ||
    person.whereMetPlaceName ||
    person.whereMet ||
    person.event ||
    undefined
  )
}

export function MemoryPersonCard({ person, index = 0 }: MemoryPersonCardProps) {
  const navigate = useNavigate()
  const context = personContext(person)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/person/${person.id}`)}
      className="hover:bg-pack-card-hover/50 flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left transition-colors"
    >
      <Avatar name={person.name} color={person.profileColor} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-pack-text truncate text-base font-medium">{person.name}</p>
        {context && (
          <p className="text-pack-text-muted mt-0.5 truncate text-sm">{context}</p>
        )}
      </div>
    </motion.button>
  )
}
