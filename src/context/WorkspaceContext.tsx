import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Workspace } from '../types'

const STORAGE_KEY = 'pack_workspace'
const LAST_USED_KEY = 'pack_last_workspace'

interface WorkspaceContextValue {
  workspace: Workspace
  setWorkspace: (ws: Workspace) => void
  lastUsedWorkspace: Workspace
  setLastUsedWorkspace: (ws: Workspace) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace>(
    () => (localStorage.getItem(STORAGE_KEY) as Workspace) || 'work',
  )
  const [lastUsedWorkspace, setLastUsedState] = useState<Workspace>(
    () => (localStorage.getItem(LAST_USED_KEY) as Workspace) || 'work',
  )

  const setWorkspace = useCallback((ws: Workspace) => {
    setWorkspaceState(ws)
    localStorage.setItem(STORAGE_KEY, ws)
  }, [])

  const setLastUsedWorkspace = useCallback((ws: Workspace) => {
    setLastUsedState(ws)
    localStorage.setItem(LAST_USED_KEY, ws)
  }, [])

  return (
    <WorkspaceContext.Provider
      value={{ workspace, setWorkspace, lastUsedWorkspace, setLastUsedWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
