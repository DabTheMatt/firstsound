import { THEME_OPTIONS, type ThemePreference } from '../theme/tokens'
import type { SensorySceneId } from './sensoryScene'

export type SensoryAtmosphere = {
  id: string
  label: string
  theme: ThemePreference
  scene: SensorySceneId
  preview: { bg: string; surface: string; accent: string }
}

/** Named looks for Sensory Mode: color theme + scene. */
export const SENSORY_ATMOSPHERES: readonly SensoryAtmosphere[] = [
  {
    id: 'bloom',
    label: 'Bloom',
    theme: 'dusk',
    scene: 'range',
    preview: { bg: '#1b1815', surface: '#2a2621', accent: '#e07a42' },
  },
  {
    id: 'range',
    label: 'Range',
    theme: 'oled',
    scene: 'range',
    preview: { bg: '#050606', surface: '#121212', accent: '#f2f0ea' },
  },
  {
    id: 'ember',
    label: 'Ember',
    theme: 'oxide',
    scene: 'range',
    preview: { bg: '#181411', surface: '#29211b', accent: '#d97845' },
  },
  {
    id: 'tide',
    label: 'Tide',
    theme: 'midnight-blue',
    scene: 'range',
    preview: { bg: '#0d1117', surface: '#18212c', accent: '#63b3d1' },
  },
  {
    id: 'canopy',
    label: 'Canopy',
    theme: 'forest',
    scene: 'range',
    preview: { bg: '#101512', surface: '#1c2520', accent: '#72b98a' },
  },
  {
    id: 'mirror',
    label: 'Mirror',
    theme: 'studio-dark',
    scene: 'mirror',
    preview: { bg: '#0a0c10', surface: '#1a2030', accent: '#9ec8ff' },
  },
  {
    id: 'canyon',
    label: 'Canyon',
    theme: 'oxide',
    scene: 'canyon',
    preview: { bg: '#120e0c', surface: '#2a1c16', accent: '#e8a060' },
  },
  {
    id: 'gleam',
    label: 'Gleam',
    theme: 'midnight-blue',
    scene: 'gleam',
    preview: { bg: '#071018', surface: '#143044', accent: '#7ee0ff' },
  },
]

export function resolveSensoryAtmosphere(
  scene: SensorySceneId,
  preference: ThemePreference,
): SensoryAtmosphere {
  const exact = SENSORY_ATMOSPHERES.find((a) => a.scene === scene && a.theme === preference)
  if (exact) return exact
  const theme = THEME_OPTIONS.find((opt) => opt.id === preference)
  return {
    id: `color:${String(preference)}:${scene}`,
    label: theme?.label ?? 'Color',
    theme: preference,
    scene,
    preview: theme?.preview ?? { bg: '#151616', surface: '#202222', accent: '#e6ad48' },
  }
}
