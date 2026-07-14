import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'
import { PwaUpdatePrompt } from '../auth/PwaUpdatePrompt'
import { PwaInstallPrompt } from '../auth/PwaInstallPrompt'
import { SyncNoticeBanner } from '../auth/SyncNoticeBanner'

function shouldHideBottomNav(pathname: string): boolean {
  if (pathname === '/add' || pathname.startsWith('/edit/')) return true
  if (pathname === '/places/add') return true
  if (/^\/places\/[^/]+\/edit$/.test(pathname)) return true
  return false
}

export function AppLayout() {
  const { pathname } = useLocation()
  const hideBottomNav = shouldHideBottomNav(pathname)

  return (
    <div
      className="app-shell"
      data-bottom-nav={hideBottomNav ? 'hidden' : 'visible'}
    >
      <DesktopNav />
      <main className="app-content mx-auto w-full max-w-lg md:max-w-5xl xl:max-w-[1500px]">
        <div className="app-notices">
          <PwaUpdatePrompt />
          <PwaInstallPrompt />
          <SyncNoticeBanner />
        </div>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
