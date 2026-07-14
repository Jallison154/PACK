import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProfileProvider } from './context/ProfileContext'
import { SyncProvider } from './context/SyncContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { UserDatabaseProvider } from './context/UserDatabaseContext'
import { AdminProvider } from './context/AdminContext'
import { PasscodeGate } from './components/auth/PasscodeGate'
import { AuthLoadingScreen } from './components/auth/AuthLoadingScreen'
import { MaintenanceGate } from './components/admin/MaintenanceGate'
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
import { AdminPortal } from './pages/admin/AdminPortal'

function AuthenticatedApp() {
  return (
    <AdminProvider>
      <UserDatabaseProvider>
        <MaintenanceGate>
          <Routes>
            <Route path="/admin/*" element={<AdminPortal />} />
            <Route
              path="*"
              element={
                <ProfileProvider>
                  <SyncProvider>
                    <WorkspaceProvider>
                      <PasscodeGate>
                        <Routes>
                          <Route element={<AppLayout />}>
                            <Route path="/" element={<TabShell />} />
                            <Route path="/search" element={<Navigate to="/pack" replace />} />
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
              }
            />
          </Routes>
        </MaintenanceGate>
      </UserDatabaseProvider>
    </AdminProvider>
  )
}

function PublicApp() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage publicMode />} />
      <Route path="/terms" element={<TermsOfServicePage publicMode />} />
      <Route
        path="/admin/*"
        element={
          <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg-primary)] px-6 text-center">
            <h1 className="text-pack-text text-xl font-semibold">Access denied</h1>
            <p className="text-pack-text-muted max-w-sm text-sm">
              Sign in with a staff account to open the Admin Portal.
            </p>
            <Navigate to="/" replace />
          </div>
        }
      />
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
