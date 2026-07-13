import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Search, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { PlacePicker } from './PlacePicker'
import { useGeolocation } from '../../hooks/useGeolocation'
import { reverseGeocode } from '../../services/geocoding'
import { fetchNearbyMapboxPois, isMapboxConfigured, selectMapboxSuggestion } from '../../services/mapbox'
import { findOrCreatePlaceFromMapbox } from '../../db/repositories/places'
import {
  formatApproximateAreaLabel,
  formatEncounterLocationStatus,
} from '../../utils/encounterLocation'
import { formatDistance } from '../../utils/geo'
import type { EncounterLocation } from '../../types'
import type { MapboxPlaceResult } from '../../services/mapbox/types'

interface PlaceFieldProps {
  label: string
  description?: string
  value: EncounterLocation | null
  onChange: (value: EncounterLocation | null) => void
  /** Request GPS on mount and use coordinates as a temporary approximate location. */
  autoCaptureGps?: boolean
  /** Encounter supports approximate GPS; exact is place-only (e.g. Last Seen). */
  mode?: 'encounter' | 'exact'
}

export function PlaceField({
  label,
  description,
  value,
  onChange,
  autoCaptureGps = false,
  mode = 'encounter',
}: PlaceFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [nearbyPois, setNearbyPois] = useState<MapboxPlaceResult[]>([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [selectingPoi, setSelectingPoi] = useState(false)
  const { position, error, status, loading, requestLocation } = useGeolocation()
  const autoRequestedRef = useRef(false)
  const appliedPositionRef = useRef<string | null>(null)
  const labelRequestRef = useRef(0)
  const allowApproximate = mode === 'encounter'
  const shouldAutoCapture = allowApproximate && autoCaptureGps

  useEffect(() => {
    if (!shouldAutoCapture || autoRequestedRef.current) return
    autoRequestedRef.current = true
    requestLocation()
  }, [shouldAutoCapture, requestLocation])

  useEffect(() => {
    if (!shouldAutoCapture || !position || value?.kind === 'exact') return

    const positionKey = `${position.latitude},${position.longitude},${position.capturedAt}`
    if (appliedPositionRef.current === positionKey) return

    appliedPositionRef.current = positionKey
    onChange({
      kind: 'approximate',
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      capturedAt: position.capturedAt,
      source: 'gps',
      label: value?.kind === 'approximate' ? value.label : undefined,
    })
  }, [shouldAutoCapture, position, value, onChange])

  useEffect(() => {
    if (!position || value?.kind !== 'approximate') return

    const requestId = ++labelRequestRef.current
    void reverseGeocode(position.latitude, position.longitude).then((geocoded) => {
      if (requestId !== labelRequestRef.current) return
      const areaLabel = formatApproximateAreaLabel(geocoded)
      if (!areaLabel) return

      onChange({
        ...value,
        label: areaLabel,
      })
    })
  }, [position, value, onChange])

  useEffect(() => {
    if (!shouldAutoCapture || !position || value?.kind === 'exact' || !isMapboxConfigured()) return

    let cancelled = false
    setLoadingNearby(true)
    void fetchNearbyMapboxPois(position.latitude, position.longitude, 6)
      .then((results) => {
        if (!cancelled) setNearbyPois(results)
      })
      .finally(() => {
        if (!cancelled) setLoadingNearby(false)
      })

    return () => {
      cancelled = true
    }
  }, [shouldAutoCapture, position, value?.kind])

  const handleUseCurrentLocation = () => {
    if (!position) {
      requestLocation()
      return
    }

    onChange({
      kind: 'approximate',
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      capturedAt: position.capturedAt,
      source: 'gps',
      label: value?.kind === 'approximate' ? value.label : undefined,
    })
  }

  const handleExactPlace = (placeId: string | null, placeName: string) => {
    if (!placeId) {
      onChange(null)
      return
    }

    onChange({
      kind: 'exact',
      placeId,
      placeName,
      source: 'saved_place',
    })
  }

  const handleSelectNearbyPoi = async (result: MapboxPlaceResult) => {
    setSelectingPoi(true)
    try {
      const resolved = await selectMapboxSuggestion(result)
      const place = await findOrCreatePlaceFromMapbox(resolved)
      onChange({
        kind: 'exact',
        placeId: place.id,
        placeName: place.name,
        latitude: place.latitude ?? undefined,
        longitude: place.longitude ?? undefined,
        source: 'search_result',
      })
    } finally {
      setSelectingPoi(false)
    }
  }

  const statusLine = formatEncounterLocationStatus(value)
  const locationDenied = status === 'denied' || status === 'timeout' || status === 'unavailable'

  return (
    <div>
      <label className="text-pack-text-secondary mb-1.5 block text-sm font-medium">{label}</label>
      {description && (
        <p className="text-pack-text-muted -mt-1 mb-2 text-xs leading-relaxed">{description}</p>
      )}

      {value ? (
        <div className="bg-pack-card border-pack-border rounded-xl border px-3 py-2.5">
          <div className="flex items-start gap-3">
            <MapPin className="text-pack-accent mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-pack-text truncate text-sm font-medium">
                {value.kind === 'exact'
                  ? value.placeName
                  : value.label ?? 'Current location captured'}
              </p>
              {statusLine && (
                <p className="text-pack-text-muted mt-0.5 text-xs leading-relaxed">{statusLine}</p>
              )}
              {value.kind === 'approximate' && value.accuracy != null && (
                <p className="text-pack-text-muted mt-0.5 text-xs">
                  accuracy {Math.round(value.accuracy)} m
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-pack-text-muted hover:text-pack-text p-1"
              aria-label="Clear location"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-pack-text-muted mb-2 text-sm">
          {loading ? 'Finding your current location…' : 'No location selected'}
        </p>
      )}

      {(error || locationDenied) && !value && (
        <p className="text-pack-text-muted mb-2 text-xs leading-relaxed">
          {error ?? 'Location unavailable — you can still save without it.'}
        </p>
      )}

      {shouldAutoCapture && value?.kind === 'approximate' && (
        <div className="mt-3 space-y-2">
          <p className="text-pack-text-secondary text-xs font-medium uppercase tracking-wide">
            Nearby places
          </p>
          {loadingNearby ? (
            <p className="text-pack-text-muted text-xs">Loading nearby points of interest…</p>
          ) : nearbyPois.length === 0 ? (
            <p className="text-pack-text-muted text-xs">
              {isMapboxConfigured()
                ? 'No nearby POIs found — search for an exact place instead.'
                : 'Map search is unavailable — choose an exact place manually.'}
            </p>
          ) : (
            nearbyPois.map((result) => (
              <button
                key={result.mapboxId}
                type="button"
                disabled={selectingPoi}
                onClick={() => void handleSelectNearbyPoi(result)}
                className="hover:bg-pack-card-hover bg-pack-card border-pack-border flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors"
              >
                <MapPin className="text-pack-accent mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-pack-text text-sm font-medium">{result.name}</p>
                  <p className="text-pack-text-muted text-xs">
                    {result.fullAddress ?? result.address ?? result.category}
                    {result.distanceMeters != null &&
                      ` · ${formatDistance(result.distanceMeters / 1000)}`}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
          <Search className="h-4 w-4" />
          {value?.kind === 'exact' ? 'Change place' : 'Choose exact place'}
        </Button>
        {allowApproximate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUseCurrentLocation}
            loading={loading}
          >
            <Navigation className="h-4 w-4" />
            Use current location
          </Button>
        )}
      </div>

      {pickerOpen && (
        <PlacePicker
          value={value?.kind === 'exact' ? value.placeId : null}
          onChange={handleExactPlace}
          onClose={() => setPickerOpen(false)}
          proximity={
            position
              ? { latitude: position.latitude, longitude: position.longitude }
              : null
          }
        />
      )}
    </div>
  )
}
