import type { ReactNode } from 'react'

export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-pack-border rounded-2xl border bg-[#171717] ${className}`}>{children}</div>
  )
}

export function AdminStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="border-pack-border rounded-2xl border bg-[#171717] p-4">
      <p className="text-pack-text-muted text-[11px] tracking-wide uppercase">{label}</p>
      <p className="text-pack-text mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-pack-text-muted mt-1 text-xs">{hint}</p>}
    </div>
  )
}

export function StatusBadge({
  status,
}: {
  status: 'healthy' | 'warning' | 'degraded' | 'offline' | 'active' | 'suspended' | string
}) {
  const styles: Record<string, string> = {
    healthy: 'bg-emerald-500/15 text-emerald-400',
    active: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    degraded: 'bg-orange-500/15 text-orange-300',
    offline: 'bg-pack-danger/15 text-pack-danger',
    suspended: 'bg-pack-danger/15 text-pack-danger',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        styles[status] ?? 'bg-pack-border text-pack-text-muted'
      }`}
    >
      {status}
    </span>
  )
}

export function AdminButton({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  loading,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
}) {
  const styles = {
    primary: 'bg-pack-accent text-black hover:opacity-90',
    secondary: 'bg-white/5 text-pack-text hover:bg-white/10',
    danger: 'bg-pack-danger/15 text-pack-danger hover:bg-pack-danger/25',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? 'Working…' : children}
    </button>
  )
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[]
  children: ReactNode
}) {
  return (
    <div className="border-pack-border overflow-x-auto rounded-2xl border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#121212] text-pack-text-muted text-xs uppercase tracking-wide">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-pack-border divide-y bg-[#171717]">{children}</tbody>
      </table>
    </div>
  )
}
