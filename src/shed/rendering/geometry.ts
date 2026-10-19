import type { OrnamentId } from '../model'
import { arcContour, clipBelow, diskContour, lineContour, rectContour } from './contour'
import { collarContour, crocketContour, hoodContour, lancetContour } from './ornament'
import { forkRng, type Rng } from './seed'
import type { Box, Contour, HelmetKind, Point, SideExtension, TowerVariation, WindowRhythm } from './types'

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t))
}

export type TowerOpening = {
  id: string
  contour: Contour
}

export type PinnacleStudy = {
  id: string
  shaft: Contour
  cap: Contour
}

export type TowerStudy = {
  width: number
  height: number
  anchorX: number
  anchorY: number
  body: Box
  roofHeight: number
  variation: TowerVariation
  plinth: Contour
  shaft: Contour
  sideReturn: Contour | null
  sideEdge: Contour | null
  gallery: Contour
  helmet: Contour
  helmetWash: Contour
  extension: Contour | null
  extensionRoof: Contour | null
  pinnacles: PinnacleStudy[]
  openings: TowerOpening[]
  hoods: Contour[]
  mullions: Contour[]
  cornices: Contour[]
  quoins: Contour[]
  guides: { axis: Contour; eave: Contour; arc: Contour; diagonal: Contour }
  crockets: Contour[]
  collar: Contour | null
  arris: Contour
  clock: Contour[]
  ornamentAnchor: Point
  hatch: Box
  loosePatch: Box
  fragment: Box
}

type HelmetBuild = {
  outline: Contour
  wash: Contour
  neckL: Point
  neckR: Point
  apex: Point
}

function between(from: Point, to: Point, t: number): Point {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]
}

export function readVariation(rng: Rng, height: number, width: number): TowerVariation {
  const sectionCap = height < 0.34 ? 2 : height < 0.68 ? 3 : 4
  const sections = Math.min(sectionCap, 2 + rng.int(0, 2))
  const helmetRoll = rng.int(0, 4)
  const helmet: HelmetKind = helmetRoll < 3 ? 'needle' : helmetRoll === 3 ? 'lantern' : 'asymmetric'
  const rhythms: readonly WindowRhythm[] = ['single', 'paired', 'mixed']
  const rhythm = rhythms[rng.int(0, 2)]!
  const extensionRoll = rng.int(0, 4)
  const extension: SideExtension = extensionRoll === 0 ? 'none' : extensionRoll < 3 ? 'left' : 'right'
  const arches = width < 0.38 ? 4 : 4 + rng.int(0, 2)
  const crockets = 2 + rng.int(0, 2)
  const clock = height > 0.42 && rng.chance(0.62)
  const lean = rng.range(-1, 1)
  return { helmet, sections, rhythm, extension, arches, crockets, clock, lean }
}

export function variationForSeed(seed: number, height = 0.62, width = 0.46): TowerVariation {
  return readVariation(forkRng(seed, 'geometry'), height, width)
}

