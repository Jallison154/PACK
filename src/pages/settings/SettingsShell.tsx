import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '../../components/layout/Header'
import { SettingsSubpageHeader } from '../../components/settings/SettingsPrimitives'
import { useIsMobile, DESKTOP_BREAKPOINT } from '../../components/ui/WorkspaceToggle'
import { getSettingsSection } from '../../settings/sections'
import { SettingsMain } from './SettingsMain'
import { SettingsSectionContent } from './SettingsSectionContent'

function SettingsPlaceholder() {
  return (
    <div className="text-pack-text-muted flex min-h-[40vh] items-center justify-center px-2 text-center text-sm leading-relaxed">
      Choose a section to view and update your Pack preferences.
    </div>
  )
}

export function SettingsShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile(DESKTOP_BREAKPOINT)

  const sectionId = location.pathname.startsWith('/settings/')
    ? location.pathname.slice('/settings/'.length)
    : undefined
  const section = getSettingsSection(sectionId)
  const showMobileDetail = isMobile && Boolean(section)

  if (sectionId === 'profile') {
    return <Navigate to="/settings/account" replace />
  }

  if (sectionId && !section) {
    return <Navigate to="/settings" replace />
  }

  const detailBody = section ? (
    <div className={`mx-auto w-full max-w-lg space-y-4 ${isMobile ? 'page-px pt-4' : ''} pb-12`}>
      <SettingsSectionContent sectionId={section.id} />
    </div>
  ) : (
    <SettingsPlaceholder />
  )

  return (
    <div className="min-h-dvh">
      {!showMobileDetail && <Header title="Settings" />}

      {showMobileDetail && section ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-dvh"
          >
            <SettingsSubpageHeader title={section.title} onBack={() => navigate('/settings')} />
            {detailBody}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="page-px mx-auto w-full max-w-5xl pt-6 pb-12">
          <div className={isMobile ? '' : 'md:grid md:grid-cols-[minmax(0,300px)_1fr] md:gap-10'}>
            <aside className={isMobile ? 'space-y-2' : 'md:sticky md:top-24'}>
              {!isMobile && (
                <p className="text-pack-text-muted mb-4 px-1 text-sm leading-relaxed">
                  Manage how Pack remembers, captures, and protects your people.
                </p>
              )}
              <SettingsMain embedded={!isMobile} activeSection={sectionId} />
            </aside>

            {!isMobile && (
              <div className="min-w-0">
                {section ? (
                  <>
                    <div className="mb-4">
                      <h2 className="text-pack-text text-xl font-semibold tracking-tight">
                        {section.title}
                      </h2>
                      <p className="text-pack-text-muted mt-1 text-sm">{section.subtitle}</p>
                    </div>
                    {detailBody}
                  </>
                ) : (
                  detailBody
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
