import { useState, useEffect, useCallback, useRef } from 'react'
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { PackLogo } from '../components/brand/PackLogo'
import { QuickCapture } from '../components/home/QuickCapture'
import { HomeExploreIndicator } from '../components/home/HomeExploreIndicator'
import { HomeScrollContent, type HomeScrollData } from '../components/home/HomeScrollContent'
import {
  getRecentlyAdded,
  getRecentInteractions,
  getUpcomingFollowUps,
  getHomeStats,
} from '../db/repositories/dashboard'
import { getRecentPlaces } from '../db/repositories/places'
import { listPackMembers } from '../db/repositories/people'
import { getGreeting } from '../utils/greeting'
import { buildMemoryFeed, filterTodayTrail } from '../utils/memoryFeed'

const emptyScrollData: HomeScrollData = {
  todayTrail: [],
  followUps: [],
  recentPlaces: [],
  corePack: [],
  insights: { people: 0, places: 0, companies: 0, followUps: 0 },
}

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

interface MorphingChromeProps {
  progress: MotionValue<number>
  onCreated: () => void
}

function MorphingChrome({ progress, onCreated }: MorphingChromeProps) {
  const greetingOpacity = useTransform(progress, [0, 0.3], [1, 0])
  const greetingY = useTransform(progress, [0, 0.35], [0, -32])
  const logoScale = useTransform(progress, [0, 0.55, 1], [1, 0.78, 0.65])
  const logoY = useTransform(progress, [0, 0.55, 1], [0, -120, -200])
  const logoX = useTransform(progress, [0, 0.55, 1], [0, -120, -140])

  const searchY = useTransform(progress, [0, 0.55, 1], [0, -280, -320])
  const searchScale = useTransform(progress, [0, 0.55, 1], [1, 0.96, 0.94])
  const searchWidth = useTransform(progress, [0.5, 1], ['100%', 'calc(100% - 5.5rem)'])
  const searchMarginLeft = useTransform(progress, [0.5, 1], ['0rem', '5.5rem'])

  const headerBgOpacity = useTransform(progress, [0.45, 0.75], [0, 1])

  const [compact, setCompact] = useState(false)
  useMotionValueEvent(progress, 'change', (v) => setCompact(v > 0.4))

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 safe-top">
      <motion.div
        className="pack-nav pointer-events-none absolute inset-x-0 top-0 border-b backdrop-blur-xl"
        style={{ opacity: headerBgOpacity }}
      />

      <div className="relative mx-auto h-dvh max-w-lg px-6">
        {/* Logo */}
        <motion.div
          className="pointer-events-auto absolute left-1/2 top-[18%] -translate-x-1/2"
          style={{ y: logoY, x: logoX, scale: logoScale }}
        >
          <PackLogo href="/" size="sm" align="center" />
        </motion.div>

        {/* Greeting */}
        <motion.div
          className="pointer-events-none absolute top-[30%] left-0 right-0 text-center"
          style={{ opacity: greetingOpacity, y: greetingY }}
        >
          <h1 className="text-pack-text text-[2rem] leading-tight font-semibold tracking-tight">
            {getGreeting()}
          </h1>
        </motion.div>

        {/* Search — single instance, morphs into header */}
        <motion.div
          className="pointer-events-auto absolute top-[48%] left-6 right-6 mx-auto max-w-sm"
          style={{
            y: searchY,
            scale: searchScale,
            width: searchWidth,
            marginLeft: searchMarginLeft,
          }}
        >
          <QuickCapture onCreated={onCreated} size={compact ? 'default' : 'hero'} />
        </motion.div>
      </div>
    </div>
  )
}

export function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportHeight = useViewportHeight()
  const [scrollData, setScrollData] = useState<HomeScrollData>(emptyScrollData)

  const { scrollY } = useScroll({ container: scrollRef })
  const progress = useTransform(scrollY, [0, viewportHeight], [0, 1], { clamp: true })

  const indicatorOpacity = useTransform(progress, [0, 0.2], [1, 0])
  const panelRadius = useTransform(progress, [0, 0.65, 1], [28, 18, 12])
  const panelShadow = useTransform(
    progress,
    [0, 0.25, 1],
    [
      '0 -4px 32px rgba(0,0,0,0.12)',
      '0 -20px 64px rgba(0,0,0,0.4)',
      '0 -8px 32px rgba(0,0,0,0.25)',
    ],
  )

  const load = useCallback(async () => {
    const [interactions, recent, followUps, places, corePack, stats] = await Promise.all([
      getRecentInteractions(undefined, 20),
      getRecentlyAdded(),
      getUpcomingFollowUps(),
      getRecentPlaces(5),
      listPackMembers({ view: 'core', sort: 'name' }),
      getHomeStats(),
    ])

    const feed = buildMemoryFeed(interactions, recent)

    setScrollData({
      todayTrail: filterTodayTrail(feed),
      followUps: followUps.slice(0, 6),
      recentPlaces: places,
      corePack: corePack.slice(0, 6),
      insights: {
        people: stats.people,
        places: stats.places,
        companies: stats.companies,
        followUps: stats.followUps,
      },
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <MorphingChrome progress={progress} onCreated={load} />

      <div
        ref={scrollRef}
        className="fixed inset-x-0 top-0 bottom-[4.5rem] z-0 mx-auto max-w-lg snap-y snap-proximity overflow-x-hidden overflow-y-auto overscroll-y-contain lg:static lg:bottom-auto lg:h-dvh"
      >
        <div className="relative" style={{ minHeight: `${viewportHeight * 2}px` }}>
          {/* Screen 1 — Opening (scroll spacer + indicator only; chrome is fixed) */}
          <section
            className="relative z-0 flex h-dvh snap-start snap-always flex-col justify-end"
            aria-label="Home"
          >
            <motion.div style={{ opacity: indicatorOpacity }}>
              <HomeExploreIndicator />
            </motion.div>
          </section>

          {/* Screen 2 — Explore layer slides up from below */}
          <motion.section
            className="relative z-10 -mt-[100dvh] min-h-dvh snap-start snap-always border-pack-border/25 border-t bg-[var(--bg-primary)]"
            style={{
              borderTopLeftRadius: panelRadius,
              borderTopRightRadius: panelRadius,
              boxShadow: panelShadow,
            }}
            aria-label="Explore Your Pack"
          >
            <div className="safe-top h-[5.5rem] shrink-0" />
            <HomeScrollContent data={scrollData} />
          </motion.section>
        </div>
      </div>
    </>
  )
}