function needleHelmet(left: number, right: number, eaveY: number, apexY: number, lean: number): HelmetBuild {
  const cx = (left + right) / 2 + lean
  const half = (right - left) / 2
  const h = Math.max(28, eaveY - apexY)
  const neckY = apexY + h * 0.46
  const neckHalf = half * 0.3
  const neckL: Point = [cx - neckHalf, neckY]
  const neckR: Point = [cx + neckHalf * 0.94, neckY + 1.4]
  const apex: Point = [cx + lean * 0.12, apexY]
  return {
    apex,
    neckL,
    neckR,
    outline: {
      id: 'helmet',
      closed: true,
      start: [left, eaveY],
      curves: [
        { op: 'C', c1: [left + half * 0.12, eaveY - h * 0.05], c2: [cx - neckHalf - half * 0.18, neckY + h * 0.1], to: neckL },
        { op: 'C', c1: [cx - neckHalf * 0.42, neckY - h * 0.22], c2: [apex[0] - half * 0.04, apexY + h * 0.16], to: apex },
        { op: 'C', c1: [apex[0] + half * 0.045, apexY + h * 0.15], c2: [cx + neckHalf * 0.5, neckY - h * 0.18], to: neckR },
        { op: 'C', c1: [cx + neckHalf + half * 0.16, neckY + h * 0.08], c2: [right - half * 0.1, eaveY - h * 0.045], to: [right, eaveY] },
      ],
    },
    wash: {
      id: 'helmet-wash',
      closed: true,
      start: [left + 4, eaveY - 1],
      curves: [
        { op: 'C', c1: [left + half * 0.28, eaveY - h * 0.07], c2: [neckL[0] - 3, neckY + 10], to: neckL },
        { op: 'L', to: neckR },
        { op: 'C', c1: [neckR[0] + 3, neckY + 9], c2: [right - half * 0.24, eaveY - h * 0.06], to: [right - 4, eaveY - 1] },
      ],
    },
  }
}

function lanternHelmet(left: number, right: number, eaveY: number, apexY: number, lean: number): HelmetBuild {
  const cx = (left + right) / 2 + lean * 0.35
  const half = (right - left) / 2
  const h = Math.max(28, eaveY - apexY)
  const drumTop = eaveY - h * 0.34
  const inset = half * 0.06
  const neckL: Point = [left + half * 0.3, drumTop]
  const neckR: Point = [right - half * 0.28, drumTop + 1]
  const apex: Point = [cx, apexY]
  return {
    apex,
    neckL,
    neckR,
    outline: {
      id: 'helmet',
      closed: true,
      start: [left, eaveY],
      curves: [
        { op: 'L', to: [left + inset, drumTop + 2] },
        { op: 'L', to: neckL },
        { op: 'C', c1: [neckL[0] + half * 0.08, drumTop - h * 0.08], c2: [cx - half * 0.08, apexY + h * 0.22], to: apex },
        { op: 'C', c1: [cx + half * 0.1, apexY + h * 0.2], c2: [neckR[0] - half * 0.04, drumTop - h * 0.06], to: neckR },
        { op: 'L', to: [right - inset, drumTop + 3] },
        { op: 'L', to: [right, eaveY] },
      ],
    },
    wash: lineContour('helmet-wash', [
      [left + 5, eaveY - 3],
      [left + inset + 3, drumTop + 8],
      [right - inset - 3, drumTop + 9],
      [right - 5, eaveY - 3],
    ], true),
  }
}

function asymmetricHelmet(left: number, right: number, eaveY: number, apexY: number, lean: number): HelmetBuild {
  const cx = (left + right) / 2
  const half = (right - left) / 2
  const h = Math.max(28, eaveY - apexY)
  const shift = Math.max(-1, Math.min(1, lean)) * half * 0.2
  const apex: Point = [cx + shift, apexY]
  const neckL: Point = [cx - half * 0.34 + shift * 0.2, apexY + h * 0.46]
  const neckR: Point = [cx + half * 0.3 + shift * 0.15, apexY + h * 0.5]
  return {
    apex,
    neckL,
    neckR,
    outline: {
      id: 'helmet',
      closed: true,
      start: [left, eaveY],
      curves: [
        { op: 'C', c1: [left + half * 0.16, eaveY - h * 0.08], c2: [neckL[0] - half * 0.04, neckL[1] + h * 0.08], to: neckL },
        { op: 'C', c1: [neckL[0] + half * 0.08, neckL[1] - h * 0.18], c2: [apex[0] - half * 0.06, apexY + h * 0.2], to: apex },
        { op: 'C', c1: [apex[0] + half * 0.08, apexY + h * 0.16], c2: [neckR[0] - half * 0.02, neckR[1] - h * 0.12], to: neckR },
        { op: 'C', c1: [neckR[0] + half * 0.1, neckR[1] + h * 0.08], c2: [right - half * 0.12, eaveY - h * 0.06], to: [right, eaveY] },
      ],
    },
    wash: lineContour('helmet-wash', [
      [left + 6, eaveY - 2],
      [neckL[0] + 4, neckL[1] + 2],
      [neckR[0] - 4, neckR[1] + 2],
      [right - 6, eaveY - 2],
    ], true),
  }
}

