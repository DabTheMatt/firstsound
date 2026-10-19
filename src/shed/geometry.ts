import type { ArchitecturalElement, OrnamentId } from './model'

export type TowerBox = {
  x: number
  y: number
  w: number
  h: number
}

export type TowerPart = {
  id: string
  d: string
  fill: string
  opacity?: number
}

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

function n(value: number): string {
  return value.toFixed(1)
}

function path(points: Array<[number, number]>, close = true): string {
  const body = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${n(point[0])} ${n(point[1])}`).join(' ')
  return close ? `${body} Z` : body
}

function arch(x: number, y: number, w: number, h: number): string {
  const radius = w / 2
  const spring = y + radius
  return `M${n(x)} ${n(y + h)} L${n(x)} ${n(spring)} A${n(radius)} ${n(radius)} 0 0 1 ${n(x + w)} ${n(spring)} L${n(x + w)} ${n(y + h)} Z`
}

function circle(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)} a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`
}

function star(cx: number, cy: number, radius: number): string {
  const points: Array<[number, number]> = []
  for (let index = 0; index < 10; index += 1) {
    const arm = index % 2 === 0 ? radius : radius * 0.42
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    points.push([cx + Math.cos(angle) * arm, cy + Math.sin(angle) * arm])
  }
  return path(points)
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

export function buildTower(element: ArchitecturalElement): TowerGraphic {
  const width = lerp(78, 168, element.width)
  const bodyHeight = lerp(148, 360, element.height)
  const roofHeight = bodyHeight * lerp(0.32, 0.74, element.roof)
  const depth = width * 0.3
  const ornamentGap = element.ornament === 'none' ? 10 : 40
  const pad = 14
  const baseHeight = 28
  const totalWidth = pad + width + depth + 18
  const totalHeight = ornamentGap + roofHeight + bodyHeight + baseHeight + 8
  const left = pad
  const right = pad + width
  const side = right + depth
  const bottom = totalHeight - 6
  const baseTop = bottom - baseHeight
  const bodyTop = baseTop - bodyHeight
  const roofTop = bodyTop - roofHeight
  const primary = element.primary
  const secondary = element.secondary
  const sideFill = mixHex(primary, '#14080c', 0.42)
  const roofSide = mixHex(secondary, '#14080c', 0.38)
  const trim = mixHex(secondary, '#fff6df', 0.28)
  const glass = mixHex(primary, '#07131c', 0.55)

  const cols = element.width >= 0.55 ? 2 : 1
  const rows = element.height < 0.38 ? 1 : element.height < 0.72 ? 2 : 3
  const windows: TowerBox[] = []
  const gapX = width / (cols + 1)
  const gapY = bodyHeight / (rows + 1)
  const windowW = Math.min(22, width * 0.18)
  const windowH = Math.min(36, bodyHeight * 0.16)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cx = left + gapX * (col + 1)
      const cy = bodyTop + gapY * (row + 1)
      windows.push({ x: cx - windowW / 2, y: cy - windowH / 2, w: windowW, h: windowH })
    }
  }

  const parts: TowerPart[] = [
    {
      id: 'shadow',
      d: `M${n(left)} ${n(bottom)} C${n(left)} ${n(bottom + 10)} ${n(side)} ${n(bottom + 14)} ${n(side)} ${n(bottom)} Z`,
      fill: '#14080c',
      opacity: 0.28,
    },
    {
      id: 'base-side',
      d: path([
        [right, baseTop],
        [side, baseTop - depth * 0.22],
        [side, bottom - depth * 0.22],
        [right, bottom],
      ]),
      fill: mixHex(sideFill, '#000000', 0.2),
    },
    {
      id: 'body-side',
      d: path([
        [right, bodyTop],
        [side, bodyTop - depth * 0.28],
        [side, baseTop - depth * 0.22],
        [right, baseTop],
      ]),
      fill: sideFill,
    },
    {
      id: 'roof-side',
      d: path([
        [right + 12, bodyTop],
        [side + 8, bodyTop - depth * 0.2],
        [(left + right) / 2 + depth * 0.55, roofTop + 10],
        [(left + right) / 2 + width * 0.08, bodyTop - roofHeight * 0.42],
      ]),
      fill: roofSide,
    },
    {
      id: 'base-front',
      d: path([
        [left - 8, baseTop + 6],
        [right + 8, baseTop + 6],
        [right + 8, bottom],
        [left - 8, bottom],
      ]),
      fill: mixHex(primary, '#000000', 0.18),
    },
    {
      id: 'body-front',
      d: path([
        [left, bodyTop],
        [right, bodyTop],
        [right, baseTop],
        [left, baseTop],
      ]),
      fill: primary,
    },
    {
      id: 'trim-top',
      d: path([
        [left - 4, bodyTop + 10],
        [right + 4, bodyTop + 10],
        [right + 4, bodyTop + 18],
        [left - 4, bodyTop + 18],
      ]),
      fill: trim,
    },
    {
      id: 'trim-mid',
      d: path([
        [left - 2, bodyTop + bodyHeight * 0.48],
        [right + 2, bodyTop + bodyHeight * 0.48],
        [right + 2, bodyTop + bodyHeight * 0.48 + 7],
        [left - 2, bodyTop + bodyHeight * 0.48 + 7],
      ]),
      fill: secondary,
      opacity: 0.9,
    },
  ]

  const doorW = Math.min(36, width * 0.28)
  const doorH = Math.min(58, bodyHeight * 0.28)
  parts.push({
    id: 'door',
    d: arch((left + right) / 2 - doorW / 2, baseTop - doorH, doorW, doorH),
    fill: glass,
  })

  windows.forEach((window, index) => {
    parts.push({
      id: `window-${index}`,
      d: arch(window.x, window.y, window.w, window.h),
      fill: glass,
    })
    parts.push({
      id: `window-trim-${index}`,
      d: path([
        [window.x - 3, window.y + window.h + 3],
        [window.x + window.w + 3, window.y + window.h + 3],
        [window.x + window.w + 3, window.y + window.h + 6],
        [window.x - 3, window.y + window.h + 6],
      ]),
      fill: secondary,
    })
  })

  parts.push(
    {
      id: 'eave',
      d: path([
        [left - 16, bodyTop + 4],
        [right + 16, bodyTop + 4],
        [right + 10, bodyTop - 12],
        [left - 10, bodyTop - 12],
      ]),
      fill: secondary,
    },
    {
      id: 'roof-front',
      d: path([
        [left - 8, bodyTop - 8],
        [right + 8, bodyTop - 8],
        [right - width * 0.16, bodyTop - roofHeight * 0.46],
        [(left + right) / 2, roofTop],
        [left + width * 0.16, bodyTop - roofHeight * 0.46],
      ]),
      fill: secondary,
    },
    {
      id: 'roof-layer',
      d: path([
        [left + width * 0.18, bodyTop - roofHeight * 0.28],
        [right - width * 0.18, bodyTop - roofHeight * 0.28],
        [(left + right) / 2, roofTop + roofHeight * 0.16],
      ]),
      fill: trim,
      opacity: 0.85,
    },
    {
      id: 'lantern',
      d: path([
        [(left + right) / 2 - 12, roofTop + 16],
        [(left + right) / 2 + 12, roofTop + 16],
        [(left + right) / 2 + 8, roofTop - 8],
        [(left + right) / 2 - 8, roofTop - 8],
      ]),
      fill: primary,
    },
  )

  const ornament = ornamentPath(element.ornament, (left + right) / 2, roofTop - 6)
  if (ornament) {
    parts.push({ id: `ornament-${element.ornament}`, d: ornament, fill: trim })
  }

  return {
    width: totalWidth,
    height: totalHeight,
    anchorX: (left + right) / 2,
    anchorY: bottom,
    body: { x: left, y: bodyTop, w: width, h: bodyHeight },
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
