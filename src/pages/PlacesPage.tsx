import { MobilePageShell } from '../components/layout/MobilePageShell'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, Navigation } from 'lucide-react'
import { PlaceMap } from '../components/places/PlaceMap'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useGeolocation } from '../hooks/useGeolocation'
import { usePackDataRefresh } from '../hooks/usePackDataRefresh'
import { getAllPlaces, getPlacesWithCoordinates } from '../db/repositories/places'
import { formatLocation } from '../utils/format'
import type { PlaceWithStats } from '../types'

export function PlacesPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [places, setPlaces] = useState<PlaceWithStats[]>([])
  const [mapPlaces, setMapPlaces] = useState<PlaceWithStats[]>([])
  const [selected, setSelected] = useState<PlaceWithStats | null>(null)
  const { position, loading: geoLoading, requestLocation } = useGeolocation()

  const reload = useCallback(async () => {
    const [all, mapped] = await Promise.all([getAllPlaces(), getPlacesWithCoordinates()])
    setPlaces(all)
    setMapPlaces(mapped)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  usePackDataRefresh(reload)

  const empty = places.length === 0

  return (
    <MobilePageShell top={false} padded={false}>
      <div className="page-top-shell page-px page-header-gap mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-pack-text text-2xl font-semibold tracking-tight">Places</h1>
          <div className="flex items-center gap-2">
            <div className="text-pack-text-muted flex gap-3 text-sm">
              <button
                type="button"
                onClick={() => setView('map')}
                className={view === 'map' ? 'text-pack-text' : 'hover:text-pack-text-secondary'}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={view === 'list' ? 'text-pack-text' : 'hover:text-pack-text-secondary'}
              >
                List
              </button>
            </div>
            <Button size="sm" onClick={() => navigate('/places/add')}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="page-px mx-auto max-w-lg pb-8">
        {empty ? (
          <EmptyState
            message="You haven't mapped your Pack yet."
            hint="Add a place or use your current location to start building your trail."
            icon={<MapPin className="h-7 w-7" />}
            action={
              <div className="flex w-full max-w-xs flex-col gap-2">
                <Button className="w-full" onClick={() => navigate('/places/add')}>
                  Add Place
                </Button>
                <Button variant="secondary" className="w-full" onClick={requestLocation} loading={geoLoading}>
                  <Navigation className="h-4 w-4" /> Use My Current Location
                </Button>
              </div>
            }
          />
        ) : view === 'map' ? (
          <div className="space-y-4">
            <div className="pack-surface overflow-hidden">
              <PlaceMap
                places={mapPlaces}
                height="min(50vh, 400px)"
                userLocation={position}
                onPlaceClick={(p) => {
                  const full = places.find((pl) => pl.id === p.id)
                  setSelected(full ?? (p as PlaceWithStats))
                }}
                onOpenPlace={(placeId) => navigate(`/places/${placeId}`)}
                emptyMessage={
                  mapPlaces.length === 0
                    ? 'Your places need coordinates to appear as pins. Add GPS when creating a place or search by address.'
                    : undefined
                }
              />
            </div>

            {!position && (
              <Button variant="secondary" className="w-full" onClick={requestLocation} loading={geoLoading}>
                <Navigation className="h-4 w-4" /> Use My Current Location
              </Button>
            )}

            {selected ? (
              <div className="px-1">
                <h3 className="text-pack-text text-lg font-medium">{selected.name}</h3>
                {selected.address && (
                  <p className="text-pack-text-muted mt-0.5 text-sm">{selected.address}</p>
                )}
                {formatLocation(selected.city, selected.state) && (
                  <p className="text-pack-text-muted text-sm">
                    {formatLocation(selected.city, selected.state)}
                  </p>
                )}
                <p className="text-pack-text-muted mt-2 text-xs">
                  {selected.metCount} met · {selected.lastSeenCount} last seen ·{' '}
                  {selected.interactionCount} trail entries
                </p>
                <Button className="mt-4 w-full" onClick={() => navigate(`/places/${selected.id}`)}>
                  Open Place
                </Button>
              </div>
            ) : mapPlaces.length > 0 ? (
              <p className="text-pack-text-muted text-center text-sm">Tap a pin to explore</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1">
            {places.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => navigate(`/places/${place.id}`)}
                className="hover:bg-pack-card-hover/50 flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left transition-colors"
              >
                <MapPin className="text-pack-text-muted h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-pack-text truncate font-medium">{place.name}</p>
                  {formatLocation(place.city, place.state) && (
                    <p className="text-pack-text-muted truncate text-sm">
                      {formatLocation(place.city, place.state)}
                    </p>
                  )}
                </div>
                <span className="text-pack-text-muted text-xs">{place.metCount + place.lastSeenCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobilePageShell>
  )
}
