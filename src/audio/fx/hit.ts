import type { ParamId } from '../parameters/types'
import type { DelayTap, ReverbTail } from './spaceModel'

export type SpaceHit =
  | { kind: 'delayTime' }
  | { kind: 'delayFeedback' }
  | { kind: 'delayOffset' }
  | { kind: 'reverbPredelay' }
  | { kind: 'reverbDecay' }
  | { kind: 'reverbSize' }
  | { kind: 'reverbWidth' }

export function hitSpaceOverlay(
  x: number,
  y: number,
  width: number,
  height: number,
  viewStart: number,
  viewEnd: number,
  regionStart: number,
  mode: 'delay' | 'reverb',
  taps: DelayTap[],
  tail: ReverbTail,
): SpaceHit | null {
  const span = Math.max(0.0001, viewEnd - viewStart)
  const timeX = (t: number) => ((regionStart + t - viewStart) / span) * width
  if (mode === 'delay') {
    const first = taps[0]
    if (first) {
      const fx = timeX(first.time)
      if (Math.abs(x - fx) < 18) return { kind: 'delayTime' }
      const left = taps.find((t) => t.channel === 'L')
      const right = taps.find((t) => t.channel === 'R')
      if (left && Math.abs(x - timeX(left.time)) < 14 && y < height * 0.45) return { kind: 'delayOffset' }
      if (right && Math.abs(x - timeX(right.time)) < 14 && y > height * 0.55) return { kind: 'delayOffset' }
    }
    if (taps.length >= 2) {
      const last = taps[Math.min(taps.length - 1, 4)]!
      if (Math.abs(x - timeX(last.time)) < 22) return { kind: 'delayFeedback' }
    }
    return null
  }
  const preX = timeX(tail.predelay)
  const endX = timeX(tail.predelay + Math.min(span * 0.9, tail.duration))
  if (Math.abs(x - preX) < 16) return { kind: 'reverbPredelay' }
  if (Math.abs(x - endX) < 18) return { kind: 'reverbDecay' }
  if (y < height * 0.22 || y > height * 0.78) return { kind: 'reverbWidth' }
  if (x > preX && x < endX) return { kind: 'reverbSize' }
  return null
}

export function dragSpaceOverlay(
  hit: SpaceHit,
  originT: number,
  nextT: number,
  originY: number,
  nextY: number,
  height: number,
  params: Record<ParamId, number>,
): Partial<Record<ParamId, number>> {
  const dt = nextT - originT
  const dy = (originY - nextY) / Math.max(1, height)
  switch (hit.kind) {
    case 'delayTime':
      return {
        delayTime: Math.max(1, params.delayTime + dt * 1000),
        delaySync: 0,
      }
    case 'delayFeedback':
      return { delayFeedback: params.delayFeedback + dt * 40 + dy * 30 }
    case 'delayOffset':
      return { delayOffset: params.delayOffset + dt * 80 }
    case 'reverbPredelay':
      return { reverbPredelay: Math.max(0.1, params.reverbPredelay + dt * 1000), reverbSync: 0 }
    case 'reverbDecay':
      return { reverbDecay: Math.max(0.05, params.reverbDecay + dt * 4) }
    case 'reverbSize':
      return { reverbSize: params.reverbSize + dy * 80 }
    case 'reverbWidth':
      return { reverbWidth: params.reverbWidth + dy * 120 }
  }
}
