import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Star, Navigation, Search, Plus, X, Globe, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input, Select, Textarea } from '../ui/Input'
import { useGeolocation } from '../../hooks/useGeolocation'
import {
  findOrCreatePlaceFromMapbox,
  getSavedPlaces,
  getRecentPlaces,
  searchPlaces,
  createPlace,
} from '../../db/repositories/places'
import {
  clearNearbyCache,
  fetchNearbyMapboxPois,
  isMapboxConfigured,
  resetMapboxSearchSession,
  selectMapboxSuggestion,
  suggestMapboxPlaces,
} from '../../services/mapbox'
import type { MapboxPlaceResult } from '../../services/mapbox/types'
import { formatDistance } from '../../utils/geo'
import { formatLocation } from '../../utils/format'
import { getPlaceCategoryLabel } from '../../types'
import { PLACE_CATEGORIES } from '../../types'
import type { Place, PlaceCategory } from '../../types'

interface PlacePickerProps {
  value: string | null
  onChange: (placeId: string | null, placeName: string) => void
  onClose: () => void
  /** When provided, Nearby + search bias to these coordinates. */
  proximity?: { latitude: number; longitude: number } | null
}

type Tab = 'nearby' | 'recent' | 'saved' | 'search' | 'new'

function formatPoiCategory(category: string | null): string {
  if (!category) return 'Point of interest'
  return category.replace(/_/g, ' ')
}

