import type { ModuleType } from '../audio/chain/chain'
import type { ParamId } from '../audio/parameters/types'
import type { VizMode } from './editorState'

/** One primary visualization on a phone. FFT is part of EQ, not its own tab. */
export type PhoneViz = 'wave' | 'eq' | 'auto'

export const PHONE_VIZ_ORDER: PhoneViz[] = ['wave', 'eq', 'auto']

export type PhoneSheetLevel = 'collapsed' | 'medium' | 'expanded'

const ESSENTIAL: Partial<Record<ModuleType, ParamId[]>> = {
  gain: ['gain', 'speed', 'pitch'],
  grain: ['grainSize', 'density', 'position'],
  filter: ['filterCutoff', 'filterReso', 'filterMix'],
  delay: ['delayTime', 'delayFeedback', 'delayWet'],
  reverb: ['reverbSize', 'reverbDecay', 'reverbWet'],
  compressor: ['compressorThreshold', 'compressorRatio', 'compressorRelease'],
  limiter: ['limiterCeiling', 'limiterRelease'],
  distortion: ['saturation', 'saturationMix'],
  midside: ['msWidth', 'msBalance'],
  output: ['outputGain'],
}

export function essentialParamIds(type: ModuleType): ParamId[] {
  return ESSENTIAL[type] ?? []
}

export function phoneVizFromMode(viz: VizMode): PhoneViz {
  if (viz === 'automation') return 'auto'
  if (viz === 'eq-split' || viz === 'spectrum') return 'eq'
  return 'wave'
}

export function vizForPhone(viz: PhoneViz): VizMode {
  if (viz === 'auto') return 'automation'
  if (viz === 'eq') return 'eq-split'
  return 'waveform'
}

/** Displayed visualization: phones never stack wave + FFT + EQ. */
export function phoneDisplayViz(viz: VizMode): VizMode {
  return vizForPhone(phoneVizFromMode(viz))
}

/**
 * Presentation-only focused editing workspace.
 * Null is the normal FIELD layout. This is not browser fullscreen and it is
 * not effect-enabled, playback, or DSP state. Specialized effect editors can
 * extend the union later; EQ, wave, and automation are the first workspaces.
 */
export type FocusWorkspace = PhoneViz

export function focusWorkspaceForViz(viz: VizMode): FocusWorkspace {
  return phoneVizFromMode(viz)
}

export function nextSheetLevel(level: PhoneSheetLevel): PhoneSheetLevel {
  if (level === 'collapsed') return 'medium'
  if (level === 'medium') return 'expanded'
  return 'collapsed'
}
