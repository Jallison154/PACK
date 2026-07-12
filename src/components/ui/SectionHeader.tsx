import type { ReactNode } from 'react'

interface SectionHeaderProps {
  children: ReactNode
  action?: ReactNode
}

export function SectionHeader({ children, action }: SectionHeaderProps) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="text-pack-text-secondary text-xs font-semibold tracking-wide uppercase">
        {children}
      </h2>
      {action}
    </div>
  )
}
