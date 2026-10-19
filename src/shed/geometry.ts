import type { ArchitecturalElement, OrnamentId } from './model'
import { clampUnit } from './model'
import { SHED_BLUE, SHED_GOLD, SHED_INK, SHED_LIMESTONE } from './palette'
import {
  accent,
  construction,
  cubic,
  disk,
  facade,
  hairline,
  lancet,
  n,
  opening,
  pointOnCubic,
  poly,
  solid,
  type DrawPart,
} from './draw'

export type TowerBox = {
  x: number
  y: number
  w: number
  h: number
}

export type TowerPart = DrawPart

export type TowerGraphic = {
  width: number
  height: number
  anchorX: number
  anchorY: number
  body: TowerBox
  roofHeight: number
  depth: number
  primary: string
  secondary: string
  side: string
  windows: TowerBox[]
  parts: TowerPart[]
  ornament: OrnamentId
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

function mixChannel(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount)
}

export function mixHex(hex: string, target: string, amount: number): string {
  const from = hex.replace('#', '')
  const to = target.replace('#', '')
  const t = Math.min(1, Math.max(0, amount))
  const channels = [0, 2, 4].map((index) =>
    mixChannel(parseInt(from.slice(index, index + 2), 16), parseInt(to.slice(index, index + 2), 16), t),
  )
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

type Cubic = {
  from: [number, number]
  c1: [number, number]
  c2: [number, number]
  to: [number, number]
}

type HelmetStudy = {
  d: string
  cx: number
  half: number
  h: number
  neckY: number
  apex: [number, number]
  leftNeck: [number, number]
  rightNeck: [number, number]
  leftUpper: Cubic
  rightUpper: Cubic
}

/**
 * Late Gothic helmet in the manner of the taller St. Mary's spire:
 * a hip that narrows to a neck, then a long needle. The shaft corners stay free for pinnacles.
 */
function helmetStudy(
  left: number,
  right: number,
  eaveY: number,
  apexY: number,
  profile: 'taller' | 'lower' = 'taller',
): HelmetStudy {
  const cx = (left + right) / 2
  const half = (right - left) / 2
  const h = eaveY - apexY
  const lower = profile === 'lower'
  const neckY = eaveY - h * (lower ? 0.58 : 0.4)
  const neckHalf = half * (lower ? 0.58 : 0.3)
  const leftNeck: [number, number] = [cx - neckHalf, neckY]
  const rightNeck: [number, number] = [cx + neckHalf, neckY]
  const apex: [number, number] = [cx, apexY]
  const leftUpper: Cubic = lower
    ? {
        from: leftNeck,
        c1: [cx - neckHalf * 0.92, neckY - h * 0.42],
        c2: [cx - half * 0.06, apexY + h * 0.46],
        to: apex,
      }
    : {
        from: leftNeck,
        c1: [cx - neckHalf * 0.42, neckY - h * 0.24],
        c2: [cx - half * 0.045, apexY + h * 0.2],
        to: apex,
      }
  const rightUpper: Cubic = lower
    ? {
        from: apex,
        c1: [cx + half * 0.06, apexY + h * 0.46],
        c2: [cx + neckHalf * 0.92, neckY - h * 0.42],
        to: rightNeck,
      }
    : {
        from: apex,
        c1: [cx + half * 0.045, apexY + h * 0.2],
        c2: [cx + neckHalf * 0.42, neckY - h * 0.24],
        to: rightNeck,
      }
  const d = [
    `M${n(left - 2)} ${n(eaveY)}`,
    cubic(
      [left - 2, eaveY],
      [left + half * 0.12, eaveY - h * 0.05],
      [cx - neckHalf - half * 0.2, neckY + h * 0.1],
      leftNeck,
    ),
    cubic(leftUpper.from, leftUpper.c1, leftUpper.c2, leftUpper.to),
    cubic(rightUpper.from, rightUpper.c1, rightUpper.c2, rightUpper.to),
    cubic(
      rightNeck,
      [cx + neckHalf + half * 0.2, neckY + h * 0.1],
      [right - half * 0.12, eaveY - h * 0.05],
      [right + 2, eaveY],
    ),
    'Z',
  ].join(' ')
  return { d, cx, half, h, neckY, apex, leftNeck, rightNeck, leftUpper, rightUpper }
}

function crocket(x: number, y: number, dir: number, salt: number): string {
  return poly(
    [
      [x, y + 2],
      [x + dir * 7, y - 1],
      [x + dir * 1.4, y - 6],
    ],
    salt,
    0.45,
  )
}

function ornamentPath(id: OrnamentId, cx: number, cy: number): string | null {
  if (id === 'none') return null
  if (id === 'finial') {
    const ball = disk(cx, cy - 9, 5.4)
    const crown = poly(
      [
        [cx - 9, cy - 14],
        [cx - 9, cy - 24],
        [cx - 5, cy - 17],
        [cx, cy - 30],
        [cx + 5, cy - 17],
        [cx + 9, cy - 24],
        [cx + 9, cy - 14],
      ],
      11,
      0.35,
    )
    return `${ball} ${crown}`
  }
  if (id === 'star') {
    const points: Array<[number, number]> = []
    const radius = 13
    const centerY = cy - 14
    for (let index = 0; index < 10; index += 1) {
      const arm = index % 2 === 0 ? radius : radius * 0.42
      const angle = -Math.PI / 2 + (index * Math.PI) / 5
      points.push([cx + Math.cos(angle) * arm, centerY + Math.sin(angle) * arm])
    }
    return poly(points, 6, 0.35)
  }
  const centerY = cy - 12
  const petals = [0, 60, 120, 180, 240, 300]
    .map((degree) => {
      const angle = (degree * Math.PI) / 180
      return disk(cx + Math.cos(angle) * 7.5, centerY + Math.sin(angle) * 7.5, 4.4)
    })
    .join(' ')
  return `${disk(cx, centerY, 3.4)} ${petals}`
}

function towerLights(element: ArchitecturalElement): { cols: number; rows: number } {
  const windows = clampUnit(element.params?.windows ?? 0.5)
  let cols = element.width >= 0.55 ? 2 : 1
  let rows = element.height < 0.38 ? 1 : element.height < 0.72 ? 2 : 3
  if (windows < 0.34) {
    cols = 1
    rows = 1
  } else if (windows > 0.67) {
    cols = Math.max(2, cols)
    rows += 1
  }
  return { cols, rows }
}

function proportionScale(element: ArchitecturalElement): number {
  return 1 + (clampUnit(element.params?.proportion ?? 0.55) - 0.55) * 0.36
}

/**
 * St. Mary's towers. Variant 0 is the taller-tower study: limestone plinth, brick shaft,
 * pointed openings, gallery, helmet, and corner pinnacles. Height, width, and roof scale those parts.
 * Variant 1 keeps the same shaft and shortens the helmet into the lower tower's copper cup.
 */
function buildMariackiTower(element: ArchitecturalElement): TowerGraphic {
  const profile = element.variant === 1 ? 'lower' : 'taller'
  const width = lerp(74, 146, element.width) * proportionScale(element)
  const bodyHeight = lerp(156, 372, element.height)
  const roofSpan = profile === 'lower' ? ([0.26, 0.46] as const) : ([0.48, 0.9] as const)
  const roofHeight = bodyHeight * lerp(roofSpan[0], roofSpan[1], element.roof)
  const depth = width * 0.3
  const rise = depth * 0.34
  const galleryH = 24
  const baseH = lerp(20, 30, element.width)
  const topPad = element.ornament === 'none' ? 18 : 48
  const left = 34
  const right = left + width
  const side = right + depth
  const cx = (left + right) / 2
  const apexY = topPad
  const eaveY = apexY + roofHeight
  const galleryBottom = eaveY + galleryH
  const shaftTop = galleryBottom
  const shaftBottom = shaftTop + bodyHeight
  const bottom = shaftBottom + baseH
  const totalWidth = side + 32
  const totalHeight = bottom + 8

  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, SHED_INK, 0.3)
  const roofSide = mixHex(secondary, SHED_INK, 0.28)
  const stone = SHED_LIMESTONE
  const stoneShadow = mixHex(stone, SHED_INK, 0.18)
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.58)
  const gold = mixHex(SHED_GOLD, secondary, 0.12)

  const { cols, rows } = towerLights(element)
  const doorH = Math.min(58, bodyHeight * 0.28)
  const usableTop = shaftTop + (rows > 1 ? 22 : 14)
  const usableBottom = shaftBottom - doorH - 12
  const band = Math.max(28, usableBottom - usableTop)
  let windowW = Math.min(cols === 1 ? 20 : 14, width * (cols === 1 ? 0.2 : 0.12))
  let windowH = Math.min(windowW * 2.8, band / (rows + 0.4))
  windowW = Math.min(windowW, Math.max(8, windowH * 0.4))
  const windows: TowerBox[] = []
  const lightGap = cols === 2 ? Math.max(3.5, windowW * 0.35) : 0
  const groupW = cols * windowW + (cols - 1) * lightGap
  const groupX = cx - groupW / 2
  const gapY = (band - rows * windowH) / (rows + 1)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      windows.push({
        x: groupX + col * (windowW + lightGap),
        y: usableTop + gapY + row * (windowH + gapY),
        w: windowW,
        h: windowH,
      })
    }
  }

  const parts: TowerPart[] = []
  const push = (part: TowerPart | null) => {
    if (part) parts.push(part)
  }

  parts.push({
    id: 'shadow',
    d: `M${n(left + 8)} ${n(bottom - 1)} C${n(left + 10)} ${n(bottom + 9)} ${n(side - 6)} ${n(bottom + 11)} ${n(side - 4)} ${n(bottom - 1)} Z`,
    fill: SHED_INK,
    fillOpacity: 0.1,
    pointerEvents: 'none',
  })

  push(
    solid(
      'base-side',
      poly(
        [
          [right - 1, shaftBottom],
          [side, shaftBottom - rise],
          [side, bottom - rise * 0.35],
          [right - 1, bottom],
        ],
        3,
        0.7,
      ),
      mixHex(stone, SHED_INK, 0.28),
      { weight: 0.9, salt: 3 },
    ),
  )
  push(
    solid(
      'body-side',
      poly(
        [
          [right - 1, eaveY + 2],
          [side, eaveY - rise + 2],
          [side, shaftBottom - rise],
          [right - 1, shaftBottom],
        ],
        4,
        1.1,
      ),
      sideFill,
      { weight: 1.05, salt: 4 },
    ),
  )

  const inset = width * 0.2
  const helmetLeft = left + inset
  const helmetRight = right - inset
  const helmet = helmetStudy(helmetLeft, helmetRight, eaveY, apexY, profile)
  const pinnacleH = Math.max(34, roofHeight * 0.46)
  const pinnacleW = Math.max(11, Math.min(16, width * 0.11))
  const sideApex: [number, number] = [helmet.apex[0] + depth * 0.14, apexY + 7]
  const sideNeck: [number, number] = [helmet.rightNeck[0] + depth * 0.22, helmet.neckY - rise * 0.3]
  const sideEave: [number, number] = [helmetRight + depth * 0.62, eaveY - rise * 0.65]
  push(
    solid(
      'roof-side',
      poly(
        [
          [helmetRight, eaveY],
          sideEave,
          sideNeck,
          sideApex,
          [helmet.apex[0] + 1, helmet.apex[1] + 4],
          [helmet.rightNeck[0], helmet.rightNeck[1]],
        ],
        5,
        0.6,
      ),
      roofSide,
      { weight: 1, salt: 5 },
    ),
  )
  parts.push(
    ...pinnacleParts('pinnacle-side', right + depth * 0.34, eaveY - rise * 0.2, pinnacleH * 0.82, pinnacleW * 0.82, sideFill, roofSide, gold),
  )

  push(
    solid(
      'base-front',
      poly(
        [
          [left - 12, shaftBottom + 5],
          [right + 10, shaftBottom + 5],
          [right + 12, bottom],
          [left - 14, bottom],
        ],
        6,
        1.15,
      ),
      stoneShadow,
      { weight: 1.05, salt: 6 },
    ),
  )
  push(
    solid(
      'base-cap',
      poly(
        [
          [left - 6, shaftBottom - 2],
          [right + 6, shaftBottom - 2],
          [right + 8, shaftBottom + 8],
          [left - 8, shaftBottom + 8],
        ],
        7,
        0.8,
      ),
      stone,
      { weight: 0.85, salt: 7 },
    ),
  )
  push(
    solid('body-front', facade(left, shaftTop, width, bodyHeight, 8, 1.15), primary, {
      weight: 1.45,
      fillOpacity: 0.95,
      salt: 8,
    }),
  )

  const courseCount = 4 + Math.round(element.height * 4)
  const courseLines: string[] = []
  for (let index = 1; index <= courseCount; index += 1) {
    const y = shaftTop + ((shaftBottom - shaftTop) * index) / (courseCount + 1)
    courseLines.push(`M${n(left + 8)} ${n(y)} L${n(right - 8)} ${n(y)}`)
  }
  push(hairline('courses', courseLines.join(' '), 0.5))
  push(
    solid(
      'quoin-left',
      poly(
        [
          [left - 1, shaftTop],
          [left + 7, shaftTop + 1],
          [left + 7, shaftBottom],
          [left - 1, shaftBottom],
        ],
        9,
        0.5,
      ),
      stone,
      { weight: 0.7, salt: 9 },
    ),
  )
  push(
    solid(
      'quoin-right',
      poly(
        [
          [right - 7, shaftTop + 1],
          [right + 1, shaftTop],
          [right + 1, shaftBottom],
          [right - 7, shaftBottom],
        ],
        10,
        0.5,
      ),
      stone,
      { weight: 0.7, salt: 10 },
    ),
  )

  for (let row = 0; row < rows - 1; row += 1) {
    const upper = windows[row * cols]
    const lower = windows[(row + 1) * cols]
    if (!upper || !lower) continue
    const bandY = upper.y + upper.h + (lower.y - (upper.y + upper.h)) * 0.5 - 3.5
    push(
      solid(
        `string-course-${row}`,
        poly(
          [
            [left - 3, bandY],
            [right + 3, bandY],
            [right + 3, bandY + 7],
            [left - 3, bandY + 7],
          ],
          12 + row,
          0.4,
        ),
        stone,
        { weight: 0.7, salt: 12 + row },
      ),
    )
  }

  push(
    solid(
      'gallery',
      poly(
        [
          [left - 8, eaveY],
          [right + 8, eaveY],
          [right + 6, galleryBottom],
          [left - 6, galleryBottom],
        ],
        13,
        0.7,
      ),
      stone,
      { weight: 0.9, salt: 13 },
    ),
  )
  const bays = Math.max(4, Math.min(5, Math.round(width / 32)))
  const bayW = Math.min(11, (width - 18) / (bays * 1.55))
  const bayGap = (width - 18 - bays * bayW) / (bays + 1)
  for (let index = 0; index < bays; index += 1) {
    const x = left + 9 + bayGap + index * (bayW + bayGap)
    push(opening(`gallery-bay-${index}`, lancet(x, eaveY + 8, bayW, 14), glass))
  }

  const doorW = Math.min(32, width * 0.3)
  push(solid('door-frame', lancet(cx - doorW / 2 - 4, shaftBottom - doorH - 8, doorW + 8, doorH + 8), stone, { weight: 0.75, salt: 14 }))
  push(opening('door', lancet(cx - doorW / 2, shaftBottom - doorH, doorW, doorH), glass))
  push(
    solid(
      'threshold',
      poly(
        [
          [cx - doorW / 2 - 6, shaftBottom - 2],
          [cx + doorW / 2 + 6, shaftBottom - 2],
          [cx + doorW / 2 + 7, shaftBottom + 4],
          [cx - doorW / 2 - 7, shaftBottom + 4],
        ],
        15,
        0.3,
      ),
      stone,
      { weight: 0.6, salt: 15 },
    ),
  )

  for (let row = 0; row < rows; row += 1) {
    const rowWindows = windows.filter((_, index) => Math.floor(index / cols) === row)
    const first = rowWindows[0]
    const last = rowWindows[rowWindows.length - 1]
    if (first && last && cols === 2) {
      const hoodX = first.x - 5
      const hoodW = last.x + last.w - first.x + 10
      push(solid(`hood-${row}`, lancet(hoodX, first.y - 8, hoodW, first.h + 8), stone, { weight: 0.7, salt: 20 + row }))
    }
    rowWindows.forEach((window, col) => {
      const index = row * cols + col
      push(solid(`window-frame-${index}`, lancet(window.x - 3, window.y - 3, window.w + 6, window.h + 3), stone, { weight: 0.65, salt: 30 + index }))
      push(opening(`window-${index}`, lancet(window.x, window.y, window.w, window.h), glass))
      if (window.w >= 16) {
        push(
          hairline(
            `mullion-${index}`,
            `M${n(window.x + window.w / 2)} ${n(window.y + window.h * 0.34)} L${n(window.x + window.w / 2)} ${n(window.y + window.h)}`,
            0.7,
          ),
        )
      }
    })
  }

  const slitX = right + depth * 0.34
  const slitY = shaftTop + bodyHeight * 0.38
  push(opening('side-slit', lancet(slitX, slitY, 6.5, 26), glass))

  push(
    solid(
      'cornice',
      poly(
        [
          [left - 10, eaveY - 3],
          [right + 8, eaveY - 3],
          [right + 6, eaveY + 5],
          [left - 8, eaveY + 5],
        ],
        18,
        0.45,
      ),
      stone,
      { weight: 0.8, salt: 18 },
    ),
  )
  push(solid('roof-front', helmet.d, secondary, { weight: 1.45, fillOpacity: 0.96, salt: 17 }))
  push(hairline('helmet-arris', `M${n(cx)} ${n(helmet.neckY)} L${n(cx)} ${n(apexY + 3)}`, 0.62))
  parts.push({
    id: 'helmet-ring',
    d: `M${n(helmet.leftNeck[0])} ${n(helmet.leftNeck[1])} L${n(helmet.rightNeck[0])} ${n(helmet.rightNeck[1])}`,
    fill: 'none',
    stroke: gold,
    strokeWidth: 1.6,
    pointerEvents: 'none',
  })

  if (profile === 'taller') {
    ;[0.34, 0.58, 0.8].forEach((t, index) => {
      const leftPoint = pointOnCubic(helmet.leftUpper.from, helmet.leftUpper.c1, helmet.leftUpper.c2, helmet.leftUpper.to, t)
      const rightPoint = pointOnCubic(helmet.rightUpper.to, helmet.rightUpper.c2, helmet.rightUpper.c1, helmet.rightUpper.from, t)
      push(solid(`crocket-l-${index}`, crocket(leftPoint[0], leftPoint[1], -1, 40 + index), SHED_INK, { weight: 0.45, fillOpacity: 0.9, salt: 40 + index }))
      push(solid(`crocket-r-${index}`, crocket(rightPoint[0], rightPoint[1], 1, 50 + index), SHED_INK, { weight: 0.45, fillOpacity: 0.9, salt: 50 + index }))
    })
  } else {
    push(accent('lantern', poly([[cx - 7, apexY + 16], [cx + 7, apexY + 16], [cx + 5, apexY + 4], [cx - 5, apexY + 4]], 19, 0.3), gold))
  }

  parts.push(...pinnacleParts('pinnacle-left', left + pinnacleW * 0.55, eaveY + 1, pinnacleH, pinnacleW, primary, secondary, gold))
  parts.push(...pinnacleParts('pinnacle-right', right - pinnacleW * 0.55, eaveY + 1, pinnacleH, pinnacleW, primary, secondary, gold))

  const ornament = ornamentPath(element.ornament, cx, apexY + 2)
  if (ornament) push(accent(`ornament-${element.ornament}`, ornament, gold))

  push(
    construction(
      'construction',
      [
        `M${n(cx)} ${n(6)} L${n(cx)} ${n(bottom + 3)}`,
        `M${n(left - 20)} ${n(eaveY)} L${n(side + 12)} ${n(eaveY)}`,
        `M${n(left - 16)} ${n(bottom)} L${n(side + 8)} ${n(bottom)}`,
      ].join(' '),
    ),
  )

  return {
    width: totalWidth,
    height: totalHeight,
    anchorX: cx,
    anchorY: bottom,
    body: { x: left, y: shaftTop, w: width, h: bodyHeight },
    roofHeight,
    depth,
    primary,
    secondary,
    side: sideFill,
    windows,
    parts,
    ornament: element.ornament,
  }
}

