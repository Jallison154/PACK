import { useNavigate } from 'react-router-dom'
import { SETTINGS_SECTIONS } from '../../settings/sections'
import { SettingsGroupRow } from '../../components/settings/SettingsPrimitives'
import { Card } from '../../components/ui/Card'

interface SettingsMainProps {
  embedded?: boolean
  activeSection?: string
}

export function SettingsMain({ embedded, activeSection }: SettingsMainProps) {
  const navigate = useNavigate()
  const primary = SETTINGS_SECTIONS.filter((s) => !s.secondary)
  const secondary = SETTINGS_SECTIONS.filter((s) => s.secondary)

  const renderRows = (sections: typeof SETTINGS_SECTIONS) =>
    sections.map((section) => (
      <SettingsGroupRow
        key={section.id}
        title={section.title}
        subtitle={section.subtitle}
        icon={section.icon}
        secondary={section.secondary}
        active={embedded && activeSection === section.id}
        onClick={() => navigate(`/settings/${section.id}`)}
      />
    ))

  if (embedded) {
    return <div className="space-y-1">{renderRows(SETTINGS_SECTIONS)}</div>
  }

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="divide-pack-border divide-y">{renderRows(primary)}</div>
      </Card>
      <Card padding="sm" className="opacity-90">
        <div className="divide-pack-border divide-y">{renderRows(secondary)}</div>
      </Card>
    </div>
  )
}
