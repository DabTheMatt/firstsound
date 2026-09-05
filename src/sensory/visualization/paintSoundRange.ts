import type { SensorySceneId } from '../sensoryScene'
import {
  canyonProject,
  canyonSliceCount,
  chromaticShift,
  gleamRayCount,
  mirrorLayout,
  rangeLayout,
} from './rangeScenes'
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
  visual: SensoryVisualState,
  grit: number,
  t: number,
  li: number,
  sway: number,
  dir: 1 | -1,
): number {
  const jag = grit > 0.05 ? Math.sin(x * 0.37 + li) * grit * amp * 0.055 : 0
  const wave = visual.mod > 0.02 ? Math.sin(x * 0.018 + t / 420) * amp * 0.12 * visual.mod : 0
  const h = (env[x] ?? 0) * amp * spec.scale + jag + wave
  return base + dir * (h + sway * (li + 1) * 0.12)
}

function strokeStack(
  ctx: CanvasRenderingContext2D,
  args: RangePaintArgs,
  xOff: number,
  fill: Rgb,
  alphaMul: number,
  base: number,
  amp: number,
  sway: number,
  grit: number,
  dir: 1 | -1,
) {
  const { width, visual, layers, specs, nowMs } = args
  specs.forEach((spec, li) => {
    const env = layers[li]
    if (!env) return
    ctx.beginPath()
    ctx.moveTo(xOff, base)
    for (let x = 0; x < width; x++) {
      ctx.lineTo(x + xOff, ridgeY(env, x, base, amp, spec, visual, grit, nowMs, li, sway, dir))
    }
    ctx.lineTo(width + xOff, base)
    ctx.closePath()
    const open = Math.max(0, visual.character)
    ctx.fillStyle = rgbCss(fill, spec.alpha * (0.7 + visual.glow * 0.55 + open * 0.12) * alphaMul)
    ctx.fill()
  })
}

