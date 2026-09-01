import { useEffect, useState } from 'react'
import {
  getCustomThemeColors,
  getThemePreference,
  persistThemePreference,
  setCustomThemeColor,
  subscribeThemeChange,
} from './theme'
import type { CustomColorId, CustomThemeColors, ThemePreference } from './tokens'

export function useTheme(): {
  preference: ThemePreference
  setPreference: (next: ThemePreference) => void
  customColors: CustomThemeColors
  setCustomColor: (id: CustomColorId, value: string) => void
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getThemePreference())
  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => getCustomThemeColors())

  useEffect(() => {
    return subscribeThemeChange(() => {
      setPreferenceState(getThemePreference())
      setCustomColors(getCustomThemeColors())
    })
  }, [])

  const setPreference = (next: ThemePreference) => {
    persistThemePreference(next)
    setPreferenceState(next)
    setCustomColors(getCustomThemeColors())
  }

  const setCustomColor = (id: CustomColorId, value: string) => {
    setCustomColors(setCustomThemeColor(id, value))
  }

  return { preference, setPreference, customColors, setCustomColor }
}
