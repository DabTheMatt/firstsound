import type { ArchitecturalElement, ColorTreatment, InkStyle, OrnamentId } from '../model'
import {
  DEFAULT_ABSTRACTION,
  DEFAULT_COLOR_TREATMENT,
  DEFAULT_INK_STYLE,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
} from '../model'
import { SHED_BLUE, SHED_GOLD, SHED_INK, SHED_LIMESTONE, SHED_PARCHMENT } from '../palette'
import { looseRect, mixHex, normalizeHex, pigment, wash } from './color'
import { contourPath } from './contour'
import { buildTowerStudy } from './geometry'
import { hatch, trace, type InkOptions } from './ink'
import { finialContour, lancetContour, rosetteContours, starContour } from './ornament'
import { clampSeed, forkRng, hashString } from './seed'
import type { Contour, SketchGraphic, SketchPart, WindowRhythm } from './types'

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

export function resolveVisualSeed(element: Pick<ArchitecturalElement, 'id' | 'visualSeed'>): number {
  if (element.visualSeed != null && Number.isFinite(element.visualSeed)) return clampSeed(element.visualSeed)
  return hashString(element.id) % 100_000
}

export function usesSketchTower(element: Pick<ArchitecturalElement, 'type' | 'variant'>): boolean {
  return element.type === 'tower' && element.variant < 2
}

export function sketchVisualKey(element: ArchitecturalElement): string {
  return [
    element.id,
    element.height,
    element.width,
    element.roof,
    element.primary,
    element.secondary,
    element.ornament,
    element.variant,
    element.params?.proportion ?? '',
    element.params?.windows ?? '',
    element.visualSeed ?? '',
    element.abstraction ?? '',
    element.inkStyle ?? '',
    element.colorTreatment ?? '',
  ].join('|')
}

function rhythmForWindows(windows: number): WindowRhythm {
  if (windows < 0.34) return 'single'
  if (windows > 0.67) return 'mixed'
  return 'paired'
}

function inkOptions(style: InkStyle, abstraction: number, seed: number, label: string, extra?: Partial<InkOptions>): InkOptions {
  return {
    style,
    abstraction,
    rng: forkRng(seed, label),
    ...extra,
  }
}

function pushTrace(parts: SketchPart[], id: string, contour: Contour, options: InkOptions) {
  parts.push(...trace(id, contour, options))
}

function ornamentContours(id: OrnamentId, cx: number, cy: number): Contour[] {
  if (id === 'none') return []
  if (id === 'star') return [starContour('ornament-star', cx, cy - 14, 13)]
  if (id === 'rosette') return rosetteContours('ornament-rosette', cx, cy - 12)
  return [finialContour('ornament-finial', cx, cy - 2)]
}

const graphicCache = new Map<string, SketchGraphic>()
const GRAPHIC_CACHE_LIMIT = 32

export function clearSketchCache(): void {
  graphicCache.clear()
}

/**
 * St. Mary's tower through the sketch engine.
 * Position is ignored: dragging must not redraw the study.
 * Repeated calls with the same visual parameters reuse the previous paths.
 */
export function renderSketchTower(element: ArchitecturalElement): SketchGraphic {
  const key = sketchVisualKey(element)
  const cached = graphicCache.get(key)
  if (cached) return cached
  const graphic = drawSketchTower(element)
  graphicCache.set(key, graphic)
  if (graphicCache.size > GRAPHIC_CACHE_LIMIT) {
    const oldest = graphicCache.keys().next().value
    if (oldest) graphicCache.delete(oldest)
  }
  return graphic
}

