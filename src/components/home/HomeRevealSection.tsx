import { useRef, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'

interface HomeRevealSectionProps {
  title: string
  children: ReactNode
}

export function HomeRevealSection({ title, children }: HomeRevealSectionProps) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-8% 0px -5% 0px' })

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <h2 className="text-pack-text-muted/80 px-1 text-[13px] font-medium tracking-wide">
        {title}
      </h2>
      {children}
    </motion.section>
  )
}
