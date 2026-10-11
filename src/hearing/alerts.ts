/** Stable, non-flashing status badges for events that would otherwise be audio-only. */

export type HearingAlert = {
  id: string
  title: string
  detail: string
  tone: 'info' | 'warn'
}

/** Info badges leave on their own. Warnings stay until the user dismisses them. */
export const HEARING_INFO_MS = 2200

const alerts: HearingAlert[] = []
const listeners = new Set<() => void>()
const infoTimers = new Map<string, ReturnType<typeof setTimeout>>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function pushHearingAlert(alert: HearingAlert): void {
  const index = alerts.findIndex((item) => item.id === alert.id)
  if (index >= 0) alerts[index] = alert
  else alerts.unshift(alert)
  if (alerts.length > 4) alerts.length = 4
  scheduleInfoDismiss(alert)
  emit()
}

export function dismissHearingAlert(id: string): void {
  const timer = infoTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    infoTimers.delete(id)
  }
  const next = alerts.filter((item) => item.id !== id)
  if (next.length === alerts.length) return
  alerts.splice(0, alerts.length, ...next)
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
