import { FIELD_VERSION } from '../version'
import {
  choiceLabel,
  type AccessUse,
  type DeviceKind,
  type Ease,
  type Impression,
  type IntroCopy,
} from './copy'

export const FEEDBACK_SUBJECT = 'FIELD — opinia użytkownika'

export const DIFFICULTY_MAX = 500
export const ACCESS_NOTE_MAX = 800
export const IDEAS_MAX = 1200
export const EMAIL_MAX = 200

/** Successful sends remembered for this tab only. The text of a note is never stored. */
export const FEEDBACK_STAMP_KEY = 'field.feedback.stamps'

const RATE_LIMIT = 3
const RATE_WINDOW_MS = 30 * 60 * 1000

export type FeedbackDraft = {
  impression: Impression | ''
  ease: Ease | ''
  difficulty: string
  access: AccessUse | ''
  accessNote: string
  ideas: string
  device: DeviceKind | ''
  email: string
  includeTech: boolean
  company: string
}

export type FeedbackIssue = 'empty' | 'email' | 'length'

export type TechInfo = {
  version: string
  locale: string
  mode: string | null
  viewport: string
  userAgent: string
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' | 'rate' | 'busy' | 'network' | 'rejected' }

export function emptyFeedbackDraft(): FeedbackDraft {
  return {
    impression: '',
    ease: '',
    difficulty: '',
    access: '',
    accessNote: '',
    ideas: '',
    device: '',
    email: '',
    includeTech: true,
    company: '',
  }
}

let draftMemory: FeedbackDraft = emptyFeedbackDraft()

/** In-memory only. A reload drops the draft. localStorage is never used. */
export function readFeedbackDraft(): FeedbackDraft {
  return { ...draftMemory }
}

export function writeFeedbackDraft(next: FeedbackDraft): void {
  draftMemory = { ...next }
}

export function clearFeedbackDraft(): void {
  draftMemory = emptyFeedbackDraft()
}

export function optionalEmailOk(value: string): boolean {
  const email = value.trim()
  if (!email) return true
  if (email.length > EMAIL_MAX) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function feedbackIssues(draft: FeedbackDraft): FeedbackIssue[] {
  const issues: FeedbackIssue[] = []
  const difficulty = draft.difficulty.trim()
  const ideas = draft.ideas.trim()
  const accessNote = draft.access === 'yes' ? draft.accessNote.trim() : ''
  if (difficulty.length > DIFFICULTY_MAX || ideas.length > IDEAS_MAX || accessNote.length > ACCESS_NOTE_MAX) {
    issues.push('length')
  }
  if (!optionalEmailOk(draft.email)) issues.push('email')
  const answered =
    Boolean(draft.impression) ||
    Boolean(draft.ease) ||
    difficulty.length > 0 ||
    Boolean(draft.access) ||
    accessNote.length > 0 ||
    ideas.length > 0 ||
    Boolean(draft.device) ||
    draft.email.trim().length > 0
  if (!answered) issues.push('empty')
  return issues
}

export type StampStore = {
  read(): number[]
  write(stamps: number[]): void
}

export function memoryStampStore(initial: number[] = []): StampStore {
  let stamps = [...initial]
  return {
    read: () => [...stamps],
    write: (next) => {
      stamps = [...next]
    },
  }
}

export function sessionStampStore(): StampStore {
  return {
    read() {
      try {
        const raw = sessionStorage.getItem(FEEDBACK_STAMP_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) return []
        return parsed.filter((item) => typeof item === 'number' && Number.isFinite(item))
      } catch {
        return []
      }
    },
    write(stamps) {
      try {
        sessionStorage.setItem(FEEDBACK_STAMP_KEY, JSON.stringify(stamps))
      } catch {
        /* private mode: the worker still limits bursts */
      }
    },
  }
}

export function recentStamps(stamps: readonly number[], now: number): number[] {
  return stamps.filter((stamp) => now - stamp < RATE_WINDOW_MS && stamp <= now + 1000)
}

export function rateLimited(stamps: readonly number[], now: number): boolean {
  return recentStamps(stamps, now).length >= RATE_LIMIT
}

/**
 * Public HTTPS endpoint, or a local http URL for tests.
 * A secret never belongs here. An empty value means delivery is off.
 */
export function feedbackEndpoint(raw: string | null | undefined = import.meta.env.VITE_FIELD_FEEDBACK_URL): string | null {
  if (!raw?.trim()) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol === 'https:') return url.toString()
    const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    if (url.protocol === 'http:' && local) return url.toString()
    return null
  } catch {
    return null
  }
}

