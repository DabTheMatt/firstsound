export type DelayType =
  | 'digital'
  | 'analog'
  | 'tape'
  | 'pingPong'
  | 'stereo'
  | 'multiTap'
  | 'reverse'
  | 'diffuse'
  | 'lofi'
  | 'pitch'

export type ReverbType =
  | 'room'
  | 'chamber'
  | 'hall'
  | 'largeHall'
  | 'plate'
  | 'spring'
  | 'cathedral'
  | 'ambience'
  | 'shimmer'
  | 'reverse'
  | 'gated'
  | 'nonlinear'
  | 'cloud'
  | 'infinite'

export type NoteDivision = '1/64' | '1/32' | '1/16' | '1/8' | '1/4' | '1/2' | '1/1' | '2/1'

export type NoteKind = 'straight' | 'dotted' | 'triplet'

export const DELAY_TYPES: { value: DelayType; label: string }[] = [
  { value: 'digital', label: 'Digital' },
  { value: 'analog', label: 'Analog' },
  { value: 'tape', label: 'Tape' },
  { value: 'pingPong', label: 'Ping-Pong' },
  { value: 'stereo', label: 'Stereo' },
  { value: 'multiTap', label: 'Multi-Tap' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'diffuse', label: 'Diffuse' },
  { value: 'lofi', label: 'Lo-Fi' },
  { value: 'pitch', label: 'Pitch' },
]

export const REVERB_TYPES: { value: ReverbType; label: string }[] = [
  { value: 'room', label: 'Room' },
  { value: 'chamber', label: 'Chamber' },
  { value: 'hall', label: 'Hall' },
  { value: 'largeHall', label: 'Large Hall' },
  { value: 'plate', label: 'Plate' },
  { value: 'spring', label: 'Spring' },
  { value: 'cathedral', label: 'Cathedral' },
  { value: 'ambience', label: 'Ambience' },
  { value: 'shimmer', label: 'Shimmer' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'gated', label: 'Gated' },
  { value: 'nonlinear', label: 'Nonlinear' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'infinite', label: 'Infinite' },
]

export const NOTE_DIVISIONS: { value: NoteDivision; label: string; beats: number }[] = [
  { value: '1/64', label: '1/64', beats: 0.0625 },
  { value: '1/32', label: '1/32', beats: 0.125 },
  { value: '1/16', label: '1/16', beats: 0.25 },
  { value: '1/8', label: '1/8', beats: 0.5 },
  { value: '1/4', label: '1/4', beats: 1 },
  { value: '1/2', label: '1/2', beats: 2 },
  { value: '1/1', label: '1/1', beats: 4 },
  { value: '2/1', label: '2/1', beats: 8 },
]

export const NOTE_KINDS: { value: NoteKind; label: string; mul: number }[] = [
  { value: 'straight', label: 'Straight', mul: 1 },
  { value: 'dotted', label: 'Dotted', mul: 1.5 },
  { value: 'triplet', label: 'Triplet', mul: 2 / 3 },
]

export const DELAY_TYPE_SET = new Set<string>(DELAY_TYPES.map((t) => t.value))
export const REVERB_TYPE_SET = new Set<string>(REVERB_TYPES.map((t) => t.value))

export function parseDelayType(raw: unknown): DelayType | null {
  return typeof raw === 'string' && DELAY_TYPE_SET.has(raw) ? (raw as DelayType) : null
}

export function parseReverbType(raw: unknown): ReverbType | null {
  return typeof raw === 'string' && REVERB_TYPE_SET.has(raw) ? (raw as ReverbType) : null
}

export function noteDivisionAt(index: number): NoteDivision {
  const i = Math.min(NOTE_DIVISIONS.length - 1, Math.max(0, Math.round(index)))
  return NOTE_DIVISIONS[i]!.value
}

export function noteKindAt(index: number): NoteKind {
  const i = Math.min(NOTE_KINDS.length - 1, Math.max(0, Math.round(index)))
  return NOTE_KINDS[i]!.value
}
