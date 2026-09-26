import { COMB_MAX_TEETH, EQ_MAX_BANDS, EQ_MAX_STAGES, EQ_POOL_BANDS, type EqBand } from './eqBands'

export type EqChannelMode = 'shared' | 'left' | 'right'

export const EQ_CHANNEL_MODES: { value: EqChannelMode; label: string; title: string }[] = [
  { value: 'shared', label: 'Shared', title: 'One EQ curve for both channels' },
  { value: 'left', label: 'Left', title: 'Edit and hear EQ on the left channel' },
  { value: 'right', label: 'Right', title: 'Edit and hear EQ on the right channel' },
]

/**
 * Bypassed biquad. Peaking at 0 dB is an identity transfer, so a stage can sit
 * in the wet path without coloring phase the way a live allpass does.
 * Set these before the node is connected or heard.
 */
export function applyIdentityBiquad(node: BiquadFilterNode): void {
  node.type = 'peaking'
  node.frequency.value = 1000
  node.Q.value = 1
  node.gain.value = 0
}

export type EqBandPath = {
  input: GainNode
  output: GainNode
  dry: GainNode
  wet: GainNode
  stages: BiquadFilterNode[]
  signature: string
  arm: 'live' | 'muting'
  token: number
  forceCommit: boolean
}

export type EqLane = {
  input: GainNode
  output: GainNode
  bands: EqBandPath[]
  combDry: GainNode
  combWet: GainNode
  comb: BiquadFilterNode[]
  combSignature: string
  combArm: 'live' | 'muting'
  combToken: number
  combForce: boolean
}

export type EqGraph = {
  input: GainNode
  output: GainNode
  left: EqLane
  right: EqLane
}

export function eqPoolSize(bandCount: number): number {
  return Math.max(EQ_POOL_BANDS, bandCount) * EQ_MAX_STAGES + COMB_MAX_TEETH
}

function createBand(ctx: AudioContext): EqBandPath {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const dry = ctx.createGain()
  const wet = ctx.createGain()
  dry.gain.value = 1
  wet.gain.value = 0
  const stage = ctx.createBiquadFilter()
  applyIdentityBiquad(stage)
  input.connect(dry)
  dry.connect(output)
  input.connect(stage)
  stage.connect(wet)
  wet.connect(output)
  return {
    input,
    output,
    dry,
    wet,
    stages: [stage],
    signature: 'off',
    arm: 'live',
    token: 0,
    forceCommit: false,
  }
}

/** Add cascade stages on the wet tap only. Caller must keep that tap silent. */
export function ensureBandStages(ctx: AudioContext, path: EqBandPath, count: number): void {
  const need = Math.max(1, Math.min(EQ_MAX_STAGES, count))
  while (path.stages.length < need) {
    const node = ctx.createBiquadFilter()
    applyIdentityBiquad(node)
    const last = path.stages[path.stages.length - 1]
    if (!last) {
      path.input.connect(node)
    } else {
      try {
        last.disconnect(path.wet)
      } catch {
        /* already rewired */
      }
      last.connect(node)
    }
    node.connect(path.wet)
    path.stages.push(node)
  }
}

function createLane(ctx: AudioContext, bandCount: number): EqLane {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const bands = Array.from({ length: bandCount }, () => createBand(ctx))
  let prev: AudioNode = input
  for (const band of bands) {
    prev.connect(band.input)
    prev = band.output
  }
  const combDry = ctx.createGain()
  const combWet = ctx.createGain()
  combDry.gain.value = 1
  combWet.gain.value = 0
  const combIn = ctx.createGain()
  const combOut = ctx.createGain()
  prev.connect(combIn)
  combIn.connect(combDry)
  combDry.connect(combOut)
  const comb: BiquadFilterNode[] = []
  let cprev: AudioNode = combIn
  for (let i = 0; i < COMB_MAX_TEETH; i++) {
    const node = ctx.createBiquadFilter()
    applyIdentityBiquad(node)
    cprev.connect(node)
    comb.push(node)
    cprev = node
  }
  cprev.connect(combWet)
  combWet.connect(combOut)
  combOut.connect(output)
  return {
    input,
    output,
    bands,
    combDry,
    combWet,
    comb,
    combSignature: 'off',
    combArm: 'live',
    combToken: 0,
    combForce: false,
  }
}

export function createEqGraph(ctx: AudioContext, _bandCount = EQ_POOL_BANDS): EqGraph {
  // Every band the UI can add is already a dry wire. Growing the list later
  // would disconnect the live chain and click.
  const input = ctx.createGain()
  const output = ctx.createGain()
  const split = ctx.createChannelSplitter(2)
  const merge = ctx.createChannelMerger(2)
  const left = createLane(ctx, EQ_MAX_BANDS)
  const right = createLane(ctx, EQ_MAX_BANDS)
  input.connect(split)
  split.connect(left.input, 0)
  split.connect(right.input, 1)
  left.output.connect(merge, 0, 0)
  right.output.connect(merge, 0, 1)
  merge.connect(output)
  return { input, output, left, right }
}

/** Bands are preallocated. Kept so older call sites can ask for a larger pool. */
export function growEqGraph(_ctx: AudioContext, _graph: EqGraph, _bandCount: number): void {
  /* lanes already hold EQ_MAX_BANDS identity stages */
}

export function eqBandsForChannel(
  mode: EqChannelMode,
  channel: 'left' | 'right',
  shared: EqBand[],
  left: EqBand[],
  right: EqBand[],
): EqBand[] {
  if (mode === 'shared') return shared
  if (channel === 'left') return left.length ? left : shared
  return right.length ? right : shared
}

export function cloneEqBands(bands: EqBand[]): EqBand[] {
  return bands.map((b) => ({ ...b }))
}
