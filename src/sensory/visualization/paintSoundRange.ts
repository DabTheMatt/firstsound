import { forPaintX, ridgeSampleStep } from '../../app/frameBudget'
import type { SensorySceneId } from '../sensoryScene'
import { gleamRayCount, mirrorLayout, rangeLayout } from './rangeScenes'
import {
  contourCount,
  echoGhostSpecs,
  grainDustCount,
  type MountainLayerSpec,
} from './mountainLayers'
import {
  landscapeStops,
  mixRgb,
  rgbCss,
  type Rgb,
  type RidgePalette,
  type SensoryVisualState,
} from './sensoryVisualState'

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
  ridge: RidgePalette
}

function hash01(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function ridgeY(
  env: Float32Array,
  x: number,
  base: number,
  amp: number,
  spec: MountainLayerSpec,
  visual: SensoryVisualState,
  grit: number,
  t: number,
  li: number,
  dir: 1 | -1,
  breath: number,
): number {
  const jag = grit > 0.04 ? Math.sin(x * 0.09 + li * 1.7) * grit * amp * 0.03 : 0
  const wave = visual.mod > 0.02 && breath !== 0 ? Math.sin(x * 0.012 + t / 1800) * breath : 0
  const h = (env[x] ?? 0) * amp * spec.scale + jag + wave
  return base + dir * h
}

function moodFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  visual: SensoryVisualState,
  ridge: RidgePalette,
  alpha: number,
) {
  const stops = landscapeStops(visual, ridge)
  const g = ctx.createLinearGradient(0, 0, width, 0)
  g.addColorStop(0, rgbCss(stops.left, alpha))
  g.addColorStop(0.48, rgbCss(stops.crest, alpha))
  g.addColorStop(1, rgbCss(stops.right, alpha))
  return g
}

function paintSky(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, ridge } = args
  const stops = landscapeStops(visual, ridge)
  const sky = ctx.createLinearGradient(0, 0, width, height)
  sky.addColorStop(0, rgbCss(mixRgb(stops.left, { r: 18, g: 12, b: 10 }, 0.55), 0.55 + visual.glow * 0.2))
  sky.addColorStop(0.45, rgbCss(mixRgb(stops.crest, { r: 22, g: 18, b: 16 }, 0.4), 0.28 + visual.haze * 0.2))
  sky.addColorStop(1, rgbCss(mixRgb(stops.right, { r: 8, g: 12, b: 20 }, 0.65), 0.42 + visual.space * 0.18))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const wash = ctx.createRadialGradient(width * 0.5, height * 0.42, 12, width * 0.5, height * 0.5, width * 0.46)
  wash.addColorStop(0, rgbCss(stops.crest, 0.08 + visual.glow * 0.16))
  wash.addColorStop(1, rgbCss(stops.crest, 0))
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, width, height)
}

function paintHazeBand(ctx: CanvasRenderingContext2D, args: RangePaintArgs, y0: number, y1: number) {
  const { width, visual } = args
  if (visual.haze < 0.08 && visual.echo < 0.08) return
  const mist = ctx.createLinearGradient(0, y0, 0, y1)
  mist.addColorStop(0, `rgba(10, 14, 22, ${0.04 + visual.haze * 0.18})`)
  mist.addColorStop(1, 'rgba(8,12,20,0)')
  ctx.fillStyle = mist
  ctx.fillRect(0, Math.min(y0, y1), width, Math.abs(y1 - y0))
}

