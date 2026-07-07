import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  hint?: string
  icon?: ReactNode
}

export function EmptyState({ message, hint, icon }: EmptyStateProps) {
  return (
    <div className="py-8 text-center">
      {icon && <div className="text-pack-text-muted/40 mx-auto mb-3">{icon}</div>}
      <p className="text-pack-text-muted text-sm">{message}</p>
      {hint && <p className="text-pack-text-muted/70 mt-1.5 text-xs leading-relaxed">{hint}</p>}
    </div>
  )
}
