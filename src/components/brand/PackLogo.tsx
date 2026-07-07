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
}

export function PackLogo({ className = '', size = 'md', href }: PackLogoProps) {
  const { height, maxWidth } = SIZES[size]

  const image = (
    <img
      src={wordmarkSrc}
      alt="Pack"
      height={height}
      className={`h-auto w-auto object-contain object-left ${maxWidth} ${className}`}
      style={{ height }}
      draggable={false}
    />
  )

  if (href) {
    return (
      <Link to={href} className="inline-flex shrink-0 items-center" aria-label="Pack home">
        {image}
      </Link>
    )
  }

  return image
}
