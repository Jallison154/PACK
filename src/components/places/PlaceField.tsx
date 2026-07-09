import { useState } from 'react'
import { MapPin, Navigation, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { PlacePicker } from './PlacePicker'
import { useGeolocation } from '../../hooks/useGeolocation'
import { createPlace } from '../../db/repositories/places'
import { reverseGeocode } from '../../services/geocoding'

interface PlaceFieldProps {
  label: string
  description?: string
  placeId: string | null
  placeName: string
  onChange: (placeId: string | null, placeName: string) => void
}

export function PlaceField({
  label,
  description,
  placeId,
  placeName,
  onChange,
}: PlaceFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const { position, loading, requestLocation } = useGeolocation()

  const handleCurrentLocation = async () => {
    if (!position) {
      requestLocation()
      return
    }
    setCreating(true)
    try {
      const geocoded = await reverseGeocode(position.latitude, position.longitude)
      const place = await createPlace({
        name: geocoded?.name ?? 'Current Location',
        address: geocoded?.address ?? undefined,
        city: geocoded?.city ?? undefined,
        state: geocoded?.state ?? undefined,
        latitude: position.latitude,
        longitude: position.longitude,
      })
      onChange(place.id, place.name)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <label className="text-pack-text-secondary mb-1.5 block text-sm font-medium">{label}</label>
      {description && (
        <p className="text-pack-text-muted -mt-1 mb-2 text-xs leading-relaxed">{description}</p>
      )}

      {placeName ? (
        <div className="bg-pack-card border-pack-border flex items-center gap-3 rounded-xl border px-3 py-2.5">
          <MapPin className="text-pack-accent h-4 w-4 shrink-0" />
          <span className="text-pack-text min-w-0 flex-1 truncate text-sm">{placeName}</span>
          <button
            type="button"
            onClick={() => onChange(null, '')}
            className="text-pack-text-muted hover:text-pack-text p-1"
            aria-label="Clear place"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="text-pack-text-muted mb-2 text-sm">No place selected</p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
          {placeId ? 'Change Place' : 'Select Place'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void handleCurrentLocation()} loading={loading || creating}>
          <Navigation className="h-4 w-4" /> Use Current Location
        </Button>
      </div>

      {pickerOpen && (
        <PlacePicker
          value={placeId}
          onChange={onChange}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
