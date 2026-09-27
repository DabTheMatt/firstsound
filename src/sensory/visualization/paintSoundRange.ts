import { forPaintX, ridgeSampleStep } from '../../app/frameBudget'
import type { SensorySceneId } from '../sensoryScene'
import { gleamRayCount, mirrorLayout, rangeLayout } from './rangeScenes'
import { changeLayerSpecs } from './changeLayers'
import {
  contourCount,
  echoGhostSpecs,
  grainDustCount,
  type MountainLayerSpec,
} from './mountainLayers'
import { perspectiveFrame, type ColorDepthBias, type DepthTraveler } from './depthField'
import { soundBodyAt, type PlaybackVisual } from './playbackWarp'
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
  /** Live time/pitch warp. Neutral values leave the sound body unchanged. */
  playback: PlaybackVisual
  pitchPhase: number
  /** Integrated playback clock. Falls behind wall time while motion settles. */
  motionMs?: number
  /** Strings traveling from the horizon toward the viewer. */
  depthTravelers?: readonly DepthTraveler[]
  /** Sound-color accent. Does not replace the theme. */
  accent?: { rgb: Rgb; amount: number; light?: number; depth?: number; detail?: number } | null
}

type SoundWarp = {
  width: number
  playback: PlaybackVisual
  pitchPhase: number
}

function soundWarp(args: RangePaintArgs): SoundWarp {
  return { width: args.width, playback: args.playback, pitchPhase: args.pitchPhase }
}

function motionTime(args: RangePaintArgs): number {
  return args.motionMs ?? args.nowMs
}

function accentCrest(crest: Rgb, args: RangePaintArgs): Rgb {
  const accent = args.accent
  if (!accent || accent.amount < 0.02) return crest
  return mixRgb(crest, accent.rgb, Math.min(0.72, accent.amount * 0.62))
}

function colorLight(args: RangePaintArgs): number {
  const light = args.accent?.light
  return light == null || !Number.isFinite(light) ? 0.5 : Math.min(1, Math.max(0, light))
}

function depthBiasOf(args: RangePaintArgs): ColorDepthBias {
  const accent = args.accent
  const light = (colorLight(args) - 0.5) * 2
  const depth = accent?.depth ?? 0
  return { light, space: Math.min(1, Math.max(0, depth * 0.5 + 0.5)) }
}

function shadeForLight(color: Rgb, light: number): Rgb {
  if (light < 0.5) return mixRgb(color, { r: 4, g: 6, b: 10 }, (0.5 - light) * 1.45)
  return mixRgb(color, { r: 255, g: 248, b: 236 }, (light - 0.5) * 1.05)
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
  warp: SoundWarp,
): number {
  const jag = grit > 0.04 ? Math.sin(x * 0.09 + li * 1.7) * grit * amp * 0.03 : 0
  const wave = visual.mod > 0.02 && breath !== 0 ? Math.sin(x * 0.012 + t / 1800) * breath : 0
  const body = soundBodyAt(env, x, warp.width, warp.playback, warp.pitchPhase)
  const h = body * amp * spec.scale + jag + wave
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
  const light = colorLight(args)
  const glow = visual.glow * (0.25 + light * 1.35)
  const stops = landscapeStops(visual, ridge)
  const left = shadeForLight(mixRgb(stops.left, { r: 18, g: 12, b: 10 }, 0.55), light)
  const crest = shadeForLight(mixRgb(stops.crest, { r: 22, g: 18, b: 16 }, 0.4), light)
  const right = shadeForLight(mixRgb(stops.right, { r: 8, g: 12, b: 20 }, 0.65), light)
  const sky = ctx.createLinearGradient(0, 0, width, height)
  sky.addColorStop(0, rgbCss(left, 0.42 + light * 0.38 + glow * 0.12))
  sky.addColorStop(0.45, rgbCss(crest, 0.12 + light * 0.32 + visual.haze * 0.16))
  sky.addColorStop(1, rgbCss(right, 0.28 + light * 0.28 + visual.space * 0.14))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const wash = ctx.createRadialGradient(width * 0.5, height * 0.42, 12, width * 0.5, height * 0.5, width * 0.46)
  wash.addColorStop(0, rgbCss(shadeForLight(stops.crest, light), (0.02 + glow * 0.22) * (0.35 + light)))
  wash.addColorStop(1, rgbCss(stops.crest, 0))
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, width, height)
}

