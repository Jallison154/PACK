import { useEffect } from 'react'
import { PACK_DATA_CHANGED } from '../services/sync/dataEvents'

export function usePackDataRefresh(onRefresh: () => void): void {
  useEffect(() => {
    const handler = () => {
      onRefresh()
    }

    window.addEventListener(PACK_DATA_CHANGED, handler)
    return () => window.removeEventListener(PACK_DATA_CHANGED, handler)
  }, [onRefresh])
}
