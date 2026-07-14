import type { ReactNode } from 'react'

interface HomeRevealSectionProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function HomeRevealSection({
  title,
  subtitle,
  action,
  children,
  className = '',
}: HomeRevealSectionProps) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-pack-text-muted/80 text-[13px] font-medium tracking-wide">{title}</h2>
          {subtitle && (
            <p className="text-pack-text-muted/60 mt-0.5 text-xs leading-relaxed">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