function pinnacleParts(
  id: string,
  cx: number,
  baseY: number,
  h: number,
  w: number,
  brick: string,
  roof: string,
  gold: string,
): TowerPart[] {
  const shaftH = h * 0.58
  const left = cx - w / 2
  const shaftTop = baseY - shaftH
  const apex = baseY - h
  const salt = id.length * 5
  return [
    solid(
      `${id}-shaft`,
      poly(
        [
          [left, shaftTop],
          [left + w, shaftTop],
          [left + w, baseY],
          [left, baseY],
        ],
        salt,
        0.45,
      ),
      brick,
      { weight: 0.7, salt },
    ),
    solid(
      `${id}-cap`,
      poly(
        [
          [left - 2, shaftTop + 1],
          [cx, apex],
          [left + w + 2, shaftTop + 1],
        ],
        salt + 2,
        0.35,
      ),
      roof,
      { weight: 0.65, salt: salt + 2 },
    ),
    accent(`${id}-tip`, disk(cx, apex - 1.2, 1.8), gold),
  ]
}

function countBetween(value: number | undefined, min: number, max: number): number {
  return min + Math.round((max - min) * clampUnit(value ?? 0.5))
}

function roundArch(x: number, y: number, w: number, h: number): string {
  const radius = Math.max(4, w / 2)
  const arch = Math.min(Math.max(8, h * 0.48), radius)
  const spring = y + arch
  return [
    `M${n(x)} ${n(y + h)}`,
    `L${n(x)} ${n(spring)}`,
    `A${n(radius)} ${n(arch)} 0 0 1 ${n(x + w)} ${n(spring)}`,
    `L${n(x + w)} ${n(y + h)}`,
    'Z',
  ].join(' ')
}

