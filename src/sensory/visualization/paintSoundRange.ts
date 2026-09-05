import type { SensorySceneId } from '../sensoryScene'
import { canyonWallInset, chromaticShift, gleamRayCount } from './rangeScenes'
import { grainBandCount, type MountainLayerSpec } from './mountainLayers'
import { mixRgb, rgbCss, type Rgb, type SensoryVisualState } from './sensoryVisualState'

export type RangePaintArgs = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  dpr: number
  visual: SensoryVisualState
  ink: Rgb
  play: string
  layers: Float32Array[]
  specs: readonly MountainLayerSpec[]
  nowMs: number
  reduced: boolean
  playFrac: number
  windowStartFrac: number
  windowEndFrac: number
  scene: SensorySceneId
}

function ridgeY(
  env: Float32Array,
  x: number,
  base: number,
  amp: number,
  spec: MountainLayerSpec,
  height: number,
  visual: SensoryVisualState,
  grit: number,
  t: number,
  li: number,
  sway: number,
): number {
  const jag = grit > 0.05 ? Math.sin(x * 0.37 + li) * grit * amp * 0.055 : 0
  const wave = visual.mod > 0.02 ? Math.sin(x * 0.018 + t / 420) * amp * 0.12 * visual.mod : 0
  const drop = spec.drop * height * (0.7 + visual.space * 0.8)
  const h = (env[x] ?? 0) * amp * spec.scale + jag + wave
  return base + drop - h + sway * (li + 1) * 0.12
}

function strokeStack(
  ctx: CanvasRenderingContext2D,
  args: RangePaintArgs,
  xOff: number,
  yOff: number,
  fill: Rgb,
  alphaMul: number,
  yScale: number,
  base: number,
  amp: number,
  sway: number,
  grit: number,
) {
  const { width, height, visual, layers, specs, nowMs } = args
  specs.forEach((spec, li) => {
    const env = layers[li]
    if (!env) return
    ctx.beginPath()
    ctx.moveTo(xOff, base + (height - base) * yScale + yOff)
    for (let x = 0; x < width; x++) {
      const y = ridgeY(env, x, base, amp, spec, height, visual, grit, nowMs, li, sway)
      const dy = (y - base) * yScale + base + yOff
      ctx.lineTo(x + xOff, dy)
    }
    ctx.lineTo(width + xOff, base + (height - base) * yScale + yOff)
    ctx.closePath()
    const open = Math.max(0, visual.character)
    ctx.fillStyle = rgbCss(fill, spec.alpha * (0.7 + visual.glow * 0.55 + open * 0.12) * alphaMul)
    ctx.fill()
  })
}

