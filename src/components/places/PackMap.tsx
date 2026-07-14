import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl, { LngLatBounds, type GeoJSONSource, type Map as MapboxMap } from 'mapbox-gl'
import type { FeatureCollection, Point } from 'geojson'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../../utils/format'
import {
  ACTIVE_MAP_COMPONENT,
  MAPBOX_DEFAULT_CENTER,
  MAPBOX_STYLE,
  MAPBOX_USER_ZOOM,
  describeMapboxTokenState,
  mapboxConfigured,
  mapboxToken,
} from '../../services/mapbox/config'
import {
  clearMapboxRuntimeError,
  markMapInitialized,
  markMapLoadFired,
  markMapboxGlInstalled,
  recordMapboxHttpStatus,
  recordMapboxRuntimeError,
  resetMapSessionFlags,
} from '../../services/mapbox/mapRuntimeDiagnostics'
import type { Place } from '../../types'
import 'mapbox-gl/dist/mapbox-gl.css'

export interface PackMapPlace extends Place {
  metCount?: number
  lastSeenCount?: number
  interactionCount?: number
  lastInteractionDate?: string | null
}

export interface PackMapProps {
  places: PackMapPlace[]
  height?: string
  center?: { longitude: number; latitude: number }
  zoom?: number
  currentLocation?: { latitude: number; longitude: number; accuracy?: number } | null
  selectedPlace?: string | null
  singlePlaceId?: string
  onPlaceSelect?: (place: PackMapPlace) => void
  onOpenPlace?: (placeId: string) => void
  onMapReady?: (map: MapboxMap) => void
  fitBounds?: boolean
  scrollWheelZoom?: boolean
  emptyMessage?: string
  showClustering?: boolean
}

interface PopupState {
  place: PackMapPlace
  longitude: number
  latitude: number
}

function createPinElement(color: string, size: number): HTMLDivElement {
  const pin = document.createElement('div')
  pin.style.width = `${size}px`
  pin.style.height = `${size}px`
  pin.style.borderRadius = '9999px'
  pin.style.border = '2px solid #FFFFFF'
  pin.style.backgroundColor = color
  pin.style.boxShadow = '0 0 0 2px rgba(255,106,45,0.25)'
  pin.style.cursor = 'pointer'
  return pin
}

function MapUnavailable({
  height,
  message,
  showDiagnosticsLink = true,
}: {
  height: string
  message: string
  showDiagnosticsLink?: boolean
}) {
  const navigate = useNavigate()
  return (
    <div
      className="bg-pack-card border-pack-border flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center"
      style={{ height }}
    >
      <p className="text-pack-text-secondary text-sm leading-relaxed">{message}</p>
      {showDiagnosticsLink && (
        <button
          type="button"
          className="text-pack-accent text-sm font-medium"
          onClick={() => navigate('/settings/advanced')}
        >
          Open Map Diagnostics
        </button>
      )}
    </div>
  )
}

function syncPlacesSource(map: MapboxMap, geojson: FeatureCollection<Point>, activePlaceId: string | null) {
  const source = map.getSource('pack-places') as GeoJSONSource | undefined
  if (source) {
    source.setData(geojson)
  } else {
    map.addSource('pack-places', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 48,
    })

    map.addLayer({
      id: 'pack-clusters',
      type: 'circle',
      source: 'pack-places',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#262626',
        'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 24],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FF6A2D',
      },
    })

    map.addLayer({
      id: 'pack-cluster-count',
      type: 'symbol',
      source: 'pack-places',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12,
      },
      paint: { 'text-color': '#FFFFFF' },
    })

    map.addLayer({
      id: 'pack-unclustered',
      type: 'circle',
      source: 'pack-places',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'case',
          ['==', ['get', 'id'], activePlaceId ?? ''],
          '#FF6A2D',
          '#71717A',
        ],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
      },
    })
  }

  if (map.getLayer('pack-unclustered')) {
    map.setPaintProperty('pack-unclustered', 'circle-color', [
      'case',
      ['==', ['get', 'id'], activePlaceId ?? ''],
      '#FF6A2D',
      '#71717A',
    ])
  }
}

