import { clampRegion, fullPlayRegion } from '../parameters/mapping'
import {
  DEFAULT_NORMALIZE_DBFS,
  DEFAULT_PROTECTIVE_FADE_SEC,
  PREP_MIN_REGION,
  type RenderOptions,
  type SamplePrepState,
} from './types'

export function defaultPrep(duration: number): SamplePrepState {
  const region = fullPlayRegion(duration)
  return {
    windowStart: 0,
    windowEnd: Math.max(0, duration),
    selectionStart: region.start,
    selectionEnd: region.end,
    reverse: false,
    gainDb: 0,
    normalize: false,
    normalizeTargetDbfs: DEFAULT_NORMALIZE_DBFS,
    removeDc: false,
    invertL: false,
    invertR: false,
    channelMode: 'original',
    fadeInEnabled: true,
    fadeOutEnabled: true,
    fadeInSec: DEFAULT_PROTECTIVE_FADE_SEC,
    fadeOutSec: DEFAULT_PROTECTIVE_FADE_SEC,
    fadeInCurve: 'equalPower',
    fadeOutCurve: 'equalPower',
    fadeInBend: 0.5,
    fadeOutBend: 0.5,
    fadeAuto: true,
    autoSnapZero: false,
    clipName: '',
  }
}

export function clampPrep(state: SamplePrepState, sourceDuration: number): SamplePrepState {
  const duration = Math.max(0, sourceDuration)
  const window = clampRegion(state.windowStart, state.windowEnd, duration, PREP_MIN_REGION)
  const span = window.end - window.start
  const sel = clampRegion(
    state.selectionStart,
    state.selectionEnd,
    duration,
    Math.min(PREP_MIN_REGION, span || PREP_MIN_REGION),
  )
  const selectionStart = Math.min(Math.max(sel.start, window.start), window.end)
  const selectionEnd = Math.min(Math.max(sel.end, window.start), window.end)
  const minEnd = Math.min(window.end, selectionStart + Math.min(PREP_MIN_REGION, span || PREP_MIN_REGION))
  return {
    ...state,
    windowStart: window.start,
    windowEnd: window.end,
    selectionStart,
    selectionEnd: Math.max(selectionEnd, minEnd),
    fadeInSec: Math.max(0, state.fadeInSec),
    fadeOutSec: Math.max(0, state.fadeOutSec),
    fadeInBend: Math.min(1, Math.max(0, state.fadeInBend)),
    fadeOutBend: Math.min(1, Math.max(0, state.fadeOutBend)),
    gainDb: Math.min(24, Math.max(-48, state.gainDb)),
    normalizeTargetDbfs: Math.min(0, Math.max(-24, state.normalizeTargetDbfs)),
  }
}

/**
 * Protective fade length from selection duration. Short transients stay short;
 * long field recordings get a slightly longer click-guard. Fallback is 10 ms.
 */
export function autoFadeSeconds(selectionDuration: number, cleanCut = false): number {
  if (cleanCut) return 0.005
  if (!(selectionDuration > 0)) return DEFAULT_PROTECTIVE_FADE_SEC
  if (selectionDuration < 1) return 0.005
  if (selectionDuration < 10) return 0.01
  if (selectionDuration < 60) return 0.018
  return 0.025
}

export function applyAutoFades(state: SamplePrepState, cleanCut = false): SamplePrepState {
  if (!state.fadeAuto) return state
  const dur = Math.max(0, state.selectionEnd - state.selectionStart)
  const fade = autoFadeSeconds(dur, cleanCut)
  const maxFade = Math.max(0, dur / 2 - 0.0005)
  const sec = Math.min(fade, maxFade)
  return {
    ...state,
    fadeInEnabled: true,
    fadeOutEnabled: true,
    fadeInSec: sec,
    fadeOutSec: sec,
  }
}

export function defaultRenderOptions(state: SamplePrepState): RenderOptions {
  return {
    applyFades: state.fadeInEnabled || state.fadeOutEnabled,
    applyGain: state.gainDb !== 0,
    applyReverse: state.reverse,
    applyNormalize: state.normalize,
    applyDc: state.removeDc,
    applyChannels:
      state.channelMode !== 'original' || state.invertL || state.invertR,
    sampleRate: 'original',
  }
}

export function selectionLength(state: SamplePrepState): number {
  return Math.max(0, state.selectionEnd - state.selectionStart)
}

export function windowLength(state: SamplePrepState): number {
  return Math.max(0, state.windowEnd - state.windowStart)
}

export function isTrimmed(state: SamplePrepState, sourceDuration: number): boolean {
  return state.windowStart > 0.0005 || state.windowEnd < sourceDuration - 0.0005
}

export function prepEqual(a: SamplePrepState, b: SamplePrepState): boolean {
  return (
    a.windowStart === b.windowStart &&
    a.windowEnd === b.windowEnd &&
    a.selectionStart === b.selectionStart &&
    a.selectionEnd === b.selectionEnd &&
    a.reverse === b.reverse &&
    a.gainDb === b.gainDb &&
    a.normalize === b.normalize &&
    a.normalizeTargetDbfs === b.normalizeTargetDbfs &&
    a.removeDc === b.removeDc &&
    a.invertL === b.invertL &&
    a.invertR === b.invertR &&
    a.channelMode === b.channelMode &&
    a.fadeInEnabled === b.fadeInEnabled &&
    a.fadeOutEnabled === b.fadeOutEnabled &&
    a.fadeInSec === b.fadeInSec &&
    a.fadeOutSec === b.fadeOutSec &&
    a.fadeInCurve === b.fadeInCurve &&
    a.fadeOutCurve === b.fadeOutCurve &&
    a.fadeInBend === b.fadeInBend &&
    a.fadeOutBend === b.fadeOutBend &&
    a.fadeAuto === b.fadeAuto &&
    a.autoSnapZero === b.autoSnapZero &&
    a.clipName === b.clipName
  )
}
