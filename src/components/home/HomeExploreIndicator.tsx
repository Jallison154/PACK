interface HomeExploreIndicatorProps {
  onActivate?: () => void
}

export function HomeExploreIndicator({ onActivate }: HomeExploreIndicatorProps) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className="home-explore-indicator flex shrink-0 flex-col items-center gap-2"
      aria-label="Explore Your Pack"
    >
      <div className="bg-pack-border/40 h-9 w-[3px] rounded-full" />
      <span className="text-pack-text-muted/45 text-[11px] tracking-[0.12em] uppercase">
        Explore Your Pack
      </span>
    </button>
  )
}
