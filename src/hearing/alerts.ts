/** Stable, non-flashing status badges for events that would otherwise be audio-only. */

export type HearingAlert = {
  id: string
  title: string
  detail: string
  tone: 'info' | 'warn'
}

const alerts: HearingAlert[] = []
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function pushHearingAlert(alert: HearingAlert): void {
  const index = alerts.findIndex((item) => item.id === alert.id)
  if (index >= 0) alerts[index] = alert
  else alerts.unshift(alert)
  if (alerts.length > 4) alerts.length = 4
  emit()
}

export function dismissHearingAlert(id: string): void {
  const next = alerts.filter((item) => item.id !== id)
  if (next.length === alerts.length) return
  alerts.splice(0, alerts.length, ...next)
  emit()
}

export function getHearingAlerts(): readonly HearingAlert[] {
  return alerts
}

export function subscribeHearingAlerts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
