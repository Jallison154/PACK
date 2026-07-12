import { WORKSPACES } from '../../types'
import { useWorkspace } from '../../context/WorkspaceContext'

interface WorkspaceHintProps {
  className?: string
}

export function WorkspaceHint({ className = '' }: WorkspaceHintProps) {
  const { lastUsedWorkspace } = useWorkspace()
  const ws = WORKSPACES.find((w) => w.value === lastUsedWorkspace)
  if (!ws) return null

  return (
    <span
      className={`text-pack-text-muted text-xs font-medium ${className}`}
      title="Default workspace when adding to Pack"
    >
      {ws.label}
    </span>
  )
}
