import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProfileProvider } from './context/ProfileContext'
import { SyncProvider } from './context/SyncContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { UserDatabaseProvider } from './context/UserDatabaseContext'
import { PasscodeGate } from './components/auth/PasscodeGate'
import { AuthLoadingScreen } from './components/auth/AuthLoadingScreen'
import { AppLayout } from './components/layout/AppLayout'
import { TabShell } from './components/layout/TabShell'
import { PublicLandingPage } from './pages/PublicLandingPage'
import { AddPersonPage } from './pages/AddPersonPage'
import { PersonDetailPage } from './pages/PersonDetailPage'
import { EditPersonPage } from './pages/EditPersonPage'
import { PlaceDetailPage } from './pages/PlaceDetailPage'
import { AddPlacePage } from './pages/AddPlacePage'
import { EditPlacePage } from './pages/EditPlacePage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'

function AuthenticatedApp() {
  return (
    <UserDatabaseProvider>
      <ProfileProvider>
        <SyncProvider>
          <WorkspaceProvider>
            <PasscodeGate>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<TabShell />} />
                  <Route path="/search" element={<TabShell />} />
                  <Route path="/pack" element={<TabShell />} />
                  <Route path="/favorites" element={<Navigate to="/pack" replace />} />
                  <Route path="/places" element={<TabShell />} />
                  <Route path="/settings/*" element={<TabShell />} />
                  <Route path="/places/add" element={<AddPlacePage />} />
                  <Route path="/places/:id/edit" element={<EditPlacePage />} />
                  <Route path="/places/:id" element={<PlaceDetailPage />} />
                  <Route path="/locations" element={<Navigate to="/places" replace />} />
                  <Route path="/locations/:id" element={<PlaceDetailPage />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                </Route>
                <Route path="/add" element={<AddPersonPage />} />
                <Route path="/person/:id" element={<PersonDetailPage />} />
                <Route path="/edit/:id" element={<EditPersonPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PasscodeGate>
          </WorkspaceProvider>
        </SyncProvider>
      </ProfileProvider>
    </UserDatabaseProvider>
  )
}

function PublicApp() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage publicMode />} />
      <Route path="/terms" element={<TermsOfServicePage publicMode />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function AppRoutes() {
  const { authStatus } = useAuth()

  if (authStatus === 'loading') {
    return <AuthLoadingScreen />
  }

  if (authStatus === 'unauthenticated') {
    return <PublicApp />
  }

  return <AuthenticatedApp />
}
