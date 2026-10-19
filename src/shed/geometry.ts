import type { ArchitecturalElement, ElementParams, OrnamentId } from './model'
import { defaultParams } from './model'
import {
  INK,
  PARCHMENT,
  circle,
  countBetween,
  courses,
  fill,
  hashString,
  hline,
  inkPath,
  lerp,
  mixHex,
  n,
  path,
  pointedArch,
  rect,
  roundArch,
  sideQuad,
  star,
  steps,
  stroke,
  wash,
  type GraphicPart,
} from './ink'

export type TowerBox = {
  x: number
  y: number
  w: number
  h: number
}

export type TowerPart = GraphicPart

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

type Palette = {
  primary: string
  secondary: string
  detail: string
  side: string
  trim: string
  glass: string
  ink: string
  seed: number
}

function paramsOf(element: ArchitecturalElement): ElementParams {
  return { ...defaultParams(), ...element.params }
}

function palette(element: ArchitecturalElement): Palette {
  const primary = element.primary || '#9c2f3c'
  const secondary = element.secondary || '#e0b15a'
  const detail = element.detail || INK
  return {
    primary,
    secondary,
    detail,
    side: mixHex(primary, '#14080c', 0.42),
    trim: mixHex(secondary, PARCHMENT, 0.28),
    glass: mixHex(primary, '#07131c', 0.55),
    ink: mixHex(detail, INK, 0.35),
    seed: hashString(element.id || element.type),
  }
}

function ornamentPath(id: OrnamentId, cx: number, cy: number): string | null {
  if (id === 'none') return null
  if (id === 'finial') {
    return path([
      [cx, cy - 28],
      [cx + 7, cy - 8],
      [cx + 3.5, cy - 8],
      [cx + 3.5, cy + 4],
      [cx - 3.5, cy + 4],
      [cx - 3.5, cy - 8],
      [cx - 7, cy - 8],
    ])
  }
  if (id === 'star') return star(cx, cy - 8, 16)
  const petals = [0, 60, 120, 180, 240, 300]
    .map((degree) => {
      const angle = (degree * Math.PI) / 180
      return circle(cx + Math.cos(angle) * 9, cy - 8 + Math.sin(angle) * 9, 6)
    })
    .join(' ')
  return `${circle(cx, cy - 8, 5)} ${petals}`
}

function graphic(
  element: ArchitecturalElement,
  colors: Palette,
  box: { width: number; height: number; anchorX: number; anchorY: number; body: TowerBox; roofHeight: number; depth: number },
  parts: TowerPart[],
  windows: TowerBox[] = [],
): TowerGraphic {
  return {
    ...box,
    primary: colors.primary,
    secondary: colors.secondary,
    side: colors.side,
    windows,
    parts: parts.filter((part) => part.d.length > 0),
    ornament: element.ornament,
  }
}

function pushOutline(parts: TowerPart[], id: string, points: Array<[number, number]>, colors: Palette): void {
  parts.push(stroke(id, inkPath(points, colors.seed + parts.length * 13), colors.ink, 1.3))
}

