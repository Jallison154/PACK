import { useState, useEffect } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { PackLogo } from '../brand/PackLogo'
import { QuickCapture } from './QuickCapture'
import { HomeExploreIndicator } from './HomeExploreIndicator'
import { HomeScrollContent, type HomeScrollData } from './HomeScrollContent'
import { getGreeting } from '../../utils/greeting'
import { useProfile } from '../../context/ProfileContext'

interface HomeMobileProps {
  data: HomeScrollData
  onCreated: () => void
  onOpenPerson: (personId: string) => void
}

export function HomeMobile({ data, onCreated, onOpenPerson }: HomeMobileProps) {
  const { greetingName } = useProfile()
  const [viewportHeight, setViewportHeight] = useState(
    () => (typeof window !== 'undefined' ? window.innerHeight : 600),
  )
  const [heroInteractive, setHeroInteractive] = useState(true)
  const [feedInteractive, setFeedInteractive] = useState(false)

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { scrollY } = useScroll()

  const fadeStart = viewportHeight * 0.15
  const fadeEnd = viewportHeight * 0.55

  const heroOpacity = useTransform(scrollY, [fadeStart, fadeEnd], [1, 0])
  const feedOpacity = useTransform(scrollY, [fadeStart, fadeEnd], [0, 1])
  const feedY = useTransform(scrollY, [fadeStart, fadeEnd], [16, 0])

  useMotionValueEvent(scrollY, 'change', (y) => {
    const mid = (fadeStart + fadeEnd) / 2
    setHeroInteractive(y < mid)
    setFeedInteractive(y > mid)
  })

  return (
    <div className="home-page">
      <div className="home-scroll mx-auto max-w-lg">
        <motion.section
          aria-label="Home"
          className="home-hero-section home-hero-panel page-px z-10 shrink-0"
          style={{
            opacity: heroOpacity,
            pointerEvents: heroInteractive ? 'auto' : 'none',
          }}
        >
          <div className="home-hero-center gap-10">
            <PackLogo href="/" size="sm" align="center" />
            <h1 className="text-pack-text text-[2rem] leading-tight font-semibold tracking-tight">
              {getGreeting(greetingName)}
            </h1>
            <div className="w-full max-w-sm">
              <QuickCapture onCreated={onCreated} onOpenPerson={onOpenPerson} size="hero" />
            </div>
          </div>

          <HomeExploreIndicator />
        </motion.section>

        <div className="home-fade-spacer" aria-hidden />

        <motion.section
          aria-label="Explore Your Pack"
          className="home-feed-section relative z-0"
          style={{
            opacity: feedOpacity,
            y: feedY,
            pointerEvents: feedInteractive ? 'auto' : 'none',
          }}
        >
          <header className="pack-nav page-nav-top-shell sticky top-0 z-20 border-b">
            <div className="page-px mx-auto flex max-w-sm items-center gap-3">
              <PackLogo href="/" size="sm" align="center" className="shrink-0 scale-90" />
              <div className="min-w-0 flex-1">
                <QuickCapture onCreated={onCreated} onOpenPerson={onOpenPerson} size="default" />
              </div>
            </div>
          </header>

          <HomeScrollContent data={data} onOpenPerson={onOpenPerson} />
        </motion.section>
      </div>
    </div>
  )
}
