import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'

export function AppLayout() {
  return (
    <div className="bg-pack-bg min-h-dvh">
      <DesktopNav />
      <main className="mx-auto w-full max-w-lg pb-24 lg:max-w-6xl lg:pb-8">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