function brickCourses(left: number, top: number, width: number, height: number, rows: number): string {
  const lines: string[] = []
  const count = Math.max(2, rows)
  for (let index = 1; index <= count; index += 1) {
    const y = top + (height * index) / (count + 1)
    lines.push(`M${n(left + 6)} ${n(y)} L${n(left + width - 6)} ${n(y)}`)
  }
  return lines.join(' ')
}

function finish(
  element: ArchitecturalElement,
  box: {
    width: number
    height: number
    anchorX: number
    anchorY: number
    body: TowerBox
    roofHeight: number
    depth: number
    side: string
    windows?: TowerBox[]
  },
  parts: TowerPart[],
): TowerGraphic {
  return {
    width: box.width,
    height: box.height,
    anchorX: box.anchorX,
    anchorY: box.anchorY,
    body: box.body,
    roofHeight: box.roofHeight,
    depth: box.depth,
    primary: element.primary,
    secondary: element.secondary,
    side: box.side,
    windows: box.windows ?? [],
    parts: parts.filter((part) => part.d.length > 0),
    ornament: element.ornament,
  }
}

/** Wawel castle tower: brick shaft, stone cornice, low hip roof. No needle spire. */
function buildWawelTower(element: ArchitecturalElement): TowerGraphic {
  const width = lerp(96, 188, element.width) * proportionScale(element)
  const bodyHeight = lerp(120, 260, element.height)
  const roofHeight = bodyHeight * lerp(0.22, 0.42, element.roof)
  const depth = width * 0.28
  const rise = depth * 0.3
  const left = 28
  const right = left + width
  const side = right + depth
  const cx = (left + right) / 2
  const bottom = 16 + roofHeight + bodyHeight + 22
  const shaftBottom = bottom - 18
  const shaftTop = shaftBottom - bodyHeight
  const eaveY = shaftTop
  const apexY = eaveY - roofHeight
  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, SHED_INK, 0.3)
  const roofSide = mixHex(secondary, SHED_INK, 0.28)
  const stone = SHED_LIMESTONE
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.55)
  const { cols, rows } = towerLights(element)
  const windowW = Math.min(16, width * 0.12)
  const windowH = Math.min(28, bodyHeight * 0.16)
  const windows: TowerBox[] = []
  const groupW = cols * windowW + (cols - 1) * 6
  const groupX = cx - groupW / 2
  const gapY = (bodyHeight * 0.62 - rows * windowH) / (rows + 1)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      windows.push({
        x: groupX + col * (windowW + 6),
        y: shaftTop + 18 + gapY + row * (windowH + gapY),
        w: windowW,
        h: windowH,
      })
    }
  }
  const parts: TowerPart[] = [
    solid(
      'body-side',
      poly(
        [
          [right, eaveY],
          [side, eaveY - rise],
          [side, shaftBottom - rise],
          [right, shaftBottom],
        ],
        2,
        0.8,
      ),
      sideFill,
      { salt: 2 },
    ),
    solid('body-front', facade(left, shaftTop, width, bodyHeight, 3, 1), primary, { weight: 1.35, salt: 3 }),
    solid(
      'cornice',
      poly(
        [
          [left - 10, eaveY - 2],
          [right + 8, eaveY - 2],
          [right + 10, eaveY + 10],
          [left - 12, eaveY + 10],
        ],
        4,
        0.45,
      ),
      stone,
      { salt: 4 },
    ),
    solid(
      'roof-side',
      poly(
        [
          [right, eaveY],
          [side - 4, eaveY - rise],
          [cx + depth * 0.2, apexY + roofHeight * 0.35],
          [cx + width * 0.08, eaveY - 4],
        ],
        5,
        0.5,
      ),
      roofSide,
      { salt: 5 },
    ),
    solid(
      'roof-front',
      poly(
        [
          [left + 4, eaveY - 2],
          [right - 4, eaveY - 2],
          [right - width * 0.18, apexY + roofHeight * 0.28],
          [cx, apexY],
          [left + width * 0.18, apexY + roofHeight * 0.28],
        ],
        6,
        0.55,
      ),
      secondary,
      { weight: 1.3, salt: 6 },
    ),
    hairline('courses', brickCourses(left, shaftTop, width, bodyHeight, 4 + Math.round(element.height * 3))),
    construction('construction', `M${n(cx)} ${n(apexY - 8)} L${n(cx)} ${n(bottom)}`),
  ]
  windows.forEach((window, index) => {
    parts.push(opening(`window-${index}`, lancet(window.x, window.y, window.w, window.h), glass))
  })
  const ornament = ornamentPath(element.ornament, cx, apexY + 2)
  if (ornament) parts.push(accent(`ornament-${element.ornament}`, ornament))
  return finish(
    element,
    {
      width: side + 24,
      height: bottom + 8,
      anchorX: cx,
      anchorY: bottom,
      body: { x: left, y: shaftTop, w: width, h: bodyHeight },
      roofHeight,
      depth,
      side: sideFill,
      windows,
    },
    parts,
  )
}