export function PlacePicker({ value, onChange, onClose, proximity }: PlacePickerProps) {
  const [tab, setTab] = useState<Tab>(proximity ? 'nearby' : 'recent')
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([])
  const [nearbyPois, setNearbyPois] = useState<MapboxPlaceResult[]>([])
  const [searchResults, setSearchResults] = useState<MapboxPlaceResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { position, error, loading, requestLocation } = useGeolocation()
  const lastNearbyKeyRef = useRef<string | null>(null)
  const nearbyCountRef = useRef(0)

  const activeProximity = useMemo(() => {
    if (proximity) return proximity
    if (position) return { latitude: position.latitude, longitude: position.longitude }
    return null
  }, [proximity, position])

  const [newPlace, setNewPlace] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    category: '' as PlaceCategory | '',
    notes: '',
  })

  const loadNearby = useCallback(async (latitude: number, longitude: number, force = false) => {
    if (!isMapboxConfigured()) {
      setNearbyError('Mapbox is not configured.')
      setNearbyPois([])
      return
    }

    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
    if (!force && lastNearbyKeyRef.current === key && nearbyCountRef.current > 0) return

    setLoadingNearby(true)
    setNearbyError(null)
    try {
      if (force) clearNearbyCache()
      const results = await fetchNearbyMapboxPois(latitude, longitude, 20)
      setNearbyPois(results)
      nearbyCountRef.current = results.length
      lastNearbyKeyRef.current = key
    } catch {
      setNearbyError('Could not load nearby places right now.')
      setNearbyPois([])
      nearbyCountRef.current = 0
    } finally {
      setLoadingNearby(false)
    }
  }, [])

  useEffect(() => {
    if (!proximity && !position) {
      requestLocation()
    }
  }, [proximity, position, requestLocation])

  useEffect(() => {
    if (tab === 'recent') getRecentPlaces(15).then(setSavedPlaces)
    if (tab === 'saved') getSavedPlaces(30).then(setSavedPlaces)
    if (tab === 'nearby' && activeProximity) {
      void loadNearby(activeProximity.latitude, activeProximity.longitude)
    }
    if (tab === 'nearby' && !activeProximity) {
      setNearbyPois([])
    }
    if (tab === 'search' && !searchQuery.trim()) {
      setSearchResults([])
      setSearchError(null)
    }
  }, [tab, activeProximity, searchQuery, loadNearby])

  useEffect(() => {
    if (tab !== 'search' || !searchQuery.trim()) return

    const timer = window.setTimeout(async () => {
      if (!isMapboxConfigured()) {
        setSearchError('Mapbox is not configured.')
        setSearchResults([])
        return
      }

      setLoadingSearch(true)
      setSearchError(null)
      try {
        const local = await searchPlaces(searchQuery)
        setSavedPlaces(local)
        const web = await suggestMapboxPlaces(searchQuery, activeProximity ?? undefined)
        setSearchResults(web)
      } catch {
        setSearchError('Search is temporarily unavailable.')
        setSearchResults([])
      } finally {
        setLoadingSearch(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [tab, searchQuery, activeProximity])

  const selectPlace = (place: Place) => {
    onChange(place.id, place.name)
    onClose()
  }

  const selectMapboxResult = async (result: MapboxPlaceResult) => {
    setSaving(true)
    try {
      const resolved = await selectMapboxSuggestion(result)
      const place = await findOrCreatePlaceFromMapbox(resolved)
      selectPlace(place)
    } finally {
      setSaving(false)
    }
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
        latitude: activeProximity?.latitude,
        longitude: activeProximity?.longitude,
        source: 'manual',
      })
      selectPlace(place)
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'nearby', label: 'Nearby' },
    { id: 'recent', label: 'Recent' },
    { id: 'saved', label: 'Saved Places' },
    { id: 'search', label: 'Search' },
    { id: 'new', label: 'Add New' },
  ]

  return (
    <div className="auth-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="bg-pack-surface flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl">
        <div className="border-pack-border flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-bold">Select Place</h3>
          <button type="button" onClick={onClose} className="text-pack-text-muted p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 py-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === item.id ? 'bg-pack-accent text-black' : 'text-pack-text-secondary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {tab === 'nearby' && (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    requestLocation()
                    if (position) {
                      void loadNearby(position.latitude, position.longitude, true)
                    }
                  }}
                  loading={loading}
                  className="flex-1"
                >
                  <Navigation className="h-4 w-4" /> Use My Current Location
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!activeProximity || loadingNearby}
                  onClick={() => {
                    if (!activeProximity) return
                    void loadNearby(activeProximity.latitude, activeProximity.longitude, true)
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-pack-text-muted text-xs leading-relaxed">
                Nearby shows real points of interest around your current location — not your saved
                Pack places.
              </p>
              {(error || nearbyError) && (
                <p className="text-pack-text-muted text-xs leading-relaxed">
                  {error ?? nearbyError} You can still search or add places manually.
                </p>
              )}
            </div>
          )}

          {tab === 'search' && (
            <div className="relative mb-3">
              <Search className="text-pack-text-muted absolute top-3 left-3 h-4 w-4" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  resetMapboxSearchSession()
                  setSearchQuery(e.target.value)
                }}
                placeholder="Pub Station, hotel, convention center..."
                className="bg-pack-card border-pack-border text-pack-text w-full rounded-xl border py-2.5 pr-3 pl-10 text-sm outline-none"
                autoFocus
              />
              <p className="text-pack-text-muted mt-1.5 text-xs">
                Search Mapbox for businesses, venues, and addresses near you
              </p>
            </div>
          )}

          {tab === 'new' ? (
            <div className="space-y-3 py-2">
              <Input
                label="Place Name *"
                value={newPlace.name}
                onChange={(e) => setNewPlace((form) => ({ ...form, name: e.target.value }))}
                placeholder="DiA Events Shop"
              />
              <Input
                label="Address"
                value={newPlace.address}
                onChange={(e) => setNewPlace((form) => ({ ...form, address: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="City"
                  value={newPlace.city}
                  onChange={(e) => setNewPlace((form) => ({ ...form, city: e.target.value }))}
                />
                <Input
                  label="State"
                  value={newPlace.state}
                  onChange={(e) => setNewPlace((form) => ({ ...form, state: e.target.value }))}
                />
              </div>
              <Select
                label="Category"
                value={newPlace.category}
                onChange={(e) =>
                  setNewPlace((form) => ({ ...form, category: e.target.value as PlaceCategory }))
                }
                options={PLACE_CATEGORIES}
              />
              <Textarea
                label="Notes"
                value={newPlace.notes}
                onChange={(e) => setNewPlace((form) => ({ ...form, notes: e.target.value }))}
                rows={2}
              />
              {!activeProximity && (
                <Button variant="ghost" size="sm" onClick={requestLocation}>
                  <Navigation className="h-4 w-4" /> Add GPS from current location (optional)
                </Button>
              )}
              {activeProximity && (
                <p className="text-pack-success text-xs">GPS will be saved with this place</p>
              )}
              <Button
                className="w-full"
                onClick={() => void handleCreate()}
                loading={saving}
                disabled={!newPlace.name.trim()}
              >
                <Plus className="h-4 w-4" /> Create Place
              </Button>
            </div>
          ) : tab === 'nearby' ? (
            <div className="space-y-2">
              {loadingNearby ? (
                <p className="text-pack-text-muted py-8 text-center text-sm">Loading nearby places…</p>
              ) : nearbyPois.length === 0 ? (
                <p className="text-pack-text-muted py-8 text-center text-sm">
                  {!activeProximity
                    ? 'Enable location to see nearby points of interest'
                    : 'No nearby places found — try search instead'}
                </p>
              ) : (
                nearbyPois.map((result) => (
                  <button
                    key={result.mapboxId}
                    type="button"
                    onClick={() => void selectMapboxResult(result)}
                    disabled={saving}
                    className="hover:bg-pack-card-hover bg-pack-card flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors"
                  >
                    <Globe className="text-pack-accent mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{result.name}</p>
                      <p className="text-pack-text-muted text-sm">
                        {formatPoiCategory(result.category)}
                        {result.fullAddress ? ` · ${result.fullAddress}` : ''}
                      </p>
                      {result.distanceMeters != null && (
                        <p className="text-pack-accent text-xs">
                          {formatDistance(result.distanceMeters / 1000)} away
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : tab === 'search' ? (
            <div className="space-y-2">
              {loadingSearch ? (
                <p className="text-pack-text-muted py-8 text-center text-sm">Searching…</p>
              ) : (
                <>
                  {savedPlaces.length > 0 && (
                    <>
                      <p className="text-pack-text-muted pt-1 text-xs font-medium uppercase">
                        Saved Places
                      </p>
                      {savedPlaces.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() => selectPlace(place)}
                          className={`hover:bg-pack-card-hover flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                            value === place.id
                              ? 'bg-pack-accent-muted ring-pack-accent ring-1'
                              : 'bg-pack-card'
                          }`}
                        >
                          <MapPin className="text-pack-text-muted mt-0.5 h-5 w-5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{place.name}</p>
                            {formatLocation(place.city, place.state) && (
                              <p className="text-pack-text-muted text-sm">
                                {formatLocation(place.city, place.state)}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {searchResults.length > 0 && (
                    <>
                      <p className="text-pack-text-muted pt-2 text-xs font-medium uppercase">
                        Search Results
                      </p>
                      {searchResults.map((result) => (
                        <button
                          key={result.mapboxId}
                          type="button"
                          onClick={() => void selectMapboxResult(result)}
                          disabled={saving}
                          className="hover:bg-pack-card-hover bg-pack-card flex w-full items-start gap-3 rounded-xl p-3 text-left"
                        >
                          <Globe className="text-pack-accent mt-0.5 h-5 w-5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{result.name}</p>
                            <p className="text-pack-text-muted text-sm leading-relaxed">
                              {result.fullAddress ?? result.address ?? formatPoiCategory(result.category)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {savedPlaces.length === 0 && searchResults.length === 0 && (
                    <p className="text-pack-text-muted py-8 text-center text-sm">
                      {searchError ?? 'No places found'}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {savedPlaces.length === 0 ? (
                <p className="text-pack-text-muted py-8 text-center text-sm">No places found</p>
              ) : (
                savedPlaces.map((place) => (
                  <button
                    key={place.id}
                    type="button"
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
                      {place.category && (
                        <p className="text-pack-text-muted text-xs">
                          {getPlaceCategoryLabel(place.category)}
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
