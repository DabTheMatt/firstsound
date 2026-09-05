export const SENSORY_AXIS_IDS = [
  'brightness',
  'warmth',
  'distance',
  'hardness',
  'fullness',
  'wildness',
  'motion',
  'strangeness',
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
}

export const PRIMARY_ORBIT_AXES: SensoryAxisId[] = ['brightness', 'warmth', 'distance', 'wildness']

export const SECONDARY_FIELD_AXES: SensoryAxisId[] = ['hardness', 'fullness', 'motion', 'strangeness']
