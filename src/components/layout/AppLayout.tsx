import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'
import { PwaUpdatePrompt } from '../auth/PwaUpdatePrompt'
import { SyncNoticeBanner } from '../auth/SyncNoticeBanner'

export function AppLayout() {
  return (
    <div className="app-shell">
      <DesktopNav />
      <div className="app-top-banners">
        <PwaUpdatePrompt />
        <SyncNoticeBanner />
      </div>
      <main className="app-content mx-auto w-full max-w-lg md:max-w-5xl">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
