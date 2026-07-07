import type { ElementType, HTMLAttributes, ReactNode } from 'react'

type SurfaceVariant = 'surface' | 'elevated'

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  variant?: SurfaceVariant
  children: ReactNode
  as?: ElementType
}

const variantClass: Record<SurfaceVariant, string> = {
  surface: 'pack-surface',
  elevated: 'pack-elevated',
}

export function Surface({
  variant = 'surface',
  children,
  className = '',
  as: Tag = 'div',
  ...props
}: SurfaceProps) {
  return (
    <Tag className={`${variantClass[variant]} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  )
}
