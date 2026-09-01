export { applyAutoFades, autoFadeSeconds, clampPrep, defaultPrep, defaultRenderOptions, isTrimmed, prepEqual, selectionLength, windowLength } from './state'
export { applyFadeIn, applyFadeOut, curvePreview, fadeGain } from './fade'
export { findZeroCrossing, snapSeconds } from './zeroCrossing'
export { detectSilence, peakAmplitude, removeDc } from './prepare'
export { resampleChannel, resampleChannels } from './resample'
export { RENDER_PIPELINE, clonePcmFromBuffer, pcmDuration, renderPrep } from './render'
export { encodeWav, exportBaseName, exportFileName } from './wav'
export { canRedo, canUndo, commit, createHistory, live, redo, resetHistory, undo } from './history'
export type { History } from './history'
export type {
  ChannelMode,
  ExportSettings,
  FadeCurveId,
  Pcm,
  RenderOptions,
  SamplePrepState,
  WavBitDepth,
} from './types'
export { nextVariationName } from './variations'
export type { SampleVariation } from './variations'
export {
  CHANNEL_MODES,
  DEFAULT_NORMALIZE_DBFS,
  DEFAULT_PROTECTIVE_FADE_SEC,
  FADE_CURVES,
  PREP_MIN_REGION,
  ZERO_SEARCH_SEC,
  ZERO_WARN_SEC,
} from './types'
