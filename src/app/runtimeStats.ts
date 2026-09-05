export type MemorySample = {
  usedBytes: number | null
  limitBytes: number | null
}

export type CpuSample = {
  percent: number | null
  source: 'pressure' | 'lag' | 'none'
}

const PRESSURE_PERCENT: Record<string, number> = {
  nominal: 12,
  fair: 40,
  serious: 72,
  critical: 94,
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  if (mb < 1024) return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

export function formatMemory(sample: MemorySample): string {
  if (sample.usedBytes == null) return 'Mem —'
  return `Mem ${formatBytes(sample.usedBytes)}`
}

export function formatCpu(sample: CpuSample): string {
  if (sample.percent == null || sample.source === 'none') return 'CPU —'
  return `CPU ${Math.round(clampPercent(sample.percent))}%`
}

export function cpuPercentFromPressure(state: string): number {
  return PRESSURE_PERCENT[state] ?? 0
}

/** Map event-loop delay (MessageChannel ping) to a 0–100 load estimate. */
export function cpuPercentFromLagMs(lagMs: number): number {
  const lag = Math.max(0, lagMs)
  if (lag <= 2) return 0
  return clampPercent(((lag - 2) / 80) * 100)
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function ema(prev: number | null, next: number, alpha = 0.35): number {
  const value = clampPercent(next)
  if (prev == null) return value
  return clampPercent(prev + alpha * (value - prev))
}
