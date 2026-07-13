import { useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'
import { PwaUpdatePrompt } from '../auth/PwaUpdatePrompt'
import { SyncNoticeBanner } from '../auth/SyncNoticeBanner'
import { useAppChromeTop } from '../../hooks/useAppChromeTop'

export function AppLayout() {
  const bannersRef = useRef<HTMLDivElement>(null)
  useAppChromeTop(bannersRef)

  return (
    <div className="app-shell">
      <DesktopNav />
      <div ref={bannersRef} className="app-top-banners">
        <PwaUpdatePrompt />
        <SyncNoticeBanner />
      </div>
      <main className="app-main mx-auto w-full max-w-lg md:max-w-5xl">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
