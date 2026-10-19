import type { ArchitecturalElement, OrnamentId } from './model'
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
function helmetStudy(left: number, right: number, eaveY: number, apexY: number): HelmetStudy {
  const cx = (left + right) / 2
  const half = (right - left) / 2
  const h = eaveY - apexY
  const neckY = eaveY - h * 0.4
  const neckHalf = half * 0.3
  const leftNeck: [number, number] = [cx - neckHalf, neckY]
  const rightNeck: [number, number] = [cx + neckHalf, neckY]
  const apex: [number, number] = [cx, apexY]
  const leftUpper: Cubic = {
    from: leftNeck,
    c1: [cx - neckHalf * 0.42, neckY - h * 0.24],
    c2: [cx - half * 0.045, apexY + h * 0.2],
    to: apex,
  }
  const rightUpper: Cubic = {
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

/**
 * One Kraków tower study, in the manner of the taller tower of St. Mary's Basilica:
 * limestone plinth, brick shaft, pointed openings, gallery, helmet, and corner pinnacles.
 * Height, width, and roof scale those parts. They do not swap in another building.
 */
export function buildTower(element: ArchitecturalElement): TowerGraphic {
  const width = lerp(74, 146, element.width)
  const bodyHeight = lerp(156, 372, element.height)
  const roofHeight = bodyHeight * lerp(0.48, 0.9, element.roof)
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

  const cols = element.width >= 0.55 ? 2 : 1
  const rows = element.height < 0.38 ? 1 : element.height < 0.72 ? 2 : 3
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
  const helmet = helmetStudy(helmetLeft, helmetRight, eaveY, apexY)
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

  ;[0.34, 0.58, 0.8].forEach((t, index) => {
    const leftPoint = pointOnCubic(helmet.leftUpper.from, helmet.leftUpper.c1, helmet.leftUpper.c2, helmet.leftUpper.to, t)
    const rightPoint = pointOnCubic(helmet.rightUpper.to, helmet.rightUpper.c2, helmet.rightUpper.c1, helmet.rightUpper.from, t)
    push(solid(`crocket-l-${index}`, crocket(leftPoint[0], leftPoint[1], -1, 40 + index), SHED_INK, { weight: 0.45, fillOpacity: 0.9, salt: 40 + index }))
    push(solid(`crocket-r-${index}`, crocket(rightPoint[0], rightPoint[1], 1, 50 + index), SHED_INK, { weight: 0.45, fillOpacity: 0.9, salt: 50 + index }))
  })

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
