interface StatPillRowProps {
  people: number
  places: number
  companies: number
  followUps: number
}

export function StatPillRow({ people, places, companies, followUps }: StatPillRowProps) {
  const stats = [
    { value: people, label: 'Members' },
    { value: places, label: 'Places' },
    { value: companies, label: 'Companies' },
    { value: followUps, label: 'Reconnect Soon' },
  ]

  return (
    <div className="text-pack-text-muted flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm">
      {stats.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-pack-border">·</span>}
          <span className="text-pack-text font-semibold tabular-nums">{s.value}</span>
          <span>{s.label}</span>
        </span>
      ))}
    </div>
  )
}