export function buildTower(element: ArchitecturalElement): TowerGraphic {
  const params = paramsOf(element)
  const colors = palette(element)
  const width = lerp(78, 168, element.width) * lerp(0.86, 1.14, params.proportion)
  const bodyHeight = lerp(148, 360, element.height)
  const roofHeight = bodyHeight * lerp(0.32, 0.74, element.roof)
  const depth = width * 0.3
  const variant = element.variant
  const ornamentGap = element.ornament === 'none' && variant === 3 ? 8 : 36
  const pad = 16
  const baseHeight = variant === 3 ? 22 : 28
  const totalWidth = pad + width + depth + 20
  const totalHeight = ornamentGap + roofHeight + bodyHeight + baseHeight + 8
  const left = pad
  const right = pad + width
  const sideX = right + depth
  const bottom = totalHeight - 6
  const baseTop = bottom - baseHeight
  const bodyTop = baseTop - bodyHeight
  const roofTop = bodyTop - roofHeight
  const cx = (left + right) / 2

  const grid = towerWindowGrid(element, params)
  const windows: TowerBox[] = []
  const gapX = width / (grid.cols + 1)
  const gapY = bodyHeight / (grid.rows + 1)
  const windowW = Math.min(variant === 3 ? 12 : 22, width * (variant === 3 ? 0.1 : 0.18))
  const windowH = Math.min(variant === 3 ? 28 : 40, bodyHeight * (variant === 3 ? 0.12 : 0.16))
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const wx = left + gapX * (col + 1)
      const wy = bodyTop + gapY * (row + 1)
      windows.push({ x: wx - windowW / 2, y: wy - windowH / 2, w: windowW, h: windowH })
    }
  }

  const parts: TowerPart[] = []
  parts.push({
    id: 'shadow',
    d: `M${n(left)} ${n(bottom)} C${n(left)} ${n(bottom + 10)} ${n(sideX)} ${n(bottom + 14)} ${n(sideX)} ${n(bottom)} Z`,
    fill: '#14080c',
    opacity: 0.28,
  })
  parts.push(fill('base-side', path(sideQuad(left, baseTop, width, baseHeight, depth, depth * 0.22)), mixHex(colors.side, '#000000', 0.2)))
  parts.push(fill('body-side', path(sideQuad(left, bodyTop, width, bodyHeight, depth, depth * 0.28)), colors.side))
  parts.push(
    fill(
      'base-front',
      path([
        [left - 8, baseTop + 6],
        [right + 8, baseTop + 6],
        [right + 8, bottom],
        [left - 8, bottom],
      ]),
      mixHex(colors.primary, '#000000', 0.18),
    ),
  )
  parts.push(fill('body-front', rect(left, bodyTop, width, bodyHeight), colors.primary))
  parts.push(wash('body-wash', rect(left + 6, bodyTop + 8, width * 0.42, bodyHeight * 0.72), colors.primary))
  parts.push(
    fill(
      'trim-top',
      rect(left - 4, bodyTop + 10, width + 8, 8),
      colors.trim,
    ),
  )
  parts.push({
    id: 'trim-mid',
    d: rect(left - 2, bodyTop + bodyHeight * 0.48, width + 4, 7),
    fill: colors.secondary,
    opacity: 0.9,
  })
  parts.push(...courses('course', left, bodyTop, width, bodyHeight, colors.detail))

  const doorW = Math.min(variant === 3 ? 44 : 36, width * (variant === 3 ? 0.42 : 0.28))
  const doorH = Math.min(variant === 3 ? 70 : 58, bodyHeight * 0.28)
  const doorPath = variant === 2 ? rect(cx - doorW / 2, baseTop - doorH, doorW, doorH) : pointedArch(cx - doorW / 2, baseTop - doorH, doorW, doorH)
  parts.push(fill('door', doorPath, colors.glass))

  windows.forEach((window, index) => {
    const opening = variant === 2 ? rect(window.x, window.y, window.w, window.h) : pointedArch(window.x, window.y, window.w, window.h)
    parts.push(fill(`window-${index}`, opening, colors.glass))
    parts.push(fill(`window-trim-${index}`, rect(window.x - 3, window.y + window.h + 3, window.w + 6, 4), colors.secondary))
    parts.push(stroke(`window-ink-${index}`, opening, colors.ink, 1))
  })

  if (variant === 0) mariackiTallCrown(parts, colors, left, right, bodyTop, roofTop, roofHeight, width, depth, cx)
  else if (variant === 1) mariackiShortHelmet(parts, colors, left, right, bodyTop, roofTop, width, cx)
  else if (variant === 2) wawelRoof(parts, colors, left, right, bodyTop, roofTop, roofHeight, width, depth, cx)
  else defensiveCrown(parts, colors, left, bodyTop, roofHeight, width, params.crenellation)

  pushOutline(parts, 'ink-body', [
    [left, bodyTop],
    [right, bodyTop],
    [right, bottom],
    [left, bottom],
  ], colors)
  parts.push(stroke('highlight', `M${n(left + 3)} ${n(bodyTop + 16)} L${n(left + 3)} ${n(baseTop - 8)}`, PARCHMENT, 1.1, 0.55))

  const ornament = ornamentPath(element.ornament, cx, variant === 3 ? bodyTop - 8 : roofTop - 6)
  if (ornament) parts.push(fill(`ornament-${element.ornament}`, ornament, colors.trim))

  return graphic(
    element,
    colors,
    {
      width: totalWidth,
      height: totalHeight,
      anchorX: cx,
      anchorY: bottom,
      body: { x: left, y: bodyTop, w: width, h: bodyHeight },
      roofHeight,
      depth,
    },
    parts,
    windows,
  )
}

function towerWindowGrid(element: ArchitecturalElement, params: ElementParams): { cols: number; rows: number } {
  const cols = element.width >= 0.55 ? 2 : 1
  let rows = element.height < 0.38 ? 1 : element.height < 0.72 ? 2 : 3
  if (params.windows < 0.34) rows = Math.max(1, rows - 1)
  else if (params.windows > 0.67) rows += 1
  return { cols, rows }
}

