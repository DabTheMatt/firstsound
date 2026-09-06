export const SENSORY_AXIS_IDS = [
  'character',
  'space',
  'echo',
  'grain',
  'dirt',
  'tight',
  'mod',
  'drift',
  'pan',
] as const

export type SensoryAxisId = (typeof SENSORY_AXIS_IDS)[number]

export type SensoryAxisKind = 'bipolar' | 'unipolar'

export type SensoryAxisDef = {
  id: SensoryAxisId
  kind: SensoryAxisKind
  /** DSP module this control owns. */
  module: 'eq' | 'reverb' | 'delay' | 'grain' | 'distortion' | 'compressor' | 'gain'
  negativeLabel: string
  positiveLabel: string
  ariaLabel: string
  hint: string
}

export const SENSORY_AXES: Record<SensoryAxisId, SensoryAxisDef> = {
  character: {
    id: 'character',
    kind: 'bipolar',
    module: 'eq',
    negativeLabel: 'tight',
    positiveLabel: 'open',
    ariaLabel: 'Character, tight to open. Morphs EQ only.',
    hint: 'shape the tone',
  },
  space: {
    id: 'space',
    kind: 'unipolar',
    module: 'reverb',
    negativeLabel: 'close',
    positiveLabel: 'vast',
    ariaLabel: 'Space, close to vast. Morphs reverb only.',
    hint: 'open the room',
  },
  echo: {
    id: 'echo',
    kind: 'unipolar',
    module: 'delay',
    negativeLabel: 'dry',
    positiveLabel: 'echo',
    ariaLabel: 'Echo, dry to echo. Morphs delay only.',
    hint: 'let it repeat',
  },
  grain: {
    id: 'grain',
    kind: 'unipolar',
    module: 'grain',
    negativeLabel: 'solid',
    positiveLabel: 'grain',
    ariaLabel: 'Grain, solid to layered. Morphs grain only.',
    hint: 'break into grains',
  },
  dirt: {
    id: 'dirt',
    kind: 'unipolar',
    module: 'distortion',
    negativeLabel: 'clean',
    positiveLabel: 'dirt',
    ariaLabel: 'Dirt, clean to grit. Morphs distortion only.',
    hint: 'add grit',
  },
  tight: {
    id: 'tight',
    kind: 'unipolar',
    module: 'compressor',
    negativeLabel: 'open',
    positiveLabel: 'tight',
    ariaLabel: 'Tight, open to compressed. Morphs compressor only.',
    hint: 'squeeze it closer',
  },
  mod: {
    id: 'mod',
    kind: 'unipolar',
    module: 'grain',
    negativeLabel: 'still',
    positiveLabel: 'mod',
    ariaLabel: 'Mod, still to modulated. Morphs grain motion only.',
    hint: 'let it breathe',
  },
  drift: {
    id: 'drift',
    kind: 'unipolar',
    module: 'delay',
    negativeLabel: 'center',
    positiveLabel: 'drift',
    ariaLabel: 'Drift, centered to moving stereo. Morphs delay image only.',
    hint: 'move it in the panorama',
  },
  pan: {
    id: 'pan',
    kind: 'unipolar',
    module: 'gain',
    negativeLabel: 'still',
    positiveLabel: 'pan',
    ariaLabel: 'Pan, still to orbiting. Morphs input pan LFO only.',
    hint: 'swing left and right',
  },
}

export const PRIMARY_ORBIT_AXES: SensoryAxisId[] = [
  'character',
  'space',
  'echo',
  'grain',
  'dirt',
  'tight',
  'mod',
  'drift',
  'pan',
]

export const SECONDARY_FIELD_AXES: SensoryAxisId[] = []

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

/** Feeling dials. Each control is a from–to pair owned by one effect. */
export const SENSORY_DIALS: readonly SensoryDialSpec[] = [
  {
    axis: 'character',
    pole: 'pos',
    kind: 'bipolar',
    label: 'character',
    negativeLabel: 'tight',
    positiveLabel: 'open',
    whisper: 'tight to open',
    tone: 'warm',
    ariaLabel: 'Character, tight to open',
  },
  {
    axis: 'space',
    pole: 'pos',
    kind: 'unipolar',
    label: 'space',
    negativeLabel: 'close',
    positiveLabel: 'vast',
    whisper: 'close to vast',
    tone: 'cool',
    ariaLabel: 'Space, close to vast',
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
    axis: 'grain',
    pole: 'pos',
    kind: 'unipolar',
    label: 'grain',
    negativeLabel: 'solid',
    positiveLabel: 'grain',
    whisper: 'solid to grain',
    tone: 'cool',
    ariaLabel: 'Grain, solid to layered',
  },
  {
    axis: 'dirt',
    pole: 'pos',
    kind: 'unipolar',
    label: 'dirt',
    negativeLabel: 'clean',
    positiveLabel: 'dirt',
    whisper: 'clean to dirt',
    tone: 'warm',
    ariaLabel: 'Dirt, clean to grit',
  },
  {
    axis: 'tight',
    pole: 'pos',
    kind: 'unipolar',
    label: 'tight',
    negativeLabel: 'open',
    positiveLabel: 'tight',
    whisper: 'open to tight',
    tone: 'warm',
    ariaLabel: 'Tight, open to compressed',
  },
  {
    axis: 'mod',
    pole: 'pos',
    kind: 'unipolar',
    label: 'mod',
    negativeLabel: 'still',
    positiveLabel: 'mod',
    whisper: 'still to modulated',
    tone: 'cool',
    ariaLabel: 'Mod, still to modulated',
  },
  {
    axis: 'drift',
    pole: 'pos',
    kind: 'unipolar',
    label: 'drift',
    negativeLabel: 'center',
    positiveLabel: 'drift',
    whisper: 'center to panorama',
    tone: 'cool',
    ariaLabel: 'Drift, centered to moving stereo',
  },
  {
    axis: 'pan',
    pole: 'pos',
    kind: 'unipolar',
    label: 'pan',
    negativeLabel: 'still',
    positiveLabel: 'pan',
    whisper: 'still to orbiting pan',
    tone: 'cool',
    ariaLabel: 'Pan, still to orbiting',
  },
]