/** Brick defensive tower in the manner of the Florian Gate and the Barbican. */
function buildDefensiveTower(element: ArchitecturalElement): TowerGraphic {
  const width = lerp(88, 170, element.width) * proportionScale(element)
  const bodyHeight = lerp(140, 300, element.height)
  const merlons = countBetween(element.params?.crenellation, 4, 8)
  const roofHeight = 28
  const depth = width * 0.22
  const left = 24
  const right = left + width
  const cx = (left + right) / 2
  const bottom = bodyHeight + roofHeight + 20
  const shaftTop = bottom - bodyHeight
  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, SHED_INK, 0.32)
  const stone = SHED_LIMESTONE
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.62)
  const { rows } = towerLights(element)
  const windows: TowerBox[] = []
  for (let row = 0; row < rows; row += 1) {
    windows.push({ x: cx - 5, y: shaftTop + 24 + row * (bodyHeight * 0.22), w: 10, h: 28 })
  }
  const parts: TowerPart[] = [
    solid(
      'body-side',
      poly(
        [
          [right, shaftTop],
          [right + depth, shaftTop - 8],
          [right + depth, bottom - 10],
          [right, bottom],
        ],
        2,
        0.7,
      ),
      sideFill,
      { salt: 2 },
    ),
    solid('body-front', facade(left, shaftTop, width, bodyHeight, 3, 1), primary, { weight: 1.35, salt: 3 }),
    solid('roof-front', poly([[left - 4, shaftTop + 6], [right + 4, shaftTop + 6], [right + 2, shaftTop - 4], [left - 2, shaftTop - 4]], 4, 0.4), secondary, { salt: 4 }),
    hairline('courses', brickCourses(left, shaftTop, width, bodyHeight, 5)),
    opening('door', lancet(cx - 16, bottom - 58, 32, 52), glass),
    construction('construction', `M${n(cx)} ${n(shaftTop - 24)} L${n(cx)} ${n(bottom)}`),
  ]
  const gap = width / merlons
  for (let index = 0; index < merlons; index += 1) {
    const mx = left + gap * index + 2
    const mw = Math.max(8, gap * 0.62)
    parts.push(
      solid(`merlon-${index}`, poly([[mx, shaftTop - 2], [mx + mw, shaftTop - 2], [mx + mw, shaftTop - 22], [mx, shaftTop - 22]], 10 + index, 0.35), primary, {
        salt: 10 + index,
      }),
    )
  }
  windows.forEach((window, index) => {
    parts.push(opening(`window-${index}`, lancet(window.x, window.y, window.w, window.h), glass))
  })
  parts.push(solid('quoin-left', poly([[left - 2, shaftTop], [left + 6, shaftTop], [left + 6, bottom - 8], [left - 2, bottom - 8]], 8, 0.3), stone, { salt: 8 }))
  return finish(
    element,
    {
      width: right + depth + 20,
      height: bottom + 8,
      anchorX: cx,
      anchorY: bottom,
      body: { x: left, y: shaftTop, w: width, h: bodyHeight },
      roofHeight,
      depth,
      side: sideFill,
      windows,
    },
    parts,
  )
}