function drawSketchTower(element: ArchitecturalElement): SketchGraphic {
  const height = clamp01(element.height, 0.62)
  const width = clamp01(element.width, 0.46)
  const roof = clamp01(element.roof, 0.5)
  const abstraction = clamp01(element.abstraction ?? DEFAULT_ABSTRACTION, DEFAULT_ABSTRACTION)
  const inkStyle: InkStyle = element.inkStyle ?? DEFAULT_INK_STYLE
  const colorTreatment: ColorTreatment = element.colorTreatment ?? DEFAULT_COLOR_TREATMENT
  const ornament = element.ornament
  const primary = normalizeHex(element.primary, DEFAULT_PRIMARY)
  const secondary = normalizeHex(element.secondary, DEFAULT_SECONDARY)
  const seed = resolveVisualSeed(element)
  const windows = clamp01(element.params?.windows ?? 0.5, 0.5)
  const proportion = clamp01(element.params?.proportion ?? 0.55, 0.55)
  const study = buildTowerStudy(width, height, roof, ornament, forkRng(seed, 'geometry'), {
    rhythm: rhythmForWindows(windows),
    helmet: element.variant === 1 ? 'lantern' : undefined,
    proportion,
  })
  const stone = SHED_LIMESTONE
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.45)
  const gold = mixHex(SHED_GOLD, secondary, 0.18)
  const parts: SketchPart[] = []

  parts.push({
    id: 'hit',
    d: `${contourPath(study.plinth, 2)} ${contourPath(study.shaft, 2)}`,
    layer: 'ink',
    fill: SHED_INK,
    fillOpacity: 0,
    stroke: 'none',
    pointerEvents: 'fill',
  })

  const colorRng = forkRng(seed, 'color')
  const washOf = (id: string, contour: Contour, fill: string, opacity?: number) => {
    parts.push(...wash(id, contour, fill, { treatment: colorTreatment, abstraction, rng: colorRng, opacity }))
  }

  if (study.sideReturn) washOf('return-wash', study.sideReturn, mixHex(primary, SHED_INK, 0.35), 0.34)
  washOf('plinth-wash', study.plinth, stone, 0.55)
  parts.push(...wash('shaft-wash', study.shaft, primary, {
    treatment: colorTreatment,
    abstraction,
    rng: colorRng,
    opacity: 0.34 - abstraction * 0.12,
    inset: 7 + abstraction * 8,
  }))
  if (study.extension) washOf('extension-wash', study.extension, mixHex(primary, stone, 0.2), 0.5)
  if (study.extensionRoof) washOf('extension-roof-wash', study.extensionRoof, secondary, 0.48)
  washOf('gallery-wash', study.gallery, stone, 0.55)
  for (const cornice of study.cornices) {
    if (abstraction > 0.72 && cornice.id === study.cornices[1]?.id) continue
    washOf(`${cornice.id}-wash`, cornice, stone, 0.7)
  }
  for (const quoin of study.quoins) washOf(`${quoin.id}-wash`, quoin, stone, 0.78)
  parts.push(...wash('helmet-wash', study.helmetWash, secondary, {
    treatment: 'reserve',
    abstraction: abstraction * 0.55,
    rng: colorRng,
    opacity: 0.4,
    inset: 6,
  }))
  for (const item of study.pinnacles) {
    washOf(`${item.id}-shaft-wash`, item.shaft, primary, 0.5)
    washOf(`${item.id}-cap-wash`, item.cap, secondary, 0.55)
  }
  for (const opening of study.openings) {
    const glassOpening = opening.id === 'door' || opening.id.startsWith('window') || opening.id.startsWith('gallery-bay') || opening.id.startsWith('lantern') || opening.id === 'turret-slit'
    if (!glassOpening) {
      washOf(`${opening.id}-wash`, opening.contour, stone, 0.72)
      continue
    }
    if (abstraction > 0.8 && opening.id.endsWith('-b')) continue
    washOf(`${opening.id}-wash`, opening.contour, opening.id.startsWith('gallery-bay') ? mixHex(glass, stone, 0.25) : glass, 0.7)
  }
  const clockFace = study.clock.find((mark) => mark.id === 'clock-face')
  if (clockFace) washOf('clock-wash', clockFace, stone, 0.28)

  const stains = colorTreatment === 'reserve' ? 2 : colorTreatment === 'layered' ? 5 : 3
  for (let index = 0; index < stains; index += 1) {
    const spot = pigment(
      `pigment-${index}`,
      [
        study.body.x + study.body.w * (0.22 + colorRng.next() * 0.55),
        study.body.y + study.body.h * (0.12 + colorRng.next() * 0.7),
      ],
      7 + colorRng.next() * 9,
      index % 2 === 0 ? mixHex(primary, SHED_INK, 0.15) : mixHex(secondary, SHED_GOLD, 0.25),
      colorRng,
      0.16 + abstraction * 0.08,
    )
    if (spot) parts.push(spot)
  }
  parts.push(looseRect(
    'stain-upper',
    study.body.x + 12 + abstraction * 4,
    study.body.y + 22,
    study.body.w * 0.62,
    study.body.h * 0.34,
    -1.2 - abstraction * 2,
    primary,
    0.28 + abstraction * 0.08,
  ))
  parts.push(looseRect(
    'stain-lower',
    study.body.x + study.body.w * 0.28,
    study.body.y + study.body.h * 0.52,
    study.body.w * 0.5,
    study.body.h * 0.22,
    1.4 + abstraction,
    mixHex(primary, SHED_PARCHMENT, 0.22),
    0.22,
  ))
  if (abstraction >= 0.18) {
    parts.push(looseRect(
      'loose-patch',
      study.loosePatch.x + abstraction * 8,
      study.loosePatch.y,
      study.loosePatch.w,
      study.loosePatch.h,
      (colorRng.next() - 0.5) * 8 * abstraction,
      mixHex(SHED_BLUE, stone, 0.45),
      0.1 + abstraction * 0.1,
    ))
  }

  const major = { echo: true, scale: 1, weight: 1.2 }
  pushTrace(parts, 'plinth', study.plinth, inkOptions(inkStyle, abstraction, seed, 'ink-plinth', { weight: 1.05, scale: 0.85 }))
  pushTrace(parts, 'shaft', study.shaft, inkOptions(inkStyle, abstraction, seed, 'ink-shaft', { echo: abstraction > 0.55, weight: 1.35 }))
  if (study.sideEdge) {
    pushTrace(parts, 'side-edge', study.sideEdge, inkOptions(inkStyle, abstraction, seed, 'ink-return', { weight: 0.7, scale: 0.55 }))
  }
  if (study.extension) {
    pushTrace(parts, study.extension.id, study.extension, inkOptions(inkStyle, abstraction, seed, 'ink-extension', major))
  }
  if (study.extensionRoof) {
    pushTrace(parts, study.extensionRoof.id, study.extensionRoof, inkOptions(inkStyle, abstraction, seed, 'ink-extension-roof', { echo: true, weight: 1 }))
  }
  pushTrace(parts, 'gallery', study.gallery, inkOptions(inkStyle, abstraction, seed, 'ink-gallery', { echo: abstraction > 0.3, weight: 0.9 }))
  for (const cornice of study.cornices) {
    pushTrace(parts, cornice.id, cornice, inkOptions(inkStyle, abstraction, seed, `ink-${cornice.id}`, { weight: 0.7, scale: 0.7 }))
  }
  for (const quoin of study.quoins) {
    pushTrace(parts, quoin.id, quoin, inkOptions(inkStyle, abstraction, seed, `ink-${quoin.id}`, { weight: 0.55, scale: 0.45 }))
  }
  pushTrace(parts, 'helmet', study.helmet, inkOptions(inkStyle, abstraction, seed, 'ink-helmet', { ...major, weight: 1.3 }))
  pushTrace(parts, 'arris', study.arris, inkOptions(inkStyle, abstraction, seed, 'ink-arris', { weight: 0.45, scale: 0.35 }))
  for (const item of study.pinnacles) {
    pushTrace(parts, item.shaft.id, item.shaft, inkOptions(inkStyle, abstraction, seed, `ink-${item.id}-shaft`, { weight: 0.7, scale: 0.6 }))
    pushTrace(parts, item.cap.id, item.cap, inkOptions(inkStyle, abstraction, seed, `ink-${item.id}-cap`, { weight: 0.7, scale: 0.55 }))
  }
  const dropBay = abstraction >= 0.66 ? study.variation.arches - 1 : -1
  for (const opening of study.openings) {
    if (opening.id === `gallery-bay-${dropBay}`) continue
    pushTrace(parts, opening.id, opening.contour, inkOptions(inkStyle, abstraction, seed, `ink-${opening.id}`, {
      weight: opening.id.startsWith('window') || opening.id === 'door' ? 0.85 : 0.65,
      scale: 0.42,
    }))
  }
  for (const hood of study.hoods) {
    pushTrace(parts, hood.id, hood, inkOptions(inkStyle, abstraction, seed, `ink-${hood.id}`, { weight: 0.6, scale: 0.5 }))
  }
  for (const mullion of study.mullions) {
    pushTrace(parts, mullion.id, mullion, inkOptions(inkStyle, abstraction, seed, `ink-${mullion.id}`, { weight: 0.55, scale: 0.35 }))
  }
  for (const mark of study.clock) {
    pushTrace(parts, mark.id, mark, inkOptions(inkStyle, abstraction, seed, `ink-${mark.id}`, { weight: 0.7, scale: 0.4 }))
  }
  for (const mark of study.crockets) {
    parts.push({
      id: mark.id,
      d: contourPath(mark, 1),
      layer: 'ink',
      fill: SHED_INK,
      fillOpacity: 0.88,
      stroke: 'none',
      pointerEvents: 'none',
    })
  }
  if (study.collar) {
    parts.push({
      id: 'collar',
      d: contourPath(study.collar, 1),
      layer: 'ornament',
      fill: gold,
      fillOpacity: 0.9,
      stroke: SHED_INK,
      strokeWidth: 0.55,
      pointerEvents: 'none',
    })
  }

  const joints = hatch(
    'brick-joints',
    study.body.x + 10,
    study.body.y + 8,
    study.body.w - 18,
    study.body.h * 0.72,
    forkRng(seed, 'joints'),
    Math.min(0.45, abstraction),
  )
  if (joints) parts.push(joints)
  const hatched = hatch('hatch', study.hatch.x, study.hatch.y, study.hatch.w, study.hatch.h, forkRng(seed, 'hatch'), abstraction)
  if (hatched) parts.push(hatched)

  for (const motif of ornamentContours(ornament, study.ornamentAnchor[0], study.ornamentAnchor[1])) {
    parts.push({
      id: motif.id,
      d: contourPath(motif, 3),
      layer: 'ornament',
      fill: gold,
      fillOpacity: 0.94,
      stroke: SHED_INK,
      strokeWidth: 0.65,
      pointerEvents: 'none',
    })
  }

  pushTrace(parts, 'construction-axis', study.guides.axis, inkOptions(inkStyle, 0.15, seed, 'guide-axis', {
    dashed: true,
    weight: 0.45,
    scale: 0.2,
    layer: 'construction',
  }))
  if (abstraction >= 0.22) {
    pushTrace(parts, 'construction-eave', study.guides.eave, inkOptions(inkStyle, 0.1, seed, 'guide-eave', { dashed: true, weight: 0.4, scale: 0.2 }))
    pushTrace(parts, 'construction-arc', study.guides.arc, inkOptions(inkStyle, 0.2, seed, 'guide-arc', { dashed: true, weight: 0.45, scale: 0.35 }))
  }
  if (abstraction >= 0.7) {
    pushTrace(parts, 'construction-diagonal', study.guides.diagonal, inkOptions(inkStyle, 0.25, seed, 'guide-diagonal', { dashed: true, weight: 0.4, scale: 0.3 }))
    const fragment = lancetContour('collage-lancet', study.fragment.x, study.fragment.y, study.fragment.w, study.fragment.h)
    parts.push(...wash('collage-wash', fragment, mixHex(primary, stone, 0.4), {
      treatment: 'reserve',
      abstraction,
      rng: forkRng(seed, 'collage-color'),
      opacity: 0.28,
    }))
    pushTrace(parts, 'collage-lancet', fragment, inkOptions(inkStyle, abstraction, seed, 'collage-ink', { echo: true, weight: 0.7, scale: 0.5 }))
  }

  return {
    width: study.width,
    height: study.height,
    anchorX: study.anchorX,
    anchorY: study.anchorY,
    body: study.body,
    roofHeight: study.roofHeight,
    primary,
    secondary,
    parts,
    ornament,
    seed,
    abstraction,
    inkStyle,
    colorTreatment,
    variation: study.variation,
  }
}
