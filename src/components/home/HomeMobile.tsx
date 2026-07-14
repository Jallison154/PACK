import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { PackLogo } from '../brand/PackLogo'
import { QuickCapture } from './QuickCapture'
import { HomeExploreIndicator } from './HomeExploreIndicator'
import { HomeScrollContent, type HomeScrollData, type HomeNearbyState } from './HomeScrollContent'
import { getGreeting } from '../../utils/greeting'
import { useProfile } from '../../context/ProfileContext'

interface HomeMobileProps {
  data: HomeScrollData
  nearby: HomeNearbyState
  onCreated: () => void
  onOpenPerson: (personId: string) => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function HomeMobile({ data, nearby, onCreated, onOpenPerson }: HomeMobileProps) {
  const { greetingName } = useProfile()
  const feedRef = useRef<HTMLElement>(null)
  const feedTopRef = useRef(0)
  const snappingRef = useRef(false)
  const lastScrollYRef = useRef(0)
  const lastDeltaYRef = useRef(0)
  const settleTimerRef = useRef<number | null>(null)

  const [feedTop, setFeedTop] = useState(0)
  const [heroInteractive, setHeroInteractive] = useState(true)
  const [feedInteractive, setFeedInteractive] = useState(false)

  const measureFeedTop = useCallback(() => {
    const el = feedRef.current
    if (!el) return 0
    const top = Math.round(el.getBoundingClientRect().top + window.scrollY)
    feedTopRef.current = top
    setFeedTop(top)
    return top
  }, [])

  const scrollToY = useCallback((top: number) => {
    snappingRef.current = true
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
    window.scrollTo({ top: Math.max(0, top), behavior })

    const clear = () => {
      snappingRef.current = false
      window.removeEventListener('scrollend', clear)
    }
    window.addEventListener('scrollend', clear, { once: true })
    window.setTimeout(clear, behavior === 'smooth' ? 520 : 50)
  }, [])

  const snapToHero = useCallback(() => {
    scrollToY(0)
  }, [scrollToY])

  const snapToFeed = useCallback(() => {
    const top = measureFeedTop()
    scrollToY(top)
  }, [measureFeedTop, scrollToY])

  const settleSnap = useCallback(() => {
    if (snappingRef.current) return
    const top = measureFeedTop()
    if (top <= 0) return

    const y = window.scrollY

    // Already in the feed content zone — free scroll, no snap
    if (y >= top - 1) return

    // At (or near) the hero
    if (y <= 2) return

    // Between hero and feed: commit to a step
    // Modest upward progress (or upward flick) locks onto the search bar
    const commitFeed = lastDeltaYRef.current > 2 || y >= top * 0.28
    if (commitFeed) snapToFeed()
    else snapToHero()
  }, [measureFeedTop, snapToFeed, snapToHero])

  const scheduleSettle = useCallback(() => {
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null
      settleSnap()
    }, 70)
  }, [settleSnap])

  useEffect(() => {
    measureFeedTop()
    const onResize = () => measureFeedTop()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measureFeedTop])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      lastDeltaYRef.current = y - lastScrollYRef.current
      lastScrollYRef.current = y
      if (!snappingRef.current) scheduleSettle()
    }

    const onTouchEnd = () => scheduleSettle()
    const onScrollEnd = () => {
      if (!snappingRef.current) settleSnap()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('scrollend', onScrollEnd)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('scrollend', onScrollEnd)
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current)
    }
  }, [scheduleSettle, settleSnap])

  const { scrollY } = useScroll()

  const fadeEnd = Math.max(feedTop, 1)
  const fadeStart = fadeEnd * 0.12

  const heroOpacity = useTransform(scrollY, [fadeStart, fadeEnd], [1, 0])
  const feedOpacity = useTransform(scrollY, [fadeStart, fadeEnd], [0, 1])
  const feedY = useTransform(scrollY, [fadeStart, fadeEnd], [20, 0])

  useMotionValueEvent(scrollY, 'change', (y) => {
    const mid = fadeEnd * 0.5
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

          <HomeExploreIndicator onActivate={snapToFeed} />
        </motion.section>

        <motion.section
          ref={feedRef}
          aria-label="Explore Your Pack"
          className="home-feed-section relative z-0"
          style={{
            opacity: feedOpacity,
            y: feedY,
            pointerEvents: feedInteractive ? 'auto' : 'none',
          }}
        >
          <header className="pack-nav page-nav-top-shell sticky top-[var(--safe-top)] z-20 border-b">
            <div className="page-px mx-auto flex max-w-sm items-center gap-3">
              <button
                type="button"
                onClick={snapToHero}
                className="flex shrink-0 items-center justify-center"
                aria-label="Back to home"
              >
                <PackLogo size="sm" align="center" className="scale-90" />
              </button>
              <div className="min-w-0 flex-1">
                <QuickCapture onCreated={onCreated} onOpenPerson={onOpenPerson} size="default" />
              </div>
            </div>
          </header>

          <HomeScrollContent data={data} nearby={nearby} onOpenPerson={onOpenPerson} />
        </motion.section>
      </div>
    </div>
  )
}