function paintWash(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number) {
  const { width, height, visual, ink } = args
  const blobs: Array<{ c: Rgb; a: number; x: number; r: number }> = [
    { c: visual.ink, a: 0.08 + visual.space * 0.1, x: width * 0.5, r: width * 0.42 },
    { c: visual.inkLeft, a: visual.drift * 0.16, x: width * 0.28, r: width * 0.3 },
    { c: visual.inkRight, a: visual.drift * 0.16, x: width * 0.72, r: width * 0.3 },
    { c: mixRgb(ink, { r: 196, g: 128, b: 255 }, 0.6), a: visual.echo * 0.14, x: width * 0.62, r: width * 0.28 },
    { c: mixRgb(ink, { r: 140, g: 255, b: 176 }, 0.5), a: visual.grain * 0.12, x: width * 0.4, r: width * 0.22 },
    { c: mixRgb(ink, { r: 255, g: 214, b: 120 }, 0.5), a: visual.pan * 0.14, x: width * (0.5 + Math.sin(args.nowMs / 900) * 0.2), r: width * 0.24 },
  ]
  for (const blob of blobs) {
    if (blob.a < 0.02) continue
    const g = ctx.createRadialGradient(blob.x, base * 0.85, 8, blob.x, base, blob.r)
    g.addColorStop(0, rgbCss(blob.c, blob.a))
    g.addColorStop(1, rgbCss(blob.c, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
  }
}

function paintSelection(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, windowStartFrac, windowEndFrac, dpr } = args
  const x0 = Math.min(windowStartFrac, windowEndFrac) * width
  const x1 = Math.max(windowStartFrac, windowEndFrac) * width
  if (x1 - x0 >= width - 2) return
  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.fillRect(0, 0, x0, height)
  ctx.fillRect(x1, 0, width - x1, height)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(x0, 0, Math.max(dpr, x1 - x0), height)
}

function paintPlayhead(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number, amp: number) {
  const { width, height, visual, play, dpr, playFrac, layers, specs } = args
  const px = playFrac * (width - 1)
  const peak = layers[0]?.[Math.round(px)] ?? 0
  const peakY = base - peak * amp * (specs[0]?.scale ?? 1)
  ctx.strokeStyle = play
  ctx.lineWidth = Math.max(1.2, dpr * (1 + visual.glow * 0.8))
  ctx.globalAlpha = 0.95
  ctx.beginPath()
  ctx.moveTo(px, 0)
  ctx.lineTo(px, height)
  ctx.stroke()
  ctx.fillStyle = play
  ctx.beginPath()
  ctx.arc(px, peakY, 3.6 * dpr, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function paintCanyonWalls(ctx: CanvasRenderingContext2D, args: RangePaintArgs, playFrac: number) {
  const { width, height, visual, dpr } = args
  const walk = Math.min(1, Math.max(0, playFrac))
  ctx.fillStyle = rgbCss({ r: 18, g: 12, b: 10 }, 0.55 + visual.space * 0.2)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  for (let x = 0; x <= width; x += 4) {
    const depth = x / width
    const inset = canyonWallInset(depth * (0.45 + walk * 0.55), width)
    ctx.lineTo(inset, (x / width) * height * 0.42)
  }
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(width, 0)
  for (let x = 0; x <= width; x += 4) {
    const depth = x / width
    const inset = canyonWallInset(depth * (0.45 + walk * 0.55), width)
    ctx.lineTo(width - inset, (x / width) * height * 0.42)
  }
  ctx.lineTo(width, height)
  ctx.closePath()
  ctx.fill()
  const vanishing = height * (0.18 + walk * 0.12)
  ctx.strokeStyle = rgbCss({ r: 232, g: 160, b: 96 }, 0.18 + visual.glow * 0.2)
  ctx.lineWidth = dpr
  ctx.beginPath()
  ctx.moveTo(canyonWallInset(walk, width), vanishing)
  ctx.lineTo(0, height)
  ctx.moveTo(width - canyonWallInset(walk, width), vanishing)
  ctx.lineTo(width, height)
  ctx.stroke()
}

function paintGleam(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number, amp: number) {
  const { width, visual, layers, specs, nowMs, dpr } = args
  const env = layers[0]
  if (!env) return
  const energy = Math.min(1, visual.space * 0.45 + visual.echo * 0.25 + visual.grain * 0.2 + visual.glow * 0.2)
  const n = gleamRayCount(energy)
  const spec = specs[0]!
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const x = Math.round(((i + 0.5) / n) * (width - 1))
    const y = ridgeY(env, x, base, amp, spec, args.height, visual, visual.dirt, nowMs, 0, 0)
    const sway = Math.sin(nowMs / 700 + i) * 18 * dpr
    const reach = (80 + visual.space * 140) * dpr
    const grad = ctx.createLinearGradient(x, y, x + sway, y - reach)
    grad.addColorStop(0, rgbCss(visual.ink, 0.22 + energy * 0.28))
    grad.addColorStop(0.45, rgbCss(mixRgb(visual.ink, { r: 126, g: 224, b: 255 }, 0.5), 0.1))
    grad.addColorStop(1, rgbCss(visual.ink, 0))
    ctx.strokeStyle = grad
    ctx.lineWidth = Math.max(1, (1.2 + visual.glow * 2.4) * dpr)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + sway * 0.4, y - reach * 0.45, x + sway, y - reach)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x - sway * 0.55, y - reach * 0.3, x - sway * 1.2, y - reach * 0.7)
    ctx.stroke()
  }
  ctx.restore()
}

