import { User, MessageSquarePlus } from 'lucide-react'
import type { DuplicateMatch } from '../../db/repositories/duplicates'
import { formatMatchSubtitle } from '../../db/repositories/duplicates'
import { Button } from '../ui/Button'
import type { MatchStrength } from '../../utils/match'

interface PossibleMatchesListProps {
  matches: DuplicateMatch[]
  onOpenProfile: (personId: string) => void
  onAddInteraction: (match: DuplicateMatch) => void
}

const strengthLabel: Record<MatchStrength, string> = {
  strong: 'Strong match',
  likely: 'Likely match',
  possible: 'Possible match',
}

export function PossibleMatchesList({
  matches,
  onOpenProfile,
  onAddInteraction,
}: PossibleMatchesListProps) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-pack-text text-sm font-semibold">Possible Matches</h2>
        <p className="text-pack-text-secondary mt-0.5 text-xs">
          Already in your Pack? Add to their trail instead of creating a duplicate.
        </p>
      </div>

      <ul className="space-y-2">
        {matches.map((match) => {
          const subtitle = formatMatchSubtitle(match.person)
          return (
            <li
              key={match.person.id}
              className="bg-pack-card border-pack-border rounded-xl border p-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black"
                  style={{ backgroundColor: match.person.profileColor }}
                >
                  {match.person.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-pack-text truncate font-medium">{match.person.name}</p>
                  {subtitle && (
                    <p className="text-pack-text-secondary mt-0.5 line-clamp-2 text-sm">
                      {subtitle}
                    </p>
                  )}
                  <p className="text-pack-text-muted mt-1 text-xs">
                    {strengthLabel[match.strength]}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => onOpenProfile(match.person.id)}
                >
                  <User className="h-3.5 w-3.5" />
                  Open Profile
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onAddInteraction(match)}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Add to Trail
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
