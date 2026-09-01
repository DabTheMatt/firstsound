import type { ParamId } from '../parameters/types'
import type { DelayType, ReverbType } from './types'

export type FxPresetCategory =
  | 'Vocals'
  | 'Guitar'
  | 'Drums'
  | 'Synth'
  | 'Rhythmic'
  | 'Stereo'
  | 'Analog/Tape'
  | 'Ambient'
  | 'Experimental'
  | 'Lo-Fi'
  | 'Room'
  | 'Plate'
  | 'Hall'
  | 'Spring'
  | 'Cinematic'

export type SpacePreset = {
  id: string
  name: string
  kind: 'delay' | 'reverb'
  category: FxPresetCategory
  delayType?: DelayType
  reverbType?: ReverbType
  params: Partial<Record<ParamId, number>>
}

export const PRESET_HINTS: Record<string, string> = {
  'dly-drums': '70 ms slap, almost no repeats — snare/hat space',
  'dly-vocal-slap': 'Short digital slapback behind a vocal',
  'dly-rockabilly': 'Tape slap ~128 ms with wow — guitar/amp vibe',
  'dly-1-4': 'Quarter-note tempo delay',
  'dly-1-8': 'Eighth-note tempo delay',
  'dly-dot-8': 'Dotted 1/8 bounce (U2 / The Edge feel)',
  'dly-ping': 'Left-right ping-pong eighths',
  'dly-haas': '18 ms offset, no feedback — stereo width only',
  'dly-analog': 'Dark BBD-style repeats',
  'dly-tape': 'Wow, flutter and rolled-off tape echo',
  'dly-dub': 'Long dark feedback that can run away',
  'dly-throw': 'One-shot quarter throw with ducking',
  'dly-lead': 'Dotted 1/8 lead delay, open top end',
  'dly-ambient': 'Long diffuse wash',
  'dly-multitap': 'Rhythmic extra taps',
  'dly-rev': 'Reverse repeats',
  'dly-lofi': 'Broken, band-limited delay',
  'dly-mod': 'Chorus-y modulation on repeats',
  'dly-chorus': 'Very short stereo chorus delay',
  'dly-osc': 'Feedback over 100% — self-oscillates (use Kill)',
  'dly-pitch': 'Pitched repeats',
  'dly-diffused': 'Delay into a smear',
  'rv-guitar-room': 'Small room around a cab',
  'rv-small': 'Tight practice-room air',
  'rv-drum-room': 'Close drum booth, strong earlies',
  'rv-vocal-room': 'Intimate vocal booth',
  'rv-vocal-plate': 'Bright studio plate',
  'rv-drum-plate': 'Snare/kit plate, short-ish',
  'rv-snare-plate': 'Classic snare plate',
  'rv-amb': 'Barely-there ambience',
  'rv-vocal-hall': 'Medium vocal hall',
  'rv-large-hall': 'Wide hall',
  'rv-cathedral': 'Very long stone space',
  'rv-dark-hall': 'Dark damped hall',
  'rv-bright-plate': 'Extra-bright plate',
  'rv-spring': 'Twangy guitar spring',
  'rv-gated': '80s gated snare',
  'rv-reverse': 'Swell into the hit',
  'rv-shimmer': 'Octave-up bloom',
  'rv-dreamy': 'Long cloud pad',
  'rv-cinema': 'Huge cinematic tail',
  'rv-infinite': 'Freeze / infinite pad',
  'rv-lofi': 'Dark cheap room',
  'rv-mod': 'Wobbly chamber',
  'rv-wash': 'Distant washed-out hall',
}

function delayP(patch: Partial<Record<ParamId, number>>): Partial<Record<ParamId, number>> {
  return {
    delaySync: 0,
    delayFreeze: 0,
    delayReverse: 0,
    delayPitch: 0,
    delayDuck: 0,
    delayDrift: 0,
    delayWow: 0,
    delayFlutter: 0,
    delayModDepth: 0,
    delayDrive: 0,
    delayDiffusion: 0,
    delayHp: 20,
    delayLp: 20000,
    delayWidth: 100,
    delayPan: 0,
    delayOffset: 0,
    delayDry: 100,
    delayWet: 28,
    delayOutput: 100,
    delayFeedback: 35,
    ...patch,
  }
}

function reverbP(patch: Partial<Record<ParamId, number>>): Partial<Record<ParamId, number>> {
  return {
    reverbFreeze: 0,
    reverbReverse: 0,
    reverbShimmer: 0,
    reverbDuck: 0,
    reverbGate: 0,
    reverbDrive: 0,
    reverbModDepth: 8,
    reverbColor: 0,
    reverbDistance: 35,
    reverbWidth: 100,
    reverbEarly: 40,
    reverbDiffusion: 55,
    reverbDensity: 70,
    reverbDry: 100,
    reverbWet: 32,
    reverbOutput: 100,
    ...patch,
  }
}