function mariackiTallCrown(
  parts: TowerPart[],
  colors: Palette,
  left: number,
  right: number,
  bodyTop: number,
  roofTop: number,
  roofHeight: number,
  width: number,
  depth: number,
  cx: number,
): void {
  const spireW = Math.max(10, width * 0.14)
  parts.push(
    fill(
      'roof-side',
      path([
        [right, bodyTop],
        [right + depth * 0.65, bodyTop - depth * 0.16],
        [cx + depth * 0.35, roofTop + roofHeight * 0.42],
        [cx + width * 0.06, bodyTop - roofHeight * 0.2],
      ]),
      mixHex(colors.secondary, '#14080c', 0.38),
    ),
  )
  parts.push(fill('eave', path([
    [left - 10, bodyTop + 2],
    [right + 10, bodyTop + 2],
    [right + 4, bodyTop - 8],
    [left - 4, bodyTop - 8],
  ]), colors.secondary))
  const pinnacles = 5
  for (let index = 0; index < pinnacles; index += 1) {
    const px = left + (width / (pinnacles - 1)) * index
    parts.push(fill(`pinnacle-${index}`, path([
      [px - 4, bodyTop - 6],
      [px + 4, bodyTop - 6],
      [px, bodyTop - 22],
    ]), colors.trim))
  }
  parts.push(fill('roof-front', path([
    [cx - spireW, bodyTop - 10],
    [cx + spireW, bodyTop - 10],
    [cx + spireW * 0.45, bodyTop - roofHeight * 0.62],
    [cx, roofTop],
    [cx - spireW * 0.45, bodyTop - roofHeight * 0.62],
  ]), colors.secondary))
  parts.push(wash('roof-wash', path([
    [cx - spireW * 0.35, bodyTop - 16],
    [cx + 2, bodyTop - 16],
    [cx, roofTop + 12],
  ]), colors.secondary))
  parts.push(fill('lantern', path([
    [cx - 8, roofTop + 18],
    [cx + 8, roofTop + 18],
    [cx + 5, roofTop + 4],
    [cx - 5, roofTop + 4],
  ]), colors.primary))
  pushOutline(parts, 'ink-spire', [
    [cx - spireW, bodyTop - 10],
    [cx, roofTop],
    [cx + spireW, bodyTop - 10],
  ], colors)
}

function mariackiShortHelmet(
  parts: TowerPart[],
  colors: Palette,
  left: number,
  right: number,
  bodyTop: number,
  roofTop: number,
  width: number,
  cx: number,
): void {
  const dome = `M${n(left + 4)} ${n(bodyTop)} Q${n(cx)} ${n(roofTop)} ${n(right - 4)} ${n(bodyTop)} Z`
  parts.push(fill('roof-front', dome, colors.secondary))
  parts.push(wash('roof-wash', `M${n(left + width * 0.28)} ${n(bodyTop - 4)} Q${n(cx - 6)} ${n(roofTop + 16)} ${n(cx)} ${n(bodyTop - 4)} Z`, colors.secondary))
  parts.push(fill('lantern', rect(cx - 10, roofTop + 8, 20, 16), colors.primary))
  parts.push(fill('lantern-cap', path([
    [cx - 12, roofTop + 8],
    [cx + 12, roofTop + 8],
    [cx, roofTop - 8],
  ]), colors.trim))
  parts.push(stroke('ink-dome', dome, colors.ink, 1.3))
}

function wawelRoof(
  parts: TowerPart[],
  colors: Palette,
  left: number,
  right: number,
  bodyTop: number,
  roofTop: number,
  roofHeight: number,
  width: number,
  depth: number,
  cx: number,
): void {
  parts.push(fill('cornice', rect(left - 8, bodyTop - 8, width + 16, 12), colors.trim))
  parts.push(fill('roof-side', path(sideQuad(left, roofTop + roofHeight * 0.45, width, roofHeight * 0.4, depth * 0.7, 8)), mixHex(colors.secondary, '#14080c', 0.35)))
  parts.push(fill('roof-front', path([
    [left - 2, bodyTop - 6],
    [right + 2, bodyTop - 6],
    [right - width * 0.16, roofTop + roofHeight * 0.28],
    [cx, roofTop + roofHeight * 0.12],
    [left + width * 0.16, roofTop + roofHeight * 0.28],
  ]), colors.secondary))
  parts.push(stroke('ink-cornice', `M${n(left - 8)} ${n(bodyTop + 4)} L${n(right + 8)} ${n(bodyTop + 4)}`, colors.ink, 1.2))
}

function defensiveCrown(
  parts: TowerPart[],
  colors: Palette,
  left: number,
  bodyTop: number,
  roofHeight: number,
  width: number,
  crenellation: number,
): void {
  const merlons = countBetween(crenellation, 4, 8)
  const gap = width / merlons
  parts.push(fill('roof-front', rect(left - 4, bodyTop - Math.min(18, roofHeight * 0.2), width + 8, 14), colors.secondary))
  for (let index = 0; index < merlons; index += 1) {
    const mx = left + gap * index + 2
    parts.push(fill(`merlon-${index}`, rect(mx, bodyTop - 26, Math.max(6, gap * 0.62), 24), colors.primary))
    parts.push(stroke(`merlon-ink-${index}`, rect(mx, bodyTop - 26, Math.max(6, gap * 0.62), 24), colors.ink, 1))
  }
}

