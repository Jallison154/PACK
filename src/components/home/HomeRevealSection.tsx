import type { ReactNode } from 'react'

interface HomeRevealSectionProps {
  title: string
  children: ReactNode
}

export function HomeRevealSection({ title, children }: HomeRevealSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-pack-text-muted/80 px-1 text-[13px] font-medium tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  )
}
