import type { Locale } from '../i18n/locale'

/** Stable semantic ids. Controls expose these. Guidance never searches by label or CSS class. */
export const GUIDE_TARGETS = [
  'waveform.main',
  'waveform.selection',
  'transport.play',
  'transport.compare',
  'edit.trim',
  'edit.fadeIn',
  'edit.fadeOut',
  'input.gain',
  'input.speed',
  'input.pitch',
  'input.reverse',
  'sound.clarity',
  'sound.warmth',
  'effect.eq',
  'effect.reverb',
  'effect.delay',
  'export.open',
  'export.confirm',
  'sample.load',
  'sample.demo',
] as const

export type GuideTargetId = (typeof GUIDE_TARGETS)[number]

export type GuideCategory = 'basic' | 'improve' | 'creative' | 'understand'

export type GuideDifficulty = 'easy' | 'moderate'

export type GuideModePref = 'simple' | 'technical' | 'any'

export type GuideAction =
  | 'playback.started'
  | 'selection.created'
  | 'trim.completed'
  | 'fade.in'
  | 'fade.out'
  | 'gain.changed'
  | 'eq.clarity'
  | 'eq.tone'
  | 'eq.changed'
  | 'reverb.enabled'
  | 'reverb.shaped'
  | 'reverb.amount'
  | 'delay.enabled'
  | 'delay.shaped'
  | 'delay.amount'
  | 'export.opened'
  | 'export.completed'
  | 'speed.changed'
  | 'pitch.changed'
  | 'reverse.changed'
  | 'compare.used'
  | 'waveform.touched'

export type StepCompletion =
  | { kind: 'manual' }
  | { kind: 'any'; actions: readonly GuideAction[] }
  | { kind: 'all'; actions: readonly GuideAction[] }

export type Localized = Record<Locale, string>

export type GuideStep = {
  id: string
  target: GuideTargetId | null
  completion: StepCompletion
  skippable: boolean
  topics: readonly string[]
  title: Localized
  instruction: Localized
  hint: Localized | null
  why: Localized | null
  more: Localized | null
  advanced: Localized | null
  success: Localized | null
  tryThis: Localized | null
}

export type GuideTask = {
  id: string
  category: GuideCategory
  difficulty: GuideDifficulty
  minutes: number
  preferredMode: GuideModePref
  requiresSample: boolean
  /** Existing FIELD capabilities this task uses. Unavailable ones stay disabled. */
  capabilities: readonly string[]
  topics: readonly string[]
  title: Localized
  description: Localized
  modeNote: Localized | null
  steps: readonly GuideStep[]
}

export type TopicCategory = 'picture' | 'level' | 'edit' | 'tone' | 'space' | 'time'

export type LearningTopic = {
  id: string
  category: TopicCategory
  title: Localized
  summary: Localized
  practical: Localized
  technical: Localized
}

export type GuidePanelMode = 'docked' | 'floating' | 'minimized'

export type GuideView =
  | 'closed'
  | 'library'
  | 'learn'
  | 'need-sound'
  | 'mode-ask'
  | 'focus-ask'
  | 'task'
  | 'done'

export type GuideSlot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
