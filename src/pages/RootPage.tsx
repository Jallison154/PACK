import { useIsDesktop } from '../components/ui/WorkspaceToggle'
import { HomePage } from './HomePage'
import { DashboardPage } from './DashboardPage'

/** Desktop opens to dashboard; mobile opens to recent people list */
export function RootPage() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DashboardPage />
  return <HomePage />
}
