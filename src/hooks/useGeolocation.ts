import { useState, useCallback } from 'react'

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number
  capturedAt: string
}

export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'timeout' | 'unavailable'

function mapGeoError(code: number): { status: GeoStatus; message: string } {
  switch (code) {
    case 1:
      return { status: 'denied', message: 'Location permission denied' }
    case 2:
      return { status: 'unavailable', message: 'Location unavailable' }
    case 3:
      return { status: 'timeout', message: 'Location request timed out' }
    default:
      return { status: 'unavailable', message: 'Could not determine location' }
  }
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [loading, setLoading] = useState(false)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device')
      setStatus('unavailable')
      return
    }

    setLoading(true)
    setError(null)
    setStatus('loading')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
        setLoading(false)
        setStatus('granted')
      },
      (err) => {
        const mapped = mapGeoError(err.code)
        setError(mapped.message)
        setStatus(mapped.status)
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    )
  }, [])

  const clear = useCallback(() => {
    setPosition(null)
    setError(null)
    setStatus('idle')
  }, [])

  return { position, error, status, loading, requestLocation, clear }
}
