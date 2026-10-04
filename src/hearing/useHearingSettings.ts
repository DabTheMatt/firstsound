import { useCallback, useSyncExternalStore } from 'react'
import {
  layersForProfile,
  persistHearingSettings,
  readStoredHearingSettings,
  subscribeHearingSettings,
  type HearingAccessSettings,
  type HearingProfile,
} from './settings'

export function useHearingSettings(): {
  settings: HearingAccessSettings
  patch: (partial: Partial<HearingAccessSettings>) => void
  setProfile: (profile: HearingProfile) => void
} {
  const settings = useSyncExternalStore(subscribeHearingSettings, readStoredHearingSettings, readStoredHearingSettings)
  const patch = useCallback((partial: Partial<HearingAccessSettings>) => {
    const current = readStoredHearingSettings()
    persistHearingSettings({
      ...current,
      ...partial,
      layers: partial.layers ?? current.layers,
      eventFilters: partial.eventFilters ?? current.eventFilters,
    })
  }, [])
  const setProfile = useCallback((profile: HearingProfile) => {
    const current = readStoredHearingSettings()
    persistHearingSettings({
      ...current,
      profile,
      layers: layersForProfile(profile),
      hapticIntensity: profile === 'visual-haptic' && current.hapticIntensity === 'off' ? 'low' : current.hapticIntensity,
    })
  }, [])
  return { settings, patch, setProfile }
}
