/** Stable, non-flashing status badges for events that would otherwise be audio-only. */

export type HearingAlert = {
  id: string
  title: string
  detail: string
  tone: 'info' | 'warn'
}

/** Info badges leave on their own. Warnings stay until the user dismisses them. */
export const HEARING_INFO_MS = 2200

let alerts: HearingAlert[] = []
const listeners = new Set<() => void>()
const infoTimers = new Map<string, ReturnType<typeof setTimeout>>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function pushHearingAlert(alert: HearingAlert): void {
  const index = alerts.findIndex((item) => item.id === alert.id)
  const next = alerts.slice()
  if (index >= 0) next[index] = alert
  else next.unshift(alert)
  if (next.length > 4) next.length = 4
  alerts = next
  scheduleInfoDismiss(alert)
  emit()
}

export function dismissHearingAlert(id: string): void {
  const timer = infoTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    infoTimers.delete(id)
  }
  if (!alerts.some((item) => item.id === id)) return
  alerts = alerts.filter((item) => item.id !== id)
  emit()
}

function scheduleInfoDismiss(alert: HearingAlert): void {
  const previous = infoTimers.get(alert.id)
  if (previous !== undefined) clearTimeout(previous)
  infoTimers.delete(alert.id)
  if (alert.tone !== 'info') return
  infoTimers.set(
    alert.id,
    setTimeout(() => dismissHearingAlert(alert.id), HEARING_INFO_MS),
  )
}

export function getHearingAlerts(): readonly HearingAlert[] {
  return alerts
}

export function subscribeHearingAlerts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
