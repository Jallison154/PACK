import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { HomeRevealSection } from './HomeRevealSection'
import { MemoryFeed } from './MemoryFeed'
import { MemoryPersonCard } from './MemoryPersonCard'
import { formatDate } from '../../utils/format'
import type { MemoryItem } from '../../utils/memoryFeed'
import type { InteractionWithPerson, PersonWithTags, Place } from '../../types'

export interface HomeScrollData {
  todayTrail: MemoryItem[]
  followUps: InteractionWithPerson[]
  recentPlaces: Place[]
  corePack: PersonWithTags[]
  recentPackMembers: PersonWithTags[]
  insights: { people: number; places: number; companies: number; followUps: number }
}

interface HomeScrollContentProps {
  data: HomeScrollData
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-pack-text-muted/60 px-1 text-sm">{children}</p>
}

export function HomeScrollContent({ data }: HomeScrollContentProps) {
  const navigate = useNavigate()
  const { todayTrail, followUps, recentPlaces, corePack, insights } = data

  return (
    <div className="page-px mx-auto w-full max-w-sm space-y-16 pt-4">
      <HomeRevealSection title="Today's Trail">
        {todayTrail.length > 0 ? (
          <MemoryFeed items={todayTrail} flat />
        ) : (
          <EmptyLine>Nothing on the trail today.</EmptyLine>
        )}
      </HomeRevealSection>

      <HomeRevealSection title="Reconnect Soon">
        {followUps.length > 0 ? (
          <div className="space-y-1">
            {followUps.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/person/${item.personId}`)}
                className="hover:bg-pack-card-hover/50 w-full rounded-xl px-1 py-2.5 text-left transition-colors"
              >
                <p className="text-pack-text text-[15px] leading-snug">
                  <span className="font-medium">{item.personName}</span>
                  {item.nextFollowUp && (
                    <span className="text-pack-text-muted">
                      {' '}
                      · {formatDate(item.nextFollowUp)}
                    </span>
                  )}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyLine>No one to reconnect with right now.</EmptyLine>
        )}
      </HomeRevealSection>

      <HomeRevealSection title="Recent Places">
        {recentPlaces.length > 0 ? (
          <div className="space-y-1">
            {recentPlaces.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => navigate(`/places/${place.id}`)}
                className="hover:bg-pack-card-hover/50 flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors"
              >
                <MapPin className="text-pack-text-muted h-4 w-4 shrink-0" />
                <span className="text-pack-text truncate text-[15px] font-medium">
                  {place.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyLine>Places will appear as you build memories.</EmptyLine>
        )}
      </HomeRevealSection>

      <HomeRevealSection title="Core Pack">
        {corePack.length > 0 ? (
          <>
            <div className="space-y-1">
              {corePack.map((person, i) => (
                <MemoryPersonCard key={person.id} person={person} index={i} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/pack')}
              className="text-pack-text-muted hover:text-pack-text-secondary mt-2 w-full px-1 text-left text-sm transition-colors"
            >
              See all
            </button>
          </>
        ) : (
          <EmptyLine>Star people to build your Core Pack.</EmptyLine>
        )}
      </HomeRevealSection>

      <HomeRevealSection title="Pack Insights">
        <p className="text-pack-text-muted/70 px-1 text-center text-sm leading-relaxed">
          <span className="text-pack-text-secondary tabular-nums">{insights.people}</span>{' '}
          {insights.people === 1 ? 'person' : 'people'}
          {' · '}
          <span className="text-pack-text-secondary tabular-nums">{insights.places}</span>{' '}
          {insights.places === 1 ? 'place' : 'places'}
          {insights.companies > 0 && (
            <>
              {' · '}
              <span className="text-pack-text-secondary tabular-nums">{insights.companies}</span>{' '}
              {insights.companies === 1 ? 'company' : 'companies'}
            </>
          )}
        </p>
      </HomeRevealSection>
    </div>
  )
}
