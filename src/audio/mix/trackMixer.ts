/**
 * Per-track mixer graph.
 *
 * Signal path, built once per track and kept while the slot exists:
 *
 *   source
 *     → input
 *     → fxInsert     future Track FX chain inserts here (between fxInsert and the next node)
 *     → mid/side     stereo tracks only; mono wires fxInsert straight to pan
 *     → pan          StereoPannerNode (mono pan, or stereo balance at the mix)
 *     → level        track volume — the existing mix fader, not a second gain
 *     → gate         mute / solo, short AudioParam ramp
 *     → output
 *         selected track → voiceBus → project effect chain → sumBus
 *         other tracks   → sumBus
 *     → master fader (sumBus) → limiter → safety gain → destination
 *
 * A level meter taps `gate` (post-mixer, pre-master) and is pulled through a
 * silent sink. It is not in series, so it cannot fold the stereo image.
 * The master meter stays on the limiter and hears the real sum, including
 * this mixer and the project effect chain. Nothing divides that sum by the
 * number of tracks.
 *
 * Knob moves write AudioParams. They do not disconnect nodes, restart
 * sources, or rebuild the strip. The Mid/Side matrix is created or removed
 * only when the buffer channel count crosses the stereo boundary.
 *
 * Input pan / balance on the project Gain module is a different parameter
 * (`pan`, `channelGainL`, `channelGainR`). This strip's pan is `track.pan`.
 */

import { msLevelGain } from '../fx/midSide'
import { setSmoothedAudioParam } from '../engine/paramSmooth'
import { forceMonoDiscrete, forceStereoDiscrete, panNorm } from '../engine/stereoStage'
import { TRACK_MIXER_PARAMS } from './mixerParams'

/** Documented stage order. Future Track FX belongs on `fxInsert`. */
export const TRACK_MIXER_STAGES = [
  'source',
  'fxInsert',
  'midSide',
  'pan',
  'level',
  'muteSolo',
  'master',
] as const

/** (L+R) and (L-R) scale that reconstructs the original stereo signal at unity. */
export const MID_SIDE_NORMALIZE = 0.5

export function reconstructMidSide(
  left: number,
  right: number,
  midGain: number,
  sideGain: number,
): { left: number; right: number } {
  const mid = (left + right) * MID_SIDE_NORMALIZE * midGain
  const side = (left - right) * MID_SIDE_NORMALIZE * sideGain
  return { left: mid + side, right: mid - side }
}

type MidSideNodes = {
  mid: GainNode
  side: GainNode
  nodes: AudioNode[]
}

export type TrackMixerStrip = {
  input: GainNode
  /** Unity send. The next task splices the per-track FX chain onto this node. */
  fxInsert: GainNode
  panner: StereoPannerNode
  level: GainNode
  gate: GainNode
  /** Post-mixer tap. Not in the audible series path. */
  meter: AnalyserNode
  output: GainNode
  stereo: boolean
  ms: MidSideNodes | null
}

export type TrackMixerTargets = {
  pan: number
  /** Linear track level. 1 is 0 dB. */
  level: number
  /** 1 audible, 0 silenced by mute or solo. */
  gate: number
  midDb: number
  sideDb: number
}

function silentCatch(run: () => void): void {
  try {
    run()
  } catch {
    /* already disconnected */
  }
}

export function createTrackMixerStrip(ctx: BaseAudioContext): TrackMixerStrip {
  const input = ctx.createGain()
  const fxInsert = ctx.createGain()
  const panner = ctx.createStereoPanner()
  const level = ctx.createGain()
  const gate = ctx.createGain()
  const meter = ctx.createAnalyser()
  const output = ctx.createGain()
  meter.fftSize = 256
  meter.smoothingTimeConstant = 0
  input.gain.value = 1
  fxInsert.gain.value = 1
  panner.pan.value = 0
  level.gain.value = 1
  gate.gain.value = 1
  output.gain.value = 1
  input.connect(fxInsert)
  fxInsert.connect(panner)
  panner.connect(level)
  level.connect(gate)
  gate.connect(output)
  gate.connect(meter)
  return { input, fxInsert, panner, level, gate, meter, output, stereo: false, ms: null }
}

