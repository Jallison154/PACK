import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'

export function AppLayout() {
  return (
    <div className="relative min-h-dvh">
      <DesktopNav />
      <main className="mx-auto w-full max-w-lg pb-28 lg:max-w-5xl lg:pb-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
