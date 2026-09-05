export const SENSORY_AXIS_IDS = [
  'brightness',
  'warmth',
  'distance',
  'hardness',
  'fullness',
  'wildness',
  'motion',
  'strangeness',
  'echo',
] as const

export type SensoryAxisId = (typeof SENSORY_AXIS_IDS)[number]

export type SensoryAxisDef = {
  id: SensoryAxisId
  negativeLabel: string
  positiveLabel: string
  ariaLabel: string
  hint: string
}

export const SENSORY_AXES: Record<SensoryAxisId, SensoryAxisDef> = {
  brightness: {
    id: 'brightness',
    negativeLabel: 'darker',
    positiveLabel: 'brighter',
    ariaLabel: 'Brightness, darker to brighter',
    hint: 'more light',
  },
  warmth: {
    id: 'warmth',
    negativeLabel: 'colder',
    positiveLabel: 'warmer',
    ariaLabel: 'Warmth, colder to warmer',
    hint: 'make it warmer',
  },
  distance: {
    id: 'distance',
    negativeLabel: 'closer',
    positiveLabel: 'further',
    ariaLabel: 'Distance, closer to further',
    hint: 'push it further',
  },
  hardness: {
    id: 'hardness',
    negativeLabel: 'softer',
    positiveLabel: 'harder',
    ariaLabel: 'Touch, softer to harder',
    hint: 'shape the attack',
  },
  fullness: {
    id: 'fullness',
    negativeLabel: 'thinner',
    positiveLabel: 'fuller',
    ariaLabel: 'Body, thinner to fuller',
    hint: 'give it more body',
  },
  wildness: {
    id: 'wildness',
    negativeLabel: 'calmer',
    positiveLabel: 'wilder',
    ariaLabel: 'Energy, calmer to wilder',
    hint: 'let it breathe',
  },
  motion: {
    id: 'motion',
    negativeLabel: 'still',
    positiveLabel: 'moving',
    ariaLabel: 'Motion, still to moving',
    hint: 'let it move',
  },
  strangeness: {
    id: 'strangeness',
    negativeLabel: 'natural',
    positiveLabel: 'strange',
    ariaLabel: 'Character, natural to strange',
    hint: 'let it wander',
  },
  echo: {
    id: 'echo',
    negativeLabel: 'dry',
    positiveLabel: 'echo',
    ariaLabel: 'Echo, dry to echo',
    hint: 'let it repeat',
  },
}

export const PRIMARY_ORBIT_AXES: SensoryAxisId[] = ['brightness', 'warmth', 'distance', 'echo', 'wildness']

export const SECONDARY_FIELD_AXES: SensoryAxisId[] = ['hardness', 'fullness', 'motion', 'strangeness']

export type SensoryDialPole = 'pos' | 'neg'

export type SensoryDialSpec = {
  axis: SensoryAxisId
  pole: SensoryDialPole
  kind?: 'unipolar' | 'bipolar'
  label: string
  negativeLabel?: string
  positiveLabel?: string
  whisper: string
  tone: 'warm' | 'cool'
  ariaLabel?: string
}

/** Feeling dials. Each control is a from–to pair. */
export const SENSORY_DIALS: readonly SensoryDialSpec[] = [
  {
    axis: 'brightness',
    pole: 'pos',
    kind: 'bipolar',
    label: 'light',
    negativeLabel: 'darker',
    positiveLabel: 'brighter',
    whisper: 'darker to brighter',
    tone: 'warm',
    ariaLabel: 'Light, darker to brighter',
  },
  {
    axis: 'warmth',
    pole: 'pos',
    kind: 'bipolar',
    label: 'warmth',
    negativeLabel: 'colder',
    positiveLabel: 'warmer',
    tone: 'warm',
    whisper: 'colder to warmer',
    ariaLabel: 'Warmth, colder to warmer',
  },
  {
    axis: 'distance',
    pole: 'pos',
    kind: 'bipolar',
    label: 'distance',
    negativeLabel: 'closer',
    positiveLabel: 'further',
    whisper: 'closer to further',
    tone: 'cool',
    ariaLabel: 'Distance, closer to further',
  },
  {
    axis: 'echo',
    pole: 'pos',
    kind: 'unipolar',
    label: 'echo',
    negativeLabel: 'dry',
    positiveLabel: 'echo',
    whisper: 'dry to echo',
    tone: 'cool',
    ariaLabel: 'Echo, dry to echo',
  },
  {
    axis: 'wildness',
    pole: 'pos',
    kind: 'bipolar',
    label: 'pulse',
    negativeLabel: 'still',
    positiveLabel: 'pulse',
    whisper: 'still to pulse',
    tone: 'cool',
    ariaLabel: 'Pulse, still to pulse',
  },
  {
    axis: 'hardness',
    pole: 'pos',
    kind: 'bipolar',
    label: 'touch',
    negativeLabel: 'softer',
    positiveLabel: 'harder',
    whisper: 'softer to harder',
    tone: 'warm',
    ariaLabel: 'Touch, softer to harder',
  },
]