export function buildFacade(element: ArchitecturalElement): TowerGraphic {
  const params = paramsOf(element)
  const colors = palette(element)
  const variant = element.variant
  const width = lerp(variant === 2 ? 220 : 110, variant === 2 ? 460 : 250, element.width)
  const bodyHeight = lerp(150, 300, element.height)
  const floors = countBetween(params.floors, 2, 5)
  const cols = countBetween(params.windows, variant === 1 ? 2 : 1, variant === 2 ? 6 : 4)
  const entrance = steps(params.entrance, 3)
  const gableKind = steps(params.gable, 3)
  const depth = width * 0.16
  const gableHeight = variant === 2 ? 18 : bodyHeight * 0.24
  const pad = 14
  const bottom = bodyHeight + gableHeight + 28
  const left = pad
  const right = left + width
  const baseTop = bottom - 16
  const bodyTop = baseTop - bodyHeight
  const cx = (left + right) / 2
  const parts: TowerPart[] = []
  parts.push(fill('shadow', `M${n(left)} ${n(bottom)} C${n(cx)} ${n(bottom + 12)} ${n(right + depth)} ${n(bottom + 8)} ${n(right + depth)} ${n(bottom)} Z`, '#14080c', 0.24))
  parts.push(fill('body-side', path(sideQuad(left, bodyTop, width, bodyHeight, depth, depth * 0.35)), colors.side))
  parts.push(fill('body-front', rect(left, bodyTop, width, bodyHeight), colors.primary))
  parts.push(wash('body-wash', rect(left + 5, bodyTop + 6, width * 0.22, bodyHeight * 0.8), colors.primary))
  parts.push(...courses('course', left, bodyTop, width, bodyHeight, colors.detail))

  const floorH = bodyHeight / (floors + 0.45)
  for (let floor = 0; floor < floors; floor += 1) {
    const rowY = bodyTop + floorH * (floor + 0.55)
    const winH = Math.max(12, floorH * (floor === 0 ? 0.42 : 0.5))
    const winW = Math.max(8, (width / (cols + 1)) * 0.42)
    for (let col = 0; col < cols; col += 1) {
      const wx = left + (width / (cols + 1)) * (col + 1) - winW / 2
      const gothic = variant === 0
      const opening = gothic ? pointedArch(wx, rowY, winW, winH) : rect(wx, rowY, winW, winH)
      parts.push(fill(`window-${floor}-${col}`, opening, colors.glass))
      parts.push(stroke(`window-ink-${floor}-${col}`, opening, colors.ink, 0.9))
    }
    parts.push(hline(`floor-line-${floor}`, left + 2, right - 2, bodyTop + floorH * (floor + 1), colors.detail))
  }

  const doorW = Math.min(width * 0.28, variant === 2 ? 54 : 36)
  const doorH = Math.min(bodyHeight * 0.28, 64)
  const doorX = cx - doorW / 2
  const doorY = baseTop - doorH
  const door = entrance === 1 ? rect(doorX, doorY, doorW, doorH) : entrance === 2 ? roundArch(doorX, doorY, doorW, doorH) : pointedArch(doorX, doorY, doorW, doorH)
  parts.push(fill('door', door, colors.glass))
  parts.push(stroke('door-ink', door, colors.ink, 1.2))
  if (entrance === 2) {
    parts.push(fill('steps', rect(doorX - 8, baseTop - 6, doorW + 16, 8), colors.trim))
  }

  if (variant === 0) {
    parts.push(fill('rose', circle(cx, bodyTop + bodyHeight * 0.16, Math.min(18, width * 0.08)), colors.secondary))
    parts.push(stroke('rose-ink', circle(cx, bodyTop + bodyHeight * 0.16, Math.min(18, width * 0.08)), colors.ink, 1))
  }

  if (variant === 2) {
    const bays = Math.max(3, cols)
    const bay = width / bays
    for (let index = 0; index < bays; index += 1) {
      const ax = left + bay * index + bay * 0.18
      const aw = bay * 0.64
      parts.push(fill(`arch-front-${index}`, roundArch(ax, baseTop - bodyHeight * 0.34, aw, bodyHeight * 0.32), colors.glass))
    }
    parts.push(fill('cornice', rect(left - 6, bodyTop + 4, width + 12, 8), colors.secondary))
  } else {
    drawGable(parts, colors, left, right, bodyTop, gableHeight, gableKind, cx)
  }

  pushOutline(parts, 'ink-facade', [
    [left, bodyTop],
    [right, bodyTop],
    [right, bottom],
    [left, bottom],
  ], colors)

  return graphic(element, colors, {
    width: pad + width + depth + 16,
    height: bottom + 10,
    anchorX: cx,
    anchorY: bottom,
    body: { x: left, y: bodyTop, w: width, h: bodyHeight },
    roofHeight: gableHeight,
    depth,
  }, parts)
}

