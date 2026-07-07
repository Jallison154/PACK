import { useState, useEffect } from 'react'
import { MapPin, Star, Navigation, Search, Plus, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input, Select, Textarea } from '../ui/Input'
import { useGeolocation } from '../../hooks/useGeolocation'
import {
  getNearbyPlaces,
  getRecentPlaces,
  getFavoritePlaces,
  searchPlaces,
  createPlace,
} from '../../db/repositories/places'
import { formatDistance } from '../../utils/geo'
import { formatLocation } from '../../utils/format'
import { PLACE_CATEGORIES } from '../../types'
import type { Place, PlaceSearchResult, PlaceCategory } from '../../types'

interface PlacePickerProps {
  value: string | null
  onChange: (placeId: string | null, placeName: string) => void
  onClose: () => void
}

type Tab = 'nearby' | 'recent' | 'favorites' | 'search' | 'new'

export function PlacePicker({ value, onChange, onClose }: PlacePickerProps) {
  const [tab, setTab] = useState<Tab>('recent')
  const [places, setPlaces] = useState<PlaceSearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const { position, error, loading, requestLocation } = useGeolocation()
  const [newPlace, setNewPlace] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    category: '' as PlaceCategory | '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (tab === 'recent') getRecentPlaces(15).then(setPlaces)
    if (tab === 'favorites') getFavoritePlaces().then(setPlaces)
    if (tab === 'nearby' && position) {
      getNearbyPlaces(position.latitude, position.longitude).then(setPlaces)
    }
    if (tab === 'search' && searchQuery) {
      const t = setTimeout(() => searchPlaces(searchQuery).then(setPlaces), 200)
      return () => clearTimeout(t)
    }
    if (tab === 'search' && !searchQuery) setPlaces([])
  }, [tab, position, searchQuery])

  const selectPlace = (place: Place) => {
    onChange(place.id, place.name)
    onClose()
  }

  const handleCreate = async () => {
    if (!newPlace.name.trim()) return
    setSaving(true)
    try {
      const place = await createPlace({
        name: newPlace.name.trim(),
        address: newPlace.address || undefined,
        city: newPlace.city || undefined,
        state: newPlace.state || undefined,
        category: newPlace.category || undefined,
        notes: newPlace.notes || undefined,
        latitude: position?.latitude,
        longitude: position?.longitude,
      })
      selectPlace(place)
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'nearby', label: 'Nearby' },
    { id: 'recent', label: 'Recent' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'search', label: 'Search' },
    { id: 'new', label: 'Add New' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="bg-pack-surface flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl">
        <div className="border-pack-border flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-bold">Select Place</h3>
          <button onClick={onClose} className="text-pack-text-muted p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t.id ? 'bg-pack-accent text-black' : 'text-pack-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {tab === 'nearby' && (
            <div className="mb-3">
              {!position && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={requestLocation}
                  loading={loading}
                  className="w-full"
                >
                  <Navigation className="h-4 w-4" /> Use My Location (optional)
                </Button>
              )}
              {error && (
                <p className="text-pack-text-muted mt-2 text-xs">
                  {error}. You can still search or add places manually.
                </p>
              )}
            </div>
          )}

          {tab === 'search' && (
            <div className="relative mb-3">
              <Search className="text-pack-text-muted absolute top-3 left-3 h-4 w-4" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places..."
                className="bg-pack-card border-pack-border w-full rounded-xl border py-2.5 pr-3 pl-10 text-sm outline-none"
                autoFocus
              />
            </div>
          )}

          {tab === 'new' ? (
            <div className="space-y-3 py-2">
              <Input
                label="Place Name *"
                value={newPlace.name}
                onChange={(e) => setNewPlace((f) => ({ ...f, name: e.target.value }))}
                placeholder="DiA Events Shop"
              />
              <Input
                label="Address"
                value={newPlace.address}
                onChange={(e) => setNewPlace((f) => ({ ...f, address: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="City"
                  value={newPlace.city}
                  onChange={(e) => setNewPlace((f) => ({ ...f, city: e.target.value }))}
                />
                <Input
                  label="State"
                  value={newPlace.state}
                  onChange={(e) => setNewPlace((f) => ({ ...f, state: e.target.value }))}
                />
              </div>
              <Select
                label="Category"
                value={newPlace.category}
                onChange={(e) =>
                  setNewPlace((f) => ({ ...f, category: e.target.value as PlaceCategory }))
                }
                options={PLACE_CATEGORIES}
              />
              <Textarea
                label="Notes"
                value={newPlace.notes}
                onChange={(e) => setNewPlace((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
              {!position && (
                <Button variant="ghost" size="sm" onClick={requestLocation}>
                  <Navigation className="h-4 w-4" /> Add GPS from current location (optional)
                </Button>
              )}
              {position && (
                <p className="text-pack-success text-xs">
                  GPS will be saved with this place
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleCreate}
                loading={saving}
                disabled={!newPlace.name.trim()}
              >
                <Plus className="h-4 w-4" /> Create Place
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {places.length === 0 ? (
                <p className="text-pack-text-muted py-8 text-center text-sm">
                  {tab === 'nearby' && !position
                    ? 'Enable location to see nearby places'
                    : 'No places found'}
                </p>
              ) : (
                places.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => selectPlace(place)}
                    className={`hover:bg-pack-card-hover flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                      value === place.id ? 'bg-pack-accent-muted ring-pack-accent ring-1' : 'bg-pack-card'
                    }`}
                  >
                    <MapPin className="text-pack-accent mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{place.name}</p>
                      {formatLocation(place.city, place.state) && (
                        <p className="text-pack-text-muted text-sm">
                          {formatLocation(place.city, place.state)}
                        </p>
                      )}
                      {place.distanceKm != null && (
                        <p className="text-pack-accent text-xs">
                          {formatDistance(place.distanceKm)} away
                        </p>
                      )}
                    </div>
                    {place.isFavorite && (
                      <Star className="text-pack-accent h-4 w-4 fill-current" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
