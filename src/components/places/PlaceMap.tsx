import { useCallback, useEffect, useMemo, useState } from 'react'
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapMouseEvent,
} from 'react-map-gl/mapbox'
import type { FeatureCollection, Point } from 'geojson'
import type { GeoJSONSource } from 'mapbox-gl'
import { formatDate } from '../../utils/format'
import { getMapboxAccessToken } from '../../lib/env'
import {
  MAPBOX_DEFAULT_CENTER,
  MAPBOX_STYLE,
  MAPBOX_USER_ZOOM,
  isMapboxConfigured,
} from '../../services/mapbox'
import type { Place } from '../../types'
import 'mapbox-gl/dist/mapbox-gl.css'

export interface MapPlace extends Place {
  metCount?: number
  lastSeenCount?: number
  interactionCount?: number
  lastInteractionDate?: string | null
}

interface PlaceMapProps {
  places: MapPlace[]
  height?: string
  center?: { longitude: number; latitude: number }
  zoom?: number
  singlePlaceId?: string
  userLocation?: { latitude: number; longitude: number; accuracy?: number } | null
  selectedPlaceId?: string | null
  onPlaceClick?: (place: MapPlace) => void
  onOpenPlace?: (placeId: string) => void
  scrollWheelZoom?: boolean
  emptyMessage?: string
  showClustering?: boolean
}

interface PopupState {
  place: MapPlace
  longitude: number
  latitude: number
}