function drawGable(
  parts: TowerPart[],
  colors: Palette,
  left: number,
  right: number,
  bodyTop: number,
  gableHeight: number,
  kind: number,
  cx: number,
): void {
  const width = right - left
  if (kind === 1) {
    const stepsN = 4
    const stepW = width / (stepsN * 2)
    const stepH = gableHeight / stepsN
    const points: Array<[number, number]> = [[left, bodyTop]]
    for (let index = 0; index < stepsN; index += 1) {
      const inset = stepW * (index + 1)
      const y = bodyTop - stepH * index
      points.push([left + inset, y], [left + inset, y - stepH])
    }
    points.push([cx, bodyTop - gableHeight])
    for (let index = stepsN - 1; index >= 0; index -= 1) {
      const inset = stepW * (index + 1)
      const y = bodyTop - stepH * index
      points.push([right - inset, y - stepH], [right - inset, y])
    }
    points.push([right, bodyTop])
    parts.push(fill('gable', path(points), colors.secondary))
    parts.push(stroke('gable-ink', inkPath(points, colors.seed + 9), colors.ink, 1.15))
    return
  }
  if (kind === 2) {
    const points: Array<[number, number]> = [
      [left, bodyTop],
      [cx, bodyTop - gableHeight],
      [right, bodyTop],
    ]
    parts.push(fill('gable', path(points), colors.secondary))
    parts.push(stroke('gable-ink', inkPath(points, colors.seed + 5), colors.ink, 1.2))
    return
  }
  const d = `M${n(left)} ${n(bodyTop)} Q${n(left + width * 0.18)} ${n(bodyTop - gableHeight)} ${n(cx)} ${n(bodyTop - gableHeight * 0.92)} Q${n(right - width * 0.18)} ${n(bodyTop - gableHeight)} ${n(right)} ${n(bodyTop)} Z`
  parts.push(fill('gable', d, colors.secondary))
  parts.push(stroke('gable-ink', d, colors.ink, 1.2))
}

export function buildRoof(element: ArchitecturalElement): TowerGraphic {
  const params = paramsOf(element)
  const colors = palette(element)
  const width = lerp(160, 420, element.width)
  const rise = lerp(54, 190, element.height) * lerp(0.55, 1, params.pitch)
  const depth = width * 0.28
  const kind = element.variant === 1 ? 1 : element.variant === 2 ? 2 : steps(params.roofline, 3)
  const pad = 18
  const left = pad
  const right = left + width
  const bottom = rise + 36
  const eaves = bottom - 10
  const ridgeY = eaves - rise
  const cx = (left + right) / 2
  const parts: TowerPart[] = []
  parts.push(fill('shadow', `M${n(left)} ${n(bottom)} C${n(cx)} ${n(bottom + 14)} ${n(right + depth)} ${n(bottom + 6)} ${n(right + depth)} ${n(bottom)} Z`, '#14080c', 0.22))

  if (kind === 1) {
    parts.push(fill('roof-side', path([
      [right, eaves],
      [right + depth, eaves - rise * 0.18],
      [cx + depth * 0.45, ridgeY + rise * 0.16],
      [cx + width * 0.08, eaves - rise * 0.2],
    ]), colors.side))
    parts.push(fill('roof-front', path([
      [left, eaves],
      [right, eaves],
      [right - width * 0.14, ridgeY + rise * 0.22],
      [left + width * 0.14, ridgeY + rise * 0.22],
    ]), colors.primary))
  } else if (kind === 2) {
    const breakY = eaves - rise * 0.46
    parts.push(fill('roof-side', path(sideQuad(left, breakY, width, rise * 0.46, depth * 0.8, rise * 0.08)), colors.side))
    parts.push(fill('roof-front', path([
      [left, eaves],
      [right, eaves],
      [right - 8, breakY],
      [cx + width * 0.12, breakY - 8],
      [cx, ridgeY],
      [cx - width * 0.12, breakY - 8],
      [left + 8, breakY],
    ]), colors.primary))
  } else {
    parts.push(fill('roof-side', path([
      [right, eaves],
      [right + depth * 0.85, eaves - 10],
      [cx + depth * 0.4, ridgeY + 8],
      [cx, eaves - rise * 0.15],
    ]), colors.side))
    parts.push(fill('roof-front', path([
      [left - 6, eaves],
      [right + 6, eaves],
      [cx, ridgeY],
    ]), colors.primary))
  }
  parts.push(wash('roof-wash', path([
    [left + width * 0.08, eaves - 6],
    [cx - 4, eaves - 6],
    [cx - width * 0.08, ridgeY + rise * 0.2],
  ]), colors.primary))
  parts.push(fill('eave', rect(left - 10, eaves - 4, width + 20, 8), colors.secondary))
  pushOutline(parts, 'ink-roof', [
    [left - 6, eaves],
    [cx, ridgeY],
    [right + 6, eaves],
  ], colors)

  const finials = countBetween(params.ridge, 1, 5)
  for (let index = 0; index < finials; index += 1) {
    const fx = left + (width / (finials + 1)) * (index + 1)
    const fy = kind === 1 ? ridgeY + rise * 0.28 : ridgeY + (eaves - ridgeY) * (0.15 + 0.2 * (index % 2))
    parts.push(fill(`ridge-${index}`, path([
      [fx - 3, fy + 10],
      [fx + 3, fy + 10],
      [fx, fy - 8],
    ]), colors.trim))
  }

  return graphic(element, colors, {
    width: pad + width + depth + 12,
    height: bottom + 12,
    anchorX: cx,
    anchorY: bottom,
    body: { x: left, y: ridgeY, w: width, h: rise },
    roofHeight: rise,
    depth,
  }, parts)
}

