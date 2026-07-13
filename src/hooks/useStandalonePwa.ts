import { useSyncExternalStore } from 'react'
import { isStandalonePWA } from '../utils/standalonePwa'

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia('(display-mode: standalone)')
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getSnapshot() {
  return isStandalonePWA()
}

/** Reactive standalone PWA flag for components that need browser-vs-standalone branching. */
export function useStandalonePwa(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
