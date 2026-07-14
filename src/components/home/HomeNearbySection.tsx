import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { HomeRevealSection } from './HomeRevealSection'
import { formatDistance } from '../../utils/geo'
import { formatRelative } from '../../utils/format'
import type { NearbyPersonResult } from '../../db/repositories/places'
import type { GeoStatus } from '../../hooks/useGeolocation'

interface HomeNearbySectionProps {
  people: NearbyPersonResult[]
  loading: boolean
  geoStatus: GeoStatus
  geoError: string | null
  onOpenPerson: (personId: string) => void
  onRetry: () => void
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-pack-text-muted/60 px-1 text-sm">{children}</p>
}

function matchVerb(kind: NearbyPersonResult['matchKind']): string {
  if (kind === 'last_seen_at_place') return 'Last seen'
  if (kind === 'approximate_gps') return 'Met near here'
  return 'Met here'
}

function placeLabel(item: NearbyPersonResult): string | null {
  if (item.place?.name) return item.place.name
  const area = item.person.whereMetAreaLabel || item.person.whereMet
  return area || null
}

function NearbyPersonCard({
  item,
  onOpenPerson,
}: {
  item: NearbyPersonResult
  onOpenPerson: (personId: string) => void
}) {
  const navigate = useNavigate()
  const when = formatRelative(item.occurredAt)
  const distance = formatDistance(item.distanceMeters / 1000)
  const place = placeLabel(item)
  const eventName = item.eventName
  const verb = matchVerb(item.matchKind)

  return (
    <div className="pack-surface overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => onOpenPerson(item.person.id)}
        className="hover:bg-pack-card-hover/40 flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors"
      >
        <Avatar name={item.person.name} color={item.person.profileColor} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-pack-text truncate text-[15px] font-medium leading-snug">
              {item.person.name}
            </p>
            <span className="bg-pack-accent-muted text-pack-accent shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
              {distance}
            </span>
          </div>

          {eventName && (
            <p className="text-pack-text-secondary mt-1 truncate text-sm leading-snug">
              {eventName}
            </p>
          )}

          <p className="text-pack-text-muted mt-1.5 text-xs leading-snug">
            {verb}
            {when ? ` · ${when}` : ''}
          </p>
        </div>
      </button>

      {place && (
        <div className="border-pack-border/60 border-t px-3.5 py-2">
          {item.place ? (
            <button
              type="button"
              onClick={() => navigate(`/places/${item.place!.id}`)}
              className="text-pack-text-muted hover:text-pack-accent flex w-full min-w-0 items-center gap-2 text-left text-xs transition-colors"
            >
              <MapPin className="text-pack-accent/80 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{place}</span>
            </button>
          ) : (
            <p className="text-pack-text-muted flex min-w-0 items-center gap-2 text-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate">{place}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function HomeNearbySection({
  people,
  loading,
  geoStatus,
  geoError,
  onOpenPerson,
  onRetry,
}: HomeNearbySectionProps) {
  const navigate = useNavigate()

  const subtitle =
    people.length > 0
      ? `${people.length} Pack member${people.length === 1 ? '' : 's'} around here`
      : undefined

  const body = (() => {
    if (loading && people.length === 0) {
      return <EmptyLine>Finding people near you…</EmptyLine>
    }
    if (geoStatus === 'denied') {
      return (
        <div className="space-y-2 px-1">
          <EmptyLine>Location is off — turn it on to see who you’ve met nearby.</EmptyLine>
          <button
            type="button"
            onClick={() => navigate('/settings/privacy')}
            className="text-pack-accent text-xs font-medium"
          >
            Open Settings
          </button>
        </div>
      )
    }
    if (geoStatus === 'unavailable' || geoStatus === 'timeout') {
      return (
        <div className="space-y-2 px-1">
          <EmptyLine>{geoError ?? 'Could not get your location.'}</EmptyLine>
          <button type="button" onClick={onRetry} className="text-pack-accent text-xs font-medium">
            Try again
          </button>
        </div>
      )
    }
    if (people.length === 0 && (geoStatus === 'granted' || geoStatus === 'idle')) {
      if (geoStatus === 'idle' && loading) {
        return <EmptyLine>Finding people near you…</EmptyLine>
      }
      if (geoStatus === 'granted') {
        return <EmptyLine>No Pack members met near this spot yet.</EmptyLine>
      }
      return <EmptyLine>Finding people near you…</EmptyLine>
    }
    if (people.length === 0) {
      return <EmptyLine>Finding people near you…</EmptyLine>
    }

    return (
      <div className="space-y-2.5">
        {people.map((item) => (
          <NearbyPersonCard key={item.person.id} item={item} onOpenPerson={onOpenPerson} />
        ))}
      </div>
    )
  })()

  const show =
    loading ||
    people.length > 0 ||
    geoStatus === 'denied' ||
    geoStatus === 'unavailable' ||
    geoStatus === 'timeout' ||
    geoStatus === 'loading' ||
    geoStatus === 'granted' ||
    geoStatus === 'idle'

  if (!show) return null

  return (
    <HomeRevealSection
      title={
        <span className="inline-flex items-center gap-1.5">
          <Navigation className="text-pack-accent h-3.5 w-3.5" aria-hidden />
          Near You
        </span>
      }
      subtitle={subtitle}
    >
      {body}
    </HomeRevealSection>
  )
}