export function buildArcade(element: ArchitecturalElement): TowerGraphic {
  const params = paramsOf(element)
  const colors = palette(element)
  const arches = countBetween(params.arches, 2, 7)
  const stories = element.variant === 1 ? 2 : 1
  const width = lerp(180, 520, element.width)
  const storyH = lerp(70, 150, element.height)
  const height = storyH * stories
  const depth = Math.max(16, width * 0.08)
  const colW = lerp(8, Math.max(10, width / arches * 0.34), params.column)
  const archRise = lerp(0.38, 0.82, params.archHeight)
  const pad = 12
  const left = pad
  const bottom = height + 24
  const top = bottom - height
  const parts: TowerPart[] = []
  parts.push(fill('body-side', path(sideQuad(left, top, width, height, depth, 6)), colors.side))
  parts.push(fill('body-front', rect(left, top, width, height), colors.primary))
  parts.push(wash('body-wash', rect(left + 4, top + 4, 18, height * 0.7), colors.primary))

  for (let story = 0; story < stories; story += 1) {
    const rowTop = top + storyH * story + 8
    const rowH = storyH - 16
    const bay = width / arches
    for (let index = 0; index < arches; index += 1) {
      const x = left + bay * index + colW * 0.45
      const aw = Math.max(8, bay - colW)
      const ah = rowH * archRise
      const opening = element.variant === 2 ? pointedArch(x, rowTop + rowH - ah, aw, ah) : roundArch(x, rowTop + rowH - ah, aw, ah)
      parts.push(fill(`arch-front-${story}-${index}`, opening, mixHex(colors.glass, PARCHMENT, 0.15)))
      parts.push(stroke(`arch-ink-${story}-${index}`, opening, colors.ink, 1.15))
      parts.push(fill(`capital-${story}-${index}`, rect(x - 2, rowTop + rowH - ah - 4, aw + 4, 4), colors.secondary))
    }
    if (story === 0 && stories === 2) {
      parts.push(fill('balustrade', rect(left, top + storyH - 3, width, 8), colors.secondary))
      parts.push(hline('baluster-line', left, left + width, top + storyH + 1, colors.detail))
    }
  }
  parts.push(fill('cornice', rect(left - 4, top + 2, width + 8, 6), colors.trim))
  pushOutline(parts, 'ink-arcade', [
    [left, top],
    [left + width, top],
    [left + width, bottom],
    [left, bottom],
  ], colors)

  return graphic(element, colors, {
    width: pad + width + depth + 10,
    height: bottom + 8,
    anchorX: left + width / 2,
    anchorY: bottom,
    body: { x: left, y: top, w: width, h: height },
    roofHeight: 0,
    depth,
  }, parts)
}

