import type { DelayTap, ReverbTail } from '../../audio/fx/spaceModel'
import { colorWithAlpha, readThemeColors } from '../../theme'

export function drawDelayOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewStart: number,
  viewEnd: number,
  regionStart: number,
  taps: DelayTap[],
  min: Float32Array,
  max: Float32Array,
): void {
  const colors = readThemeColors()
  const span = Math.max(0.0001, viewEnd - viewStart)
  const lanes = 1
  const mid = height / 2
  const half = height * 0.38
  for (const tap of taps) {
    const x0 = ((regionStart + tap.time - viewStart) / span) * width
    if (x0 > width + 8 || x0 + width < -8) continue
    const panY = tap.pan * height * 0.16
    const alpha = Math.max(0.05, Math.min(0.45, tap.gain * 0.7))
    ctx.fillStyle = colorWithAlpha(colors.waveformSecondary, alpha * (0.7 + tap.degraded * 0.3))
    const step = Math.max(1, Math.floor(min.length / width))
    for (let x = 0; x < width; x += step) {
      const src = Math.min(min.length - 1, Math.floor((x / width) * min.length))
      let hi = max[src] ?? 0
      let lo = min[src] ?? 0
      if (tap.reverse) {
        const r = min.length - 1 - src
        hi = max[r] ?? 0
        lo = min[r] ?? 0
      }
      const px = x0 + x
      const top = mid + panY - hi * half * (0.55 + tap.gain * 0.4)
      const bot = mid + panY - lo * half * (0.55 + tap.gain * 0.4)
      ctx.fillRect(px, top, step, Math.max(1, bot - top))
    }
    ctx.fillStyle = colorWithAlpha(colors.accent, Math.min(0.8, alpha + 0.2))
    ctx.fillRect(x0, 8 + (tap.channel === 'R' ? height - 16 : 0), 2, 10)
  }
  void lanes
}

export function drawReverbOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewStart: number,
  viewEnd: number,
  regionStart: number,
  tail: ReverbTail,
  now: number,
): void {
  const colors = readThemeColors()
  if (tail.mix < 0.01 && !tail.freeze) return
  const span = Math.max(0.0001, viewEnd - viewStart)
  const xOf = (t: number) => ((regionStart + t - viewStart) / span) * width
  const x0 = xOf(tail.predelay)
  const dur = tail.freeze ? span * 1.4 : tail.duration
  const x1 = xOf(tail.predelay + dur)
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const wobble = Math.sin(now * (0.4 + tail.shimmer) * Math.PI * 2) * tail.size * 6
  const spread = height * (0.18 + tail.size * 0.22) * (0.6 + tail.width * 0.4)
  const grd = ctx.createLinearGradient(left, 0, right, 0)
  const fill = colors.spectrum
  if (tail.reverse) {
    grd.addColorStop(0, colorWithAlpha(fill, 0.02))
    grd.addColorStop(0.7, colorWithAlpha(fill, 0.08 + tail.mix * 0.18))
    grd.addColorStop(1, colorWithAlpha(fill, 0.16 + tail.mix * 0.2))
  } else {
    grd.addColorStop(0, colorWithAlpha(fill, 0.14 + tail.mix * 0.18))
    grd.addColorStop(Math.min(0.9, 0.25 + tail.diffusion * 0.3), colorWithAlpha(fill, 0.08 + tail.mix * 0.1))
    grd.addColorStop(1, colorWithAlpha(fill, 0.01))
  }
  ctx.fillStyle = grd
  const mid = height / 2 + wobble * 0.15
  ctx.beginPath()
  ctx.moveTo(left, mid)
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = left + (right - left) * t
    const env = tail.reverse ? t ** 0.7 : (1 - t) ** (1.1 + tail.damping)
    const dens = 0.7 + tail.density * 0.5 + Math.sin(t * 18 + now * 3) * tail.diffusion * 0.08
    ctx.lineTo(x, mid - spread * env * dens)
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    const x = left + (right - left) * t
    const env = tail.reverse ? t ** 0.7 : (1 - t) ** (1.1 + tail.damping)
    const dens = 0.7 + tail.density * 0.5 + Math.sin(t * 18 + now * 3) * tail.diffusion * 0.08
    ctx.lineTo(x, mid + spread * env * dens * (0.85 + tail.distance * 0.2))
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = colorWithAlpha(colors.spectrumLine, 0.25 + tail.mix * 0.3)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, 6)
  ctx.lineTo(x0, height - 6)
  ctx.stroke()
  for (const e of tail.early) {
    const x = xOf(e)
    if (x < 0 || x > width) continue
    ctx.fillStyle = colorWithAlpha(colors.spectrumLine, 0.15 + tail.mix * 0.2)
    ctx.fillRect(x, height * 0.2, 1.5, height * 0.6)
  }
  if (tail.freeze) {
    ctx.fillStyle = colorWithAlpha(colors.accent, 0.1)
    ctx.fillRect(0, 0, width, height)
  }
}
