import type { AdminSectionId } from '../../admin/types'
import { AdminOverviewPage } from './AdminOverviewPage'
import { AdminUsersPage } from './AdminUsersPage'
import { AdminSupportPage } from './AdminSupportPage'
import { AdminSystemHealthPage } from './AdminSystemHealthPage'
import { AdminSyncHealthPage } from './AdminSyncHealthPage'
import { AdminServicesPage } from './AdminServicesPage'
import { AdminErrorsPage } from './AdminErrorsPage'
import { AdminFeatureFlagsPage } from './AdminFeatureFlagsPage'
import { AdminAuditPage } from './AdminAuditPage'
import { AdminSettingsPage } from './AdminSettingsPage'

export function AdminSectionContent({ sectionId }: { sectionId: AdminSectionId }) {
  switch (sectionId) {
    case 'overview':
      return <AdminOverviewPage />
    case 'users':
      return <AdminUsersPage />
    case 'support':
      return <AdminSupportPage />
    case 'system-health':
      return <AdminSystemHealthPage />
    case 'sync-health':
      return <AdminSyncHealthPage />
    case 'services':
      return <AdminServicesPage />
    case 'errors':
      return <AdminErrorsPage />
    case 'feature-flags':
      return <AdminFeatureFlagsPage />
    case 'audit':
      return <AdminAuditPage />
    case 'settings':
      return <AdminSettingsPage />
    default:
      return null
  }
}
