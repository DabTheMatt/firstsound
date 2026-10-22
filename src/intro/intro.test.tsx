import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import { introCopy, TOUR_IDS } from './copy'
import {
  clearFeedbackDraft,
  emptyFeedbackDraft,
  feedbackEndpoint,
  feedbackIssues,
  feedbackMessage,
  memoryStampStore,
  rateLimited,
  readFeedbackDraft,
  resetFeedbackSendLock,
  submitFeedback,
  writeFeedbackDraft,
  FEEDBACK_SUBJECT,
} from './feedback'
import { HelpPanel } from './HelpPanel'
import hostSource from './IntroHost.tsx?raw'
import feedbackSource from './feedback.ts?raw'
import { visibleBox } from './spotlight'
import { markWelcomeSeen, parseIntroRecord, readIntroRecord, shouldShowWelcome, writeIntroRecord, INTRO_STORAGE_KEY } from './storage'
import { WelcomePanel } from './WelcomePanel'
import { FeedbackForm } from './FeedbackForm'

function memoryStorage() {
  const data = new Map<string, string>()
  const api = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
  }
  return { api, data }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('intro copy', () => {
  it('keeps seven screens and the same steps in both languages', () => {
    const polish = introCopy('pl')
    const english = introCopy('en')
    expect(polish.tour.map((step) => step.id)).toEqual([...TOUR_IDS])
    expect(english.tour.map((step) => step.id)).toEqual([...TOUR_IDS])
    for (const step of polish.tour) {
      const other = english.tour.find((item) => item.id === step.id)
      expect(step.title).not.toBe(other?.title)
      expect(step.body.length).toBeGreaterThan(0)
      expect(step.body.length).toBeLessThanOrEqual(3)
    }
    expect(polish.impressions).toHaveLength(5)
    expect(polish.ease).toHaveLength(4)
    expect(polish.accessChoices).toHaveLength(3)
    expect(polish.devices).toHaveLength(4)
    expect(polish.welcomeLead).toBe('Przestrzeń do odkrywania dźwięku.')
    expect(polish.discover).toBe('Odkryj FIELD')
    expect(polish.feedbackTooltip).toBe('Prześlij opinię')
  })
})

describe('welcome storage', () => {
  beforeEach(() => {
    const { api } = memoryStorage()
    vi.stubGlobal('localStorage', api)
  })

  it('shows once, then remembers a dismissal without personal data', () => {
    expect(shouldShowWelcome()).toBe(true)
    markWelcomeSeen(true)
    expect(shouldShowWelcome()).toBe(false)
    const raw = localStorage.getItem(INTRO_STORAGE_KEY) ?? ''
    expect(raw).not.toContain('@')
    expect(raw).not.toContain('difficulty')
    expect(parseIntroRecord(raw)).toEqual({ seen: true, suppress: true })
  })

  it('ignores a broken record', () => {
    localStorage.setItem(INTRO_STORAGE_KEY, '{')
    expect(readIntroRecord()).toEqual({ seen: false, suppress: false })
    writeIntroRecord({ seen: true, suppress: false })
    expect(shouldShowWelcome()).toBe(false)
  })
})

describe('feedback message', () => {
  const copy = introCopy('pl')

  it('accepts optional blanks and hides the access note unless the answer is yes', () => {
    const draft = { ...emptyFeedbackDraft(), impression: 'neutral' as const, access: 'no' as const, accessNote: 'secret', includeTech: false }
    expect(feedbackIssues(draft)).toEqual([])
    const text = feedbackMessage(draft, copy, null, new Date('2026-10-22T07:28:00.000Z'), 'pl')
    expect(text.startsWith(FEEDBACK_SUBJECT)).toBe(true)
    expect(text).toContain('Neutralnie')
    expect(text).toContain('Nie')
    expect(text).not.toContain('secret')
    expect(text).not.toContain('Wersja FIELD')
    expect(text).toContain('2026-10-22T07:28:00.000Z')
  })

  it('includes the access note, contact, and technical block when asked', () => {
    const draft = {
      ...emptyFeedbackDraft(),
      access: 'yes' as const,
      accessNote: 'fokus jest czytelny',
      email: 'person@example.com',
      device: 'phone' as const,
      includeTech: true,
    }
    const text = feedbackMessage(
      draft,
      copy,
      { version: '0.49.0', locale: 'pl', mode: 'simple', viewport: '390×844', userAgent: 'TestBrowser' },
      new Date('2026-10-22T07:28:00.000Z'),
      'pl',
    )
    expect(text).toContain('fokus jest czytelny')
    expect(text).toContain('person@example.com')
    expect(text).toContain('Telefon')
    expect(text).toContain('0.49.0')
    expect(text).toContain('TestBrowser')
  })

  it('rejects an empty note, a broken email, and an oversized answer', () => {
    expect(feedbackIssues(emptyFeedbackDraft())).toContain('empty')
    expect(feedbackIssues({ ...emptyFeedbackDraft(), email: 'not-an-email', impression: 'neutral' })).toContain('email')
    expect(feedbackIssues({ ...emptyFeedbackDraft(), difficulty: 'x'.repeat(501) })).toContain('length')
  })
})