export function buildTower(element: ArchitecturalElement): TowerGraphic {
  if (element.variant === 2) return buildWawelTower(element)
  if (element.variant >= 3) return buildDefensiveTower(element)
  return buildMariackiTower(element)
}

export function buildFacade(element: ArchitecturalElement): TowerGraphic {
  const variant = element.variant
  const floors = countBetween(element.params?.floors, 2, 5)
  const cols = countBetween(element.params?.windows, variant === 1 ? 2 : 1, variant === 2 ? 6 : 4)
  const entrance = countBetween(element.params?.entrance, 0, 2)
  const gableKind = countBetween(element.params?.gable, 0, 2)
  const width = lerp(variant === 2 ? 220 : 118, variant === 2 ? 460 : 250, element.width)
  const bodyHeight = lerp(150, 300, element.height)
  const depth = width * 0.14
  const gableHeight = variant === 2 ? 16 : bodyHeight * 0.22
  const left = 16
  const bottom = bodyHeight + gableHeight + 24
  const bodyTop = bottom - 14 - bodyHeight
  const cx = left + width / 2
  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, SHED_INK, 0.28)
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.55)
  const parts: TowerPart[] = [
    solid(
      'body-side',
      poly(
        [
          [left + width, bodyTop],
          [left + width + depth, bodyTop - 8],
          [left + width + depth, bottom - 12],
          [left + width, bottom],
        ],
        2,
        0.7,
      ),
      sideFill,
      { salt: 2 },
    ),
    solid('body-front', facade(left, bodyTop, width, bodyHeight, 3, 1.05), primary, { weight: 1.35, salt: 3 }),
    hairline('courses', brickCourses(left, bodyTop, width, bodyHeight, floors + 2)),
  ]
  const floorH = bodyHeight / (floors + 0.4)
  const windows: TowerBox[] = []
  for (let floor = 0; floor < floors; floor += 1) {
    const winH = Math.max(14, floorH * 0.46)
    const winW = Math.max(8, (width / (cols + 1)) * 0.38)
    for (let col = 0; col < cols; col += 1) {
      const x = left + (width / (cols + 1)) * (col + 1) - winW / 2
      const y = bodyTop + floorH * (floor + 0.42)
      windows.push({ x, y, w: winW, h: winH })
      const openingPath = variant === 0 ? lancet(x, y, winW, winH) : roundArch(x, y, winW, winH * 0.86)
      parts.push(opening(`window-${floor}-${col}`, openingPath, glass))
    }
  }
  const doorW = Math.min(width * 0.26, variant === 2 ? 52 : 34)
  const doorH = Math.min(bodyHeight * 0.26, 62)
  const doorX = cx - doorW / 2
  const doorY = bottom - 14 - doorH
  const door =
    entrance === 1 ? poly([[doorX, doorY + doorH], [doorX + doorW, doorY + doorH], [doorX + doorW, doorY], [doorX, doorY]], 9, 0.3) : entrance === 2 ? roundArch(doorX, doorY, doorW, doorH) : lancet(doorX, doorY, doorW, doorH)
  parts.push(opening('door', door, glass))
  if (variant === 0) parts.push(opening('rose', disk(cx, bodyTop + bodyHeight * 0.14, Math.min(16, width * 0.07)), secondary))
  if (variant === 2) {
    const bays = Math.max(3, cols)
    const bay = width / bays
    for (let index = 0; index < bays; index += 1) {
      const x = left + bay * index + bay * 0.16
      parts.push(opening(`arch-front-${index}`, roundArch(x, bottom - 14 - bodyHeight * 0.36, bay * 0.68, bodyHeight * 0.32), glass))
    }
    parts.push(solid('cornice', poly([[left - 6, bodyTop + 2], [left + width + 6, bodyTop + 2], [left + width + 4, bodyTop + 10], [left - 4, bodyTop + 10]], 6, 0.35), secondary, { salt: 6 }))
  } else {
    parts.push(solid('gable', gablePath(left, left + width, bodyTop, gableHeight, gableKind, cx), secondary, { weight: 1.15, salt: 7 }))
  }
  parts.push(construction('construction', `M${n(cx)} ${n(bodyTop - gableHeight)} L${n(cx)} ${n(bottom)}`))
  return finish(
    element,
    {
      width: left + width + depth + 16,
      height: bottom + 10,
      anchorX: cx,
      anchorY: bottom,
      body: { x: left, y: bodyTop, w: width, h: bodyHeight },
      roofHeight: gableHeight,
      depth,
      side: sideFill,
      windows,
    },
    parts,
  )
}