export function feedbackConfigured(): boolean {
  return feedbackEndpoint() !== null
}

function line(label: string, value: string): string {
  return `${label}\n${value.trim() || '—'}`
}

export function feedbackMessage(
  draft: FeedbackDraft,
  copy: IntroCopy,
  tech: TechInfo | null,
  when: Date,
  locale: 'pl' | 'en',
): string {
  const accessNote = draft.access === 'yes' ? draft.accessNote.trim() : ''
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const local = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: zone,
  }).format(when)
  const blocks = [
    FEEDBACK_SUBJECT,
    '',
    `${local} (${zone})`,
    when.toISOString(),
    '',
    line(copy.qImpression, choiceLabel(copy.impressions, draft.impression) || copy.blank),
    '',
    line(copy.qEase, choiceLabel(copy.ease, draft.ease) || copy.blank),
    '',
    line(copy.qDifficulty, draft.difficulty.trim() || copy.blank),
    '',
    line(copy.qAccess, choiceLabel(copy.accessChoices, draft.access) || copy.blank),
  ]
  if (draft.access === 'yes') {
    blocks.push('', line(copy.qAccessNote, accessNote || copy.blank))
  }
  blocks.push(
    '',
    line(copy.qIdeas, draft.ideas.trim() || copy.blank),
    '',
    line(copy.qDevice, choiceLabel(copy.devices, draft.device) || copy.blank),
    '',
    line(copy.contact, draft.email.trim() || copy.blank),
  )
  if (tech) {
    blocks.push(
      '',
      copy.technicalHeading,
      `${copy.versionLabel}: ${tech.version}`,
      `${copy.localeLabel}: ${tech.locale}`,
      `${copy.modeLabel}: ${tech.mode || copy.blank}`,
      `${copy.viewportLabel}: ${tech.viewport}`,
      `${copy.browserLabel}: ${tech.userAgent}`,
    )
  }
  return blocks.join('\n')
}

export function collectTechInfo(locale: string, mode: string | null): TechInfo {
  const width = typeof window === 'undefined' ? 0 : window.innerWidth
  const height = typeof window === 'undefined' ? 0 : window.innerHeight
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  return {
    version: FIELD_VERSION,
    locale,
    mode,
    viewport: `${width}×${height}`,
    userAgent: agent,
  }
}

export function readInterfaceMode(): string | null {
  try {
    const raw = localStorage.getItem('firstsound.uiMode')
    return raw === 'simple' || raw === 'technical' || raw === 'sensory' ? raw : null
  } catch {
    return null
  }
}

let inflight = false

export function resetFeedbackSendLock(): void {
  inflight = false
}

export async function submitFeedback(input: {
  draft: FeedbackDraft
  copy: IntroCopy
  locale: string
  mode: string | null
  now?: number
  endpoint?: string | null
  fetchImpl?: typeof fetch
  stamps?: StampStore
}): Promise<SendResult> {
  if (inflight) return { ok: false, reason: 'busy' }
  if (input.draft.company.trim()) return { ok: true }
  const now = input.now ?? Date.now()
  const stamps = input.stamps ?? sessionStampStore()
  const history = recentStamps(stamps.read(), now)
  if (history.length >= RATE_LIMIT) return { ok: false, reason: 'rate' }
  const endpoint = input.endpoint === undefined ? feedbackEndpoint() : input.endpoint
  if (!endpoint) return { ok: false, reason: 'unconfigured' }
  const tech = input.draft.includeTech ? collectTechInfo(input.locale, input.mode) : null
  const locale = input.locale === 'pl' ? 'pl' : 'en'
  const text = feedbackMessage(input.draft, input.copy, tech, new Date(now), locale)
  const replyEmail = input.draft.email.trim() || null
  inflight = true
  try {
    const fetchImpl = input.fetchImpl ?? fetch
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        subject: FEEDBACK_SUBJECT,
        text,
        replyEmail,
        company: input.draft.company,
      }),
    })
    if (!response.ok) return { ok: false, reason: 'rejected' }
    stamps.write([...history, now])
    return { ok: true }
  } catch {
    return { ok: false, reason: 'network' }
  } finally {
    inflight = false
  }
}
