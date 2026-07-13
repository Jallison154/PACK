import { useState } from 'react'
import { MapPin, Navigation, Search } from 'lucide-react'
import { Input, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { useGeolocation } from '../../hooks/useGeolocation'
import { searchPlacesMapbox, reverseGeocode } from '../../services/geocoding'
import type { GeocodeResult } from '../../services/geocoding'
import { PLACE_CATEGORIES } from '../../types'
import type { PlaceCategory, PlaceInput } from '../../types'
import type { Place } from '../../types'

export interface PlaceFormValues {
  name: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: string
  longitude: string
  category: PlaceCategory | ''
  notes: string
  mapboxId: string
  featureType: string
  poiCategories: string[]
  brand: string
  source: Place['source'] | ''
}

export function emptyPlaceForm(): PlaceFormValues {
  return {
    name: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    latitude: '',
    longitude: '',
    category: '',
    notes: '',
    mapboxId: '',
    featureType: '',
    poiCategories: [],
    brand: '',
    source: '',
  }
}

export function placeFormFromInput(input: PlaceInput | Place): PlaceFormValues {
  return {
    name: input.name,
    address: input.address ?? '',
    city: input.city ?? '',
    state: input.state ?? '',
    postalCode: input.postalCode ?? '',
    country: input.country ?? '',
    latitude: input.latitude != null ? String(input.latitude) : '',
    longitude: input.longitude != null ? String(input.longitude) : '',
    category: input.category ?? '',
    notes: input.notes ?? '',
    mapboxId: input.mapboxId ?? '',
    featureType: input.featureType ?? '',
    poiCategories: input.poiCategories ?? [],
    brand: input.brand ?? '',
    source: input.source ?? '',
  }
}

export function placeFormToInput(form: PlaceFormValues, isFavorite = false): PlaceInput {
  return {
    name: form.name.trim(),
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    postalCode: form.postalCode.trim() || undefined,
    country: form.country.trim() || undefined,
    latitude: form.latitude ? Number(form.latitude) : undefined,
    longitude: form.longitude ? Number(form.longitude) : undefined,
    category: form.category || undefined,
    notes: form.notes.trim() || undefined,
    mapboxId: form.mapboxId.trim() || undefined,
    featureType: form.featureType.trim() || undefined,
    poiCategories: form.poiCategories.length ? form.poiCategories : undefined,
    brand: form.brand.trim() || undefined,
    source: form.source || undefined,
    isFavorite,
  }
}

function applyGeocode(form: PlaceFormValues, result: GeocodeResult): PlaceFormValues {
  return {
    ...form,
    name: result.name || form.name,
    address: result.address ?? form.address,
    city: result.city ?? form.city,
    state: result.state ?? form.state,
    postalCode: result.postalCode ?? form.postalCode,
    country: result.country ?? form.country,
    latitude: String(result.latitude),
    longitude: String(result.longitude),
    mapboxId: result.mapboxId,
    featureType: result.featureType ?? '',
    poiCategories: result.poiCategories,
    brand: result.brand ?? '',
    source: 'mapbox',
  }
}

interface PlaceFormProps {
  form: PlaceFormValues
  onChange: (form: PlaceFormValues) => void
  showSearch?: boolean
}

export function PlaceForm({ form, onChange, showSearch = true }: PlaceFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const { position, error: geoError, loading: geoLoading, requestLocation } = useGeolocation()

  const update = (patch: Partial<PlaceFormValues>) => {
    onChange({ ...form, ...patch })
  }

  const runSearch = async () => {
    if (searchQuery.trim().length < 2) return
    setSearching(true)
    setSearchError(null)
    try {
      const found = await searchPlacesMapbox(
        searchQuery,
        position ? { latitude: position.latitude, longitude: position.longitude } : undefined,
      )
      setResults(found)
      if (found.length === 0) setSearchError('No results. Try a business name or full address.')
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const useCurrentLocation = async () => {
    if (!position) {
      requestLocation()
      return
    }
    update({
      latitude: String(position.latitude),
      longitude: String(position.longitude),
    })
    try {
      const result = await reverseGeocode(position.latitude, position.longitude)
      if (result) onChange(applyGeocode(form, result))
    } catch {
      // Coordinates still saved without reverse geocode
    }
  }

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="border-pack-border rounded-2xl border p-4">
          <p className="text-pack-text-secondary mb-2 text-sm font-medium">Search for a place</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-pack-text-muted absolute top-3 left-3 h-4 w-4" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void runSearch())}
                placeholder="Pub Station Billings MT, convention center..."
                className="bg-pack-card border-pack-border w-full rounded-xl border py-2.5 pr-3 pl-10 text-sm outline-none"
              />
            </div>
            <Button variant="secondary" onClick={() => void runSearch()} loading={searching}>
              Search
            </Button>
          </div>
          {searchError && <p className="text-pack-danger mt-2 text-xs">{searchError}</p>}
          {results.length > 0 && (
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.mapboxId}
                  type="button"
                  onClick={() => {
                    onChange(applyGeocode(form, result))
                    setResults([])
                    setSearchQuery('')
                  }}
                  className="hover:bg-pack-card-hover bg-pack-card flex w-full items-start gap-2 rounded-xl p-3 text-left"
                >
                  <MapPin className="text-pack-accent mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{result.name}</p>
                    <p className="text-pack-text-muted text-xs leading-relaxed">{result.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-pack-text-muted mt-2 text-xs">Powered by Mapbox</p>
        </div>
      )}

      <Button variant="secondary" className="w-full" onClick={() => void useCurrentLocation()} loading={geoLoading}>
        <Navigation className="h-4 w-4" />
        {position ? 'Use My Current Location' : 'Enable Current Location'}
      </Button>
      {geoError && (
        <p className="text-pack-text-muted text-xs">Location unavailable. You can still enter a place manually.</p>
      )}

      <Input
        label="Place Name *"
        value={form.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder="Las Vegas Convention Center"
      />
      <Input
        label="Address"
        value={form.address}
        onChange={(e) => update({ address: e.target.value })}
        placeholder="3150 Paradise Rd"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" value={form.city} onChange={(e) => update({ city: e.target.value })} />
        <Input label="State" value={form.state} onChange={(e) => update({ state: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Latitude"
          value={form.latitude}
          onChange={(e) => update({ latitude: e.target.value })}
          placeholder="45.7833"
        />
        <Input
          label="Longitude"
          value={form.longitude}
          onChange={(e) => update({ longitude: e.target.value })}
          placeholder="-108.5007"
        />
      </div>
      <Select
        label="Category"
        value={form.category}
        onChange={(e) => update({ category: e.target.value as PlaceCategory })}
        options={PLACE_CATEGORIES}
      />
      <Textarea
        label="Notes"
        value={form.notes}
        onChange={(e) => update({ notes: e.target.value })}
        rows={3}
      />
    </div>
  )
}
