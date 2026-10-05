import { useCallback, useSyncExternalStore } from 'react'
import {
  persistTechnicalInterface,
  readStoredTechnicalInterface,
  subscribeTechnicalInterface,
  type TechnicalInterface,
} from './technicalInterface'

export function useTechnicalInterface(): readonly [TechnicalInterface, (next: TechnicalInterface) => void] {
  const value = useSyncExternalStore(
    subscribeTechnicalInterface,
    readStoredTechnicalInterface,
    () => 'classic' as const,
  )
  const setValue = useCallback((next: TechnicalInterface) => {
    persistTechnicalInterface(next)
  }, [])
  return [value, setValue] as const
}
