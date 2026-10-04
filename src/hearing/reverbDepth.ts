/**
 * Reverb picture for the head and the space field.
 * Size is the room. Distance is how far the source sits in front of the listener.
 * Wet is how much of the reverb is in the mix. It does not move the source.
 */

export type ReverbSpaceInput = {
  engaged: boolean
  wet: number
  distance: number
  size: number
  decaySec: number
}

export type ReverbSpacePicture = {
  engaged: boolean
  /** 0 is a small room, 1 is a large room. The head shrinks as this grows. */
  size: number
  /** 0 is just in front of the listener, 1 is at the far wall. */
  distance: number
  /** 0 is dry, 1 is all reverb. Reflections use this. The source position does not. */
  wet: number
  /** 0 is a short tail, 1 is a long tail. */
  decay: number
}

export type HeadLayout = {
  headRadius: number
  headX: number
  headY: number
  roomX: number
  roomY: number
  roomW: number
  roomH: number
  sourceX: number
  sourceY: number
}

function unit(value: number, span: number): number {
  if (!(span > 0) || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value / span))
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function reverbSpacePicture(input: ReverbSpaceInput): ReverbSpacePicture {
  if (!input.engaged) return { engaged: false, size: 0, distance: 0, wet: 0, decay: 0 }
  const decay = unit(Math.log10(Math.max(0.05, input.decaySec) / 0.05), Math.log10(60 / 0.05))
  return {
    engaged: true,
    size: unit(input.size, 100),
    distance: unit(input.distance, 100),
    wet: unit(input.wet, 100),
    decay,
  }
}

export function roomWord(size: number): 'small' | 'mid' | 'large' {
  if (size < 0.34) return 'small'
  if (size < 0.67) return 'mid'
  return 'large'
}

export function distanceWord(distance: number): 'close' | 'mid' | 'far' {
  if (distance < 0.34) return 'close'
  if (distance < 0.67) return 'mid'
  return 'far'
}

/**
 * Top-down head. Front is up.
 * Room size and source distance both shrink the head, so a larger or more
 * distant space reads as a smaller listener. The source stays outside the
 * head and moves toward the front as distance grows.
 */
export function headLayout(
  width: number,
  height: number,
  balance: number,
  size: number,
  distance: number,
): HeadLayout {
  const size01 = clamp01(size)
  const distance01 = clamp01(distance)
  const minSide = Math.max(48, Math.min(width, height))
  const inset = 8 + (1 - size01) * minSide * 0.1
  const roomX = inset
  const roomY = inset
  const roomW = Math.max(24, width - inset * 2)
  const roomH = Math.max(24, height - inset * 2)
  const shrink = Math.min(1, size01 * 0.75 + distance01 * 0.75)
  const headRadius = Math.max(9, minSide * (0.33 - shrink * 0.23))
  const headX = roomX + roomW / 2
  const headY = roomY + roomH * 0.64
  const frontOfHead = headY - headRadius
  const gap = Math.max(12, headRadius * 0.28)
  const nearY = frontOfHead - gap
  const farY = Math.max(14, nearY - Math.max(36, headRadius * 0.85))
  const sourceY = nearY + (farY - nearY) * distance01
  const sourceX = headX + Math.max(-1, Math.min(1, balance)) * Math.min(roomW * 0.22, headRadius)
  return { headRadius, headX, headY, roomX, roomY, roomW, roomH, sourceX, sourceY }
}

/** True when the source center sits outside the head ellipse. */
export function sourceOutsideHead(layout: HeadLayout): boolean {
  const rx = Math.max(1, layout.headRadius * 0.82)
  const ry = Math.max(1, layout.headRadius)
  const nx = (layout.sourceX - layout.headX) / rx
  const ny = (layout.sourceY - layout.headY) / ry
  return nx * nx + ny * ny > 1
}
