import { useLocation } from 'react-router-dom'
import { TabPanel, getActiveMainTab } from './TabPanel'
import { HomePage } from '../../pages/HomePage'
import { SearchPage } from '../../pages/SearchPage'
import { MyPackPage } from '../../pages/MyPackPage'
import { PlacesPage } from '../../pages/PlacesPage'
import { SettingsPage } from '../../pages/SettingsPage'

export function TabShell() {
  const { pathname } = useLocation()
  const activeTab = getActiveMainTab(pathname)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabPanel active={activeTab === '/'} label="Home">
        <HomePage />
      </TabPanel>
      <TabPanel active={activeTab === '/search'} label="Search Your Pack">
        <SearchPage />
      </TabPanel>
      <TabPanel active={activeTab === '/pack'} label="My Pack">
        <MyPackPage />
      </TabPanel>
      <TabPanel active={activeTab === '/places'} label="Places">
        <PlacesPage />
      </TabPanel>
      <TabPanel active={activeTab === '/settings'} label="Settings">
        <SettingsPage />
      </TabPanel>
    </div>
  )
}
