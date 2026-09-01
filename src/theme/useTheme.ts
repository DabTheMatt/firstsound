import { useEffect, useState } from 'react'
import {
  deleteSavedTheme,
  getCustomThemeColors,
  getSavedThemes,
  getThemePreference,
  persistThemePreference,
  saveCurrentAsTheme,
  setCustomThemeColor,
  subscribeThemeChange,
} from './theme'
import type { CustomColorId, CustomThemeColors, SavedTheme, ThemePreference } from './tokens'

export function useTheme(): {
  preference: ThemePreference
  setPreference: (next: ThemePreference) => void
  customColors: CustomThemeColors
  setCustomColor: (id: CustomColorId, value: string) => void
  savedThemes: SavedTheme[]
  saveCurrentTheme: (name?: string) => SavedTheme | null
  removeSavedTheme: (id: string) => void
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getThemePreference())
  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => getCustomThemeColors())
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => getSavedThemes())

  useEffect(() => {
    return subscribeThemeChange(() => {
      setPreferenceState(getThemePreference())
      setCustomColors(getCustomThemeColors())
      setSavedThemes(getSavedThemes())
    })
  }, [])

  const setPreference = (next: ThemePreference) => {
    persistThemePreference(next)
    setPreferenceState(getThemePreference())
    setCustomColors(getCustomThemeColors())
    setSavedThemes(getSavedThemes())
  }

  const setCustomColor = (id: CustomColorId, value: string) => {
    setCustomColors(setCustomThemeColor(id, value))
    setSavedThemes(getSavedThemes())
  }

  const saveCurrentTheme = (name?: string) => {
    const saved = saveCurrentAsTheme(name)
    setPreferenceState(getThemePreference())
    setCustomColors(getCustomThemeColors())
    setSavedThemes(getSavedThemes())
    return saved
  }

  const removeSavedTheme = (id: string) => {
    deleteSavedTheme(id)
    setPreferenceState(getThemePreference())
    setCustomColors(getCustomThemeColors())
    setSavedThemes(getSavedThemes())
  }

  return {
    preference,
    setPreference,
    customColors,
    setCustomColor,
    savedThemes,
    saveCurrentTheme,
    removeSavedTheme,
  }
}