function gablePath(left: number, right: number, bodyTop: number, gableHeight: number, kind: number, cx: number): string {
  const width = right - left
  if (kind === 1) {
    const steps = 4
    const stepW = width / (steps * 2)
    const stepH = gableHeight / steps
    const points: Array<[number, number]> = [[left, bodyTop]]
    for (let index = 0; index < steps; index += 1) {
      const inset = stepW * (index + 1)
      const y = bodyTop - stepH * index
      points.push([left + inset, y], [left + inset, y - stepH])
    }
    points.push([cx, bodyTop - gableHeight])
    for (let index = steps - 1; index >= 0; index -= 1) {
      const inset = stepW * (index + 1)
      const y = bodyTop - stepH * index
      points.push([right - inset, y - stepH], [right - inset, y])
    }
    points.push([right, bodyTop])
    return poly(points, 8, 0.4)
  }
  if (kind === 2) return poly([[left, bodyTop], [cx, bodyTop - gableHeight], [right, bodyTop]], 8, 0.45)
  return `M${n(left)} ${n(bodyTop)} Q${n(left + width * 0.2)} ${n(bodyTop - gableHeight)} ${n(cx)} ${n(bodyTop - gableHeight * 0.9)} Q${n(right - width * 0.2)} ${n(bodyTop - gableHeight)} ${n(right)} ${n(bodyTop)} Z`
}

export function buildRoof(element: ArchitecturalElement): TowerGraphic {
  const width = lerp(170, 420, element.width)
  const rise = lerp(56, 188, element.height) * lerp(0.55, 1, clampUnit(element.params?.pitch ?? 0.66))
  const depth = width * 0.26
  const kind = element.variant === 1 ? 1 : element.variant === 2 ? 2 : countBetween(element.params?.roofline, 0, 2)
  const left = 20
  const right = left + width
  const bottom = rise + 28
  const eaves = bottom - 8
  const ridgeY = eaves - rise
  const cx = (left + right) / 2
  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, SHED_INK, 0.3)
  const front =
    kind === 1
      ? poly(
          [
            [left, eaves],
            [right, eaves],
            [right - width * 0.16, ridgeY + rise * 0.24],
            [left + width * 0.16, ridgeY + rise * 0.24],
          ],
          3,
          0.6,
        )
      : kind === 2
        ? poly(
            [
              [left, eaves],
              [right, eaves],
              [right - 10, eaves - rise * 0.42],
              [cx, ridgeY],
              [left + 10, eaves - rise * 0.42],
            ],
            4,
            0.55,
          )
        : poly(
            [
              [left - 4, eaves],
              [right + 4, eaves],
              [cx, ridgeY],
            ],
            5,
            0.5,
          )
  const parts: TowerPart[] = [
    solid(
      'roof-side',
      poly(
        [
          [right, eaves],
          [right + depth * 0.8, eaves - 12],
          [cx + depth * 0.35, ridgeY + 10],
          [cx, eaves - rise * 0.12],
        ],
        2,
        0.6,
      ),
      sideFill,
      { salt: 2 },
    ),
    solid('roof-front', front, primary, { weight: 1.35, salt: 6 }),
    solid('eave', poly([[left - 8, eaves - 3], [right + 8, eaves - 3], [right + 6, eaves + 6], [left - 6, eaves + 6]], 7, 0.35), secondary, { salt: 7 }),
    construction('construction', `M${n(cx)} ${n(ridgeY - 6)} L${n(cx)} ${n(bottom)}`),
  ]
  const finials = countBetween(element.params?.ridge, 1, 5)
  for (let index = 0; index < finials; index += 1) {
    const fx = left + (width / (finials + 1)) * (index + 1)
    const fy = ridgeY + rise * (kind === 1 ? 0.3 : 0.12)
    parts.push(accent(`ridge-${index}`, poly([[fx - 3, fy + 12], [fx + 3, fy + 12], [fx, fy - 8]], 12 + index, 0.25)))
  }
  return finish(
    element,
    {
      width: right + depth + 16,
      height: bottom + 10,
      anchorX: cx,
      anchorY: bottom,
      body: { x: left, y: ridgeY, w: width, h: rise },
      roofHeight: rise,
      depth,
      side: sideFill,
    },
    parts,
  )
}

