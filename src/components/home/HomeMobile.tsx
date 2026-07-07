import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { PackLogo } from '../brand/PackLogo'
import { QuickCapture } from './QuickCapture'
import { HomeExploreIndicator } from './HomeExploreIndicator'
import { HomeScrollContent, type HomeScrollData } from './HomeScrollContent'
import { getGreeting } from '../../utils/greeting'

function useViewportHeight() {
  const [height, setHeight] = useState(
    () => (typeof window !== 'undefined' ? window.innerHeight : 800),
  )

  useEffect(() => {
    const update = () => setHeight(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return height
}

interface HomeMobileProps {
  data: HomeScrollData
  onCreated: () => void
}

export function HomeMobile({ data, onCreated }: HomeMobileProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportHeight = useViewportHeight()
  const [heroInteractive, setHeroInteractive] = useState(true)
  const [feedInteractive, setFeedInteractive] = useState(false)

  const { scrollY } = useScroll({ container: scrollRef })

  const fadeStart = viewportHeight * 0.15
  const fadeEnd = viewportHeight * 0.55

  const heroOpacity = useTransform(scrollY, [fadeStart, fadeEnd], [1, 0])
  const feedOpacity = useTransform(scrollY, [fadeStart, fadeEnd], [0, 1])
  const heroY = useTransform(scrollY, [fadeStart, fadeEnd], [0, -20])
  const feedY = useTransform(scrollY, [fadeStart, fadeEnd], [16, 0])

  useMotionValueEvent(scrollY, 'change', (y) => {
    const mid = (fadeStart + fadeEnd) / 2
    setHeroInteractive(y < mid)
    setFeedInteractive(y > mid)
  })

  return (
    <div
      ref={scrollRef}
      className="home-scroll fixed inset-x-0 top-0 bottom-[4.5rem] z-0 mx-auto max-w-lg"
    >
      <motion.section
        aria-label="Home"
        className="home-hero-section home-viewport-height page-px sticky top-0 z-10 flex shrink-0 flex-col"
        style={{
          opacity: heroOpacity,
          y: heroY,
          pointerEvents: heroInteractive ? 'auto' : 'none',
        }}
      >
        <div className="safe-top flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-14">
            <PackLogo href="/" size="sm" align="center" />
          </div>
          <h1 className="text-pack-text text-[2rem] leading-tight font-semibold tracking-tight">
            {getGreeting()}
          </h1>
        </div>

        <div className="mx-auto w-full max-w-sm shrink-0 pb-6">
          <QuickCapture onCreated={onCreated} size="hero" />
        </div>

        <HomeExploreIndicator />
      </motion.section>

      <div className="home-fade-spacer shrink-0" aria-hidden />

      <motion.section
        aria-label="Explore Your Pack"
        className="home-feed-section relative z-0 min-h-[calc(100dvh-4.5rem)]"
        style={{
          opacity: feedOpacity,
          y: feedY,
          pointerEvents: feedInteractive ? 'auto' : 'none',
        }}
      >
        <header className="pack-nav page-nav-top sticky top-0 z-20 border-b">
          <div className="page-px mx-auto flex max-w-sm items-center gap-3">
            <PackLogo href="/" size="sm" align="center" className="shrink-0 scale-90" />
            <div className="min-w-0 flex-1">
              <QuickCapture onCreated={onCreated} size="default" />
            </div>
          </div>
        </header>

        <HomeScrollContent data={data} />
      </motion.section>
    </div>
  )
}
