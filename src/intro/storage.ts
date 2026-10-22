/** First-run welcome only. Never store feedback or contact details here. */
export const INTRO_STORAGE_KEY = 'field.intro'

export type IntroRecord = {
  seen: boolean
  suppress: boolean
}

const EMPTY: IntroRecord = { seen: false, suppress: false }

export function parseIntroRecord(raw: string | null | undefined): IntroRecord {
  if (!raw) return { ...EMPTY }
  try {
    const parsed = JSON.parse(raw) as Partial<IntroRecord>
    return {
      seen: parsed.seen === true,
      suppress: parsed.suppress === true,
    }
  } catch {
    return { ...EMPTY }
  }
}

export function readIntroRecord(): IntroRecord {
  try {
    return parseIntroRecord(localStorage.getItem(INTRO_STORAGE_KEY))
  } catch {
    return { ...EMPTY }
  }
}

export function writeIntroRecord(next: IntroRecord): void {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify({ seen: next.seen === true, suppress: next.suppress === true }))
  } catch {
    /* private mode */
  }
}

/** Shown at each start, until the person asks for it to stay hidden. */
export function shouldShowWelcome(record: IntroRecord = readIntroRecord()): boolean {
  return !record.suppress
}

export function markWelcomeSeen(suppress = false): void {
  const current = readIntroRecord()
  writeIntroRecord({ seen: true, suppress: suppress || current.suppress })
}
