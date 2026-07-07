import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
}

const variants = {
  primary: 'bg-pack-accent text-black hover:bg-pack-accent-hover active:scale-[0.98]',
  secondary: 'bg-pack-card text-pack-text border border-pack-border hover:bg-pack-card-hover',
  ghost: 'text-pack-text-secondary hover:text-pack-text hover:bg-pack-card',
  danger: 'bg-pack-danger/10 text-pack-danger hover:bg-pack-danger/20',
}

const sizes = {
  sm: 'px-3 py-2 text-sm min-h-[40px]',
  md: 'px-5 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-4 text-lg min-h-[56px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  className = '',
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </motion.button>
  )
}