function paintMountains(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number, amp: number, sway: number) {
  const { width, height, visual, ink, dpr, reduced } = args
  const grit = visual.dirt
  const echoShift = visual.echo * 28 * dpr
  const chroma = chromaticShift(visual.drift, dpr)
  const panSwing = reduced ? 0 : Math.sin(args.nowMs / 520) * visual.pan * 42 * dpr

  const draw = (xOff: number, fill: Rgb, alpha: number, yScale = 1, yOff = 0) => {
    strokeStack(ctx, args, xOff + panSwing, yOff, fill, alpha, yScale, base, amp, sway, grit)
  }

  if (visual.drift > 0.06) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    draw(chroma.r, visual.inkRed, 0.82)
    draw(chroma.g, visual.inkGreen, 0.7)
    draw(chroma.b, visual.inkBlue, 0.82)
    ctx.restore()
  } else {
    draw(0, ink, 1)
  }

  if (visual.echo > 0.08) {
    draw(echoShift, mixRgb(ink, { r: 196, g: 128, b: 255 }, 0.55), visual.echo * 0.55)
    draw(-echoShift * 0.7, mixRgb(ink, { r: 196, g: 128, b: 255 }, 0.35), visual.echo * 0.35)
  }

  if (args.scene === 'mirror') {
    ctx.save()
    ctx.globalAlpha = 0.55
    const water = base + 8 * dpr
    draw(6 * dpr, mixRgb(ink, { r: 158, g: 200, b: 255 }, 0.35), 0.7, -0.88, water * 2 - height * 0.08)
    ctx.restore()
    const fade = ctx.createLinearGradient(0, water, 0, height)
    fade.addColorStop(0, 'rgba(6,8,14,0.05)')
    fade.addColorStop(1, 'rgba(6,8,14,0.55)')
    ctx.fillStyle = fade
    ctx.fillRect(0, water, width, height - water)
  }
}

export function paintSoundRange(args: RangePaintArgs) {
  const { ctx, width, height, visual, dpr, reduced, scene } = args
  const zoom = visual.zoom
  const base = height * (scene === 'mirror' ? 0.5 : 0.72 - visual.space * 0.24)
  const amp = height * (0.34 + visual.mass * 0.1) * zoom * (1 - visual.tight * 0.45)
  const t = args.nowMs
  const sway = reduced ? 0 : visual.mod * 18 * dpr * Math.sin(t / 900)
  const bands = grainBandCount(visual.grain)
  const gap = bands > 1 ? Math.max(4 * dpr, visual.grain * 22 * dpr) : 0
  const bandW = bands > 1 ? (width - gap * (bands - 1)) / bands : width

  paintWash(ctx, args, base)
  if (scene === 'canyon') paintCanyonWalls(ctx, args, args.playFrac)

  const paintClipped = () => {
    if (bands <= 1) {
      paintMountains(ctx, args, base, amp, sway)
      return
    }
    for (let b = 0; b < bands; b++) {
      const x0 = b * (bandW + gap)
      ctx.save()
      ctx.beginPath()
      ctx.rect(x0, 0, bandW, height)
      ctx.clip()
      ctx.translate(0, ((b % 2) * 2 - 1) * visual.grain * 12 * dpr)
      paintMountains(ctx, args, base, amp, sway)
      ctx.restore()
    }
  }

  if (scene === 'canyon') {
    ctx.save()
    ctx.beginPath()
    const walk = args.playFrac
    ctx.moveTo(canyonWallInset(0.05, width), height)
    ctx.lineTo(canyonWallInset(0.55 + walk * 0.3, width), height * 0.22)
    ctx.lineTo(width - canyonWallInset(0.55 + walk * 0.3, width), height * 0.22)
    ctx.lineTo(width - canyonWallInset(0.05, width), height)
    ctx.closePath()
    ctx.clip()
    paintClipped()
    ctx.restore()
  } else {
    paintClipped()
  }

  if (scene === 'gleam') paintGleam(ctx, args, base, amp)
  paintSelection(ctx, args)
  paintPlayhead(ctx, args, base, amp)
}
