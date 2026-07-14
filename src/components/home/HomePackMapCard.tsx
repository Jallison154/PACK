import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LngLatBounds, type Map as MapboxMap } from 'mapbox-gl'
import { MapPin, Navigation, Maximize2, Plus } from 'lucide-react'
import { PackMap, type PackMapPlace } from '../places/PackMap'
import { Button } from '../ui/Button'
import { useGeolocation } from '../../hooks/useGeolocation'
import { MAPBOX_USER_ZOOM, mapboxConfigured } from '../../services/mapbox/config'
import { formatDate } from '../../utils/format'

interface HomePackMapCardProps {
  places: PackMapPlace[]
}

export function HomePackMapCard({ places }: HomePackMapCardProps) {
  const navigate = useNavigate()
  const mapRef = useRef<MapboxMap | null>(null)
  const [selected, setSelected] = useState<PackMapPlace | null>(null)
  const { position, loading, requestLocation } = useGeolocation()

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  const mappable = places.filter((place) => place.latitude != null && place.longitude != null)
  const hasPins = mappable.length > 0

  const fitAllPins = () => {
    const map = mapRef.current
    if (!map || mappable.length === 0) return
    const bounds = new LngLatBounds()
    for (const place of mappable) {
      bounds.extend([place.longitude!, place.latitude!])
    }
    if (position) bounds.extend([position.longitude, position.latitude])
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 56, maxZoom: MAPBOX_USER_ZOOM, duration: 500 })
    }
  }

  return (
    <section className="border-pack-border overflow-hidden rounded-2xl border bg-[#171717]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-pack-text text-sm font-medium tracking-wide">Your Pack Map</h2>
          <p className="text-pack-text-muted mt-0.5 text-xs leading-relaxed">
            Places connected to the people you know.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/places')}
          >
            Open Places
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={requestLocation}
            loading={loading}
            className="min-w-10"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span className="sr-only">Use current location</span>
          </Button>
          {hasPins && (
            <Button
              size="sm"
              variant="secondary"
              onClick={fitAllPins}
              className="min-w-10"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="sr-only">Fit all pins</span>
            </Button>
          )}
        </div>
      </div>

      {!hasPins ? (
        <div className="flex h-[420px] flex-col items-center justify-center gap-4 px-6 text-center">
          <MapPin className="text-pack-text-muted h-8 w-8" />
          <div>
            <p className="text-pack-text text-sm font-medium">You haven’t mapped your Pack yet.</p>
            <p className="text-pack-text-muted mt-1 text-xs leading-relaxed">
              Add places as you meet people to see your trail take shape.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/places/add')}>
            <Plus className="h-4 w-4" />
            Add Place
          </Button>
        </div>
      ) : !mapboxConfigured ? (
        <div className="flex h-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-pack-text-secondary text-sm">Mapbox is not configured.</p>
          <Button size="sm" variant="secondary" onClick={() => navigate('/settings/advanced')}>
            Open Diagnostics
          </Button>
        </div>
      ) : (
        <>
          <div className="px-3 pb-3">
            <PackMap
              places={mappable}
              height="460px"
              currentLocation={position}
              selectedPlace={selected?.id ?? null}
              fitBounds
              showClustering
              onMapReady={(map) => {
                mapRef.current = map
              }}
              onPlaceSelect={(place) => setSelected(place)}
              onOpenPlace={(placeId) => navigate(`/places/${placeId}`)}
            />
          </div>

          {selected && (
            <div className="border-pack-border border-t px-4 py-3">
              <p className="text-pack-text truncate text-sm font-medium">{selected.name}</p>
              {(selected.address || selected.city) && (
                <p className="text-pack-text-muted mt-0.5 truncate text-xs">
                  {[selected.address, selected.city, selected.state].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-pack-text-muted mt-1.5 text-xs">
                {(selected.metCount ?? 0) + (selected.lastSeenCount ?? 0)} Pack Members
                {selected.lastInteractionDate
                  ? ` · Last trail ${formatDate(selected.lastInteractionDate)}`
                  : ''}
              </p>
              <button
                type="button"
                className="text-pack-accent mt-2 text-sm font-medium"
                onClick={() => navigate(`/places/${selected.id}`)}
              >
                Open Place
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