export function PackMap({
  places,
  height = '320px',
  center,
  zoom,
  currentLocation,
  selectedPlace,
  singlePlaceId,
  onPlaceSelect,
  onOpenPlace,
  onMapReady,
  fitBounds = false,
  scrollWheelZoom = true,
  emptyMessage,
  showClustering = true,
}: PackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const placesRef = useRef(places)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [containerReady, setContainerReady] = useState(false)

  const mappable = useMemo(
    () => places.filter((place) => place.latitude != null && place.longitude != null),
    [places],
  )
  const activePlaceId = selectedPlace ?? singlePlaceId ?? null

  placesRef.current = places
  onPlaceSelectRef.current = onPlaceSelect

  const geojson = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: mappable.map((place) => ({
        type: 'Feature',
        properties: { id: place.id },
        geometry: {
          type: 'Point',
          coordinates: [place.longitude!, place.latitude!],
        },
      })),
    }),
    [mappable],
  )

  useEffect(() => {
    markMapboxGlInstalled(typeof mapboxgl?.Map === 'function')
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const checkSize = () => {
      const sized = el.clientWidth > 0 && el.clientHeight > 0
      setContainerReady(sized)
      if (sized && mapRef.current) mapRef.current.resize()
    }

    checkSize()
    const observer = new ResizeObserver(checkSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [height, mapboxConfigured])

  useEffect(() => {
    const tokenState = describeMapboxTokenState()
    if (tokenState === 'token_missing') {
      setMapError('Mapbox is not configured.')
      recordMapboxRuntimeError({
        message: 'Mapbox token missing (VITE_MAPBOX_ACCESS_TOKEN).',
        category: 'token_missing',
      })
      return
    }
    if (tokenState === 'token_malformed') {
      setMapError('Mapbox is not configured.')
      recordMapboxRuntimeError({
        message: 'Mapbox token malformed — expected a public pk.* token.',
        category: 'token_malformed',
      })
      return
    }
    if (!mapboxConfigured || !containerRef.current || !containerReady) return

    resetMapSessionFlags()
    clearMapboxRuntimeError()
    setMapError(null)

    mapboxgl.accessToken = mapboxToken

    const initialCenter: [number, number] = [
      center?.longitude ?? currentLocation?.longitude ?? MAPBOX_DEFAULT_CENTER.longitude,
      center?.latitude ?? currentLocation?.latitude ?? MAPBOX_DEFAULT_CENTER.latitude,
    ]
    const initialZoom =
      zoom ?? (currentLocation || mappable.length ? MAPBOX_USER_ZOOM : MAPBOX_DEFAULT_CENTER.zoom)

    let map: MapboxMap
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: true,
        scrollZoom: scrollWheelZoom,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mapbox constructor failed.'
      setMapError('Mapbox could not load.')
      recordMapboxRuntimeError({
        message,
        category: message.toLowerCase().includes('webgl') ? 'webgl_unavailable' : 'constructor_error',
      })
      return
    }

    mapRef.current = map
    markMapInitialized(ACTIVE_MAP_COMPONENT)
    map.resize()

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    const onError = (event: { error?: Error & { status?: number; url?: string } }) => {
      const err = event.error
      const message = err?.message ?? 'Mapbox could not load.'
      const status = err?.status
      const url = err?.url ?? null
      if (status != null) recordMapboxHttpStatus(status, url)
      recordMapboxRuntimeError({ message, status, url })
      setMapError('Mapbox could not load.')
    }

    map.on('error', onError)

    map.on('data', (event) => {
      if (event.dataType === 'source' || event.dataType === 'style') {
        // Style/source fetches that succeed indicate api.mapbox.com is reachable.
        recordMapboxHttpStatus(200)
      }
    })

    map.on('load', () => {
      markMapLoadFired()
      recordMapboxHttpStatus(200)
      map.resize()
      setReady(true)
      onMapReady?.(map)

      if (fitBounds && mappable.length > 0) {
        const bounds = new LngLatBounds()
        for (const place of mappable) {
          bounds.extend([place.longitude!, place.latitude!])
        }
        if (currentLocation) {
          bounds.extend([currentLocation.longitude, currentLocation.latitude])
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 48, maxZoom: MAPBOX_USER_ZOOM, duration: 0 })
        }
      }
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      map.remove()
      mapRef.current = null
      setReady(false)
      resetMapSessionFlags()
    }
    // Mount once token/container are ready; position updates handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxConfigured, containerReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (showClustering) {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      const ensureLayers = () => syncPlacesSource(map, geojson, activePlaceId)
      if (map.isStyleLoaded()) ensureLayers()
      else map.once('load', ensureLayers)

      const onClick = (event: mapboxgl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: ['pack-clusters', 'pack-unclustered'].filter((id) => map.getLayer(id)),
        })
        const feature = features[0]
        if (!feature) return

        if (feature.properties?.cluster) {
          const clusterId = feature.properties.cluster_id as number
          const source = map.getSource('pack-places') as GeoJSONSource
          source.getClusterExpansionZoom(clusterId, (error, expansionZoom) => {
            if (error || expansionZoom == null) return
            const [lng, lat] = (feature.geometry as Point).coordinates
            map.easeTo({ center: [lng, lat], zoom: expansionZoom })
          })
          return
        }

        const placeId = feature.properties?.id as string | undefined
        const place = placesRef.current.find((item) => item.id === placeId)
        if (!place || place.latitude == null || place.longitude == null) return
        onPlaceSelectRef.current?.(place)
        setPopup({ place, longitude: place.longitude, latitude: place.latitude })
      }

      map.on('click', onClick)
      return () => {
        map.off('click', onClick)
      }
    }

    if (map.getSource('pack-places')) {
      if (map.getLayer('pack-unclustered')) map.removeLayer('pack-unclustered')
      if (map.getLayer('pack-cluster-count')) map.removeLayer('pack-cluster-count')
      if (map.getLayer('pack-clusters')) map.removeLayer('pack-clusters')
      map.removeSource('pack-places')
    }

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = mappable.map((place) => {
      const isActive = place.id === activePlaceId
      const marker = new mapboxgl.Marker({
        element: createPinElement(isActive ? '#FF6A2D' : '#71717A', isActive ? 32 : 24),
        anchor: 'center',
      })
        .setLngLat([place.longitude!, place.latitude!])
        .addTo(map)

      marker.getElement().addEventListener('click', (event) => {
        event.stopPropagation()
        onPlaceSelectRef.current?.(place)
        setPopup({
          place,
          longitude: place.longitude!,
          latitude: place.latitude!,
        })
      })
      return marker
    })
  }, [activePlaceId, geojson, mappable, ready, showClustering])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (!currentLocation) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker({
        element: createPinElement('#FF6A2D', 18),
        anchor: 'center',
      })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map)
    } else {
      userMarkerRef.current.setLngLat([currentLocation.longitude, currentLocation.latitude])
    }

    map.easeTo({
      center: [currentLocation.longitude, currentLocation.latitude],
      zoom: MAPBOX_USER_ZOOM,
      duration: 400,
    })
  }, [currentLocation, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const resize = () => map.resize()
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [ready, height])

  if (!mapboxConfigured && !mapError) {
    return <MapUnavailable height={height} message="Mapbox is not configured." />
  }

  if (mapError && !ready) {
    return <MapUnavailable height={height} message={mapError} />
  }

  const hasPins = mappable.length > 0

  return (
    <div className="pack-map-shell relative overflow-hidden rounded-2xl" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />

      {import.meta.env.DEV && (
        <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-lg bg-[#171717]/95 px-2 py-1 text-xs text-[#FF6A2D]">
          Provider: Mapbox
        </div>
      )}

      {mapError && ready && (
        <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-[#2A2A2A] bg-[#171717]/95 px-3 py-2 text-center text-xs text-[#A1A1AA]">
          {mapError}
        </div>
      )}

      {popup && (
        <div className="absolute top-3 right-3 z-10 max-w-[220px] rounded-xl border border-[#2A2A2A] bg-[#171717] p-3 text-sm text-white shadow-lg">
          <p className="font-semibold">{popup.place.name}</p>
          {popup.place.address && <p className="mt-1 text-[#A1A1AA]">{popup.place.address}</p>}
          {(popup.place.city || popup.place.state) && (
            <p className="text-[#A1A1AA]">
              {[popup.place.city, popup.place.state].filter(Boolean).join(', ')}
            </p>
          )}
          {popup.place.metCount != null && (
            <p className="mt-2 text-[#A1A1AA]">{popup.place.metCount} met here</p>
          )}
          {popup.place.lastSeenCount != null && (
            <p className="text-[#A1A1AA]">{popup.place.lastSeenCount} last seen here</p>
          )}
          {popup.place.lastInteractionDate && (
            <p className="text-xs text-[#A1A1AA]">
              Last trail: {formatDate(popup.place.lastInteractionDate)}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            {onOpenPlace && (
              <button
                type="button"
                className="text-pack-accent font-medium"
                onClick={() => onOpenPlace(popup.place.id)}
              >
                Open Place
              </button>
            )}
            <button
              type="button"
              className="text-[#A1A1AA]"
              onClick={() => setPopup(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

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

export function PackMapPreview({
  place,
  height = '160px',
}: {
  place: Place | null
  height?: string
}) {
  if (!place?.latitude || !place?.longitude) return null
  return (
    <PackMap
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
