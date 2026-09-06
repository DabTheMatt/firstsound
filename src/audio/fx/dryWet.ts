export function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/** Complementary share so Dry + Wet = 100%. */
export function complementaryPct(valuePct: number): number {
  return clampPct(100 - valuePct)
}

export function isCorrelated(flag: number): boolean {
  return flag >= 0.5
}

export function applyCorrelatedPair(changed: 'dry' | 'wet', valuePct: number): { dry: number; wet: number } {
  const value = clampPct(valuePct)
  if (changed === 'wet') return { wet: value, dry: complementaryPct(value) }
  return { dry: value, wet: complementaryPct(value) }
}

export function applyReverbCorrelation(
  params: { reverbDry: number; reverbWet: number; reverbCorrelate: number },
  changed: 'dry' | 'wet' | 'enable' = 'wet',
): void {
  if (!isCorrelated(params.reverbCorrelate) && changed !== 'enable') return
  if (changed === 'enable') params.reverbCorrelate = 1
  const pair = applyCorrelatedPair(changed === 'dry' ? 'dry' : 'wet', changed === 'dry' ? params.reverbDry : params.reverbWet)
  params.reverbDry = pair.dry
  params.reverbWet = pair.wet
}

export type DelayCorrelationChange = 'dry' | 'wet' | 'dryR' | 'wetR' | 'enable'

export function applyDelayCorrelation(
  params: {
    delayDry: number
    delayDryR: number
    delayWet: number
    delayWetR: number
    delayCorrelate: number
  },
  changed: DelayCorrelationChange = 'wet',
): void {
  if (!isCorrelated(params.delayCorrelate) && changed !== 'enable') return
  if (changed === 'enable') params.delayCorrelate = 1
  if (changed === 'dry' || changed === 'wet' || changed === 'enable') {
    const pair = applyCorrelatedPair(
      changed === 'dry' ? 'dry' : 'wet',
      changed === 'dry' ? params.delayDry : params.delayWet,
    )
    params.delayDry = pair.dry
    params.delayWet = pair.wet
  }
  if (changed === 'dryR' || changed === 'wetR' || changed === 'enable') {
    const pair = applyCorrelatedPair(
      changed === 'dryR' ? 'dry' : 'wet',
      changed === 'dryR' ? params.delayDryR : params.delayWetR,
    )
    params.delayDryR = pair.dry
    params.delayWetR = pair.wet
  }
}

/** Linear Dry/Wet sends. Correlate derives Dry from Wet so the pair sums to 100%. */
export function correlatedSendLevels(
  dryPct: number,
  wetPct: number,
  correlate: number,
): { dry: number; wet: number; out: number } {
  const wet = clampPct(wetPct)
  const dry = isCorrelated(correlate) ? complementaryPct(wet) : clampPct(dryPct)
  return fxSendLevels(dry, wet, 100)
}

export function reverbSendLevels(params: {
  reverbDry: number
  reverbWet: number
  reverbCorrelate: number
}): { dry: number; wet: number; out: number } {
  return correlatedSendLevels(params.reverbDry, params.reverbWet, params.reverbCorrelate)
}

export function delaySendLevels(params: {
  delayDry: number
  delayWet: number
  delayCorrelate: number
}): { dry: number; wet: number; out: number } {
  return correlatedSendLevels(params.delayDry, params.delayWet, params.delayCorrelate)
}

export function delayChannelSendLevels(
  params: {
    delayDry: number
    delayDryR: number
    delayWet: number
    delayWetR: number
    delayCorrelate: number
  },
  channel: 'L' | 'R',
  stereo: boolean,
): { dry: number; wet: number; out: number } {
  if (channel === 'R' && stereo) {
    return correlatedSendLevels(params.delayDryR, params.delayWetR, params.delayCorrelate)
  }
  return delaySendLevels(params)
}

/** Equal-power dry/wet so Mix 50% stays near unity loudness. Ends are exact 0/1 so Mix can mute. */
export function equalPowerDryWet(mix01: number): { dry: number; wet: number } {
  const t = Math.min(1, Math.max(0, mix01))
  if (t <= 0.002) return { dry: 1, wet: 0 }
  if (t >= 0.998) return { dry: 0, wet: 1 }
  const a = t * (Math.PI / 2)
  return { dry: Math.cos(a), wet: Math.sin(a) }
}

export function fxSendLevels(
  dryPct: number,
  wetPct: number,
  outPct: number,
): { dry: number; wet: number; out: number } {
  return {
    dry: Math.min(1, Math.max(0, dryPct / 100)),
    wet: Math.min(1, Math.max(0, wetPct / 100)),
    out: Math.min(2, Math.max(0, outPct / 100)),
  }
}

/** Feedback gain for delay repeats. Always < 1 so each echo is quieter than the last. */
export function safeFeedbackGain(feedbackPct: number): number {
  return Math.min(0.95, Math.max(0, feedbackPct / 100))
}

/** Mid/side width: 0 = mono, 100 = natural, 200 = extra-wide. */
export function sideGainFromWidth(widthPct: number): number {
  return Math.min(2.2, Math.max(0, widthPct / 100))
}

/**
 * Send stereo image into an effect.
 * 0% sums L/R (mono glue); 100% keeps independent channels.
 */
export function stereoInputMix(stereoPct: number): { keep: number; cross: number } {
  const t = Math.min(1, Math.max(0, stereoPct / 100))
  return { keep: 0.5 + 0.5 * t, cross: 0.5 - 0.5 * t }
}

/** Full-wave rectifier curve for an envelope follower (dry ducking). */
export function makeAbsCurve(n = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.abs(x)
  }
  return curve
}
