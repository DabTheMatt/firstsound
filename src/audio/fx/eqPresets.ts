import type { EqBand } from '../engine/eqBands'

export type EqPresetCategory =
  | 'Vocals'
  | 'Drums'
  | 'Bass'
  | 'Guitar'
  | 'Keys / Synth'
  | 'Master'
  | 'Restore'
  | 'Creative'

export type EqPreset = {
  id: string
  name: string
  category: EqPresetCategory
  hint: string
  bands: EqBand[]
}

const hp = (hz: number, q = 0.7): EqBand => ({
  type: 'highpass',
  frequency: hz,
  gain: 0,
  q,
  slope: 12,
})
const lp = (hz: number, q = 0.7): EqBand => ({
  type: 'lowpass',
  frequency: hz,
  gain: 0,
  q,
  slope: 12,
})
const ls = (hz: number, gain: number, q = 0.7): EqBand => ({
  type: 'lowshelf',
  frequency: hz,
  gain,
  q,
  slope: 12,
})
const hs = (hz: number, gain: number, q = 0.7): EqBand => ({
  type: 'highshelf',
  frequency: hz,
  gain,
  q,
  slope: 12,
})
const bell = (hz: number, gain: number, q: number): EqBand => ({
  type: 'peaking',
  frequency: hz,
  gain,
  q,
  slope: 12,
})
const notch = (hz: number, q: number): EqBand => ({
  type: 'notch',
  frequency: hz,
  gain: 0,
  q,
  slope: 12,
})

export const EQ_PRESET_CATEGORIES: EqPresetCategory[] = [
  'Vocals',
  'Drums',
  'Bass',
  'Guitar',
  'Keys / Synth',
  'Master',
  'Restore',
  'Creative',
]

/** Common mixing / restoration starting points (conservative gains). */
export const EQ_PRESETS: EqPreset[] = [
  {
    id: 'eq-vocal-presence',
    name: 'Vocal presence',
    category: 'Vocals',
    hint: 'HPF rumble, cut boxiness, lift 3–5 kHz presence',
    bands: [hp(90), bell(280, -2.5, 1.1), bell(3500, 2.5, 1.2), hs(10000, 1.5)],
  },
  {
    id: 'eq-vocal-deess',
    name: 'Vocal de-ess',
    category: 'Vocals',
    hint: 'Soft dip around 7 kHz sibilance',
    bands: [hp(80), bell(7200, -4, 2.8), hs(12000, 0.8)],
  },
  {
    id: 'eq-vocal-radio',
    name: 'Vocal radio',
    category: 'Vocals',
    hint: 'Telephone-adjacent mid focus',
    bands: [hp(280), bell(1800, 3.5, 0.8), lp(4800)],
  },
  {
    id: 'eq-kick',
    name: 'Kick punch',
    category: 'Drums',
    hint: 'Weight at 55–70 Hz, scoop mud, click at 4 kHz',
    bands: [hp(28), bell(62, 3, 1.1), bell(320, -3.5, 1.2), bell(4200, 2, 1.4)],
  },
  {
    id: 'eq-snare',
    name: 'Snare body',
    category: 'Drums',
    hint: 'Body near 200 Hz, snap near 4 kHz',
    bands: [hp(70), bell(200, 2.5, 1.1), bell(400, -2, 1.2), bell(4500, 3, 1.3)],
  },
  {
    id: 'eq-hat',
    name: 'Hats air',
    category: 'Drums',
    hint: 'HPF body, gentle air shelf',
    bands: [hp(400), bell(6000, -1.5, 1.6), hs(11000, 2.5)],
  },
  {
    id: 'eq-bass-tight',
    name: 'Bass tight',
    category: 'Bass',
    hint: 'Sub shelf, cut 250 Hz mud, pick at 800 Hz',
    bands: [hp(32), ls(70, 2.5), bell(250, -3, 1.1), bell(800, 1.5, 1.2)],
  },
  {
    id: 'eq-guitar-scoop',
    name: 'Guitar scoop',
    category: 'Guitar',
    hint: 'Classic mid scoop for stacked guitars',
    bands: [hp(80), bell(400, -3.5, 0.9), bell(3500, 2, 1.2), hs(9000, 1)],
  },
  {
    id: 'eq-acoustic',
    name: 'Acoustic body',
    category: 'Guitar',
    hint: 'Tame boom, keep sparkle',
    bands: [hp(70), bell(180, -2.5, 1), bell(3200, 2, 1.2), hs(12000, 1.5)],
  },
  {
    id: 'eq-piano',
    name: 'Piano clarity',
    category: 'Keys / Synth',
    hint: 'Low cut, gentle presence',
    bands: [hp(40), bell(250, -1.5, 1), bell(2800, 1.8, 1.1), hs(10000, 1.2)],
  },
  {
    id: 'eq-synth-dark',
    name: 'Synth dark',
    category: 'Keys / Synth',
    hint: 'Warm low-mid, rolled top',
    bands: [ls(120, 2), bell(2500, -2, 0.9), lp(9000)],
  },
  {
    id: 'eq-loudness',
    name: 'Loudness smile',
    category: 'Master',
    hint: 'Fletcher–Munson-ish low and air lift',
    bands: [ls(80, 2), bell(400, -1, 0.8), hs(10000, 2)],
  },
  {
    id: 'eq-master-air',
    name: 'Master air',
    category: 'Master',
    hint: 'Subtle high shelf, tiny mud cut',
    bands: [hp(24), bell(280, -1, 1), hs(12000, 1.8)],
  },
  {
    id: 'eq-rumble',
    name: 'Rumble cut',
    category: 'Restore',
    hint: 'Steep high-pass for field recordings',
    bands: [hp(50, 0.9), hp(80, 0.7)],
  },
  {
    id: 'eq-hum',
    name: 'Mains hum',
    category: 'Restore',
    hint: 'Notch 50 and 100 Hz (EU mains)',
    bands: [notch(50, 12), notch(100, 10), hp(30)],
  },
  {
    id: 'eq-hiss',
    name: 'Tape hiss',
    category: 'Restore',
    hint: 'Gentle high cut with a sibilance dip',
    bands: [bell(8000, -2.5, 1.4), lp(14000)],
  },
  {
    id: 'eq-telephone',
    name: 'Telephone',
    category: 'Creative',
    hint: 'Band-limited 300 Hz–3.4 kHz',
    bands: [hp(300), lp(3400)],
  },
  {
    id: 'eq-lofi',
    name: 'Lo-fi radio',
    category: 'Creative',
    hint: 'Small speaker: no sub, no air',
    bands: [hp(180), bell(900, 2.5, 0.9), lp(5500)],
  },
]

export function eqPresetsIn(category: EqPresetCategory): EqPreset[] {
  return EQ_PRESETS.filter((p) => p.category === category)
}

export function findEqPreset(id: string): EqPreset | undefined {
  return EQ_PRESETS.find((p) => p.id === id)
}