export const SPACE_PRESETS: SpacePreset[] = [
  { id: 'dly-drums', name: 'Drum Slap', kind: 'delay', category: 'Drums', delayType: 'digital', params: delayP({ delayTime: 70, delayFeedback: 8, delayWet: 16, delayLp: 8000, delayDuck: 25 }) },
  { id: 'dly-vocal-slap', name: 'Vocal Slapback', kind: 'delay', category: 'Vocals', delayType: 'digital', params: delayP({ delayTime: 95, delayFeedback: 12, delayWet: 22, delayLp: 9000 }) },
  { id: 'dly-rockabilly', name: 'Rockabilly Slapback', kind: 'delay', category: 'Guitar', delayType: 'tape', params: delayP({ delayTime: 128, delayFeedback: 18, delayWet: 30, delayDrive: 35, delayWow: 18, delayLp: 6500 }) },
  { id: 'dly-1-4', name: '1/4 Note Delay', kind: 'delay', category: 'Rhythmic', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 4, delayNoteKind: 0, delayFeedback: 38, delayWet: 32 }) },
  { id: 'dly-1-8', name: '1/8 Note Delay', kind: 'delay', category: 'Rhythmic', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 0, delayFeedback: 34, delayWet: 30 }) },
  { id: 'dly-dot-8', name: 'Dotted 1/8 Delay', kind: 'delay', category: 'Rhythmic', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 1, delayFeedback: 36, delayWet: 34 }) },
  { id: 'dly-ping', name: 'Ping-Pong Delay', kind: 'delay', category: 'Stereo', delayType: 'pingPong', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 0, delayFeedback: 48, delayWidth: 170, delayWet: 36 }) },
  { id: 'dly-haas', name: 'Stereo Widening / Haas', kind: 'delay', category: 'Stereo', delayType: 'stereo', params: delayP({ delayTime: 18, delayFeedback: 0, delayOffset: 55, delayWidth: 180, delayWet: 40 }) },
  { id: 'dly-analog', name: 'Dark Analog Delay', kind: 'delay', category: 'Analog/Tape', delayType: 'analog', params: delayP({ delayTime: 380, delayFeedback: 52, delayHp: 180, delayLp: 4200, delayDrive: 22, delayWet: 34 }) },
  { id: 'dly-tape', name: 'Tape Echo', kind: 'delay', category: 'Analog/Tape', delayType: 'tape', params: delayP({ delayTime: 310, delayFeedback: 46, delayDrive: 40, delayWow: 28, delayFlutter: 18, delayLp: 5500, delayWet: 38 }) },
  { id: 'dly-dub', name: 'Dub Delay', kind: 'delay', category: 'Experimental', delayType: 'analog', params: delayP({ delayTime: 520, delayFeedback: 88, delayHp: 220, delayLp: 3800, delayDrive: 30, delayWet: 42 }) },
  { id: 'dly-throw', name: 'Vocal Throw', kind: 'delay', category: 'Vocals', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 4, delayFeedback: 8, delayWet: 55, delayDuck: 40 }) },
  { id: 'dly-lead', name: 'Guitar Lead Delay', kind: 'delay', category: 'Guitar', delayType: 'digital', params: delayP({ delaySync: 1, delayNote: 3, delayNoteKind: 1, delayFeedback: 42, delayWet: 36, delayLp: 10000 }) },
  { id: 'dly-ambient', name: 'Ambient Delay', kind: 'delay', category: 'Ambient', delayType: 'diffuse', params: delayP({ delayTime: 680, delayFeedback: 62, delayDiffusion: 78, delayModDepth: 35, delayWet: 40, delayWidth: 160 }) },
  { id: 'dly-multitap', name: 'Rhythmic Multi-Tap', kind: 'delay', category: 'Rhythmic', delayType: 'multiTap', params: delayP({ delaySync: 1, delayNote: 3, delayFeedback: 28, delayDiffusion: 22, delayWet: 38 }) },
  { id: 'dly-rev', name: 'Reverse Delay', kind: 'delay', category: 'Experimental', delayType: 'reverse', params: delayP({ delayTime: 420, delayFeedback: 30, delayReverse: 100, delayWet: 48 }) },
  { id: 'dly-lofi', name: 'Lo-Fi Delay', kind: 'delay', category: 'Lo-Fi', delayType: 'lofi', params: delayP({ delayTime: 260, delayFeedback: 44, delayHp: 280, delayLp: 3200, delayDrive: 48, delayDrift: 35, delayWet: 36 }) },
  { id: 'dly-mod', name: 'Modulated Delay', kind: 'delay', category: 'Synth', delayType: 'digital', params: delayP({ delayTime: 240, delayFeedback: 40, delayModDepth: 55, delayModRate: 0.8, delayWet: 32 }) },
  { id: 'dly-chorus', name: 'Chorus-like Short Delay', kind: 'delay', category: 'Synth', delayType: 'stereo', params: delayP({ delayTime: 18, delayFeedback: 22, delayModDepth: 70, delayModRate: 2.4, delayWidth: 160, delayWet: 45, delayOffset: 18 }) },
  { id: 'dly-osc', name: 'Self-Oscillating Delay', kind: 'delay', category: 'Experimental', delayType: 'analog', params: delayP({ delayTime: 220, delayFeedback: 90, delayDrive: 18, delayLp: 6000, delayWet: 40 }) },
  { id: 'dly-pitch', name: 'Pitch-Shifting Delay', kind: 'delay', category: 'Experimental', delayType: 'pitch', params: delayP({ delayTime: 360, delayFeedback: 48, delayPitch: 12, delayWet: 38 }) },
  { id: 'dly-diffused', name: 'Diffused Delay', kind: 'delay', category: 'Ambient', delayType: 'diffuse', params: delayP({ delayTime: 190, delayFeedback: 58, delayDiffusion: 92, delayWet: 36, delayWidth: 140 }) },

  { id: 'rv-guitar-room', name: 'Guitar Room', kind: 'reverb', category: 'Guitar', reverbType: 'room', params: reverbP({ reverbSize: 36, reverbDecay: 0.9, reverbPredelay: 14, reverbWet: 26, reverbColor: 10 }) },
  { id: 'rv-small', name: 'Small Room', kind: 'reverb', category: 'Room', reverbType: 'room', params: reverbP({ reverbSize: 22, reverbDecay: 0.35, reverbPredelay: 8, reverbWet: 22, reverbDistance: 20 }) },
  { id: 'rv-drum-room', name: 'Drum Room', kind: 'reverb', category: 'Drums', reverbType: 'room', params: reverbP({ reverbSize: 28, reverbDecay: 0.55, reverbPredelay: 12, reverbEarly: 70, reverbWet: 26, reverbHighCut: 9000 }) },
  { id: 'rv-vocal-room', name: 'Vocal Room', kind: 'reverb', category: 'Vocals', reverbType: 'room', params: reverbP({ reverbSize: 32, reverbDecay: 0.8, reverbPredelay: 22, reverbWet: 28, reverbColor: 8 }) },
  { id: 'rv-vocal-plate', name: 'Vocal Plate', kind: 'reverb', category: 'Plate', reverbType: 'plate', params: reverbP({ reverbSize: 48, reverbDecay: 1.8, reverbPredelay: 18, reverbWet: 34, reverbColor: 20, reverbDamping: 11000 }) },
  { id: 'rv-drum-plate', name: 'Drum Plate', kind: 'reverb', category: 'Drums', reverbType: 'plate', params: reverbP({ reverbSize: 42, reverbDecay: 1.1, reverbPredelay: 10, reverbWet: 30, reverbHighCut: 12000 }) },
  { id: 'rv-snare-plate', name: 'Snare Plate', kind: 'reverb', category: 'Drums', reverbType: 'plate', params: reverbP({ reverbSize: 38, reverbDecay: 0.9, reverbPredelay: 8, reverbWet: 36, reverbEarly: 55 }) },
  { id: 'rv-amb', name: 'Short Ambience', kind: 'reverb', category: 'Room', reverbType: 'ambience', params: reverbP({ reverbSize: 18, reverbDecay: 0.22, reverbPredelay: 4, reverbWet: 18, reverbDistance: 10 }) },
  { id: 'rv-vocal-hall', name: 'Vocal Hall', kind: 'reverb', category: 'Hall', reverbType: 'hall', params: reverbP({ reverbSize: 62, reverbDecay: 2.4, reverbPredelay: 28, reverbWet: 32, reverbDistance: 45 }) },
  { id: 'rv-large-hall', name: 'Large Hall', kind: 'reverb', category: 'Hall', reverbType: 'largeHall', params: reverbP({ reverbSize: 78, reverbDecay: 3.8, reverbPredelay: 36, reverbWet: 36, reverbWidth: 140 }) },
  { id: 'rv-cathedral', name: 'Cathedral', kind: 'reverb', category: 'Hall', reverbType: 'cathedral', params: reverbP({ reverbSize: 92, reverbDecay: 8, reverbPredelay: 55, reverbWet: 40, reverbColor: -25, reverbDistance: 80 }) },
  { id: 'rv-dark-hall', name: 'Dark Hall', kind: 'reverb', category: 'Hall', reverbType: 'hall', params: reverbP({ reverbSize: 70, reverbDecay: 3.2, reverbColor: -55, reverbDamping: 2800, reverbHighCut: 4500, reverbWet: 34 }) },
  { id: 'rv-bright-plate', name: 'Bright Plate', kind: 'reverb', category: 'Plate', reverbType: 'plate', params: reverbP({ reverbSize: 50, reverbDecay: 2.2, reverbColor: 55, reverbDamping: 15000, reverbHighCut: 18000, reverbWet: 34 }) },
  { id: 'rv-spring', name: 'Guitar Spring', kind: 'reverb', category: 'Spring', reverbType: 'spring', params: reverbP({ reverbSize: 40, reverbDecay: 1.4, reverbPredelay: 6, reverbWet: 30, reverbColor: 15, reverbDrive: 12 }) },
  { id: 'rv-gated', name: 'Gated Snare Reverb', kind: 'reverb', category: 'Drums', reverbType: 'gated', params: reverbP({ reverbSize: 55, reverbDecay: 0.7, reverbPredelay: 2, reverbGate: 80, reverbGateThres: -18, reverbGateHold: 80, reverbGateRelease: 40, reverbWet: 42 }) },
  { id: 'rv-reverse', name: 'Reverse Reverb', kind: 'reverb', category: 'Experimental', reverbType: 'reverse', params: reverbP({ reverbSize: 60, reverbDecay: 1.6, reverbPredelay: 80, reverbReverse: 100, reverbWet: 48 }) },
  { id: 'rv-shimmer', name: 'Shimmer Reverb', kind: 'reverb', category: 'Ambient', reverbType: 'shimmer', params: reverbP({ reverbSize: 72, reverbDecay: 6, reverbShimmer: 70, reverbShimmerPitch: 12, reverbWet: 40, reverbModDepth: 22 }) },
  { id: 'rv-dreamy', name: 'Dreamy Ambient Reverb', kind: 'reverb', category: 'Ambient', reverbType: 'cloud', params: reverbP({ reverbSize: 80, reverbDecay: 9, reverbDiffusion: 90, reverbModDepth: 40, reverbWet: 44, reverbWidth: 160 }) },
  { id: 'rv-cinema', name: 'Huge Cinematic Reverb', kind: 'reverb', category: 'Cinematic', reverbType: 'largeHall', params: reverbP({ reverbSize: 96, reverbDecay: 12, reverbPredelay: 70, reverbDistance: 85, reverbWet: 46, reverbWidth: 180 }) },
  { id: 'rv-infinite', name: 'Infinite Pad / Freeze', kind: 'reverb', category: 'Ambient', reverbType: 'infinite', params: reverbP({ reverbSize: 88, reverbDecay: 40, reverbFreeze: 1, reverbWet: 50, reverbShimmer: 20 }) },
  { id: 'rv-lofi', name: 'Lo-Fi Reverb', kind: 'reverb', category: 'Experimental', reverbType: 'room', params: reverbP({ reverbSize: 40, reverbDecay: 1.2, reverbHighCut: 2800, reverbLowCut: 280, reverbDrive: 35, reverbWet: 30, reverbColor: -20 }) },
  { id: 'rv-mod', name: 'Modulated Reverb', kind: 'reverb', category: 'Synth', reverbType: 'chamber', params: reverbP({ reverbSize: 55, reverbDecay: 2.8, reverbModDepth: 70, reverbModRate: 0.45, reverbWet: 36 }) },
  { id: 'rv-wash', name: 'Distant / Washed-Out Reverb', kind: 'reverb', category: 'Cinematic', reverbType: 'hall', params: reverbP({ reverbSize: 85, reverbDecay: 7, reverbDistance: 95, reverbWet: 52, reverbLowCut: 350, reverbHighCut: 6000, reverbColor: -15 }) },
]

export const DELAY_PRESET_CATEGORIES: FxPresetCategory[] = [
  'Vocals',
  'Guitar',
  'Drums',
  'Synth',
  'Rhythmic',
  'Stereo',
  'Analog/Tape',
  'Ambient',
  'Experimental',
  'Lo-Fi',
]

export const REVERB_PRESET_CATEGORIES: FxPresetCategory[] = [
  'Vocals',
  'Drums',
  'Guitar',
  'Synth',
  'Room',
  'Plate',
  'Hall',
  'Spring',
  'Ambient',
  'Cinematic',
  'Experimental',
]

export function presetsFor(kind: 'delay' | 'reverb', category?: FxPresetCategory): SpacePreset[] {
  return SPACE_PRESETS.filter((p) => p.kind === kind && (!category || p.category === category))
}

export function defaultPresetFor(kind: 'delay' | 'reverb', category: FxPresetCategory): SpacePreset | undefined {
  return presetsFor(kind, category)[0]
}

export function findSpacePreset(id: string): SpacePreset | undefined {
  return SPACE_PRESETS.find((p) => p.id === id)
}

export function presetHint(preset: SpacePreset): string {
  return PRESET_HINTS[preset.id] ?? preset.name
}
