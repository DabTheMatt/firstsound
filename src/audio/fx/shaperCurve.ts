import { setSmoothedAudioParam, SMOOTH_GAIN_SEC } from '../engine/paramSmooth'

const shaperCurveKey = new WeakMap<WaveShaperNode, string>()

/**
 * WaveShaper curves are static transfers. Assign one only when the transfer
 * changes so offline engines that reject a second write (and live graphs)
 * keep the curve that matches the current parameters.
 *
 * Prefer `createClickSafeShaper` on a live graph. Assigning `curve` on a
 * shaper that is already in the signal path is a hard transfer step.
 */
export function shaperCurveMatches(shaper: WaveShaperNode, key: string): boolean {
  return shaperCurveKey.get(shaper) === key
}

export function setShaperCurve(shaper: WaveShaperNode, key: string, curve: Float32Array): void {
  if (shaperCurveKey.get(shaper) === key) return
  const copy = new Float32Array(curve.length)
  copy.set(curve)
  shaper.curve = copy
  shaperCurveKey.set(shaper, key)
}

type ShaperLeg = {
  node: WaveShaperNode
  gain: GainNode
  /** Earliest time a new curve may be written. Infinity while the leg is hot. */
  writableAt: number
  /** Timestamp the fade-in was scheduled for, if this leg is the incoming one. */
  fadeInAt: number | null
}

/**
 * Three waveshapers summed through gains. The audible transfer lives on one
 * leg; a curve is written only onto a leg whose gain is still 0, then the
 * shared gain profile crossfades. The spare legs stay in the graph at gain 0
 * so the next swap does not allocate another processor.
 */
export type ClickSafeShaper = {
  input: GainNode
  output: GainNode
  /** Leg that last became the target. Offline bypass reconnects `output`. */
  readonly node: WaveShaperNode
  oversample: OverSampleType
  setCurve(key: string, curve: Float32Array, now: number): void
}

export function createClickSafeShaper(ctx: BaseAudioContext): ClickSafeShaper {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const legs: ShaperLeg[] = []
  for (let i = 0; i < 3; i++) {
    const node = ctx.createWaveShaper()
    const gain = ctx.createGain()
    gain.gain.value = i === 0 ? 1 : 0
    input.connect(node)
    node.connect(gain)
    gain.connect(output)
    legs.push({
      node,
      gain,
      writableAt: i === 0 ? Number.POSITIVE_INFINITY : 0,
      fadeInAt: null,
    })
  }
  let oversample: OverSampleType = 'none'
  let hot = 0
  let key = ''
  let primed = false

  const install = (index: number, curve: Float32Array, curveKey: string) => {
    const leg = legs[index]!
    const node = ctx.createWaveShaper()
    node.oversample = oversample
    setShaperCurve(node, curveKey, curve)
    try {
      input.disconnect(leg.node)
    } catch {
      /* leg was not wired */
    }
    try {
      leg.node.disconnect(leg.gain)
    } catch {
      /* leg was not wired */
    }
    input.connect(node)
    node.connect(leg.gain)
    leg.node = node
  }

  const write = (index: number, curve: Float32Array, curveKey: string) => {
    const node = legs[index]!.node
    try {
      node.oversample = oversample
      setShaperCurve(node, curveKey, curve)
    } catch {
      // Offline engines reject a second curve assignment. Swap the node so
      // the silent leg still takes the latest transfer.
      install(index, curve, curveKey)
    }
  }

  const pick = (now: number): { index: number; replacePending: boolean } => {
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]!
      if (leg.fadeInAt != null && leg.fadeInAt >= now - 1e-4) return { index: i, replacePending: true }
    }
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]!
      if (leg.fadeInAt == null && leg.writableAt <= now) return { index: i, replacePending: false }
    }
    let best = 0
    for (let i = 1; i < legs.length; i++) {
      if (legs[i]!.writableAt < legs[best]!.writableAt) best = i
    }
    return { index: best, replacePending: false }
  }

  return {
    input,
    output,
    get node() {
      return legs[hot]!.node
    },
    get oversample() {
      return oversample
    },
    set oversample(value: OverSampleType) {
      oversample = value
      if (!primed) {
        for (const leg of legs) leg.node.oversample = value
      }
    },
    setCurve(nextKey, curve, now) {
      if (nextKey === key && primed) return
      const t = Math.max(0, Number.isFinite(now) ? now : 0)
      if (!primed) {
        write(hot, curve, nextKey)
        key = nextKey
        primed = true
        return
      }
      const choice = pick(t)
      if (choice.replacePending) {
        write(choice.index, curve, nextKey)
        key = nextKey
        hot = choice.index
        return
      }
      const dest = legs[choice.index]!
      const start = Math.max(t, dest.writableAt)
      write(choice.index, curve, nextKey)
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i]!
        if (i === choice.index) {
          setSmoothedAudioParam(leg.gain.gain, 1, start, 'gain')
          leg.fadeInAt = start
          leg.writableAt = Number.POSITIVE_INFINITY
          continue
        }
        const becameAudible = leg.fadeInAt != null && leg.fadeInAt < start - 1e-4
        setSmoothedAudioParam(leg.gain.gain, 0, start, 'gain')
        leg.fadeInAt = null
        leg.writableAt = becameAudible ? start + SMOOTH_GAIN_SEC : start
      }
      key = nextKey
      hot = choice.index
    },
  }
}