export function buildArcade(element: ArchitecturalElement): TowerGraphic {
  const arches = countBetween(element.params?.arches, 2, 7)
  const stories = element.variant === 1 ? 2 : 1
  const width = lerp(190, 520, element.width)
  const storyH = lerp(72, 148, element.height)
  const height = storyH * stories
  const depth = Math.max(16, width * 0.08)
  const column = clampUnit(element.params?.column ?? 0.38)
  const colW = lerp(8, Math.max(12, (width / arches) * 0.32), column)
  const archRise = lerp(0.42, 0.82, clampUnit(element.params?.archHeight ?? 0.62))
  const left = 14
  const bottom = height + 20
  const top = bottom - height
  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, SHED_INK, 0.24)
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.5)
  const parts: TowerPart[] = [
    solid('body-front', facade(left, top, width, height, 2, 0.8), primary, { weight: 1.25, salt: 2 }),
    solid(
      'body-side',
      poly(
        [
          [left + width, top],
          [left + width + depth, top - 4],
          [left + width + depth, bottom - 8],
          [left + width, bottom],
        ],
        3,
        0.45,
      ),
      sideFill,
      { salt: 3 },
    ),
  ]
  for (let story = 0; story < stories; story += 1) {
    const rowTop = top + storyH * story + 8
    const rowH = storyH - 16
    const bay = width / arches
    for (let index = 0; index < arches; index += 1) {
      const x = left + bay * index + colW * 0.4
      const aw = Math.max(10, bay - colW)
      const ah = Math.max(16, rowH * archRise)
      const openingPath = element.variant === 2 ? lancet(x, rowTop + rowH - ah, aw, ah) : roundArch(x, rowTop + rowH - ah, aw, ah)
      parts.push(opening(`arch-front-${story}-${index}`, openingPath, glass))
      parts.push(
        solid(`capital-${story}-${index}`, poly([[x - 2, rowTop + rowH - ah - 3], [x + aw + 2, rowTop + rowH - ah - 3], [x + aw + 1, rowTop + rowH - ah + 2], [x - 1, rowTop + rowH - ah + 2]], 20 + index, 0.2), secondary, {
          weight: 0.6,
          salt: 20 + index,
        }),
      )
    }
  }
  if (stories === 2) {
    parts.push(solid('balustrade', poly([[left, top + storyH - 4], [left + width, top + storyH - 4], [left + width, top + storyH + 4], [left, top + storyH + 4]], 8, 0.3), secondary, { salt: 8 }))
  }
  parts.push(construction('construction', `M${n(left - 4)} ${n(top + height / 2)} L${n(left + width + 8)} ${n(top + height / 2)}`))
  return finish(
    element,
    {
      width: left + width + depth + 12,
      height: bottom + 8,
      anchorX: left + width / 2,
      anchorY: bottom,
      body: { x: left, y: top, w: width, h: height },
      roofHeight: 8,
      depth,
      side: sideFill,
    },
    parts,
  )
}

export function buildGate(element: ArchitecturalElement): TowerGraphic {
  if (element.variant >= 2) return buildPortal(element)
  const wide = element.variant === 1
  const width = lerp(wide ? 180 : 124, wide ? 340 : 230, element.width)
  const bodyHeight = lerp(wide ? 120 : 168, wide ? 230 : 310, element.height)
  const depth = width * (wide ? 0.1 : 0.18)
  const left = 18
  const bottom = bodyHeight + 28
  const bodyTop = bottom - bodyHeight
  const cx = left + width / 2
  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, SHED_INK, 0.3)
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.58)
  const passageW = lerp(width * 0.28, width * 0.58, clampUnit(element.params?.passage ?? 0.62))
  const passageH = bodyHeight * (wide ? 0.48 : 0.4)
  const passage = wide
    ? roundArch(cx - passageW / 2, bottom - 14 - passageH, passageW, passageH)
    : lancet(cx - passageW / 2, bottom - 14 - passageH, passageW, passageH)
  const parts: TowerPart[] = [
    solid('body-front', wide ? roundArch(left, bodyTop + 8, width, bodyHeight) : facade(left, bodyTop, width, bodyHeight, 3, 1), primary, { weight: 1.35, salt: 3 }),
    solid(
      'body-side',
      poly(
        [
          [left + width, bodyTop],
          [left + width + depth, bodyTop - 6],
          [left + width + depth, bottom - 8],
          [left + width, bottom],
        ],
        2,
        0.55,
      ),
      sideFill,
      { salt: 2 },
    ),
    opening('door', passage, glass),
    hairline('courses', brickCourses(left, bodyTop, width, bodyHeight, 4)),
    construction('construction', `M${n(cx)} ${n(bodyTop - 20)} L${n(cx)} ${n(bottom)}`),
  ]
  if (!wide) parts.push(opening('niche', lancet(cx - 12, bodyTop + bodyHeight * 0.16, 24, 46), secondary))
  const merlons = countBetween(element.params?.crenellation, wide ? 6 : 4, wide ? 11 : 8)
  const gap = width / merlons
  for (let index = 0; index < merlons; index += 1) {
    const mx = left + gap * index + 2
    const mw = Math.max(8, gap * 0.55)
    parts.push(solid(`merlon-${index}`, poly([[mx, bodyTop - 2], [mx + mw, bodyTop - 2], [mx + mw, bodyTop - 18], [mx, bodyTop - 18]], 12 + index, 0.3), primary, { salt: 12 + index }))
  }
  parts.push(solid('roof-front', poly([[left, bodyTop + 2], [left + width, bodyTop + 2], [left + width - 2, bodyTop - 6], [left + 2, bodyTop - 6]], 6, 0.3), secondary, { salt: 6 }))
  return finish(
    element,
    {
      width: left + width + depth + 14,
      height: bottom + 12,
      anchorX: cx,
      anchorY: bottom,
      body: { x: left, y: bodyTop, w: width, h: bodyHeight },
      roofHeight: 20,
      depth,
      side: sideFill,
    },
    parts,
  )
}

function buildPortal(element: ArchitecturalElement): TowerGraphic {
  const width = lerp(78, 160, element.width)
  const height = lerp(120, 220, element.height)
  const left = 16
  const bottom = height + 16
  const top = bottom - height
  const cx = left + width / 2
  const openingW = lerp(width * 0.42, width * 0.7, clampUnit(element.params?.passage ?? 0.62))
  const primary = element.primary
  const secondary = element.secondary
  const parts: TowerPart[] = [
    solid('body-front', facade(left, top, width, height, 2, 0.7), primary, { weight: 1.3, salt: 2 }),
    opening('door', lancet(cx - openingW / 2, top + 18, openingW, height * 0.7), mixHex(SHED_BLUE, SHED_INK, 0.55)),
    solid('jamb-left', poly([[cx - openingW / 2 - 8, top + 18], [cx - openingW / 2, top + 18], [cx - openingW / 2, bottom - 8], [cx - openingW / 2 - 8, bottom - 8]], 4, 0.25), secondary, { salt: 4 }),
    solid('jamb-right', poly([[cx + openingW / 2, top + 18], [cx + openingW / 2 + 8, top + 18], [cx + openingW / 2 + 8, bottom - 8], [cx + openingW / 2, bottom - 8]], 5, 0.25), secondary, { salt: 5 }),
    solid('pediment', poly([[left + 8, top + 16], [cx, top - 4], [left + width - 8, top + 16]], 6, 0.35), SHED_LIMESTONE, { salt: 6 }),
  ]
  if (clampUnit(element.params?.density ?? 0.55) > 0.4) parts.push(accent('rosette', disk(cx, top + height * 0.2, 6)))
  return finish(
    element,
    {
      width: left + width + 14,
      height: bottom + 8,
      anchorX: cx,
      anchorY: bottom,
      body: { x: left, y: top, w: width, h: height },
      roofHeight: 14,
      depth: 8,
      side: mixHex(primary, SHED_INK, 0.25),
    },
    parts,
  )
}

