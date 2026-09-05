import type { ThemePreference } from '../theme/tokens'
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
    id: 'glass',
    label: 'Glass',
    theme: 'studio-dark',
    scene: 'glass',
    preview: { bg: '#151616', surface: '#202222', accent: '#e6ad48' },
  },
]
