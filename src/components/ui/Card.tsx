import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddings = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, onClick, className = '', padding = 'md' }: CardProps) {
  const Component = onClick ? motion.button : motion.div

  return (
    <Component
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`bg-pack-card border-pack-border/80 rounded-xl border text-left ${paddings[padding]} ${onClick ? 'hover:bg-pack-card-hover active:bg-pack-card-hover cursor-pointer transition-colors' : ''} ${className}`}
    >
      {children}
    </Component>
  )
}
