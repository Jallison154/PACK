import { Link } from 'react-router-dom'
import wordmarkSrc from '../../assets/pack-logo-wordmark.png'

type PackLogoSize = 'sm' | 'md' | 'lg'

const SIZES: Record<PackLogoSize, { height: number; maxWidth: string }> = {
  sm: { height: 18, maxWidth: 'max-w-[88px]' },
  md: { height: 22, maxWidth: 'max-w-[108px]' },
  lg: { height: 28, maxWidth: 'max-w-[136px]' },
}

interface PackLogoProps {
  className?: string
  size?: PackLogoSize
  href?: string
  align?: 'left' | 'center'
}

export function PackLogo({ className = '', size = 'md', href, align = 'left' }: PackLogoProps) {
  const { height, maxWidth } = SIZES[size]
  const centered = align === 'center'

  const image = (
    <img
      src={wordmarkSrc}
      alt="Pack"
      height={height}
      className={`h-auto w-auto object-contain ${centered ? 'object-center' : 'object-left'} ${maxWidth} ${className}`}
      style={{ height }}
      draggable={false}
    />
  )

  const wrapperClass = centered
    ? 'flex shrink-0 items-center justify-center'
    : 'inline-flex shrink-0 items-center'

  if (href) {
    return (
      <Link to={href} className={wrapperClass} aria-label="Pack home">
        {image}
      </Link>
    )
  }

  return <div className={wrapperClass}>{image}</div>
}