export function buildAttic(element: ArchitecturalElement): TowerGraphic {
  const bays = countBetween(element.params?.parapet, 3, 8)
  const width = lerp(210, 540, element.width)
  const height = lerp(68, 148, element.height)
  const left = 14
  const bottom = height + 16
  const top = bottom - height
  const bay = width / bays
  const primary = element.primary
  const secondary = element.secondary
  const density = clampUnit(element.params?.density ?? 0.55)
  const parts: TowerPart[] = [
    solid('body-front', facade(left, top, width, height, 2, 0.7), primary, { weight: 1.2, salt: 2 }),
    solid('base-cornice', poly([[left - 4, bottom - 12], [left + width + 4, bottom - 12], [left + width + 2, bottom - 3], [left - 2, bottom - 3]], 3, 0.3), secondary, { salt: 3 }),
  ]
  for (let index = 0; index < bays; index += 1) {
    const x = left + bay * index
    const panelX = x + bay * 0.18
    const panelW = Math.max(8, bay * 0.64)
    const panel = element.variant === 0 ? roundArch(panelX, top + height * 0.28, panelW, height * 0.46) : poly([[panelX, top + height * 0.72], [panelX + panelW, top + height * 0.72], [panelX + panelW, top + height * 0.32], [panelX, top + height * 0.32]], 10 + index, 0.25)
    parts.push(opening(`bay-${index}`, panel, mixHex(primary, SHED_INK, 0.16)))
    if (density > 0.35) parts.push(hairline(`medallion-${index}`, disk(x + bay / 2, top + height * 0.5, Math.min(7, bay * 0.14)), 0.7))
    if (element.variant === 0 && density > 0.2) {
      const vx = x + bay - 4
      parts.push(hairline(`volute-${index}`, `M${n(vx)} ${n(top + height * 0.72)} Q${n(vx + 8)} ${n(top + height * 0.28)} ${n(vx - 2)} ${n(top + 8)}`, 0.7))
      parts.push(accent(`pinnacle-${index}`, poly([[x + bay * 0.5 - 3, top + 8], [x + bay * 0.5 + 3, top + 8], [x + bay * 0.5, top - 8]], 30 + index, 0.2)))
    }
  }
  parts.push(construction('construction', `M${n(left)} ${n(top + height * 0.5)} L${n(left + width)} ${n(top + height * 0.5)}`))
  return finish(
    element,
    {
      width: left + width + 18,
      height: bottom + 12,
      anchorX: left + width / 2,
      anchorY: bottom,
      body: { x: left, y: top, w: width, h: height },
      roofHeight: 12,
      depth: 12,
      side: mixHex(primary, SHED_INK, 0.22),
    },
    parts,
  )
}

export function buildOrnament(element: ArchitecturalElement): TowerGraphic {
  const size = lerp(56, 140, Math.max(element.width, element.height))
  const cx = 16 + size / 2
  const bottom = size + 14
  const primary = element.primary
  const secondary = element.secondary
  const variant = element.variant
  const parts: TowerPart[] = []
  if (variant === 1) {
    const petals = [0, 60, 120, 180, 240, 300]
      .map((degree) => {
        const angle = (degree * Math.PI) / 180
        return disk(cx + Math.cos(angle) * size * 0.22, bottom - size * 0.55 + Math.sin(angle) * size * 0.22, size * 0.11)
      })
      .join(' ')
    parts.push(solid('ornament-rosette', `${disk(cx, bottom - size * 0.55, size * 0.1)} ${petals}`, primary, { salt: 2 }))
    parts.push(hairline('ornament-ink', disk(cx, bottom - size * 0.55, size * 0.34)))
  } else if (variant === 2) {
    parts.push(solid('shaft', poly([[cx - 6, bottom - size * 0.7], [cx + 6, bottom - size * 0.7], [cx + 6, bottom - 8], [cx - 6, bottom - 8]], 3, 0.3), primary, { salt: 3 }))
    parts.push(solid('cap', poly([[cx - 14, bottom - size * 0.7], [cx + 14, bottom - size * 0.7], [cx, bottom - size]], 4, 0.35), secondary, { salt: 4 }))
  } else if (variant === 3) {
    parts.push(solid('medallion', disk(cx, bottom - size * 0.5, size * 0.32), primary, { salt: 5 }))
    parts.push(hairline('medallion-ring', disk(cx, bottom - size * 0.5, size * 0.2)))
  } else {
    parts.push(
      solid(
        'ornament-finial',
        poly(
          [
            [cx, bottom - size],
            [cx + size * 0.1, bottom - size * 0.62],
            [cx + size * 0.04, bottom - size * 0.62],
            [cx + size * 0.04, bottom - 8],
            [cx - size * 0.04, bottom - 8],
            [cx - size * 0.04, bottom - size * 0.62],
            [cx - size * 0.1, bottom - size * 0.62],
          ],
          6,
          0.3,
        ),
        primary,
        { salt: 6 },
      ),
    )
    parts.push(hairline('ornament-ink', disk(cx, bottom - size * 0.72, size * 0.16)))
  }
  parts.push(solid('plinth', poly([[cx - size * 0.22, bottom - 6], [cx + size * 0.22, bottom - 6], [cx + size * 0.26, bottom + 2], [cx - size * 0.26, bottom + 2]], 9, 0.25), SHED_LIMESTONE, { salt: 9 }))
  parts.push(construction('construction', `M${n(cx)} ${n(bottom - size)} L${n(cx)} ${n(bottom)}`))
  return finish(
    element,
    {
      width: 32 + size,
      height: bottom + 6,
      anchorX: cx,
      anchorY: bottom,
      body: { x: 16, y: bottom - size, w: size, h: size },
      roofHeight: size * 0.28,
      depth: 0,
      side: mixHex(primary, SHED_INK, 0.2),
    },
    parts,
  )
}

export function buildElement(element: ArchitecturalElement): TowerGraphic {
  switch (element.type) {
    case 'facade':
      return buildFacade(element)
    case 'roof':
      return buildRoof(element)
    case 'arcade':
      return buildArcade(element)
    case 'gate':
      return buildGate(element)
    case 'attic':
      return buildAttic(element)
    case 'ornament':
      return buildOrnament(element)
    default:
      return buildTower(element)
  }
}
