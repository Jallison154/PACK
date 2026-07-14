import { useNavigate } from 'react-router-dom'
import { HomeRevealSection } from './HomeRevealSection'
import { HomePersonRow } from './HomePersonRow'
import { formatDistance } from '../../utils/geo'
import type { NearbyPersonResult } from '../../db/repositories/places'
import type { GeoStatus } from '../../hooks/useGeolocation'

interface HomeNearbySectionProps {
  people: NearbyPersonResult[]
  loading: boolean
  geoStatus: GeoStatus
  geoError: string | null
  onOpenPerson: (personId: string) => void
  onRetry: () => void
  variant?: 'feed' | 'card'
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-pack-text-muted/60 px-1 text-sm">{children}</p>
}

export function HomeNearbySection({
  people,
  loading,
  geoStatus,
  geoError,
  onOpenPerson,
  onRetry,
  variant = 'feed',
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
      <div className="space-y-1">
        {people.map((item) => (
          <div key={item.person.id} className="min-w-0">
            <HomePersonRow person={item.person} onOpenPerson={onOpenPerson} compact />
            <p className="text-pack-text-muted -mt-1 mb-1 truncate px-2 pl-[3.25rem] text-[11px]">
              {item.contextLabel}
              {' · '}
              {formatDistance(item.distanceMeters / 1000)}
              {item.place && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => navigate(`/places/${item.place!.id}`)}
                    className="text-pack-accent hover:underline"
                  >
                    View place
                  </button>
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    )
  })()

  // Keep the section visible so location permission UX isn’t buried
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

  if (variant === 'card') {
    return (
      <HomeRevealSection title="Near You" subtitle={subtitle}>
        {body}
      </HomeRevealSection>
    )
  }

  return (
    <HomeRevealSection title="Near You" subtitle={subtitle}>
      {body}
    </HomeRevealSection>
  )
}
