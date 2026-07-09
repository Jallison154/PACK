import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { PackLogo } from '../brand/PackLogo'
import { QuickCapture } from './QuickCapture'
import { HomeRevealSection } from './HomeRevealSection'
import { MemoryFeed } from './MemoryFeed'
import { MemoryPersonCard } from './MemoryPersonCard'
import { formatDate } from '../../utils/format'
import { getGreeting } from '../../utils/greeting'
import { useProfile } from '../../context/ProfileContext'
import type { HomeScrollData } from './HomeScrollContent'

interface HomeDesktopProps {
  data: HomeScrollData
  onCreated: () => void
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-pack-text-muted/60 px-1 text-sm">{children}</p>
}

export function HomeDesktop({ data, onCreated }: HomeDesktopProps) {
  const navigate = useNavigate()
  const { greetingName } = useProfile()
  const { todayTrail, followUps, recentPlaces, recentPackMembers, insights } = data

  return (
    <div className="page-top page-px mx-auto w-full max-w-5xl pb-16">
      <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PackLogo href="/" size="sm" align="left" />
          <h1 className="text-pack-text mt-4 text-[2rem] leading-tight font-semibold tracking-tight">
            {getGreeting(greetingName)}
          </h1>
          <p className="text-pack-text-muted mt-1 text-sm">Your pack at a glance</p>
        </div>

        <div className="pack-elevated shrink-0 rounded-2xl px-5 py-3 text-sm leading-relaxed">
          <span className="text-pack-text-secondary tabular-nums">{insights.people}</span>{' '}
          {insights.people === 1 ? 'person' : 'people'}
          {' · '}
          <span className="text-pack-text-secondary tabular-nums">{insights.places}</span>{' '}
          {insights.places === 1 ? 'place' : 'places'}
          {insights.followUps > 0 && (
            <>
              {' · '}
              <span className="text-pack-text-secondary tabular-nums">{insights.followUps}</span>{' '}
              {insights.followUps === 1 ? 'follow-up' : 'follow-ups'}
            </>
          )}
        </div>
      </header>

      <div className="mb-10 max-w-xl">
        <QuickCapture onCreated={onCreated} size="hero" />
      </div>

      <div className="grid gap-10 md:grid-cols-2">
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

        <HomeRevealSection title="Recent Pack Members">
          {recentPackMembers.length > 0 ? (
            <>
              <div className="space-y-1">
                {recentPackMembers.map((person, i) => (
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
            <EmptyLine>People you add will show up here.</EmptyLine>
          )}
        </HomeRevealSection>
      </div>

      <div className="mt-10">
        <HomeRevealSection title="Pack Insights">
          <p className="text-pack-text-muted/70 px-1 text-sm leading-relaxed">
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
            {insights.followUps > 0 && (
              <>
                {' · '}
                <span className="text-pack-text-secondary tabular-nums">{insights.followUps}</span>{' '}
                {insights.followUps === 1 ? 'follow-up due' : 'follow-ups due'}
              </>
            )}
          </p>
        </HomeRevealSection>
      </div>
    </div>
  )
}
