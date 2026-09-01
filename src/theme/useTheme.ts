import { useEffect, useState } from 'react'
import {
  getThemePreference,
  persistThemePreference,
  subscribeThemeChange,
} from './theme'
import type { ThemePreference } from './tokens'

export function useTheme(): {
  preference: ThemePreference
  setPreference: (next: ThemePreference) => void
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getThemePreference())

  useEffect(() => {
    return subscribeThemeChange(() => setPreferenceState(getThemePreference()))
  }, [])

  const setPreference = (next: ThemePreference) => {
    persistThemePreference(next)
    setPreferenceState(next)
  }

  return { preference, setPreference }
}
