import { Card } from '../ui/Card'

interface CompactStatsProps {
  stats: {
    totalContacts: number
    secondary1: number
    secondary2: number
    secondary3: number
    addedThisWeek: number
  }
  labels: {
    total: string
    s1: string
    s2: string
    s3: string
  }
}

export function CompactStats({ stats, labels }: CompactStatsProps) {
  const items = [
    { label: labels.total, value: stats.totalContacts },
    { label: labels.s1, value: stats.secondary1 },
    { label: labels.s2, value: stats.secondary2 },
    { label: labels.s3, value: stats.secondary3 },
  ]

  return (
    <Card padding="sm" className="!p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="text-center sm:text-left">
            <p className="text-pack-text text-lg font-bold tabular-nums">{item.value}</p>
            <p className="text-pack-text-muted text-[11px]">{item.label}</p>
          </div>
        ))}
      </div>
      {stats.addedThisWeek > 0 && (
        <p className="text-pack-accent mt-2 text-center text-xs sm:text-left">
          +{stats.addedThisWeek} added to Pack this week
        </p>
      )}
    </Card>
  )
}
