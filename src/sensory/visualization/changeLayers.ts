export type ChangeLayerSpec = {
  scale: number
  alpha: number
  drop: number
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/**
 * Expanding, fading copies of the ridge while a parameter is being changed.
 * `phase01` is a looping 0…1 clock so the shells keep breathing.
 */
export function changeLayerSpecs(energy: number, phase01: number): ChangeLayerSpec[] {
  const e = clamp01(energy)
  if (e < 0.03) return []
  const phase = ((phase01 % 1) + 1) % 1
  const n = 2 + Math.round(e * 3)
  const out: ChangeLayerSpec[] = []
  for (let i = 0; i < n; i++) {
    const u = (phase + i / n) % 1
    const fade = 1 - u
    out.push({
      scale: 1 + u * (0.16 + e * 0.62),
      alpha: fade * fade * e * 0.2,
      drop: u * (0.05 + e * 0.06),
    })
  }
  return out
}

/** Extra film grain while editing, strongest on the grain axis itself. */
export function editFilmGrainBoost(axisId: string | null, amount: number): number {
  if (!axisId) return 0
  const mag = clamp01(Math.abs(amount))
  if (axisId === 'grain') return 0.22 + mag * 0.38
  return 0.08 + mag * 0.18
}