function Pin({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-white shadow-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 0 2px rgba(255,106,45,0.25)`,
      }}
    />
  )
}

export function PlaceMap({
  places,
  height = '320px',
  center,
  zoom,
  singlePlaceId,
  userLocation,
  selectedPlaceId,
  onPlaceClick,
  onOpenPlace,
  scrollWheelZoom = true,
  emptyMessage,
  showClustering = true,
}: PlaceMapProps) {
  const token = getMapboxAccessToken()
  const mappable = places.filter((place) => place.latitude != null && place.longitude != null)
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [viewState, setViewState] = useState({
    longitude: center?.longitude ?? userLocation?.longitude ?? MAPBOX_DEFAULT_CENTER.longitude,
    latitude: center?.latitude ?? userLocation?.latitude ?? MAPBOX_DEFAULT_CENTER.latitude,
    zoom: zoom ?? (userLocation || mappable.length ? MAPBOX_USER_ZOOM : MAPBOX_DEFAULT_CENTER.zoom),
  })

  useEffect(() => {
    if (userLocation) {
      setViewState((current) => ({
        ...current,
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        zoom: MAPBOX_USER_ZOOM,
      }))
      return
    }

    if (mappable.length === 1) {
      setViewState({
        longitude: mappable[0].longitude!,
        latitude: mappable[0].latitude!,
        zoom: MAPBOX_USER_ZOOM,
      })
    }
  }, [userLocation, mappable])

  const geojson = useMemo<FeatureCollection<Point>>(() => {
    return {
      type: 'FeatureCollection',
      features: mappable.map((place) => ({
        type: 'Feature',
        properties: {
          id: place.id,
          cluster: false,
        },
        geometry: {
          type: 'Point',
          coordinates: [place.longitude!, place.latitude!],
        },
      })),
    }
  }, [mappable])

  const onClusterClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0]
    if (!feature) return

    const clusterId = feature.properties?.cluster_id
    const mapboxSource = event.target.getSource('pack-places') as GeoJSONSource | undefined
    if (!mapboxSource || clusterId == null) return

    mapboxSource.getClusterExpansionZoom(clusterId, (error, expansionZoom) => {
      if (error || expansionZoom == null) return
      const [lng, lat] = (feature.geometry as Point).coordinates
      event.target.easeTo({ center: [lng, lat], zoom: expansionZoom })
    })
  }, [])

  if (!isMapboxConfigured() || !token) {
    return (
      <div
        className="bg-pack-card border-pack-border flex items-center justify-center rounded-2xl border p-6 text-center"
        style={{ height }}
      >
        <p className="text-pack-text-secondary text-sm leading-relaxed">
          Map services are not configured.
        </p>
      </div>
    )
  }

  const hasPins = mappable.length > 0

  return (
    <div className="pack-map-shell relative overflow-hidden rounded-2xl" style={{ height }}>
      <Map
        mapboxAccessToken={token}
        mapStyle={MAPBOX_STYLE}
        {...viewState}
        onMove={(event) => setViewState(event.viewState)}
        onClick={showClustering ? onClusterClick : undefined}
        interactiveLayerIds={showClustering ? ['pack-clusters', 'pack-unclustered'] : undefined}
        scrollZoom={scrollWheelZoom}
        style={{ width: '100%', height: '100%' }}
        attributionControl
      >
        <NavigationControl position="top-right" visualizePitch={false} showCompass={false} />

        {showClustering && hasPins && (
          <Source
            id="pack-places"
            type="geojson"
            data={geojson}
            cluster
            clusterMaxZoom={14}
            clusterRadius={48}
          >
            <Layer
              id="pack-clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': '#262626',
                'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 24],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FF6A2D',
              }}
            />
            <Layer
              id="pack-cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': '{point_count_abbreviated}',
                'text-size': 12,
              }}
              paint={{ 'text-color': '#FFFFFF' }}
            />
            <Layer
              id="pack-unclustered"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': [
                  'case',
                  ['==', ['get', 'id'], selectedPlaceId ?? singlePlaceId ?? ''],
                  '#FF6A2D',
                  '#71717A',
                ],
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
              }}
            />
          </Source>
        )}

        {!showClustering &&
          mappable.map((place) => (
            <Marker
              key={place.id}
              longitude={place.longitude!}
              latitude={place.latitude!}
              anchor="center"
              onClick={(event) => {
                event.originalEvent.stopPropagation()
                onPlaceClick?.(place)
                setPopup({
                  place,
                  longitude: place.longitude!,
                  latitude: place.latitude!,
                })
              }}
            >
              <Pin
                color={
                  place.id === selectedPlaceId || place.id === singlePlaceId ? '#FF6A2D' : '#71717A'
                }
                size={place.id === selectedPlaceId || place.id === singlePlaceId ? 32 : 24}
              />
            </Marker>
          ))}

        {userLocation && (
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
            <Pin color="#FF6A2D" size={18} />
          </Marker>
        )}

        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            anchor="top"
            closeOnClick={false}
            onClose={() => setPopup(null)}
            className="pack-map-popup"
          >
            <div className="pack-map-popup__content min-w-[180px] text-sm">
              <p className="text-pack-text font-semibold">{popup.place.name}</p>
              {popup.place.address && (
                <p className="text-pack-text-muted mt-1">{popup.place.address}</p>
              )}
              {(popup.place.city || popup.place.state) && (
                <p className="text-pack-text-muted">
                  {[popup.place.city, popup.place.state].filter(Boolean).join(', ')}
                </p>
              )}
              {popup.place.metCount != null && (
                <p className="text-pack-text-secondary mt-2">{popup.place.metCount} met here</p>
              )}
              {popup.place.lastSeenCount != null && (
                <p className="text-pack-text-secondary">{popup.place.lastSeenCount} last seen here</p>
              )}
              {popup.place.lastInteractionDate && (
                <p className="text-pack-text-muted text-xs">
                  Last trail: {formatDate(popup.place.lastInteractionDate)}
                </p>
              )}
              {onOpenPlace && (
                <button
                  type="button"
                  className="text-pack-accent mt-3 font-medium"
                  onClick={() => onOpenPlace(popup.place.id)}
                >
                  Open Place
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {!hasPins && emptyMessage && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 p-6">
          <p className="text-pack-text max-w-xs rounded-2xl bg-[#171717]/95 px-4 py-3 text-center text-sm leading-relaxed">
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
      center={{ longitude: place.longitude, latitude: place.latitude }}
      zoom={MAPBOX_USER_ZOOM}
      singlePlaceId={place.id}
      scrollWheelZoom={false}
      showClustering={false}
    />
  )
}
