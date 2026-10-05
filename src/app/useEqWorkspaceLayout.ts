import { useCallback, useSyncExternalStore } from 'react'
import {
  persistEqWorkspaceLayout,
  readStoredEqWorkspaceLayout,
  subscribeEqWorkspaceLayout,
  type EqWorkspaceLayout,
} from './eqWorkspaceLayout'

export function useEqWorkspaceLayout(): readonly [EqWorkspaceLayout, (next: EqWorkspaceLayout) => void] {
  const value = useSyncExternalStore(
    subscribeEqWorkspaceLayout,
    readStoredEqWorkspaceLayout,
    () => 'strips' as const,
  )
  const setValue = useCallback((next: EqWorkspaceLayout) => {
    persistEqWorkspaceLayout(next)
  }, [])
  return [value, setValue] as const
}
