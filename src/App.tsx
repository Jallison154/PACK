import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { DatabaseProvider } from './context/DatabaseContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { PasscodeGate } from './components/auth/PasscodeGate'
import { AppLayout } from './components/layout/AppLayout'
import { RootPage } from './pages/RootPage'
import { AddPersonPage } from './pages/AddPersonPage'
import { PersonDetailPage } from './pages/PersonDetailPage'
import { EditPersonPage } from './pages/EditPersonPage'
import { SearchPage } from './pages/SearchPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { PlacesPage } from './pages/PlacesPage'
import { PlaceDetailPage } from './pages/PlaceDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <DatabaseProvider>
      <WorkspaceProvider>
        <PasscodeGate>
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<RootPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/places" element={<PlacesPage />} />
                  <Route path="/places/:id" element={<PlaceDetailPage />} />
                  <Route path="/locations" element={<PlacesPage />} />
                  <Route path="/locations/:id" element={<PlaceDetailPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="/add" element={<AddPersonPage />} />
                <Route path="/person/:id" element={<PersonDetailPage />} />
                <Route path="/edit/:id" element={<EditPersonPage />} />
                <Route path="/search" element={<SearchPage />} />
              </Routes>
            </AnimatePresence>
          </BrowserRouter>
        </PasscodeGate>
      </WorkspaceProvider>
    </DatabaseProvider>
  )
}
