import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { formatDate } from '../../utils/format'
import type { Place } from '../../types'

const defaultIcon = new L.Icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const accentIcon = new L.Icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -38],
  shadowSize: [46, 46],
  className: 'pack-map-pin-accent',
})

export interface MapPlace extends Place {
  metCount?: number
  lastSeenCount?: number
  interactionCount?: number
  lastInteractionDate?: string | null
}

interface PlaceMapProps {
  places: MapPlace[]
  height?: string
  center?: [number, number]
  zoom?: number
  singlePlaceId?: string
  userLocation?: { latitude: number; longitude: number } | null
  onPlaceClick?: (place: MapPlace) => void
  onOpenPlace?: (placeId: string) => void
  scrollWheelZoom?: boolean
  emptyMessage?: string
}

function FitBounds({
  places,
  userLocation,
}: {
  places: MapPlace[]
  userLocation?: { latitude: number; longitude: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    const coords = places
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [p.latitude!, p.longitude!] as [number, number])

    if (userLocation) {
      coords.push([userLocation.latitude, userLocation.longitude])
    }

    if (coords.length === 1) {
      map.setView(coords[0], 14)
    } else if (coords.length > 1) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
    }
  }, [map, places, userLocation])
  return null
}

export function PlaceMap({
  places,
  height = '320px',
  center = [39.8283, -98.5795],
  zoom = 4,
  singlePlaceId,
  userLocation,
  onPlaceClick,
  onOpenPlace,
  scrollWheelZoom = true,
  emptyMessage,
}: PlaceMapProps) {
  const mappable = places.filter((p) => p.latitude != null && p.longitude != null)
  const hasPins = mappable.length > 0
  const mapCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : hasPins
      ? [mappable[0].latitude!, mappable[0].longitude!]
      : center
  const mapZoom = userLocation || hasPins ? 12 : zoom

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds places={mappable} userLocation={userLocation} />
        {userLocation && (
          <CircleMarker
            center={[userLocation.latitude, userLocation.longitude]}
            radius={8}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}
          />
        )}
        {mappable.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude!, place.longitude!]}
            icon={place.id === singlePlaceId ? accentIcon : defaultIcon}
            eventHandlers={{
              click: () => onPlaceClick?.(place),
            }}
          >
            <Popup>
              <div className="min-w-[160px] text-sm">
                <p className="font-bold">{place.name}</p>
                {place.address && <p className="text-gray-600">{place.address}</p>}
                {(place.city || place.state) && (
                  <p className="text-gray-600">
                    {[place.city, place.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {place.metCount != null && <p>{place.metCount} met here</p>}
                {place.lastSeenCount != null && <p>{place.lastSeenCount} last seen here</p>}
                {place.lastInteractionDate && (
                  <p className="text-gray-500">Last trail: {formatDate(place.lastInteractionDate)}</p>
                )}
                {onOpenPlace && (
                  <button
                    type="button"
                    className="text-pack-accent mt-2 font-medium"
                    onClick={() => onOpenPlace(place.id)}
                  >
                    Open Place
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!hasPins && emptyMessage && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 p-6">
          <p className="text-pack-text max-w-xs rounded-2xl bg-black/70 px-4 py-3 text-center text-sm leading-relaxed">
            {emptyMessage}
          </p>
        </div>
      )}
    </div>
  )
}

export function PlaceMapPreview({
  place,
  height = '160px',
}: {
  place: Place | null
  height?: string
}) {
  if (!place?.latitude || !place?.longitude) return null
  return (
    <PlaceMap
      places={[place]}
      height={height}
      center={[place.latitude, place.longitude]}
      zoom={14}
      singlePlaceId={place.id}
      scrollWheelZoom={false}
    />
  )
}
