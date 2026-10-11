/**
 * Sensory Comfort presentation.
 * Preferences describe how FIELD draws. They do not read or write the audio graph.
 */

export type VisualActivity = 'standard' | 'low'

export type NoticePriority = 'critical' | 'action' | 'informational' | 'decorative'

export type SensoryComfortInput = {
  reduceMotion: boolean
  sensoryComfort: boolean
  visualActivity: VisualActivity
  reduceDecorativeMotion: boolean
  calmMeters: boolean
  calmSpectrum: boolean
  reduceVisualEffects: boolean
  quietNotifications: boolean
}

export type SensoryPresentation = {
  /** Master preference. Sub-preferences apply only while this is on. */
  active: boolean
  /** FIELD Reduced Motion or the operating-system request. Independent of the master. */
  motionReduced: boolean
  visualActivity: VisualActivity
  reduceDecorativeMotion: boolean
  calmMeters: boolean
  calmSpectrum: boolean
  reduceVisualEffects: boolean
  quietNotifications: boolean
}

export type PresentationTokens = {
  motionDuration: string
  motionIntensity: string
  glowIntensity: string
  transitionDuration: string
  decorativeOpacity: string
}

export type SensoryCalmFactors = {
  /** 0 stops decorative oscillation. 1 leaves it. */
  motion: number
  /** 0 quiets glow, haze, and grain. 1 leaves them. */
  intensity: number
}

const STANDARD_TOKENS: PresentationTokens = {
  motionDuration: '180ms',
  motionIntensity: '1',
  glowIntensity: '1',
  transitionDuration: '160ms',
  decorativeOpacity: '1',
}

export function readVisualActivity(raw: unknown): VisualActivity {
  return raw === 'standard' || raw === 'low' ? raw : 'low'
}

/**
 * One derived presentation.
 * Reduced Motion stays effective when Sensory Comfort is off.
 * Stored sub-preferences apply only while the master is on.
 */
export function resolveSensoryPresentation(settings: SensoryComfortInput, systemReduced = false): SensoryPresentation {
  const motionReduced = settings.reduceMotion || systemReduced
  const active = settings.sensoryComfort
  const reduceDecorativeMotion = motionReduced || (active && settings.reduceDecorativeMotion)
  return {
    active,
    motionReduced,
    visualActivity: active && settings.visualActivity === 'low' ? 'low' : 'standard',
    reduceDecorativeMotion,
    calmMeters: active && settings.calmMeters,
    calmSpectrum: active && settings.calmSpectrum,
    reduceVisualEffects: active && settings.reduceVisualEffects,
    quietNotifications: active && settings.quietNotifications,
  }
}

export function presentationTokens(presentation: SensoryPresentation): PresentationTokens {
  if (!presentation.active && !presentation.motionReduced) return { ...STANDARD_TOKENS }
  if (presentation.motionReduced || presentation.reduceDecorativeMotion) {
    return {
      motionDuration: '0ms',
      motionIntensity: '0',
      glowIntensity: presentation.reduceVisualEffects || presentation.motionReduced ? '0.2' : '0.45',
      transitionDuration: '0ms',
      decorativeOpacity: presentation.reduceVisualEffects ? '0.35' : '0.5',
    }
  }
  return {
    motionDuration: '70ms',
    motionIntensity: '0.45',
    glowIntensity: presentation.reduceVisualEffects ? '0.2' : '0.7',
    transitionDuration: '70ms',
    decorativeOpacity: presentation.reduceVisualEffects ? '0.4' : '0.8',
  }
}

/** Decorative optical fields only. Parameter axes on the visual state stay put. */
export function sensoryCalmFactors(presentation: SensoryPresentation): SensoryCalmFactors | null {
  if (!presentation.active) return null
  const motion = presentation.reduceDecorativeMotion ? 0 : 1
  const intensity = presentation.reduceVisualEffects ? 0.22 : 1
  if (motion === 1 && intensity === 1) return null
  return { motion, intensity }
}

/**
 * Bar position for drawing. `percent` is already a presentation of a measured dB value.
 * Calm mode quantizes that drawing. It does not accept or return decibels.
 */
export function presentMeterPercent(percent: number, calm: boolean): number {
  if (!calm) return percent
  if (!Number.isFinite(percent)) return 0
  const clamped = Math.min(100, Math.max(0, percent))
  return Math.round(clamped / 2) * 2
}

export function noticeShown(priority: NoticePriority, quiet: boolean): boolean {
  if (priority === 'critical' || priority === 'action') return true
  return !quiet
}

/** Tempo copy written by the engine. Failures stay. Progress notes can go quiet. */
export function tempoNoticePriority(text: string): NoticePriority {
  const value = text.toLowerCase()
  if (
    value.includes('load a sample') ||
    value.includes('no steady') ||
    value.includes('failed') ||
    value.includes('error') ||
    value.includes('unavailable')
  ) {
    return 'action'
  }
  return 'informational'
}