/** Full-field luminance so light and dark read before any ridge motion. */
function paintLightVeil(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const light = colorLight(args)
  const delta = light - 0.5
  if (Math.abs(delta) < 0.03) return
  const { width, height } = args
  ctx.save()
  if (delta < 0) {
    const dark = -delta
    ctx.fillStyle = `rgba(1, 3, 8, ${0.1 + dark * 0.5})`
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.globalCompositeOperation = 'screen'
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.4, width * 0.04, width * 0.5, height * 0.46, width * 0.72)
    glow.addColorStop(0, `rgba(255, 250, 240, ${0.05 + delta * 0.38})`)
    glow.addColorStop(0.55, `rgba(255, 244, 224, ${delta * 0.16})`)
    glow.addColorStop(1, 'rgba(255, 244, 224, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
  }
  ctx.restore()
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
  warp: SoundWarp,
) {
  const step = ridgeSampleStep(width)
  ctx.beginPath()
  forPaintX(width, step, (x) => {
    const y = ridgeY(env, x, base, amp * frac, spec, visual, grit, t, li, dir, breath, warp)
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

type ProjectedSpan = {
  origin: number
  spanPx: number
  full: boolean
}

function projectedSpan(width: number, span: number, parallax = 0): ProjectedSpan {
  const clamped = Math.max(0.05, span)
  const spanPx = width * clamped
  const origin = (width - spanPx) / 2 + parallax * width
  return { origin, spanPx, full: clamped >= 0.995 && Math.abs(parallax) < 0.001 }
}

function traceProjected(
  ctx: CanvasRenderingContext2D,
  env: Float32Array,
  width: number,
  frame: ProjectedSpan,
  base: number,
  amp: number,
  spec: MountainLayerSpec,
  visual: SensoryVisualState,
  grit: number,
  t: number,
  li: number,
  dir: 1 | -1,
  breath: number,
  warp: SoundWarp,
  close: boolean,
) {
  const step = Math.max(2, ridgeSampleStep(width))
  const start = frame.origin
  const end = frame.origin + frame.spanPx
  ctx.beginPath()
  if (close) ctx.moveTo(start, base)
  let moved = false
  for (let sx = start; sx <= end + 0.01; sx += step) {
    const u = frame.spanPx <= 1 ? 0 : Math.min(1, (sx - start) / frame.spanPx)
    const envX = frame.full ? Math.min(width - 1, Math.max(0, sx)) : u * (width - 1)
    const y = ridgeY(env, envX, base, amp, spec, visual, grit, t, li, dir, breath, warp)
    if (!moved && !close) ctx.moveTo(sx, y)
    else ctx.lineTo(sx, y)
    moved = true
  }
  if (close) {
    ctx.lineTo(end, base)
    ctx.closePath()
  }
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
  const { width, height, visual, layers, specs, dpr, ridge } = args
  const warp = soundWarp(args)
  const grit = visual.dirt
  const breath = args.reduced ? 0 : visual.mod * amp * 0.04
  const contours = contourCount(visual.space, visual.grain)
  const order = specs.map((spec, li) => ({ spec, li, env: layers[li] })).filter((row) => row.env)
  const crest = shadeForLight(accentCrest(landscapeStops(visual, ridge).crest, args), colorLight(args))
  const light = colorLight(args)
  const bias = depthBiasOf(args)
  const lum = 0.4 + light * 1.15
  const t = motionTime(args)
  const horizonY = height * (dir < 0 ? 0.3 : 0.7)
  for (let i = order.length - 1; i >= 0; i--) {
    const { spec, li, env } = order[i]!
    const frame = perspectiveFrame(spec.z, bias)
    const drop = dir * (spec.drop + extraDrop) * height * 0.12
    const layerBase = base + (horizonY - base) * frame.horizon + drop
    const layerAmp = amp * frame.amplitude
    const placed = projectedSpan(width, frame.span)
    ctx.save()
    if (xOff) ctx.translate(xOff * (0.25 + frame.span * 0.75), 0)
    traceProjected(ctx, env!, width, placed, layerBase, layerAmp, spec, visual, grit, t, li, dir, breath, warp, true)
    ctx.fillStyle = moodFill(ctx, width, visual, ridge, spec.alpha * (0.85 + visual.glow * light * 0.35) * alphaMul * lum)
    ctx.fill()

    ctx.strokeStyle = rgbCss(crest, (0.22 + visual.sharpness * 0.28) * alphaMul * lum)
    ctx.lineWidth = Math.max(0.7, dpr * frame.weight * 0.55)
    ctx.lineJoin = 'round'
    traceProjected(ctx, env!, width, placed, layerBase, layerAmp, spec, visual, grit, t, li, dir, breath, warp, false)
    ctx.stroke()

    const detail = 0.45 + light * 0.75 + (args.accent?.detail ?? 0) * 0.2
    const lines = Math.max(2, Math.round(contours * frame.spread * detail))
    ctx.lineWidth = Math.max(0.45, dpr * (0.35 + frame.span * 0.35))
    for (let k = 1; k < lines; k++) {
      const frac = k / lines
      ctx.strokeStyle = rgbCss(crest, (0.045 + visual.space * 0.07) * (1 - frac * 0.45) * alphaMul * lum)
      traceProjected(
        ctx,
        env!,
        width,
        placed,
        layerBase,
        layerAmp * frac,
        spec,
        visual,
        grit,
        t,
        li,
        dir,
        breath,
        warp,
        false,
      )
      ctx.stroke()
    }
    ctx.restore()
  }
}

function depthBase(base: number, dir: 1 | -1, height: number, lift: number): number {
  return base + dir * lift * height * 0.62
}

/**
 * Structures at different Z. Far ones are small and gathered at the horizon.
 * Near ones expand outward, then soften as they pass the viewer.
 */
function paintDepthStrings(
  ctx: CanvasRenderingContext2D,
  args: RangePaintArgs,
  base: number,
  amp: number,
  dir: 1 | -1,
  which: 'approach' | 'pass' = 'approach',
) {
  const travelers = args.depthTravelers?.filter((row) => (which === 'pass' ? row.phase >= 0.72 : row.phase < 0.72))
  if (!travelers?.length) return
  const env = args.layers[0]
  const spec = args.specs[0]
  if (!env || !spec) return
  const { width, height, visual, dpr } = args
  const warp = soundWarp(args)
  const t = motionTime(args)
  const light = colorLight(args)
  const crest = shadeForLight(accentCrest(landscapeStops(visual, args.ridge).crest, args), light)
  const lum = 0.55 + light * 0.9
  for (const traveler of travelers) {
    if (traveler.alpha < 0.02) continue
    const layerBase = depthBase(base, dir, height, traveler.lift)
    const layerAmp = amp * traveler.scale
    const placed = projectedSpan(width, traveler.span, traveler.parallax)
    const draw = (lineWidth: number, alpha: number, ampScale = 1, fill = false) => {
      ctx.save()
      ctx.globalAlpha = alpha * lum
      ctx.strokeStyle = rgbCss(crest, 1)
      ctx.fillStyle = rgbCss(crest, 0.22)
      ctx.lineWidth = lineWidth
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      traceProjected(
        ctx,
        env,
        width,
        placed,
        layerBase,
        layerAmp * ampScale,
        spec,
        visual,
        visual.dirt * 0.35,
        t,
        traveler.lane,
        dir,
        0,
        warp,
        fill,
      )
      if (fill) ctx.fill()
      else ctx.stroke()
      ctx.restore()
    }
    draw(Math.max(0.6, dpr * (0.8 + traveler.blur)), traveler.alpha * 0.16, 1, true)
    if (traveler.blur > 0.35) draw(Math.max(1, dpr * (1.4 + traveler.blur * 2.2)), traveler.alpha * 0.2)
    draw(Math.max(0.7, dpr * traveler.weight), traveler.alpha)
    const lines = traveler.z > 0.34 ? Math.max(1, Math.round(traveler.spread * 2.4)) : 0
    for (let k = 1; k <= lines; k++) {
      const frac = k / (lines + 1)
      draw(Math.max(0.45, dpr * 0.55), traveler.alpha * 0.28 * (1 - frac * 0.4), frac)
    }
    if (traveler.detail > 0.22) {
      draw(Math.max(0.45, dpr * 0.4), traveler.alpha * traveler.detail * 0.6, 0.58)
    }
  }
}

function paintAccentGlow(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const accent = args.accent
  if (!accent || accent.amount < 0.04) return
  const { width, height } = args
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.62, 8, width * 0.5, height * 0.58, width * 0.42)
  glow.addColorStop(0, rgbCss(accent.rgb, 0.03 + accent.amount * 0.1))
  glow.addColorStop(1, rgbCss(accent.rgb, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

function paintEchoGhosts(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number, amp: number, dir: 1 | -1) {
  const ghosts = echoGhostSpecs(args.visual.echo)
  if (!ghosts.length) return
  for (const ghost of ghosts) {
    paintRidgeStack(ctx, args, base, amp, dir, ghost.xOff * args.width, ghost.alpha, ghost.drop)
  }
}

function paintChangeLayers(ctx: CanvasRenderingContext2D, args: RangePaintArgs, base: number, amp: number, dir: 1 | -1) {
  const energy = args.visual.changeEnergy
  if (energy < 0.03) return
  const phase = args.reduced ? 0.32 : (args.nowMs / 1500) % 1
  const shells = changeLayerSpecs(energy, phase)
  for (const shell of shells) {
    if (shell.alpha < 0.012) continue
    paintRidgeStack(ctx, args, base, amp * shell.scale, dir, 0, shell.alpha, shell.drop)
  }
}

function paintFilmGrain(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, dpr } = args
  const grain = visual.filmGrain
  if (grain < 0.04) return
  const n = Math.round(width * (0.16 + grain * 0.42))
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  for (let i = 0; i < n; i++) {
    const x = hash01(i + 41) * width
    const y = hash01(i + 91) * height
    const a = 0.03 + hash01(i + 3) * (0.06 + grain * 0.12)
    ctx.fillStyle = hash01(i + 11) > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    ctx.fillRect(x, y, Math.max(1, dpr * 0.7), Math.max(1, dpr * 0.7))
  }
  ctx.restore()
}

function paintChromaticFringe(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, layers, specs, reduced, dpr } = args
  const fringeTime = motionTime(args)
  const chroma = visual.chroma
  if (chroma < 0.04) return
  const env = layers[0]
  const spec = specs[0]
  if (!env || !spec) return
  const split = (0.6 + chroma * 3.2) * dpr
  const layout = rangeLayout(height, visual.space)
  const amp = layout.amp * (1 - visual.tight * 0.22)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.lineWidth = Math.max(0.8, dpr * 0.7)
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.12 + chroma * 0.28
  ctx.strokeStyle = rgbCss(visual.inkRed, 1)
  ctx.translate(-split, 0)
  strokeContour(ctx, env, width, layout.base, amp, spec, visual, visual.dirt, fringeTime, 0, layout.dir, 0, 1, soundWarp(args))
  ctx.restore()
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.lineWidth = Math.max(0.8, dpr * 0.7)
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.12 + chroma * 0.28
  ctx.strokeStyle = rgbCss(visual.inkBlue, 1)
  ctx.translate(split, reduced ? 0 : split * 0.15)
  strokeContour(ctx, env, width, layout.base, amp, spec, visual, visual.dirt, fringeTime, 0, layout.dir, 0, 1, soundWarp(args))
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const left = ctx.createLinearGradient(0, 0, width * 0.2, 0)
  left.addColorStop(0, rgbCss(visual.inkRed, 0.05 + chroma * 0.14))
  left.addColorStop(1, rgbCss(visual.inkRed, 0))
  ctx.fillStyle = left
  ctx.fillRect(0, 0, width * 0.24, height)
  const right = ctx.createLinearGradient(width, 0, width * 0.8, 0)
  right.addColorStop(0, rgbCss(visual.inkBlue, 0.05 + chroma * 0.14))
  right.addColorStop(1, rgbCss(visual.inkBlue, 0))
  ctx.fillStyle = right
  ctx.fillRect(width * 0.76, 0, width * 0.24, height)
  ctx.restore()
}

function paintDust(ctx: CanvasRenderingContext2D, args: RangePaintArgs) {
  const { width, height, visual, dpr } = args
  const n = grainDustCount(visual.filmGrain, width)
  if (n < 2) return
  const tint = mixRgb(visual.ink, { r: 220, g: 230, b: 210 }, 0.55)
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = hash01(i) * width
    const y = height * (0.18 + hash01(i + 19) * 0.62)
    const r = (0.4 + hash01(i + 7) * 1.2) * dpr
    ctx.fillStyle = rgbCss(tint, 0.05 + visual.filmGrain * 0.14 * hash01(i + 3))
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
  const { width, visual, play, dpr, playFrac, layers, specs, playback, pitchPhase } = args
  const px = playFrac * (width - 1)
  const env = layers[0]
  const sampleX = playback.timeStretch === 1 && playback.pitchFeel === 0 ? Math.round(px) : px
  const peak = env ? soundBodyAt(env, sampleX, width, playback, pitchPhase) : 0
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
  const { width, visual, layers, specs, dpr } = args
  const gleamTime = motionTime(args)
  const ink = args.accent && args.accent.amount > 0.04 ? mixRgb(visual.ink, args.accent.rgb, args.accent.amount * 0.5) : visual.ink
  const env = layers[0]
  if (!env) return
  const energy = Math.min(1, visual.space * 0.45 + visual.echo * 0.25 + visual.glow * 0.2)
  const n = gleamRayCount(energy)
  const spec = specs[0]!
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const x = Math.round(((i + 0.5) / n) * (width - 1))
    const y = ridgeY(env, x, base, amp, spec, visual, visual.dirt, gleamTime, 0, -1, 0, soundWarp(args))
    const sway = Math.sin(gleamTime / 2800 + i) * 8 * dpr
    const reach = (70 + visual.space * 90) * dpr
    const grad = ctx.createLinearGradient(x, y, x + sway, y - reach)
    grad.addColorStop(0, rgbCss(ink, 0.12 + energy * 0.18))
    grad.addColorStop(0.5, rgbCss(mixRgb(ink, { r: 126, g: 224, b: 255 }, 0.4), 0.06))
    grad.addColorStop(1, rgbCss(ink, 0))
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
  paintAccentGlow(ctx, args)
  paintHazeBand(ctx, args, args.height * 0.12, args.height)
  paintRidgeStack(ctx, args, layout.base, amp, layout.dir)
  paintDepthStrings(ctx, args, layout.base, amp, layout.dir, 'approach')
  paintDepthStrings(ctx, args, layout.base, amp, layout.dir, 'pass')
  paintEchoGhosts(ctx, args, layout.base, amp, layout.dir)
  paintChangeLayers(ctx, args, layout.base, amp, layout.dir)
  paintDust(ctx, args)
  paintLightVeil(ctx, args)
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
    paintAccentGlow(ctx, args)
    paintRidgeStack(ctx, args, layout.upperBase, amp, layout.upperDir)
    paintRidgeStack(ctx, args, layout.lowerBase, amp, layout.lowerDir)
    paintDepthStrings(ctx, args, layout.upperBase, amp, layout.upperDir, 'approach')
    paintDepthStrings(ctx, args, layout.lowerBase, amp, layout.lowerDir, 'approach')
    paintDepthStrings(ctx, args, layout.lowerBase, amp, layout.lowerDir, 'pass')
    paintEchoGhosts(ctx, args, layout.lowerBase, amp, layout.lowerDir)
    paintChangeLayers(ctx, args, layout.lowerBase, amp, layout.lowerDir)
    paintDust(ctx, args)
    paintLightVeil(ctx, args)
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
  paintAccentGlow(ctx, args)
  paintHazeBand(ctx, args, args.height * 0.08, args.height * 0.55)
  paintRidgeStack(ctx, args, layout.base, amp, layout.dir)
  paintDepthStrings(ctx, args, layout.base, amp, layout.dir, 'approach')
  paintDepthStrings(ctx, args, layout.base, amp, layout.dir, 'pass')
  paintEchoGhosts(ctx, args, layout.base, amp, layout.dir)
  paintChangeLayers(ctx, args, layout.base, amp, layout.dir)
  paintDust(ctx, args)
  if (scene === 'gleam' && !reduced) paintGleam(ctx, args, layout.base, amp)
  paintLightVeil(ctx, args)
  paintSelection(ctx, args)
  paintPlayhead(ctx, args, [layout.base], amp, [layout.dir])
  paintChromaticFringe(ctx, args)
  paintFilmGrain(ctx, args)
}
