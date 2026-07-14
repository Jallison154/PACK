import { useCallback, useEffect, useState } from 'react'
import { useGeolocation } from './useGeolocation'
import {
  getPeopleNearLocation,
  type NearbyPersonResult,
} from '../db/repositories/places'
import { usePackDataRefresh } from './usePackDataRefresh'

export function useHomeNearbyPeople() {
  const { position, error, status, loading: geoLoading, requestLocation } = useGeolocation()
  const [people, setPeople] = useState<NearbyPersonResult[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)

  const refreshPeople = useCallback(async () => {
    if (!position) {
      setPeople([])
      return
    }
    setLoadingPeople(true)
    try {
      const results = await getPeopleNearLocation(position.latitude, position.longitude)
      setPeople(results)
    } catch {
      setPeople([])
    } finally {
      setLoadingPeople(false)
    }
  }, [position])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    void refreshPeople()
  }, [refreshPeople])

  usePackDataRefresh(refreshPeople)

  return {
    people,
    position,
    geoStatus: status,
    geoError: error,
    loading: geoLoading || loadingPeople,
    retry: requestLocation,
  }
}
