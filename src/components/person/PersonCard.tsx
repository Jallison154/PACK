import { Star, MapPin, Building2, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { formatDate, formatLocation } from '../../utils/format'
import { WORKSPACES, type PersonWithTags } from '../../types'

interface PersonCardProps {
  person: PersonWithTags
  index?: number
}

export function PersonCard({ person, index = 0 }: PersonCardProps) {
  const navigate = useNavigate()
  const ws = WORKSPACES.find((w) => w.value === person.workspace)
  const location = person.whereMet || person.event
  const locDetail = formatLocation(person.city, person.state)

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/person/${person.id}`)}
      className="bg-pack-card border-pack-border hover:bg-pack-card-hover flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors"
    >
      <Avatar name={person.name} color={person.profileColor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-semibold">{person.name}</h3>
          {person.isFavorite && (
            <Star className="text-pack-accent h-4 w-4 shrink-0 fill-current" />
          )}
          <span className="text-pack-text-muted ml-auto text-xs">{ws?.emoji}</span>
        </div>
        {person.workspace === 'work' && person.company && (
          <p className="text-pack-text-secondary mt-0.5 flex items-center gap-1.5 truncate text-sm">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {person.company}
          </p>
        )}
        {person.workspace === 'personal' && person.householdName && (
          <p className="text-pack-text-secondary mt-0.5 flex items-center gap-1.5 truncate text-sm">
            <Home className="h-3.5 w-3.5 shrink-0" />
            {person.householdName}
          </p>
        )}
        {location && (
          <p className="text-pack-text-muted mt-0.5 flex items-center gap-1.5 truncate text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {location}
            {locDetail && ` · ${locDetail}`}
          </p>
        )}
        {person.dateMet && (
          <p className="text-pack-text-muted mt-1 text-xs">
            Met {formatDate(person.dateMet)}
          </p>
        )}
        {person.lastSeenAt && (
          <p className="text-pack-accent mt-0.5 text-xs">
            Last seen at {person.lastSeenAt}
            {person.lastSeenDate && ` · ${formatDate(person.lastSeenDate)}`}
          </p>
        )}
      </div>
    </motion.button>
  )
}
