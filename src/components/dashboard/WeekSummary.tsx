import { Card } from '../ui/Card'

interface WeekSummaryProps {
  peopleAdded: number
  newCompanies: number
  newLocations: number
  newEvents: number
  workspace: 'work' | 'personal'
}

export function WeekSummary({
  peopleAdded,
  newCompanies,
  newLocations,
  newEvents,
  workspace,
}: WeekSummaryProps) {
  const stats =
    workspace === 'work'
      ? [
          { label: 'Added', value: peopleAdded },
          { label: 'Companies', value: newCompanies },
          { label: 'Places', value: newLocations },
          { label: 'Events', value: newEvents },
        ]
      : [
          { label: 'Added', value: peopleAdded },
          { label: 'Places', value: newLocations },
        ]

  return (
    <Card padding="sm" className="!p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <p className="text-pack-accent text-xl font-bold tabular-nums">{s.value}</p>
            <p className="text-pack-text-muted text-xs">{s.label} this week</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