export function buildGate(element: ArchitecturalElement): TowerGraphic {
  const params = paramsOf(element)
  const colors = palette(element)
  const variant = element.variant
  if (variant === 2) return buildPortal(element, colors, params)
  const wide = variant === 1
  const width = lerp(wide ? 180 : 120, wide ? 340 : 230, element.width)
  const bodyHeight = lerp(wide ? 120 : 160, wide ? 240 : 320, element.height)
  const depth = width * (wide ? 0.12 : 0.2)
  const pad = 16
  const left = pad
  const right = left + width
  const bottom = bodyHeight + 30
  const bodyTop = bottom - bodyHeight
  const cx = (left + right) / 2
  const parts: TowerPart[] = []
  parts.push(fill('shadow', `M${n(left)} ${n(bottom)} C${n(cx)} ${n(bottom + 12)} ${n(right + depth)} ${n(bottom + 8)} ${n(right + depth)} ${n(bottom)} Z`, '#14080c', 0.24))
  if (wide) {
    const bow = `M${n(left)} ${n(bottom)} L${n(left)} ${n(bodyTop + 28)} Q${n(cx)} ${n(bodyTop - 10)} ${n(right)} ${n(bodyTop + 28)} L${n(right)} ${n(bottom)} Z`
    parts.push(fill('body-front', bow, colors.primary))
    parts.push(stroke('ink-bow', bow, colors.ink, 1.3))
  } else {
    parts.push(fill('body-side', path(sideQuad(left, bodyTop, width, bodyHeight, depth, 10)), colors.side))
    parts.push(fill('body-front', rect(left, bodyTop, width, bodyHeight), colors.primary))
  }
  parts.push(wash('body-wash', rect(left + 8, bodyTop + 20, width * 0.2, bodyHeight * 0.45), colors.primary))
  parts.push(...courses('course', left, bodyTop + 10, width, bodyHeight - 20, colors.detail))

  const passageW = lerp(width * 0.28, width * 0.62, params.passage)
  const passageH = bodyHeight * (wide ? 0.46 : 0.42)
  const passage = wide
    ? roundArch(cx - passageW / 2, bottom - 12 - passageH, passageW, passageH)
    : pointedArch(cx - passageW / 2, bottom - 12 - passageH, passageW, passageH)
  parts.push(fill('door', passage, colors.glass))
  parts.push(stroke('door-ink', passage, colors.ink, 1.35))

  if (!wide) {
    parts.push(fill('niche', pointedArch(cx - 14, bodyTop + bodyHeight * 0.18, 28, 48), mixHex(colors.secondary, colors.primary, 0.25)))
    parts.push(stroke('niche-ink', pointedArch(cx - 14, bodyTop + bodyHeight * 0.18, 28, 48), colors.ink, 1))
  }

  const merlons = countBetween(params.crenellation, wide ? 6 : 4, wide ? 11 : 8)
  const gap = width / merlons
  for (let index = 0; index < merlons; index += 1) {
    const mx = left + gap * index + 2
    const mw = Math.max(6, gap * 0.58)
    parts.push(fill(`merlon-${index}`, rect(mx, bodyTop - 18, mw, 22), colors.primary))
    parts.push(stroke(`merlon-ink-${index}`, rect(mx, bodyTop - 18, mw, 22), colors.ink, 0.9))
  }
  parts.push(fill('roof-front', rect(left, bodyTop - 4, width, 8), colors.secondary))
  pushOutline(parts, 'ink-gate', [
    [left, bodyTop],
    [right, bodyTop],
    [right, bottom],
    [left, bottom],
  ], colors)

  return graphic(element, colors, {
    width: pad + width + depth + 12,
    height: bottom + 16,
    anchorX: cx,
    anchorY: bottom,
    body: { x: left, y: bodyTop, w: width, h: bodyHeight },
    roofHeight: 22,
    depth,
  }, parts)
}

function buildPortal(element: ArchitecturalElement, colors: Palette, params: ElementParams): TowerGraphic {
  const width = lerp(70, 160, element.width)
  const height = lerp(110, 220, element.height)
  const pad = 16
  const left = pad
  const bottom = height + 20
  const top = bottom - height
  const cx = left + width / 2
  const parts: TowerPart[] = []
  const openingW = lerp(width * 0.4, width * 0.72, params.passage)
  const arch = pointedArch(cx - openingW / 2, top + 16, openingW, height * 0.72)
  parts.push(fill('body-front', rect(left, top, width, height), colors.primary))
  parts.push(fill('door', arch, colors.glass))
  parts.push(stroke('door-ink', arch, colors.ink, 1.4))
  parts.push(fill('jamb-left', rect(cx - openingW / 2 - 8, top + 16, 8, height * 0.7), colors.secondary))
  parts.push(fill('jamb-right', rect(cx + openingW / 2, top + 16, 8, height * 0.7), colors.secondary))
  parts.push(fill('pediment', path([
    [left + 6, top + 18],
    [cx, top - 6],
    [left + width - 6, top + 18],
  ]), colors.trim))
  parts.push(stroke('ink-portal', rect(left, top, width, height), colors.ink, 1.2))
  if (params.density > 0.4) {
    parts.push(fill('rosette', circle(cx, top + height * 0.22, 7), colors.secondary))
  }
  return graphic(element, colors, {
    width: pad + width + 12,
    height: bottom + 8,
    anchorX: cx,
    anchorY: bottom,
    body: { x: left, y: top, w: width, h: height },
    roofHeight: 12,
    depth: 8,
  }, parts)
}

