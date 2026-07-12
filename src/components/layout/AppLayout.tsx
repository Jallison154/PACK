import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'
import { PwaUpdatePrompt } from '../auth/PwaUpdatePrompt'
import { SyncPromptBanner } from '../auth/SyncPromptBanner'
import { SyncNoticeBanner } from '../auth/SyncNoticeBanner'

export function AppLayout() {
  return (
    <div className="relative min-h-dvh">
      <DesktopNav />
      <PwaUpdatePrompt />
      <SyncPromptBanner />
      <SyncNoticeBanner />
      <main className="mx-auto w-full max-w-lg pb-28 md:max-w-5xl md:pb-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