describe('feedback delivery', () => {
  beforeEach(() => {
    resetFeedbackSendLock()
    clearFeedbackDraft()
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('feedback must not use localStorage')
      },
    })
  })

  it('keeps a draft in memory only', () => {
    writeFeedbackDraft({ ...emptyFeedbackDraft(), ideas: 'więcej miejsca' })
    expect(readFeedbackDraft().ideas).toBe('więcej miejsca')
    clearFeedbackDraft()
    expect(readFeedbackDraft().ideas).toBe('')
  })

  it('refuses a public secret and a non-local http address', () => {
    expect(feedbackEndpoint('')).toBeNull()
    expect(feedbackEndpoint('http://example.com/feedback')).toBeNull()
    expect(feedbackEndpoint('https://feedback.example/post')).toBe('https://feedback.example/post')
    expect(feedbackEndpoint('http://127.0.0.1:8787/')).toBe('http://127.0.0.1:8787/')
  })

  it('does not call the network when delivery is off or the honeypot is filled', async () => {
    const fetchImpl = vi.fn()
    const draft = { ...emptyFeedbackDraft(), impression: 'positive' as const }
    const off = await submitFeedback({
      draft,
      copy: introCopy('en'),
      locale: 'en',
      mode: 'technical',
      endpoint: null,
      fetchImpl,
      stamps: memoryStampStore(),
    })
    expect(off).toEqual({ ok: false, reason: 'unconfigured' })
    const dropped = await submitFeedback({
      draft: { ...draft, company: 'spam' },
      copy: introCopy('en'),
      locale: 'en',
      mode: null,
      endpoint: 'https://feedback.example/post',
      fetchImpl,
      stamps: memoryStampStore(),
    })
    expect(dropped).toEqual({ ok: true })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('limits repeats and keeps the note when the request fails', async () => {
    const now = 1_700_000_000_000
    expect(rateLimited([now, now, now], now)).toBe(true)
    const stamps = memoryStampStore([now, now, now])
    const limited = await submitFeedback({
      draft: { ...emptyFeedbackDraft(), ease: 'yes' },
      copy: introCopy('en'),
      locale: 'en',
      mode: null,
      now,
      endpoint: 'https://feedback.example/post',
      fetchImpl: vi.fn(),
      stamps,
    })
    expect(limited).toEqual({ ok: false, reason: 'rate' })

    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    const failed = await submitFeedback({
      draft: { ...emptyFeedbackDraft(), ideas: 'keep me' },
      copy: introCopy('en'),
      locale: 'en',
      mode: 'sensory',
      endpoint: 'https://feedback.example/post',
      fetchImpl,
      stamps: memoryStampStore(),
    })
    expect(failed).toEqual({ ok: false, reason: 'network' })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))
    expect(body.subject).toBe(FEEDBACK_SUBJECT)
    expect(body.text).toContain('keep me')
    expect(body.text).not.toContain('RESEND')
  })

  it('does not embed a mailbox secret in the client', () => {
    expect(feedbackSource).not.toContain('gmail.com')
    expect(feedbackSource).not.toContain('RESEND_API_KEY')
    expect(hostSource).not.toContain('AudioEngine')
    expect(hostSource).not.toContain('togglePlay')
  })
})

describe('intro markup', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'field.uiLocale' ? 'pl' : null),
      setItem: () => undefined,
    })
    vi.stubGlobal('document', { documentElement: { lang: 'pl' } })
  })

  it('renders the welcome actions and the feedback questions', () => {
    const welcome = renderToStaticMarkup(
      <I18nProvider>
        <WelcomePanel onClose={() => undefined} />
      </I18nProvider>,
    )
    expect(welcome).toContain('Odkryj FIELD')
    expect(welcome).toContain('Rozpocznij pracę')
    expect(welcome).toContain('Nie pokazuj ponownie')
    expect(welcome).toContain('role="dialog"')

    const form = renderToStaticMarkup(
      <I18nProvider>
        <FeedbackForm onClose={() => undefined} />
      </I18nProvider>,
    )
    expect(form).toContain('Pomóż rozwijać FIELD')
    expect(form).toContain('Jak oceniasz pierwsze wrażenie?')
    expect(form).toContain('Jeszcze nie, ale zamierzam')
    expect(form).toContain('Np. znalezienie funkcji, zrozumienie parametru, obsługa na telefonie…')
    expect(form).not.toContain('Co działa dobrze, a co można poprawić?')

    const help = renderToStaticMarkup(
      <I18nProvider>
        <HelpPanel onClose={() => undefined} />
      </I18nProvider>,
    )
    expect(help).toContain('Uruchom przewodnik')
    expect(help).toContain('Pokaż ustawienia dostępności')
    expect(help).toContain('F1')
  })
})

describe('spotlight', () => {
  it('ignores an empty target and keeps a visible one', () => {
    expect(visibleBox({ top: -20, left: 0, width: 4, height: 4, bottom: -16, right: 4 }, 800, 1200)).toBe(false)
    expect(visibleBox({ top: 10, left: 10, width: 40, height: 20, bottom: 30, right: 50 }, 800, 1200)).toBe(true)
  })
})
