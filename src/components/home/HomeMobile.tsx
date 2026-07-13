import { useState, useEffect, useRef } from 'react'
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
}

export function HomeMobile({ data, onCreated }: HomeMobileProps) {
  const { greetingName } = useProfile()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollAreaHeight, setScrollAreaHeight] = useState(600)
  const [heroInteractive, setHeroInteractive] = useState(true)
  const [feedInteractive, setFeedInteractive] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const update = () => setScrollAreaHeight(element.clientHeight)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const { scrollY } = useScroll({ container: scrollRef })

  const fadeStart = scrollAreaHeight * 0.15
  const fadeEnd = scrollAreaHeight * 0.55

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
    <div className="home-page">
      <div ref={scrollRef} className="home-scroll mx-auto max-w-lg">
        <motion.section
          aria-label="Home"
          className="home-hero-section home-hero-panel page-px sticky top-0 z-10 shrink-0"
          style={{
            opacity: heroOpacity,
            y: heroY,
            pointerEvents: heroInteractive ? 'auto' : 'none',
          }}
        >
          <div className="home-hero-center gap-10">
            <PackLogo href="/" size="sm" align="center" />
            <h1 className="text-pack-text text-[2rem] leading-tight font-semibold tracking-tight">
              {getGreeting(greetingName)}
            </h1>
            <div className="w-full max-w-sm">
              <QuickCapture onCreated={onCreated} size="hero" />
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
                <QuickCapture onCreated={onCreated} size="default" />
              </div>
            </div>
          </header>

          <HomeScrollContent data={data} />
        </motion.section>
      </div>
    </div>
  )
}