/**
 * Insert the encode → gain → decode matrix between fxInsert and the panner.
 * Coefficients match `reconstructMidSide`. Unity mid and side gains are 1.
 */
export function enableTrackMidSide(ctx: BaseAudioContext, strip: TrackMixerStrip): void {
  if (strip.ms) return
  silentCatch(() => strip.fxInsert.disconnect())
  forceStereoDiscrete(strip.fxInsert)

  const split = ctx.createChannelSplitter(2)
  const midFromL = ctx.createGain()
  const midFromR = ctx.createGain()
  const sideFromL = ctx.createGain()
  const sideFromR = ctx.createGain()
  midFromL.gain.value = MID_SIDE_NORMALIZE
  midFromR.gain.value = MID_SIDE_NORMALIZE
  sideFromL.gain.value = MID_SIDE_NORMALIZE
  sideFromR.gain.value = -MID_SIDE_NORMALIZE
  for (const tap of [midFromL, midFromR, sideFromL, sideFromR]) forceMonoDiscrete(tap)

  const mid = ctx.createGain()
  const side = ctx.createGain()
  forceMonoDiscrete(mid)
  forceMonoDiscrete(side)
  mid.gain.value = 1
  side.gain.value = 1

  const sideInv = ctx.createGain()
  sideInv.gain.value = -1
  forceMonoDiscrete(sideInv)
  const decode = ctx.createChannelMerger(2)

  strip.fxInsert.connect(split)
  split.connect(midFromL, 0)
  split.connect(midFromR, 1)
  split.connect(sideFromL, 0)
  split.connect(sideFromR, 1)
  midFromL.connect(mid)
  midFromR.connect(mid)
  sideFromL.connect(side)
  sideFromR.connect(side)
  mid.connect(decode, 0, 0)
  mid.connect(decode, 0, 1)
  side.connect(decode, 0, 0)
  side.connect(sideInv)
  sideInv.connect(decode, 0, 1)
  decode.connect(strip.panner)

  strip.ms = {
    mid,
    side,
    nodes: [split, midFromL, midFromR, sideFromL, sideFromR, mid, side, sideInv, decode],
  }
  strip.stereo = true
}

/** Drop the matrix and pass fxInsert straight to the panner again. */
export function disableTrackMidSide(strip: TrackMixerStrip): void {
  if (!strip.ms) {
    strip.stereo = false
    return
  }
  silentCatch(() => strip.fxInsert.disconnect())
  for (const node of strip.ms.nodes) silentCatch(() => node.disconnect())
  strip.ms = null
  strip.stereo = false
  try {
    strip.fxInsert.channelCountMode = 'max'
    strip.fxInsert.channelInterpretation = 'speakers'
  } catch {
    /* node rejects channel config */
  }
  strip.fxInsert.connect(strip.panner)
}

export function disconnectTrackMixerStrip(strip: TrackMixerStrip): void {
  disableTrackMidSide(strip)
  for (const node of [strip.input, strip.fxInsert, strip.panner, strip.level, strip.gate, strip.meter, strip.output]) {
    silentCatch(() => node.disconnect())
  }
}

function linearGain(value: number): number {
  if (!(value > 1e-5)) return 0
  return value
}

/** Schedule mixer AudioParams. Does not touch the node graph. */
export function applyTrackMixerParams(strip: TrackMixerStrip, targets: TrackMixerTargets, now: number): void {
  const pan = Math.min(TRACK_MIXER_PARAMS.pan.max, Math.max(TRACK_MIXER_PARAMS.pan.min, targets.pan))
  setSmoothedAudioParam(strip.panner.pan, panNorm(pan), now, 'pan')
  setSmoothedAudioParam(strip.level.gain, linearGain(targets.level), now, 'gain')
  setSmoothedAudioParam(strip.gate.gain, targets.gate > 0.5 ? 1 : 0, now, 'gain')
  if (strip.ms) {
    setSmoothedAudioParam(strip.ms.mid.gain, msLevelGain(targets.midDb), now, 'gain')
    setSmoothedAudioParam(strip.ms.side.gain, msLevelGain(targets.sideDb), now, 'gain')
  }
}