export function buildAttic(element: ArchitecturalElement): TowerGraphic {
  const params = paramsOf(element)
  const colors = palette(element)
  const bays = countBetween(params.parapet, 3, 8)
  const width = lerp(200, 560, element.width)
  const height = lerp(64, 150, element.height)
  const depth = 14
  const pad = 12
  const left = pad
  const bottom = height + 18
  const top = bottom - height
  const bay = width / bays
  const parts: TowerPart[] = []
  parts.push(fill('body-side', path(sideQuad(left, top, width, height, depth, 4)), colors.side))
  parts.push(fill('body-front', rect(left, top, width, height), colors.primary))
  parts.push(fill('base-cornice', rect(left - 4, bottom - 12, width + 8, 10), colors.secondary))
  parts.push(fill('top-cornice', rect(left - 2, top + 2, width + 4, 5), colors.trim))

  for (let index = 0; index < bays; index += 1) {
    const x = left + bay * index
    const panelX = x + bay * 0.18
    const panelW = bay * 0.64
    const panel = element.variant === 0
      ? roundArch(panelX, top + height * 0.28, panelW, height * 0.5)
      : rect(panelX, top + height * 0.32, panelW, height * 0.4)
    parts.push(fill(`bay-${index}`, panel, mixHex(colors.primary, '#14080c', 0.18)))
    parts.push(stroke(`bay-ink-${index}`, panel, colors.ink, 1))
    if (params.density > 0.35) {
      parts.push(stroke(`medallion-${index}`, circle(x + bay / 2, top + height * 0.48, Math.min(8, bay * 0.16)), colors.secondary, 1.2))
    }
    if (element.variant === 0 && params.density > 0.2) {
      const vx = x + bay - 2
      parts.push(stroke(`volute-${index}`, `M${n(vx)} ${n(top + height * 0.75)} Q${n(vx + 8)} ${n(top + height * 0.2)} ${n(vx - 2)} ${n(top + 6)}`, colors.ink, 1.1))
      parts.push(fill(`pinnacle-${index}`, path([
        [x + bay * 0.5 - 3, top + 8],
        [x + bay * 0.5 + 3, top + 8],
        [x + bay * 0.5, top - 10],
      ]), colors.trim))
    }
  }
  pushOutline(parts, 'ink-attic', [
    [left, top],
    [left + width, top],
    [left + width, bottom],
    [left, bottom],
  ], colors)

  return graphic(element, colors, {
    width: pad + width + depth + 8,
    height: bottom + 14,
    anchorX: left + width / 2,
    anchorY: bottom,
    body: { x: left, y: top, w: width, h: height },
    roofHeight: 12,
    depth,
  }, parts)
}

export function buildOrnament(element: ArchitecturalElement): TowerGraphic {
  const params = paramsOf(element)
  const colors = palette(element)
  const size = lerp(54, 140, Math.max(element.width, element.height))
  const pad = 10
  const cx = pad + size / 2
  const bottom = size + pad
  const parts: TowerPart[] = []
  const variant = element.variant
  if (variant === 1) {
    const petals = [0, 60, 120, 180, 240, 300]
      .map((degree) => {
        const angle = (degree * Math.PI) / 180
        return circle(cx + Math.cos(angle) * size * 0.22, bottom - size * 0.55 + Math.sin(angle) * size * 0.22, size * 0.12)
      })
      .join(' ')
    parts.push(fill('ornament-rosette', `${circle(cx, bottom - size * 0.55, size * 0.1)} ${petals}`, colors.primary))
    parts.push(stroke('ornament-ink', circle(cx, bottom - size * 0.55, size * 0.34), colors.ink, 1.2))
  } else if (variant === 2) {
    parts.push(fill('shaft', rect(cx - 6, bottom - size * 0.72, 12, size * 0.55), colors.primary))
    parts.push(fill('cap', path([
      [cx - 16, bottom - size * 0.72],
      [cx + 16, bottom - size * 0.72],
      [cx, bottom - size],
    ]), colors.secondary))
    parts.push(stroke('ornament-ink', path([
      [cx - 16, bottom - size * 0.72],
      [cx, bottom - size],
      [cx + 16, bottom - size * 0.72],
      [cx - 6, bottom - 8],
      [cx + 6, bottom - 8],
    ]), colors.ink, 1.2))
  } else if (variant === 3) {
    parts.push(fill('medallion', circle(cx, bottom - size * 0.5, size * 0.34), colors.primary))
    parts.push(stroke('medallion-ring', circle(cx, bottom - size * 0.5, size * 0.22), colors.secondary, 1.6))
    if (params.density > 0.45) {
      parts.push(stroke('medallion-inner', circle(cx, bottom - size * 0.5, size * 0.1), colors.ink, 1))
    }
    parts.push(stroke('ornament-ink', circle(cx, bottom - size * 0.5, size * 0.34), colors.ink, 1.3))
  } else {
    const finial = path([
      [cx, bottom - size],
      [cx + size * 0.12, bottom - size * 0.62],
      [cx + size * 0.05, bottom - size * 0.62],
      [cx + size * 0.05, bottom - 8],
      [cx - size * 0.05, bottom - 8],
      [cx - size * 0.05, bottom - size * 0.62],
      [cx - size * 0.12, bottom - size * 0.62],
    ])
    parts.push(fill('ornament-finial', finial, colors.primary))
    parts.push(stroke('ornament-ink', finial, colors.ink, 1.2))
  }
  parts.push(wash('ornament-wash', circle(cx - size * 0.08, bottom - size * 0.62, size * 0.08), colors.primary))

  return graphic(element, colors, {
    width: pad * 2 + size,
    height: bottom + 8,
    anchorX: cx,
    anchorY: bottom,
    body: { x: pad, y: bottom - size, w: size, h: size },
    roofHeight: size * 0.3,
    depth: 0,
  }, parts)
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
