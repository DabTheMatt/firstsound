import { formatParamValue } from '../../audio/parameters/mapping'
import type { ParamDef } from '../../audio/parameters/types'

/**
 * Automation stores the parameter value itself: playback replaces the manual
 * knob with the envelope. A signed readout is for parameters whose own zero
 * is a neutral deviation (level around 0 dB, pitch in semitones, bipolar
 * percent). Stereo position keeps the existing L/R readout.
 */
export type AutomationReadoutKind = 'signed' | 'absolute'

const STEREO_POSITION = new Set(['pan', 'delayPan', 'reverbPan'])

export function automationReadoutKind(def: ParamDef): AutomationReadoutKind {
  if (!(def.min < 0 && def.max > 0)) return 'absolute'
  if (STEREO_POSITION.has(def.id)) return 'absolute'
  if (def.unit === 'dB' || def.unit === 'st' || def.unit === '%') return 'signed'
  return 'absolute'
}

function prefixPositive(formatted: string): string {
  if (formatted.startsWith('+') || formatted.startsWith('-') || formatted.startsWith('−')) return formatted
  if (/^\d/.test(formatted)) return `+${formatted}`
  return formatted
}

function signedNeutral(value: number, def: ParamDef, formatted: string): string | null {
  if (def.unit === 'dB' && Math.abs(value) < 0.05 && /^-?0(?:\.0+)? dB$/.test(formatted)) return '0 dB'
  if (def.unit === 'st' && Math.abs(value) < 0.005 && /^-?0(?:\.0+)? st$/.test(formatted)) return '0 st'
  if (def.unit === '%' && Math.abs(value) < 0.5 && /^-?0(?:\.0+)? %$/.test(formatted)) return '0 %'
  return null
}

/** Real parameter units for one automation node. Never a raw 0–1 envelope. */
export function formatAutomationNodeValue(value: number, def: ParamDef): string {
  const formatted = formatParamValue(value, def)
  if (automationReadoutKind(def) !== 'signed') return formatted
  const neutral = signedNeutral(value, def, formatted)
  if (neutral) return neutral
  return value > 0 ? prefixPositive(formatted) : formatted
}
