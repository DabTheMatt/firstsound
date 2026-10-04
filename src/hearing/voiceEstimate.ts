/**
 * Conservative voice-band energy estimate.
 * This is not speech separation. Narrow tones inside the voice band stay inconclusive.
 */

import type { BufferAnalysis } from './analyze'

export type VoiceEstimate = {
  status: 'estimate' | 'omitted'
  label: 'VOICE-DOMINANT' | 'BACKGROUND HIGH' | 'INCONCLUSIVE'
  voiceShare: number | null
  backgroundShare: number | null
  contrastDb: number | null
  detail: string
}

export function voiceEstimate(analysis: BufferAnalysis): VoiceEstimate {
  if (analysis.silent || analysis.narrowTonal || analysis.tonality === 'high') {
    return {
      status: 'omitted',
      label: 'INCONCLUSIVE',
      voiceShare: null,
      backgroundShare: null,
      contrastDb: null,
      detail: 'Voice and background were not separated. A narrow tone is not reported as speech.',
    }
  }
  const voice = analysis.bands
    .filter((band) => band.id === 'lowMid' || band.id === 'mid' || band.id === 'highMid')
    .reduce((sum, band) => sum + band.share, 0)
  const background = Math.max(0, 1 - voice)
  if (analysis.flatness === null || analysis.flatness < 0.08 || analysis.flatness > 0.85) {
    return {
      status: 'omitted',
      label: 'INCONCLUSIVE',
      voiceShare: null,
      backgroundShare: null,
      contrastDb: null,
      detail: 'ESTIMATE omitted. Spectral shape is outside the range used for a voice-band guess.',
    }
  }
  const contrast = background > 0.02 && voice > 0.02 ? 10 * Math.log10(voice / background) : null
  if (voice >= 0.55) {
    return {
      status: 'estimate',
      label: 'VOICE-DOMINANT',
      voiceShare: voice,
      backgroundShare: background,
      contrastDb: contrast,
      detail: `ESTIMATE. ${Math.round(voice * 100)}% of spectral power sits between 250 Hz and 6 kHz. This is not a speech transcript.`,
    }
  }
  if (background >= 0.62) {
    return {
      status: 'estimate',
      label: 'BACKGROUND HIGH',
      voiceShare: voice,
      backgroundShare: background,
      contrastDb: contrast,
      detail: `ESTIMATE. ${Math.round(background * 100)}% of spectral power is outside 250 Hz–6 kHz.`,
    }
  }
  return {
    status: 'omitted',
    label: 'INCONCLUSIVE',
    voiceShare: null,
    backgroundShare: null,
    contrastDb: null,
    detail: 'ESTIMATE omitted. Voice-band contrast is not clear enough to report a number.',
  }
}
