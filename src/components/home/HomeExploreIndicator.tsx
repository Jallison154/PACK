import { motion } from 'framer-motion'

export function HomeExploreIndicator() {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 pb-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.8 }}
    >
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-2"
      >
        <div className="bg-pack-border/40 h-9 w-[3px] rounded-full" />
        <span className="text-pack-text-muted/45 text-[11px] tracking-[0.12em] uppercase">
          Explore Your Pack
        </span>
      </motion.div>
    </motion.div>
  )
}
