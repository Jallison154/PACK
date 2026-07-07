import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Star, List, Map } from 'lucide-react'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PlaceMap } from '../components/places/PlaceMap'
import { getAllPlaces, getPlacesWithCoordinates } from '../db/repositories/places'
import { formatLocation } from '../utils/format'
import { getPlaceCategoryLabel } from '../types'
import type { PlaceWithStats } from '../types'

export function PlacesPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [places, setPlaces] = useState<PlaceWithStats[]>([])
  const [mapPlaces, setMapPlaces] = useState<PlaceWithStats[]>([])
  const [selected, setSelected] = useState<PlaceWithStats | null>(null)

  useEffect(() => {
    getAllPlaces().then(setPlaces)
    getPlacesWithCoordinates().then(setMapPlaces)
  }, [])

  return (
    <div className="min-h-dvh">
      <Header
        title="Places"
        right={
          <div className="flex gap-1">
            <button
              onClick={() => setView('list')}
              className={`rounded-lg p-2 ${view === 'list' ? 'bg-pack-accent text-black' : 'text-pack-text-muted'}`}
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('map')}
              className={`rounded-lg p-2 ${view === 'map' ? 'bg-pack-accent text-black' : 'text-pack-text-muted'}`}
            >
              <Map className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4">
        {view === 'map' ? (
          <div className="space-y-4">
            <PlaceMap
              places={mapPlaces}
              height="min(55vh, 420px)"
              onPlaceClick={(p) => {
                const full = places.find((pl) => pl.id === p.id)
                setSelected(full ?? (p as PlaceWithStats))
              }}
            />
            {selected && (
              <Card>
                <h3 className="text-lg font-bold">{selected.name}</h3>
                {selected.category && (
                  <p className="text-pack-text-muted text-sm">
                    {getPlaceCategoryLabel(selected.category)}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p>{selected.metCount} met here</p>
                  <p>{selected.lastSeenCount} last seen</p>
                  <p>{selected.interactionCount} interactions</p>
                </div>
                <Button className="mt-4 w-full" onClick={() => navigate(`/places/${selected.id}`)}>
                  Open Place
                </Button>
              </Card>
            )}
          </div>
        ) : places.length === 0 ? (
          <div className="py-16 text-center">
            <MapPin className="text-pack-text-muted mx-auto h-12 w-12" />
            <p className="text-pack-text-secondary mt-4">No places yet</p>
            <p className="text-pack-text-muted mt-1 text-sm">
              Places are created when you save interactions or add them manually
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {places.map((place, i) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card onClick={() => navigate(`/places/${place.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="bg-pack-accent-muted flex h-10 w-10 items-center justify-center rounded-xl">
                      <MapPin className="text-pack-accent h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{place.name}</h3>
                        {place.isFavorite && (
                          <Star className="text-pack-accent h-4 w-4 fill-current" />
                        )}
                      </div>
                      {formatLocation(place.city, place.state) && (
                        <p className="text-pack-text-muted text-sm">
                          {formatLocation(place.city, place.state)}
                        </p>
                      )}
                      {place.category && (
                        <p className="text-pack-text-muted text-xs">
                          {getPlaceCategoryLabel(place.category)}
                        </p>
                      )}
                    </div>
                    <div className="text-pack-text-secondary text-right text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {place.metCount + place.lastSeenCount}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
