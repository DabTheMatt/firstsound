/** Clicking a parameter opens contextual help only while this is on. */
export const HELP_CLICK_KEY = 'field.help.click'

type Listener = () => void

const listeners = new Set<Listener>()

export function parseHelpClicks(raw: string | null | undefined): boolean {
  return raw !== 'off'
}

function readStored(): boolean {
  try {
    return parseHelpClicks(localStorage.getItem(HELP_CLICK_KEY))
  } catch {
    return true
  }
}

let enabled: boolean | null = null

export function helpClicksOn(): boolean {
  if (enabled == null) enabled = readStored()
  return enabled
}

export function subscribeHelpClicks(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setHelpClicks(on: boolean): void {
  const next = on === true
  if (helpClicksOn() === next) return
  enabled = next
  try {
    localStorage.setItem(HELP_CLICK_KEY, next ? 'on' : 'off')
  } catch {
    /* private mode */
  }
  for (const listener of listeners) listener()
}

/** Test helper. The next read comes from storage again. */
export function resetHelpClicks(): void {
  enabled = null
}
