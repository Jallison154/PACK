import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  hint?: string
  icon?: ReactNode
}

export function EmptyState({ message, hint, icon }: EmptyStateProps) {
  return (
    <div className="text-pack-text-muted py-4 text-center">
      {icon && <div className="mb-2 flex justify-center opacity-60">{icon}</div>}
      <p className="text-sm">{message}</p>
      {hint && <p className="text-pack-text-muted/80 mt-1 text-xs">{hint}</p>}
    </div>
  )
}
