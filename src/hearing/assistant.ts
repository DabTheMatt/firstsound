/**
 * Technical conditions only. Findings navigate to a time.
 * Nothing here changes audio.
 */

import type { BufferAnalysis } from './analyze'
import type { HearingEvent } from './events'

export type MixingFinding = {
  id: string
  title: string
  time: number | null
  detail: string
  /** Optional navigation span in seconds. */
  end: number | null
}

const SUBJECTIVE = /\b(bad|poor|wrong|ugly|warm|beautiful|professional|good mix)\b/i

export function mixingFindings(analysis: BufferAnalysis, events: readonly HearingEvent[]): MixingFinding[] {
  const out: MixingFinding[] = []
  if (analysis.clipped || analysis.clipCount > 0) {
    const clip = events.find((event) => event.kind === 'possibleClip')
    const peak = analysis.peakDbfs
    out.push({
      id: 'possible-clipping',
      title: 'POSSIBLE CLIPPING',
      time: clip?.time ?? analysis.originSec,
      end: clip ? clip.time + clip.duration : null,
      detail: peak !== null ? `Peak ${peak.toFixed(1)} dBFS` : `${analysis.clipCount} full-scale samples`,
    })
  }
  const low = analysis.bands.filter((band) => band.id === 'sub' || band.id === 'bass').reduce((sum, band) => sum + band.share, 0)
  if (!analysis.silent && low >= 0.55) {
    out.push({
      id: 'high-low-energy',
      title: 'VERY HIGH LOW-FREQUENCY ENERGY',
      time: analysis.originSec,
      end: null,
      detail: `${Math.round(low * 100)}% of spectral power is below 250 Hz`,
    })
  }
  if (analysis.stereo && Math.abs(analysis.stereo.balance) >= 0.25) {
    const side = analysis.stereo.balanceSide
    out.push({
      id: 'lr-imbalance',
      title: 'L/R LEVEL IMBALANCE',
      time: analysis.originSec,
      end: null,
      detail: `${side === 'C' ? 'Center' : side === 'R' ? 'Right' : 'Left'} channel average +${analysis.stereo.channelDeltaDb.toFixed(1)} dB`,
    })
  }
  if (analysis.stereo && analysis.stereo.correlation < 0.15) {
    out.push({
      id: 'low-correlation',
      title: 'VERY LOW STEREO CORRELATION',
      time: analysis.originSec,
      end: null,
      detail: `Correlation ${analysis.stereo.correlation.toFixed(2)}. Possible mono compatibility issue.`,
    })
  }
  if (analysis.crestDb !== null && analysis.crestDb >= 24) {
    out.push({
      id: 'extreme-dynamics',
      title: 'EXTREME DYNAMIC RANGE',
      time: analysis.originSec,
      end: null,
      detail: `Crest factor ${analysis.crestDb.toFixed(1)} dB`,
    })
  }
  if (!analysis.silent && analysis.crestDb !== null && analysis.crestDb < 3) {
    out.push({
      id: 'low-dynamics',
      title: 'VERY LOW DYNAMIC RANGE',
      time: analysis.originSec,
      end: null,
      detail: `Crest factor ${analysis.crestDb.toFixed(1)} dB`,
    })
  }
  const silence = events.find((event) => event.kind === 'silence' && event.duration >= 0.8)
  if (silence) {
    out.push({
      id: 'long-silence',
      title: 'LONG SILENT REGION',
      time: silence.time,
      end: silence.time + silence.duration,
      detail: `${silence.duration.toFixed(2)} s below −70 dBFS`,
    })
  }
  if (!analysis.silent && Math.abs(analysis.dcOffset) >= 0.02) {
    out.push({
      id: 'dc-offset',
      title: 'STRONG DC OFFSET',
      time: analysis.originSec,
      end: null,
      detail: `Mean sample ${analysis.dcOffset.toFixed(3)}`,
    })
  }
  for (const finding of out) {
    if (SUBJECTIVE.test(finding.title) || SUBJECTIVE.test(finding.detail)) {
      throw new Error('Hearing Access finding used subjective language')
    }
  }
  return out
}
