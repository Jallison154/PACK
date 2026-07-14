import { MobilePageShell } from '../components/layout/MobilePageShell'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, Navigation } from 'lucide-react'
import { PackMap } from '../components/places/PackMap'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchBar } from '../components/ui/SearchBar'
import { useGeolocation } from '../hooks/useGeolocation'
import { usePackDataRefresh } from '../hooks/usePackDataRefresh'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { mapboxConfigured } from '../services/mapbox/config'
import { getAllPlaces, getPlacesWithCoordinates } from '../db/repositories/places'
import { formatLocation } from '../utils/format'
import type { PlaceWithStats } from '../types'

function placeMatchesQuery(place: PlaceWithStats, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    place.name,
    place.address,
    place.city,
    place.state,
    place.category,
    place.notes,
    place.postalCode,
    place.country,
    place.brand,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function PlacesPage() {
  const navigate = useNavigate()
  const [places, setPlaces] = useState<PlaceWithStats[]>([])
  const [mapPlaces, setMapPlaces] = useState<PlaceWithStats[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PlaceWithStats | null>(null)
  const listItemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const { position, loading: geoLoading, requestLocation } = useGeolocation()
  const mapConfigured = mapboxConfigured
  const debouncedQuery = useDebouncedValue(query, 150)

  const reload = useCallback(async () => {
    const [all, mapped] = await Promise.all([getAllPlaces(), getPlacesWithCoordinates()])
    setPlaces(all)
    setMapPlaces(mapped)
  }, [])

  useEffect(() => {
    void reload()
    requestLocation()
  }, [reload, requestLocation])

  usePackDataRefresh(reload)

  const filteredPlaces = useMemo(
    () => places.filter((place) => placeMatchesQuery(place, debouncedQuery)),
    [places, debouncedQuery],
  )

  const filteredMapPlaces = useMemo(
    () => mapPlaces.filter((place) => placeMatchesQuery(place, debouncedQuery)),
    [mapPlaces, debouncedQuery],
  )

  useEffect(() => {
    if (!selected) return
    if (!filteredPlaces.some((place) => place.id === selected.id)) {
      setSelected(null)
      return
    }
    listItemRefs.current[selected.id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [selected, filteredPlaces])

  const selectPlace = (place: PlaceWithStats) => {
    setSelected(place)
  }

  const empty = places.length === 0
  const noSearchMatches = !empty && filteredPlaces.length === 0

  return (
    <MobilePageShell top={false} padded={false}>
      <div className="page-top-shell page-px page-header-gap mx-auto w-full max-w-lg md:max-w-5xl xl:max-w-[1500px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-pack-text text-2xl font-semibold tracking-tight">Places</h1>
            <p className="text-pack-text-muted mt-0.5 text-sm">
              {empty
                ? 'Map the places connected to your Pack.'
                : debouncedQuery.trim()
                  ? `${filteredPlaces.length} of ${places.length} ${places.length === 1 ? 'place' : 'places'}`
                  : `${places.length} ${places.length === 1 ? 'place' : 'places'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={requestLocation}
              loading={geoLoading}
              className="hidden sm:inline-flex"
            >
              <Navigation className="h-4 w-4" />
              Locate
            </Button>
            <Button size="sm" onClick={() => navigate('/places/add')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>

        {!empty && (
          <div className="mt-4">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search places by name, city, or address…"
              embedded
            />
          </div>
        )}
      </div>

      <div className="page-px mx-auto w-full max-w-lg pb-8 md:max-w-5xl xl:max-w-[1500px]">
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
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={requestLocation}
                  loading={geoLoading}
                >
                  <Navigation className="h-4 w-4" /> Use My Current Location
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,400px)] lg:items-start lg:gap-6 lg:space-y-0">
            <div className="space-y-3">
              {!mapConfigured && (
                <p className="text-pack-text-muted rounded-xl border border-[#2a2a2a] bg-[#171717] px-4 py-3 text-sm">
                  Mapbox is not configured. You can still add and manage places manually.
                </p>
              )}

              <div className="border-pack-border h-[min(52vh,420px)] overflow-hidden rounded-2xl border bg-[#171717] lg:h-[min(70vh,640px)]">
                <PackMap
                  places={filteredMapPlaces}
                  height="100%"
                  currentLocation={position}
                  selectedPlace={selected?.id ?? null}
                  fitBounds={filteredMapPlaces.length > 1 && !position && !debouncedQuery.trim()}
                  onPlaceSelect={(place) => {
                    const full = filteredPlaces.find((item) => item.id === place.id)
                    selectPlace(full ?? (place as PlaceWithStats))
                  }}
                  onOpenPlace={(placeId) => navigate(`/places/${placeId}`)}
                  emptyMessage={
                    filteredMapPlaces.length === 0
                      ? debouncedQuery.trim()
                        ? 'No matching places with map pins.'
                        : 'Your saved places need coordinates to appear as pins. Add GPS when creating a place or search by address.'
                      : undefined
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3 px-1 sm:hidden">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={requestLocation}
                  loading={geoLoading}
                >
                  <Navigation className="h-4 w-4" /> Use My Current Location
                </Button>
              </div>

              {selected && (
                <div className="border-pack-border rounded-2xl border bg-[#171717] px-4 py-3 lg:hidden">
                  <h3 className="text-pack-text text-base font-medium">{selected.name}</h3>
                  {(selected.address || formatLocation(selected.city, selected.state)) && (
                    <p className="text-pack-text-muted mt-0.5 text-sm">
                      {[selected.address, formatLocation(selected.city, selected.state)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  <p className="text-pack-text-muted mt-1.5 text-xs">
                    {selected.metCount} met · {selected.lastSeenCount} last seen ·{' '}
                    {selected.interactionCount} trail entries
                  </p>
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    onClick={() => navigate(`/places/${selected.id}`)}
                  >
                    Open Place
                  </Button>
                </div>
              )}
            </div>

            <div className="border-pack-border overflow-hidden rounded-2xl border bg-[#171717] lg:sticky lg:top-24 lg:max-h-[min(70vh,640px)] lg:flex lg:flex-col">
              <div className="border-pack-border flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h2 className="text-pack-text text-sm font-medium">
                    {debouncedQuery.trim() ? 'Matching Places' : 'All Places'}
                  </h2>
                  <p className="text-pack-text-muted text-xs">
                    Tap a place to highlight it on the map
                  </p>
                </div>
              </div>

              <div className="divide-pack-border/40 divide-y overflow-y-auto lg:flex-1">
                {noSearchMatches ? (
                  <div className="px-4 py-8">
                    <EmptyState
                      message={`No places match "${debouncedQuery.trim()}"`}
                      hint="Try a city, address, or part of the place name."
                      icon={<MapPin className="h-7 w-7" />}
                    />
                  </div>
                ) : (
                  filteredPlaces.map((place) => {
                    const isSelected = selected?.id === place.id
                    return (
                      <button
                        key={place.id}
                        type="button"
                        ref={(el) => {
                          listItemRefs.current[place.id] = el
                        }}
                        onClick={() => selectPlace(place)}
                        onDoubleClick={() => navigate(`/places/${place.id}`)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'bg-pack-accent/10'
                            : 'hover:bg-pack-card-hover/50'
                        }`}
                      >
                        <MapPin
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-pack-accent' : 'text-pack-text-muted'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-pack-text truncate font-medium">{place.name}</p>
                          {formatLocation(place.city, place.state) ? (
                            <p className="text-pack-text-muted truncate text-sm">
                              {formatLocation(place.city, place.state)}
                            </p>
                          ) : place.address ? (
                            <p className="text-pack-text-muted truncate text-sm">{place.address}</p>
                          ) : null}
                          <p className="text-pack-text-muted/80 mt-0.5 text-[11px]">
                            {place.metCount} met · {place.lastSeenCount} last seen
                          </p>
                        </div>
                        {isSelected && (
                          <button
                            type="button"
                            className="text-pack-accent shrink-0 text-xs font-medium"
                            onClick={(event) => {
                              event.stopPropagation()
                              navigate(`/places/${place.id}`)
                            }}
                          >
                            Open
                          </button>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MobilePageShell>
  )
}
