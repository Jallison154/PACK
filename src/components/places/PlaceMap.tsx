import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
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
  onPlaceClick?: (place: MapPlace) => void
  scrollWheelZoom?: boolean
}

function FitBounds({ places }: { places: MapPlace[] }) {
  const map = useMap()
  useEffect(() => {
    const coords = places
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [p.latitude!, p.longitude!] as [number, number])
    if (coords.length === 1) {
      map.setView(coords[0], 14)
    } else if (coords.length > 1) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
    }
  }, [map, places])
  return null
}

export function PlaceMap({
  places,
  height = '320px',
  center = [39.8283, -98.5795],
  zoom = 4,
  singlePlaceId,
  onPlaceClick,
  scrollWheelZoom = true,
}: PlaceMapProps) {
  const mappable = places.filter((p) => p.latitude != null && p.longitude != null)

  if (mappable.length === 0) {
    return (
      <div
        className="bg-pack-card border-pack-border flex items-center justify-center rounded-2xl border text-sm"
        style={{ height }}
      >
        <p className="text-pack-text-muted px-4 text-center">
          No GPS coordinates yet. Add latitude/longitude to places to see them on the map.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds places={mappable} />
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
              <div className="text-sm">
                <p className="font-bold">{place.name}</p>
                {place.city && <p className="text-gray-600">{place.city}</p>}
                {place.metCount != null && <p>{place.metCount} met here</p>}
                {place.interactionCount != null && (
                  <p>{place.interactionCount} interactions</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
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
