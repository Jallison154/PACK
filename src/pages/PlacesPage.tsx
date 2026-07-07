import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { PlaceMap } from '../components/places/PlaceMap'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { getAllPlaces, getPlacesWithCoordinates } from '../db/repositories/places'
import { formatLocation } from '../utils/format'
import type { PlaceWithStats } from '../types'

export function PlacesPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [places, setPlaces] = useState<PlaceWithStats[]>([])
  const [mapPlaces, setMapPlaces] = useState<PlaceWithStats[]>([])
  const [selected, setSelected] = useState<PlaceWithStats | null>(null)

  useEffect(() => {
    getAllPlaces().then(setPlaces)
    getPlacesWithCoordinates().then(setMapPlaces)
  }, [])

  return (
    <div className="min-h-dvh">
      <div className="page-top page-px page-header-gap mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-pack-text text-2xl font-semibold tracking-tight">Places</h1>
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
        </div>
      </div>

      <div className="page-px mx-auto max-w-lg pb-8">
        {view === 'map' ? (
          <div className="space-y-4">
            <div className="pack-surface overflow-hidden">
              <PlaceMap
                places={mapPlaces}
                height="min(50vh, 400px)"
                onPlaceClick={(p) => {
                  const full = places.find((pl) => pl.id === p.id)
                  setSelected(full ?? (p as PlaceWithStats))
                }}
              />
            </div>
            {selected ? (
              <div className="px-1">
                <h3 className="text-pack-text text-lg font-medium">{selected.name}</h3>
                {formatLocation(selected.city, selected.state) && (
                  <p className="text-pack-text-muted mt-0.5 text-sm">
                    {formatLocation(selected.city, selected.state)}
                  </p>
                )}
                <Button className="mt-4 w-full" onClick={() => navigate(`/places/${selected.id}`)}>
                  See who you met here
                </Button>
              </div>
            ) : mapPlaces.length === 0 ? (
              places.length === 0 ? (
                <EmptyState
                  message="No places yet."
                  hint="Places appear as you build memories."
                  icon={<MapPin className="h-7 w-7" />}
                />
              ) : (
                <p className="text-pack-text-muted px-1 text-center text-sm leading-relaxed">
                  {places.length} {places.length === 1 ? 'place' : 'places'} in your Pack.
                  Add a location when logging a memory to see pins on the map.
                </p>
              )
            ) : (
              <p className="text-pack-text-muted text-center text-sm">Tap a pin</p>
            )}
          </div>
        ) : places.length === 0 ? (
          <EmptyState
            message="No places yet."
            hint="Places appear as you build memories."
            icon={<MapPin className="h-7 w-7" />}
          />
        ) : (
          <div>
            {places.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => navigate(`/places/${place.id}`)}
                className="hover:bg-pack-card-hover/50 flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left transition-colors"
              >
                <MapPin className="text-pack-text-muted h-4 w-4 shrink-0" />
                <p className="text-pack-text truncate font-medium">{place.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