function pinnacle(id: string, cx: number, baseY: number, h: number, w: number): PinnacleStudy {
  const shaftH = h * 0.58
  const top = baseY - shaftH
  const left = cx - w / 2
  return {
    id,
    shaft: rectContour(`${id}-shaft`, left, top, w, shaftH),
    cap: lineContour(`${id}-cap`, [
      [left - 1.6, top + 1],
      [cx, baseY - h],
      [left + w + 1.6, top + 1],
    ], true),
  }
}

function crocketMarks(neck: Point, apex: Point, count: number, direction: number): Contour[] {
  const marks: Contour[] = []
  for (let index = 0; index < count; index += 1) {
    const t = 0.28 + (index / Math.max(1, count)) * 0.48
    const at = between(neck, apex, t)
    marks.push(crocketContour(`crocket-${direction > 0 ? 'r' : 'l'}-${index}`, at[0], at[1], direction))
  }
  return marks
}

/**
 * A tower study in the vocabulary of St. Mary's Basilica:
 * brick shaft, limestone plinth, pointed lights, gallery, unequal pinnacles,
 * and either the tall Hejnalica needle, the south-tower lantern, or an asymmetric spire.
 * Width, height, and roof scale those parts. The seed changes the structure.
 */
export function buildTowerStudy(
  widthT: number,
  heightT: number,
  roofT: number,
  ornament: OrnamentId,
  rng: Rng,
): TowerStudy {
  const variation = readVariation(rng, heightT, widthT)
  const bodyW = lerp(80, 132, widthT)
  const bodyH = lerp(150, 334, heightT)
  const roofScale = variation.helmet === 'lantern' ? lerp(0.4, 0.7, roofT) : lerp(0.56, 1.02, roofT)
  const roofHeight = bodyH * roofScale
  const sidePad = variation.extension === 'none' ? 0 : 28
  const leftMargin = 30 + (variation.extension === 'left' ? sidePad : 0)
  const rightMargin = 40 + (variation.extension === 'right' ? sidePad : 0)
  const topPad = ornament === 'none' ? 18 : 40
  const shaftLeft = leftMargin
  const shaftRight = shaftLeft + bodyW
  const cx = (shaftLeft + shaftRight) / 2
  const lean = variation.lean * (variation.helmet === 'asymmetric' ? bodyW * 0.16 : bodyW * 0.04)
  const apexY = topPad
  const eaveY = apexY + roofHeight
  const galleryH = 32
  const shaftTop = eaveY
  const shaftBottom = shaftTop + bodyH
  const plinthH = lerp(16, 28, widthT)
  const bottom = shaftBottom + plinthH
  const skew = variation.lean * 2.4
  const taper = 2 + Math.abs(variation.lean)

  const shaft = lineContour('shaft', [
    [shaftLeft - 1, shaftBottom],
    [shaftLeft + skew * 0.35, shaftTop + bodyH * 0.48],
    [shaftLeft + taper + skew, shaftTop],
    [shaftRight - taper, shaftTop],
    [shaftRight + 2.4, shaftTop + bodyH * 0.46],
    [shaftRight + 1, shaftBottom],
  ], true)
  const plinth = lineContour('plinth', [
    [shaftLeft - 12, shaftBottom - 1],
    [shaftRight + 13, shaftBottom - 2],
    [shaftRight + 16, bottom],
    [shaftLeft - 15, bottom + skew * 0.4],
  ], true)
  const sideReturn = variation.extension === 'right'
    ? null
    : lineContour('side-shade', [
      [shaftRight + 4, shaftTop + 18],
      [shaftRight + 18, shaftTop + 12],
      [shaftRight + 19, shaftBottom - 10],
      [shaftRight + 5, shaftBottom - 4],
    ], true)
  const sideEdge = variation.extension === 'right'
    ? null
    : lineContour('side-edge', [
      [shaftRight + 4, shaftTop + 18],
      [shaftRight + 18, shaftTop + 12],
      [shaftRight + 19, shaftBottom - 10],
      [shaftRight + 5, shaftBottom - 4],
    ], false)
  const gallery = lineContour('gallery', [
    [shaftLeft - 7, eaveY - 1],
    [shaftRight + 8, eaveY - 2],
    [shaftRight + 5, eaveY + galleryH],
    [shaftLeft - 5, eaveY + galleryH],
  ], true)

  const helmetLeft = shaftLeft + bodyW * 0.16
  const helmetRight = shaftRight - bodyW * 0.14
  const builtHelmet = variation.helmet === 'lantern'
    ? lanternHelmet(helmetLeft, helmetRight, eaveY, apexY, lean)
    : variation.helmet === 'asymmetric'
      ? asymmetricHelmet(shaftLeft + 6, shaftRight - 4, eaveY, apexY, variation.lean)
      : needleHelmet(helmetLeft, helmetRight, eaveY, apexY, lean)
  const helmetWash = clipBelow(builtHelmet.outline, Math.min(builtHelmet.neckL[1], builtHelmet.neckR[1])) ?? builtHelmet.wash
  const helmet = { ...builtHelmet, wash: { ...helmetWash, id: 'helmet-wash' } }

  const pinnacleH = Math.max(34, roofHeight * (variation.helmet === 'lantern' ? 0.22 : 0.3))
  const pinnacleW = Math.max(9, Math.min(14, bodyW * 0.09))
  const leftScale = variation.lean < 0 ? 1.16 : 0.76
  const rightScale = variation.lean < 0 ? 0.72 : 1.14
  const pinnacles = [
    pinnacle('pinnacle-left', shaftLeft + pinnacleW * 0.2, eaveY + 2, pinnacleH * leftScale, pinnacleW),
    pinnacle('pinnacle-right', shaftRight - pinnacleW * 0.2, eaveY + 1, pinnacleH * rightScale, pinnacleW * 0.92),
  ]

  let extension: Contour | null = null
  let extensionRoof: Contour | null = null
  const openings: TowerOpening[] = []
  if (variation.extension === 'left') {
    const turretW = 28
    const turretH = bodyH * 0.7
    const turretLeft = shaftLeft - turretW + 6
    const turretBottom = shaftBottom - 1
    const turretTop = turretBottom - turretH
    extension = lineContour('turret', [
      [turretLeft, turretBottom],
      [turretLeft + 1.5, turretTop],
      [turretLeft + turretW, turretTop + 3],
      [shaftLeft + 2, turretBottom],
    ], true)
    extensionRoof = lineContour('turret-roof', [
      [turretLeft - 3, turretTop + 1],
      [turretLeft + turretW * 0.46, turretTop - 46],
      [turretLeft + turretW + 2, turretTop + 2],
    ], true)
    openings.push({
      id: 'turret-slit',
      contour: lancetContour('turret-slit', turretLeft + 6, turretTop + turretH * 0.38, 6.5, 28),
    })
  } else if (variation.extension === 'right') {
    const step = bodyH * 0.22
    const face = shaftRight + 2
    extension = lineContour('buttress', [
      [face, shaftBottom],
      [face + 36, shaftBottom + 1],
      [face + 36, shaftBottom - step],
      [face + 22, shaftBottom - step],
      [face + 22, shaftBottom - step * 1.8],
      [face + 10, shaftBottom - step * 1.8],
      [face + 10, shaftBottom - step * 2.45],
      [face, shaftBottom - step * 2.45],
    ], true)
  }

  const doorH = Math.min(56, bodyH * 0.24)
  const doorW = Math.min(28, bodyW * 0.26)
  const doorX = cx - doorW / 2 + variation.lean * bodyW * 0.05
  openings.push({
    id: 'door-frame',
    contour: lancetContour('door-frame', doorX - 3, shaftBottom - doorH - 6, doorW + 6, doorH + 6),
  })
  openings.push({
    id: 'door',
    contour: lancetContour('door', doorX, shaftBottom - doorH, doorW, doorH),
  })

  const usableTop = shaftTop + galleryH + 12
  const usableBottom = shaftBottom - doorH - 16
  const span = usableBottom - usableTop
  const rows = span < 70 ? 1 : variation.sections > 2 ? variation.sections - 1 : variation.sections
  const hoods: Contour[] = []
  const mullions: Contour[] = []
  if (span > 22) {
    for (let row = 0; row < rows; row += 1) {
      const bandTop = usableTop + (span * row) / rows
      const bandH = span / rows
      const paired = variation.rhythm === 'paired' || (variation.rhythm === 'mixed' && row % 2 === 1)
      const winH = Math.min(paired ? bandH * 0.58 : bandH * 0.7, paired ? 40 : 56)
      const winW = paired ? Math.min(12, bodyW * 0.1) : Math.min(18, bodyW * 0.16)
      const y = bandTop + Math.max(2, (bandH - winH) * 0.42)
      if (paired) {
        const gap = Math.max(4, winW * 0.42)
        const group = winW * 2 + gap
        const x = cx - group / 2 + variation.lean * 5
        openings.push({ id: `frame-${row}`, contour: lancetContour(`frame-${row}`, x - 4, y - 3, group + 8, winH + 4) })
        openings.push({ id: `window-${row}-a`, contour: lancetContour(`window-${row}-a`, x, y, winW, winH) })
        openings.push({ id: `window-${row}-b`, contour: lancetContour(`window-${row}-b`, x + winW + gap, y + 1, winW, winH) })
        hoods.push(hoodContour(`hood-${row}`, x - 4, y - 8, group + 8, winH * 0.42))
      } else {
        const shift = (row % 2 === 0 ? -1 : 1) * (3 + Math.abs(variation.lean) * 4)
        const x = cx - winW / 2 + shift
        openings.push({ id: `frame-${row}`, contour: lancetContour(`frame-${row}`, x - 4, y - 3, winW + 8, winH + 4) })
        openings.push({ id: `window-${row}`, contour: lancetContour(`window-${row}`, x, y, winW, winH) })
        if (winW >= 15) {
          mullions.push(lineContour(`mullion-${row}`, [
            [x + winW / 2, y + winH * 0.34],
            [x + winW / 2, y + winH],
          ], false))
        }
      }
    }
  }

  const bayW = Math.min(10, (bodyW - 18) / (variation.arches * 1.65))
  const inner = bodyW - 18
  const gap = (inner - variation.arches * bayW) / (variation.arches + 1)
  for (let index = 0; index < variation.arches; index += 1) {
    const x = shaftLeft + 9 + gap + index * (bayW + gap)
    openings.push({
      id: `gallery-bay-${index}`,
      contour: lancetContour(`gallery-bay-${index}`, x, eaveY + 6, bayW, 20),
    })
  }

  if (variation.helmet === 'lantern') {
    const lightW = 7
    const lightY = Math.min(eaveY - 22, helmet.neckL[1] + 10)
    for (let index = 0; index < 3; index += 1) {
      const x = helmetLeft + bodyW * 0.22 + index * (lightW + 6)
      openings.push({
        id: `lantern-${index}`,
        contour: lancetContour(`lantern-${index}`, x, lightY, lightW, 16),
      })
    }
  }

  const cornices: Contour[] = []
  for (let index = 1; index < variation.sections; index += 1) {
    const y = shaftTop + (bodyH * index) / variation.sections
    const slope = variation.lean * 1.4
    cornices.push(lineContour(`cornice-${index}`, [
      [shaftLeft - 4, y],
      [shaftRight + 4, y + slope],
      [shaftRight + 4, y + slope + 5],
      [shaftLeft - 4, y + 5],
    ], true))
  }

  const quoins: Contour[] = []
  const stones = 4
  for (let index = 0; index < stones; index += 1) {
    const stoneH = Math.min(18, bodyH / (stones * 2.1))
    const y = shaftTop + 16 + index * ((bodyH - 36) / stones)
    const outset = index % 2 === 0 ? 0 : 3
    quoins.push(rectContour(`quoin-l-${index}`, shaftLeft - 1 + outset, y, 7, stoneH))
    quoins.push(rectContour(`quoin-r-${index}`, shaftRight - 8 - outset, y + 6, 7, stoneH))
  }

  const clock: Contour[] = []
  if (variation.clock) {
    const clockR = Math.min(16, bodyW * 0.13)
    const clockX = cx + variation.lean * 7
    const clockY = shaftTop + bodyH * 0.3
    clock.push(diskContour('clock-face', clockX, clockY, clockR))
    clock.push(diskContour('clock-ring', clockX, clockY, clockR * 0.72))
    clock.push(lineContour('clock-hand-a', [
      [clockX, clockY],
      [clockX + 1.5, clockY - clockR * 0.62],
    ], false))
    clock.push(lineContour('clock-hand-b', [
      [clockX, clockY],
      [clockX + clockR * 0.48, clockY + 1.2],
    ], false))
  }

  const crockets = variation.helmet === 'lantern'
    ? []
    : [
      ...crocketMarks(helmet.neckL, helmet.apex, variation.crockets, -1),
      ...crocketMarks(helmet.neckR, helmet.apex, variation.crockets, 1),
    ]

  const collar = variation.helmet === 'needle'
    ? collarContour('collar', helmet.neckL, helmet.neckR)
    : null

  return {
    width: shaftRight + rightMargin,
    height: bottom + 8,
    anchorX: cx,
    anchorY: bottom,
    body: { x: shaftLeft, y: shaftTop, w: bodyW, h: bodyH },
    roofHeight,
    variation,
    plinth,
    shaft,
    sideReturn,
    sideEdge,
    gallery,
    helmet: helmet.outline,
    helmetWash: helmet.wash,
    extension,
    extensionRoof,
    pinnacles,
    openings,
    hoods,
    mullions,
    cornices,
    quoins,
    guides: {
      axis: lineContour('guide-axis', [[cx, apexY - 12], [cx, bottom + 4]], false),
      eave: lineContour('guide-eave', [[shaftLeft - 24, eaveY], [shaftRight + 28, eaveY]], false),
      arc: arcContour('guide-arc', cx, eaveY, bodyW * 0.62, 206, 346),
      diagonal: lineContour('guide-diagonal', [[shaftLeft - 8, shaftBottom - 4], [shaftRight + 10, eaveY + 6]], false),
    },
    crockets,
    collar,
    arris: lineContour('arris', [
      [(helmet.neckL[0] + helmet.neckR[0]) / 2, (helmet.neckL[1] + helmet.neckR[1]) / 2 + 1],
      helmet.apex,
    ], false),
    clock,
    ornamentAnchor: [helmet.apex[0], helmet.apex[1] + 1],
    hatch: { x: shaftRight - 18, y: shaftTop + 18, w: 14, h: bodyH - 36 },
    loosePatch: {
      x: shaftLeft + bodyW * 0.16,
      y: shaftBottom - bodyH * 0.34,
      w: bodyW * 0.42,
      h: Math.max(18, bodyH * 0.14),
    },
    fragment: {
      x: variation.extension === 'left' ? shaftLeft - 48 : shaftRight + 28,
      y: eaveY + bodyH * 0.16,
      w: 28,
      h: 72,
    },
  }
}