function paintWash(ctx: CanvasRenderingContext2D, args: RangePaintArgs, focusY: number) {
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
    const g = ctx.createRadialGradient(blob.x, focusY, 8, blob.x, focusY, blob.r)
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

function paintChromaStacks(
  ctx: CanvasRenderingContext2D,
  args: RangePaintArgs,
  base: number,
  amp: number,
  sway: number,
  dir: 1 | -1,
) {
  const { visual, ink, dpr, reduced } = args
  const grit = visual.dirt
  const echoShift = visual.echo * 28 * dpr
  const chroma = chromaticShift(visual.drift, dpr)
  const panSwing = reduced ? 0 : Math.sin(args.nowMs / 520) * visual.pan * 42 * dpr
  const draw = (xOff: number, fill: Rgb, alpha: number) => {
    strokeStack(ctx, args, xOff + panSwing, fill, alpha, base, amp, sway, grit, dir)
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
}

function withGrainBands(args: RangePaintArgs, paint: () => void) {
  const { ctx, width, height, visual, dpr } = args
  const bands = grainBandCount(visual.grain)
  if (bands <= 1) {
    paint()
    return
  }
  const gap = Math.max(4 * dpr, visual.grain * 22 * dpr)
  const bandW = (width - gap * (bands - 1)) / bands
  for (let b = 0; b < bands; b++) {
    const x0 = b * (bandW + gap)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0, 0, bandW, height)
    ctx.clip()
    ctx.translate(0, ((b % 2) * 2 - 1) * visual.grain * 12 * dpr)
    paint()
    ctx.restore()
  }
}

function paintPlayheadPair(
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
  ctx.lineWidth = Math.max(1.2, dpr * (1 + visual.glow * 0.8))
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
    ctx.arc(px, y, 3.6 * dpr, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function paintCanyon(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, ink, play, dpr, playFrac, layers, specs } = args
  const env = layers[0]
  if (!env) return
  const slices = canyonSliceCount(height)
  const step = Math.max(2, Math.floor(width / 140))
  const spec0: MountainLayerSpec = specs[0] ?? { scale: 1, alpha: 1, blur: 0, drop: 0 }

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, rgbCss(mixRgb(ink, { r: 56, g: 36, b: 24 }, 0.35), 0.55))
  sky.addColorStop(1, 'rgba(6, 4, 3, 0.92)')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const farFloor = canyonProject(0.5, 1, 0, width, height)
  const nearL = canyonProject(0, 0, 0, width, height)
  const nearR = canyonProject(1, 0, 0, width, height)
  ctx.beginPath()
  ctx.moveTo(nearL.x, nearL.floorY)
  ctx.lineTo(nearR.x, nearR.floorY)
  ctx.lineTo(canyonProject(1, 1, 0, width, height).x, farFloor.floorY)
  ctx.lineTo(canyonProject(0, 1, 0, width, height).x, farFloor.floorY)
  ctx.closePath()
  const floor = ctx.createLinearGradient(width / 2, farFloor.floorY, width / 2, nearL.floorY)
  floor.addColorStop(0, 'rgba(64, 42, 28, 0.4)')
  floor.addColorStop(1, 'rgba(12, 8, 6, 0.7)')
  ctx.fillStyle = floor
  ctx.fill()

  for (let i = slices - 1; i >= 0; i--) {
    const d0 = i / slices
    const d1 = (i + 1) / slices
    const li = Math.min(specs.length - 1, Math.floor((1 - d0) * specs.length))
    const spec = specs[li] ?? spec0
    const layerEnv = layers[li] ?? env
    ctx.beginPath()
    for (let x = 0; x <= width; x += step) {
      const xi = Math.min(width - 1, x)
      const amp01 = Math.min(1, (layerEnv[xi] ?? 0) * spec.scale * (0.85 + visual.mass * 0.2))
      const p = canyonProject(xi / Math.max(1, width - 1), d0, amp01, width, height)
      if (x === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    for (let x = width; x >= 0; x -= step) {
      const xi = Math.min(width - 1, x)
      const amp01 = Math.min(1, (layerEnv[xi] ?? 0) * spec.scale * (0.85 + visual.mass * 0.2))
      const p = canyonProject(xi / Math.max(1, width - 1), d1, amp01, width, height)
      ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    const shade = 0.16 + (1 - d0) * 0.5
    ctx.fillStyle = rgbCss(mixRgb(ink, { r: 255, g: 156, b: 72 }, d0 * 0.18), shade * spec.alpha * (0.7 + visual.glow * 0.35))
    ctx.fill()
  }

  const px = Math.min(1, Math.max(0, playFrac))
  const peak = env[Math.round(px * (width - 1))] ?? 0
  const far = canyonProject(px, 1, peak, width, height)
  const near = canyonProject(px, 0, peak, width, height)
  ctx.strokeStyle = play
  ctx.lineWidth = Math.max(1.4, dpr * 1.4)
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.moveTo(far.x, far.y)
  ctx.lineTo(near.x, near.y)
  ctx.stroke()
  ctx.fillStyle = play
  ctx.beginPath()
  ctx.arc(near.x, near.y, 3.4 * dpr, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
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
    const y = ridgeY(env, x, base, amp, spec, visual, visual.dirt, nowMs, 0, 0, -1)
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

export function paintSoundRange(args: RangePaintArgs) {
  const { ctx, width, height, visual, dpr, reduced, scene } = args
  const t = args.nowMs
  const sway = reduced ? 0 : visual.mod * 18 * dpr * Math.sin(t / 900)

  if (scene === 'canyon') {
    paintCanyon(ctx, args)
    paintSelection(ctx, args)
    return
  }

  if (scene === 'mirror') {
    const layout = mirrorLayout(height)
    const amp = layout.amp * (1 - visual.tight * 0.22)
    paintWash(ctx, args, height * 0.5)
    withGrainBands(args, () => {
      paintChromaStacks(ctx, args, layout.upperBase, amp, sway, layout.upperDir)
      paintChromaStacks(ctx, args, layout.lowerBase, amp, sway, layout.lowerDir)
    })
    const haze = ctx.createLinearGradient(0, layout.upperBase, 0, layout.lowerBase)
    haze.addColorStop(0, 'rgba(8,12,20,0)')
    haze.addColorStop(0.5, `rgba(10,16,28,${0.18 + visual.space * 0.22})`)
    haze.addColorStop(1, 'rgba(8,12,20,0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, layout.upperBase, width, layout.gap)
    paintSelection(ctx, args)
    paintPlayheadPair(ctx, args, [layout.upperBase, layout.lowerBase], amp, [
      layout.upperDir,
      layout.lowerDir,
    ])
    return
  }

  const layout = rangeLayout(height)
  const amp = layout.amp * (1 - visual.tight * 0.22)
  paintWash(ctx, args, layout.base)
  withGrainBands(args, () => {
    paintChromaStacks(ctx, args, layout.base, amp, sway, layout.dir)
  })
  if (scene === 'gleam') paintGleam(ctx, args, layout.base, amp)
  paintSelection(ctx, args)
  paintPlayheadPair(ctx, args, [layout.base], amp, [layout.dir])
}
