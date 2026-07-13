import { useEffect, type RefObject } from 'react'

/**
 * Publishes the height of the sticky top banner region as --app-chrome-top on .app-shell.
 * Home hero sizing uses this so it never double-counts safe-area or banner space.
 */
export function useAppChromeTop(bannersRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const banners = bannersRef.current
    const shell = banners?.closest('.app-shell') as HTMLElement | null
    if (!banners || !shell) return

    const update = () => {
      shell.style.setProperty('--app-chrome-top', `${banners.offsetHeight}px`)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(banners)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [bannersRef])
}
