import { WORKSPACES, type Workspace } from '../../types'

interface WorkspaceBadgeProps {
  workspace: Workspace
  className?: string
}

export function WorkspaceBadge({ workspace, className = '' }: WorkspaceBadgeProps) {
  const ws = WORKSPACES.find((w) => w.value === workspace)
  if (!ws) return null

  return (
    <span
      className={`bg-white/5 text-pack-text-muted shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${className}`}
    >
      {ws.label}
    </span>
  )
}
