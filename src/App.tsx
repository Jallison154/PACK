import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DatabaseProvider } from './context/DatabaseContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { PasscodeGate } from './components/auth/PasscodeGate'
import { AppLayout } from './components/layout/AppLayout'
import { TabShell } from './components/layout/TabShell'
import { AddPersonPage } from './pages/AddPersonPage'
import { PersonDetailPage } from './pages/PersonDetailPage'
import { EditPersonPage } from './pages/EditPersonPage'
import { PlaceDetailPage } from './pages/PlaceDetailPage'

export default function App() {
  return (
    <DatabaseProvider>
      <WorkspaceProvider>
        <PasscodeGate>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<TabShell />} />
                <Route path="/search" element={<TabShell />} />
                <Route path="/pack" element={<TabShell />} />
                <Route path="/favorites" element={<Navigate to="/pack" replace />} />
                <Route path="/places" element={<TabShell />} />
                <Route path="/settings" element={<TabShell />} />
                <Route path="/places/:id" element={<PlaceDetailPage />} />
                <Route path="/locations" element={<Navigate to="/places" replace />} />
                <Route path="/locations/:id" element={<PlaceDetailPage />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
              </Route>
              <Route path="/add" element={<AddPersonPage />} />
              <Route path="/person/:id" element={<PersonDetailPage />} />
              <Route path="/edit/:id" element={<EditPersonPage />} />
            </Routes>
          </BrowserRouter>
        </PasscodeGate>
      </WorkspaceProvider>
    </DatabaseProvider>
  )
}
