import { COMB_MAX_TEETH, EQ_MAX_STAGES, EQ_POOL_BANDS, type EqBand } from './eqBands'

export type EqChannelMode = 'shared' | 'left' | 'right'

export const EQ_CHANNEL_MODES: { value: EqChannelMode; label: string; title: string }[] = [
  { value: 'shared', label: 'Shared', title: 'One EQ curve for both channels' },
  { value: 'left', label: 'Left', title: 'Edit and hear EQ on the left channel' },
  { value: 'right', label: 'Right', title: 'Edit and hear EQ on the right channel' },
]

export type EqGraph = {
  input: GainNode
  output: GainNode
  left: BiquadFilterNode[]
  right: BiquadFilterNode[]
}

function makeChain(ctx: AudioContext, count: number): BiquadFilterNode[] {
  const nodes: BiquadFilterNode[] = []
  for (let i = 0; i < count; i++) nodes.push(ctx.createBiquadFilter())
  for (let i = 0; i < nodes.length - 1; i++) nodes[i]!.connect(nodes[i + 1]!)
  return nodes
}

export function eqPoolSize(bandCount: number): number {
  return Math.max(EQ_POOL_BANDS, bandCount) * EQ_MAX_STAGES + COMB_MAX_TEETH
}

export function createEqGraph(ctx: AudioContext, bandCount = EQ_POOL_BANDS): EqGraph {
  const count = eqPoolSize(bandCount)
  const input = ctx.createGain()
  const output = ctx.createGain()
  const split = ctx.createChannelSplitter(2)
  const merge = ctx.createChannelMerger(2)
  const left = makeChain(ctx, count)
  const right = makeChain(ctx, count)
  input.connect(split)
  split.connect(left[0]!, 0)
  split.connect(right[0]!, 1)
  left.at(-1)!.connect(merge, 0, 0)
  right.at(-1)!.connect(merge, 0, 1)
  merge.connect(output)
  return { input, output, left, right }
}

export function growEqGraph(ctx: AudioContext, graph: EqGraph, bandCount: number): void {
  const bandNeed = Math.max(EQ_POOL_BANDS, bandCount) * EQ_MAX_STAGES
  growLane(ctx, graph.left, bandNeed)
  growLane(ctx, graph.right, bandNeed)
}

function growLane(ctx: AudioContext, lane: BiquadFilterNode[], bandNeed: number): void {
  const comb = COMB_MAX_TEETH
  if (lane.length <= comb) return
  const currentBands = lane.length - comb
  if (currentBands >= bandNeed) return
  const lastBand = lane[currentBands - 1]
  const firstComb = lane[currentBands]
  if (!lastBand || !firstComb) return
  lastBand.disconnect()
  const extra: BiquadFilterNode[] = []
  let prev = lastBand
  while (currentBands + extra.length < bandNeed) {
    const node = ctx.createBiquadFilter()
    prev.connect(node)
    extra.push(node)
    prev = node
  }
  prev.connect(firstComb)
  lane.splice(currentBands, 0, ...extra)
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