function strokeContour(
  ctx: CanvasRenderingContext2D,
  env: Float32Array,
  width: number,
  base: number,
  amp: number,
  spec: MountainLayerSpec,
  visual: SensoryVisualState,
  grit: number,
  t: number,
  li: number,
  dir: 1 | -1,
  breath: number,
  frac: number,
) {
  const step = ridgeSampleStep(width)
  ctx.beginPath()
  forPaintX(width, step, (x) => {
    const y = ridgeY(env, x, base, amp * frac, spec, visual, grit, t, li, dir, breath)
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

function paintRidgeStack(
  ctx: CanvasRenderingContext2D,
  args: RangePaintArgs,
  base: number,
  amp: number,
  dir: 1 | -1,
  xOff = 0,
  alphaMul = 1,
  extraDrop = 0,
) {
  const { width, height, visual, layers, specs, nowMs, dpr, ridge } = args
  const grit = visual.dirt
  const breath = args.reduced ? 0 : visual.mod * amp * 0.04
  const contours = contourCount(visual.space, visual.grain)
  const order = specs.map((spec, li) => ({ spec, li, env: layers[li] })).filter((row) => row.env)
  const crest = landscapeStops(visual, ridge).crest
  for (let i = order.length - 1; i >= 0; i--) {
    const { spec, li, env } = order[i]!
    const layerBase = base + dir * (spec.drop + extraDrop) * height * 0.42
    const layerAmp = amp * (1 - spec.z * 0.18)
    ctx.save()
    if (xOff) ctx.translate(xOff, 0)
    const step = ridgeSampleStep(width)
    ctx.beginPath()
    ctx.moveTo(0, layerBase)
    forPaintX(width, step, (x) => {
      ctx.lineTo(x, ridgeY(env!, x, layerBase, layerAmp, spec, visual, grit, nowMs, li, dir, breath))
    })
    ctx.lineTo(width - 1, layerBase)
    ctx.closePath()
    ctx.fillStyle = moodFill(ctx, width, visual, ridge, spec.alpha * (0.85 + visual.glow * 0.2) * alphaMul)
    ctx.fill()

    ctx.strokeStyle = rgbCss(crest, (0.22 + visual.sharpness * 0.28) * alphaMul)
    ctx.lineWidth = Math.max(1, dpr * (1.1 - spec.z * 0.4))
    ctx.lineJoin = 'round'
    ctx.beginPath()
    forPaintX(width, step, (x) => {
      const y = ridgeY(env!, x, layerBase, layerAmp, spec, visual, grit, nowMs, li, dir, breath)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    const lines = Math.max(4, Math.round(contours * (1 - spec.z * 0.55)))
    ctx.lineWidth = Math.max(0.6, dpr * 0.55)
    for (let k = 1; k < lines; k++) {
      const frac = k / lines
      ctx.strokeStyle = rgbCss(crest, (0.05 + visual.space * 0.06) * (1 - frac * 0.4) * alphaMul)
      strokeContour(ctx, env!, width, layerBase, layerAmp, spec, visual, grit, nowMs, li, dir, breath, frac)
    }
    ctx.restore()
  }
}

function paintEchoGhosts(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number, amp: number, dir: 1 | -1) {
  const ghosts = echoGhostSpecs(args.visual.echo)
  if (!ghosts.length) return
  for (const ghost of ghosts) {
    paintRidgeStack(ctx, args, base, amp, dir, ghost.xOff * args.width, ghost.alpha, ghost.drop)
  }
}

function paintFilmGrain(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, dpr } = args
  const n = Math.round(width * (0.22 + visual.dirt * 0.12))
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  for (let i = 0; i < n; i++) {
    const x = hash01(i + 41) * width
    const y = hash01(i + 91) * height
    const a = 0.03 + hash01(i + 3) * (0.07 + visual.grain * 0.05)
    ctx.fillStyle = hash01(i + 11) > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    ctx.fillRect(x, y, Math.max(1, dpr * 0.7), Math.max(1, dpr * 0.7))
  }
  ctx.restore()
}

function paintChromaticFringe(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, layers, specs, nowMs, reduced, dpr } = args
  const env = layers[0]
  const spec = specs[0]
  if (!env || !spec) return
  const split = (0.8 + visual.space * 1.8 + visual.drift * 1.6) * dpr
  const layout = rangeLayout(height, visual.space)
  const amp = layout.amp * (1 - visual.tight * 0.22)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.lineWidth = Math.max(0.8, dpr * 0.7)
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.16 + visual.space * 0.08
  ctx.strokeStyle = rgbCss(visual.inkRed, 1)
  ctx.translate(-split, 0)
  strokeContour(ctx, env, width, layout.base, amp, spec, visual, visual.dirt, nowMs, 0, layout.dir, 0, 1)
  ctx.restore()
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.lineWidth = Math.max(0.8, dpr * 0.7)
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.16 + visual.space * 0.08
  ctx.strokeStyle = rgbCss(visual.inkBlue, 1)
  ctx.translate(split, reduced ? 0 : split * 0.15)
  strokeContour(ctx, env, width, layout.base, amp, spec, visual, visual.dirt, nowMs, 0, layout.dir, 0, 1)
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const left = ctx.createLinearGradient(0, 0, width * 0.2, 0)
  left.addColorStop(0, rgbCss(visual.inkRed, 0.08 + visual.space * 0.05))
  left.addColorStop(1, rgbCss(visual.inkRed, 0))
  ctx.fillStyle = left
  ctx.fillRect(0, 0, width * 0.24, height)
  const right = ctx.createLinearGradient(width, 0, width * 0.8, 0)
  right.addColorStop(0, rgbCss(visual.inkBlue, 0.08 + visual.space * 0.05))
  right.addColorStop(1, rgbCss(visual.inkBlue, 0))
  ctx.fillStyle = right
  ctx.fillRect(width * 0.76, 0, width * 0.24, height)
  ctx.restore()
}

function paintDust(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, dpr } = args
  const n = grainDustCount(visual.grain, width)
  if (n < 2) return
  const tint = mixRgb(visual.ink, { r: 220, g: 230, b: 210 }, 0.55)
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = hash01(i) * width
    const y = height * (0.18 + hash01(i + 19) * 0.62)
    const r = (0.4 + hash01(i + 7) * 1.2) * dpr
    ctx.fillStyle = rgbCss(tint, 0.05 + visual.grain * 0.14 * hash01(i + 3))
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function paintSelection(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, windowStartFrac, windowEndFrac, dpr } = args
  const x0 = Math.min(windowStartFrac, windowEndFrac) * width
  const x1 = Math.max(windowStartFrac, windowEndFrac) * width
  if (x1 - x0 >= width - 2) return
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.fillRect(0, 0, x0, height)
  ctx.fillRect(x1, 0, width - x1, height)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(x0, 0, Math.max(dpr, x1 - x0), height)
}

function paintPlayhead(
  ctx: CanvasRenderingContext2D,
  args: RangePaintArgs,
  bases: number[],
  amp: number,
  dirs: Array<1 | -1>,
) {
  const { width, visual, play, dpr, playFrac, layers, specs } = args
  const px = playFrac * (width - 1)
  const peak = layers[0]?.[Math.round(px)] ?? 0
  ctx.strokeStyle = args.play
  ctx.lineWidth = Math.max(1.1, dpr * (1 + visual.glow * 0.35))
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.moveTo(px, 0)
  ctx.lineTo(px, args.height)
  ctx.stroke()
  ctx.globalAlpha = 0.95
  ctx.fillStyle = play
  bases.forEach((base, i) => {
    const dir = dirs[i] ?? -1
    const y = base + dir * peak * amp * (specs[0]?.scale ?? 1)
    ctx.beginPath()
    ctx.arc(px, y, 3.2 * dpr, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function paintGleam(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number, amp: number) {
  const { width, visual, layers, specs, nowMs, dpr } = args
  const env = layers[0]
  if (!env) return
  const energy = Math.min(1, visual.space * 0.45 + visual.echo * 0.25 + visual.glow * 0.2)
  const n = gleamRayCount(energy)
  const spec = specs[0]!
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const x = Math.round(((i + 0.5) / n) * (width - 1))
    const y = ridgeY(env, x, base, amp, spec, visual, visual.dirt, nowMs, 0, -1, 0)
    const sway = Math.sin(nowMs / 2800 + i) * 8 * dpr
    const reach = (70 + visual.space * 90) * dpr
    const grad = ctx.createLinearGradient(x, y, x + sway, y - reach)
    grad.addColorStop(0, rgbCss(visual.ink, 0.12 + energy * 0.18))
    grad.addColorStop(0.5, rgbCss(mixRgb(visual.ink, { r: 126, g: 224, b: 255 }, 0.4), 0.06))
    grad.addColorStop(1, rgbCss(visual.ink, 0))
    ctx.strokeStyle = grad
    ctx.lineWidth = Math.max(1, (0.8 + visual.glow * 1.4) * dpr)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + sway * 0.35, y - reach * 0.45, x + sway, y - reach)
    ctx.stroke()
  }
  ctx.restore()
}

function paintCanyon(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const layout = rangeLayout(args.height, args.visual.space)
  const amp = layout.amp * (1 - args.visual.tight * 0.22)
  paintSky(ctx, args)
  paintHazeBand(ctx, args, args.height * 0.12, args.height)
  paintRidgeStack(ctx, args, layout.base, amp, layout.dir)
  paintEchoGhosts(ctx, args, layout.base, amp, layout.dir)
  paintDust(ctx, args)
}

export function paintSoundRange(args: RangePaintArgs) {
  const { ctx, visual, reduced, scene } = args

  if (scene === 'canyon') {
    paintCanyon(ctx, args)
    paintSelection(ctx, args)
    const layout = rangeLayout(args.height, visual.space)
    paintPlayhead(ctx, args, [layout.base], layout.amp * (1 - visual.tight * 0.22), [layout.dir])
    paintChromaticFringe(ctx, args)
    paintFilmGrain(ctx, args)
    return
  }

  if (scene === 'mirror') {
    const layout = mirrorLayout(args.height, visual.space)
    const amp = layout.amp * (1 - visual.tight * 0.22)
    paintSky(ctx, args)
    paintRidgeStack(ctx, args, layout.upperBase, amp, layout.upperDir)
    paintRidgeStack(ctx, args, layout.lowerBase, amp, layout.lowerDir)
    paintEchoGhosts(ctx, args, layout.lowerBase, amp, layout.lowerDir)
    paintDust(ctx, args)
    const haze = ctx.createLinearGradient(0, layout.upperBase, 0, layout.lowerBase)
    haze.addColorStop(0, 'rgba(8,12,20,0)')
    haze.addColorStop(0.5, `rgba(10,16,28,${0.12 + visual.space * 0.16})`)
    haze.addColorStop(1, 'rgba(8,12,20,0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, layout.upperBase, args.width, layout.gap)
    paintSelection(ctx, args)
    paintPlayhead(ctx, args, [layout.upperBase, layout.lowerBase], amp, [layout.upperDir, layout.lowerDir])
    paintChromaticFringe(ctx, args)
    paintFilmGrain(ctx, args)
    return
  }

  const layout = rangeLayout(args.height, visual.space)
  const amp = layout.amp * (1 - visual.tight * 0.22)
  paintSky(ctx, args)
  paintHazeBand(ctx, args, args.height * 0.08, args.height * 0.55)
  paintRidgeStack(ctx, args, layout.base, amp, layout.dir)
  paintEchoGhosts(ctx, args, layout.base, amp, layout.dir)
  paintDust(ctx, args)
  if (scene === 'gleam' && !reduced) paintGleam(ctx, args, layout.base, amp)
  paintSelection(ctx, args)
  paintPlayhead(ctx, args, [layout.base], amp, [layout.dir])
  paintChromaticFringe(ctx, args)
  paintFilmGrain(ctx, args)
}
