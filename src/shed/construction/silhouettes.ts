import { cubic, construction, disk, facade, hairline, lancet, n, opening, poly, solid, type DrawPart } from '../draw'
import { mixHex } from '../rendering/color'
import { SHED_BLUE, SHED_INK, SHED_LIMESTONE } from '../palette'
import { SHED_STYLE } from '../style'
import { clampUnit, type ArchitecturalElement, type OrnamentId } from '../model'

type Box = { x: number; y: number; w: number; h: number }

type Graphic = {
  width: number
  height: number
  anchorX: number
  anchorY: number
  body: Box
  roofHeight: number
  depth: number
  primary: string
  secondary: string
  side: string
  windows: Box[]
  parts: DrawPart[]
  ornament: OrnamentId
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clampUnit(t)
}

function finish(
  element: ArchitecturalElement,
  box: {
    width: number
    height: number
    anchorX: number
    anchorY: number
    body: Box
    roofHeight: number
    depth: number
    side: string
  },
  parts: DrawPart[],
): Graphic {
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
    windows: [],
    parts: parts.filter((part) => part.d.length > 0),
    ornament: element.ornament,
  }
}

function sheet(element: ArchitecturalElement, parts: DrawPart[], width: number, height: number, anchorX: number, anchorY: number, body: Box, roofHeight: number, depth: number): Graphic {
  return finish(element, { width, height, anchorX, anchorY, body, roofHeight, depth, side: mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade) }, parts)
}

function rightSide(left: number, top: number, width: number, height: number, depth: number): string {
  return poly(
    [
      [left + width, top],
      [left + width + depth, top - depth * 0.35],
      [left + width + depth, top + height - depth * 0.2],
      [left + width, top + height],
    ],
    2,
    0.45,
  )
}

function roundArch(x: number, y: number, w: number, h: number): string {
  const radius = Math.max(4, w / 2)
  const arch = Math.min(Math.max(8, h * 0.55), radius)
  const spring = y + arch
  return [
    `M${n(x)} ${n(y + h)}`,
    `L${n(x)} ${n(spring)}`,
    `A${n(radius)} ${n(arch)} 0 0 1 ${n(x + w)} ${n(spring)}`,
    `L${n(x + w)} ${n(y + h)}`,
    'Z',
  ].join(' ')
}

/** Kraków townhouse ground floor: narrow brick face, paired windows, a single door. */
function townhouseBase(element: ArchitecturalElement): Graphic {
  const width = lerp(120, 210, element.width)
  const body = lerp(150, 250, element.height)
  const depth = width * 0.12
  const left = 18
  const bottom = body + 28
  const top = bottom - body
  const primary = element.primary
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.5)
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(primary, SHED_INK, SHED_STYLE.sideShade), { salt: 1 }),
    solid('front', facade(left, top, width, body, 4, 0.8), primary, { salt: 4 }),
    hairline('sill', `M${n(left + 8)} ${n(top + body * 0.42)} L${n(left + width - 8)} ${n(top + body * 0.42)}`),
  ]
  const winW = width * 0.16
  const winH = body * 0.22
  for (const column of [0.28, 0.72]) {
    const x = left + width * column - winW / 2
    parts.push(opening(`window-${column}`, poly([[x, top + 18], [x + winW, top + 18], [x + winW, top + 18 + winH], [x, top + 18 + winH]], 5, 0.2), glass))
  }
  const doorW = width * 0.22
  parts.push(opening('door', roundArch(left + width / 2 - doorW / 2, top + body * 0.48, doorW, body * 0.46), element.secondary))
  parts.push(construction('axis', `M${n(left + width / 2)} ${n(top)} L${n(left + width / 2)} ${n(bottom)}`))
  return sheet(element, parts, left + width + depth + 8, bottom + 8, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

/** Sukiennice-like ground floor: wide limestone face and three street arches. */
function renaissanceBase(element: ArchitecturalElement): Graphic {
  const width = lerp(240, 420, element.width)
  const body = lerp(120, 190, element.height)
  const depth = width * 0.08
  const left = 16
  const bottom = body + 24
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade), { salt: 2 }),
    solid('front', facade(left, top, width, body, 6, 0.6), element.secondary, { salt: 6 }),
    hairline('rustic', `M${n(left + 6)} ${n(top + body * 0.22)} L${n(left + width - 6)} ${n(top + body * 0.22)}`),
  ]
  const gap = width * 0.06
  const archW = (width - gap * 4) / 3
  for (let index = 0; index < 3; index += 1) {
    const x = left + gap + index * (archW + gap)
    parts.push(opening(`arch-${index}`, roundArch(x, top + body * 0.28, archW, body * 0.66), mixHex(SHED_BLUE, SHED_INK, 0.62)))
    parts.push(hairline(`pier-${index}`, `M${n(x - 2)} ${n(top + 8)} L${n(x - 2)} ${n(bottom - 6)}`))
  }
  parts.push(construction('axis', `M${n(left + width / 2)} ${n(top)} L${n(left + width / 2)} ${n(bottom)}`))
  return sheet(element, parts, left + width + depth + 8, bottom + 6, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

/** Gothic brick ground floor with a pointed portal and a rose. */
function gothicBase(element: ArchitecturalElement): Graphic {
  const width = lerp(110, 180, element.width)
  const body = lerp(180, 300, element.height)
  const depth = width * 0.16
  const left = 20
  const bottom = body + 30
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade), { salt: 3 }),
    solid('front', facade(left, top, width, body, 8, 0.9), element.primary, { salt: 8 }),
    solid('buttress-l', poly([[left - 8, top + body * 0.2], [left, top + body * 0.16], [left, bottom], [left - 10, bottom]], 3, 0.3), SHED_LIMESTONE, { salt: 3 }),
    solid('buttress-r', poly([[left + width, top + body * 0.16], [left + width + 8, top + body * 0.2], [left + width + 10, bottom], [left + width, bottom]], 4, 0.3), SHED_LIMESTONE, { salt: 4 }),
  ]
  const doorW = width * 0.34
  parts.push(opening('portal', lancet(left + width / 2 - doorW / 2, top + body * 0.42, doorW, body * 0.52), element.secondary))
  parts.push(opening('rose', disk(left + width / 2, top + body * 0.18, Math.min(16, width * 0.1)), mixHex(SHED_BLUE, SHED_INK, 0.4)))
  parts.push(construction('axis', `M${n(left + width / 2)} ${n(top)} L${n(left + width / 2)} ${n(bottom)}`))
  return sheet(element, parts, left + width + depth + 16, bottom + 8, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

/** Florian Gate: square brick gatehouse, passage, and a shallow cap. */
function gateBase(element: ArchitecturalElement): Graphic {
  const width = lerp(130, 220, element.width)
  const body = lerp(170, 280, element.height)
  const cap = body * 0.12
  const depth = width * 0.18
  const left = 22
  const bottom = body + cap + 20
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade), { salt: 5 }),
    solid('front', facade(left, top, width, body, 5, 0.7), element.primary, { salt: 5 }),
    solid('cap', poly([[left - 6, top], [left + width + 6, top], [left + width + 4, top - cap], [left + width / 2, top - cap - 8], [left - 4, top - cap]], 6, 0.35), element.secondary, { salt: 6 }),
  ]
  const passage = width * 0.46
  parts.push(opening('passage', roundArch(left + width / 2 - passage / 2, top + body * 0.38, passage, body * 0.58), mixHex(SHED_INK, SHED_BLUE, 0.25)))
  parts.push(hairline('crenel', `M${n(left + 8)} ${n(top + 10)} L${n(left + width - 8)} ${n(top + 10)}`))
  parts.push(construction('axis', `M${n(left + width / 2)} ${n(top - cap)} L${n(left + width / 2)} ${n(bottom)}`))
  return sheet(element, parts, left + width + depth + 12, bottom + 8, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, cap, depth)
}

/** Barbican: a round brick drum with one pointed passage. */
function defensiveGate(element: ArchitecturalElement): Graphic {
  const radius = lerp(70, 120, element.width)
  const body = lerp(140, 220, element.height)
  const cx = radius + 28
  const bottom = body + 24
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('drum', `M${n(cx - radius)} ${n(top + 16)} A${n(radius)} ${n(radius * 0.72)} 0 0 1 ${n(cx + radius)} ${n(top + 16)} L${n(cx + radius)} ${n(bottom)} L${n(cx - radius)} ${n(bottom)} Z`, element.primary, { salt: 7 }),
    solid('neck', poly([[cx - radius * 0.55, top + 8], [cx + radius * 0.55, top + 8], [cx + radius * 0.62, top + 22], [cx - radius * 0.62, top + 22]], 8, 0.3), SHED_LIMESTONE, { salt: 8 }),
  ]
  parts.push(opening('passage', lancet(cx - radius * 0.28, top + body * 0.4, radius * 0.56, body * 0.5), element.secondary))
  parts.push(hairline('hoop', `M${n(cx - radius + 4)} ${n(top + body * 0.35)} A${n(radius)} ${n(18)} 0 0 1 ${n(cx + radius - 4)} ${n(top + body * 0.35)}`))
  parts.push(construction('axis', `M${n(cx)} ${n(top)} L${n(cx)} ${n(bottom)}`))
  return sheet(element, parts, cx + radius + 16, bottom + 8, cx, bottom, { x: cx - radius, y: top, w: radius * 2, h: body }, 12, 0)
}

function townhouseFloor(element: ArchitecturalElement): Graphic {
  const width = lerp(120, 200, element.width)
  const body = lerp(90, 160, element.height)
  const depth = width * 0.1
  const left = 16
  const bottom = body + 16
  const top = bottom - body
  const glass = mixHex(SHED_BLUE, SHED_INK, 0.5)
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade), { salt: 9 }),
    solid('front', facade(left, top, width, body, 9, 0.7), element.primary, { salt: 9 }),
  ]
  const winW = width * 0.14
  const winH = body * 0.46
  for (const column of [0.22, 0.5, 0.78]) {
    const x = left + width * column - winW / 2
    parts.push(opening(`window-${column}`, poly([[x, top + body * 0.22], [x + winW, top + body * 0.22], [x + winW, top + body * 0.22 + winH], [x, top + body * 0.22 + winH]], 10, 0.15), glass))
  }
  parts.push(hairline('cornice', `M${n(left)} ${n(top + 6)} L${n(left + width)} ${n(top + 6)}`))
  return sheet(element, parts, left + width + depth + 8, bottom + 6, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

function renaissanceFloor(element: ArchitecturalElement): Graphic {
  const width = lerp(220, 400, element.width)
  const body = lerp(80, 140, element.height)
  const depth = width * 0.07
  const left = 14
  const bottom = body + 18
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade), { salt: 11 }),
    solid('front', facade(left, top, width, body, 11, 0.5), element.secondary, { salt: 11 }),
  ]
  const bay = width / 5
  for (let index = 0; index < 5; index += 1) {
    const x = left + bay * index + bay * 0.28
    parts.push(hairline(`pilaster-${index}`, `M${n(left + bay * index + 4)} ${n(top + 4)} L${n(left + bay * index + 4)} ${n(bottom - 4)}`))
    parts.push(opening(`bay-${index}`, roundArch(x, top + body * 0.22, bay * 0.44, body * 0.62), mixHex(SHED_BLUE, SHED_INK, 0.55)))
  }
  return sheet(element, parts, left + width + depth + 8, bottom + 6, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

function gothicWindows(element: ArchitecturalElement): Graphic {
  const width = lerp(110, 190, element.width)
  const body = lerp(120, 210, element.height)
  const depth = width * 0.12
  const left = 16
  const bottom = body + 16
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade), { salt: 12 }),
    solid('front', facade(left, top, width, body, 12, 0.8), element.primary, { salt: 12 }),
  ]
  const winW = width * 0.22
  parts.push(opening('lancet-l', lancet(left + width * 0.18, top + body * 0.16, winW, body * 0.7), mixHex(SHED_BLUE, SHED_INK, 0.45)))
  parts.push(opening('lancet-r', lancet(left + width * 0.58, top + body * 0.16, winW, body * 0.7), mixHex(SHED_BLUE, SHED_INK, 0.45)))
  parts.push(opening('quatrefoil', disk(left + width / 2, top + body * 0.12, width * 0.06), element.secondary))
  return sheet(element, parts, left + width + depth + 8, bottom + 6, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

/** A floor with a stone balcony that projects past the face. */
function balconyFloor(element: ArchitecturalElement): Graphic {
  const width = lerp(130, 220, element.width)
  const body = lerp(100, 170, element.height)
  const depth = width * 0.1
  const left = 24
  const bottom = body + 28
  const top = bottom - body
  const railY = top + body * 0.62
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(element.primary, SHED_INK, SHED_STYLE.sideShade), { salt: 13 }),
    solid('front', facade(left, top, width, body, 13, 0.7), element.primary, { salt: 13 }),
    solid('balcony', poly([[left + width * 0.12, railY], [left + width * 0.88, railY], [left + width * 0.94, railY + 16], [left + width * 0.06, railY + 16]], 14, 0.25), SHED_LIMESTONE, { salt: 14 }),
  ]
  for (let index = 0; index < 7; index += 1) {
    const x = left + width * 0.16 + index * width * 0.1
    parts.push(hairline(`baluster-${index}`, `M${n(x)} ${n(railY)} L${n(x)} ${n(railY + 14)}`))
  }
  const winW = width * 0.18
  parts.push(opening('door', roundArch(left + width / 2 - winW / 2, top + body * 0.18, winW, body * 0.46), element.secondary))
  return sheet(element, parts, left + width + depth + 10, bottom + 6, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

function archRow(element: ArchitecturalElement, count: number, pointed: boolean, deep: boolean): Graphic {
  const width = lerp(count === 1 ? 90 : 180, count === 1 ? 160 : 360, element.width)
  const body = lerp(pointed ? 120 : 90, pointed ? 200 : 150, element.height)
  const depth = deep ? width * 0.16 : width * 0.08
  const left = 16
  const bottom = body + 18
  const top = bottom - body
  const fill = deep ? element.secondary : element.primary
  const parts: DrawPart[] = [
    solid('side', rightSide(left, top, width, body, depth), mixHex(fill, SHED_INK, SHED_STYLE.sideShade), { salt: 15 }),
    solid('front', facade(left, top, width, body, 15, deep ? 0.4 : 0.7), fill, { salt: 15 }),
  ]
  const gap = width * (count === 1 ? 0.16 : 0.05)
  const archW = (width - gap * (count + 1)) / count
  for (let index = 0; index < count; index += 1) {
    const x = left + gap + index * (archW + gap)
    const path = pointed ? lancet(x, top + body * 0.18, archW, body * 0.74) : roundArch(x, top + body * 0.22, archW, body * 0.7)
    parts.push(opening(`arch-${index}`, path, mixHex(SHED_BLUE, SHED_INK, 0.6)))
  }
  if (deep) parts.push(hairline('courtyard', `M${n(left + 8)} ${n(top + body * 0.55)} L${n(left + width - 8)} ${n(top + body * 0.55)}`))
  return sheet(element, parts, left + width + depth + 8, bottom + 6, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, depth)
}

/** Cloth Hall attic: a long parapet of volutes and circular openings. */
function sukienniceAttic(element: ArchitecturalElement): Graphic {
  const width = lerp(240, 420, element.width)
  const body = lerp(70, 120, element.height)
  const left = 18
  const bottom = body + 16
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('sill', poly([[left, bottom - 10], [left + width, bottom - 10], [left + width, bottom], [left, bottom]], 16, 0.3), element.primary, { salt: 16 }),
  ]
  const bays = 5
  const bay = width / bays
  for (let index = 0; index < bays; index += 1) {
    const x = left + bay * index + bay / 2
    const d = [
      `M${n(x - bay * 0.42)} ${n(bottom - 10)}`,
      cubic([x - bay * 0.42, bottom - 10], [x - bay * 0.48, top + body * 0.2], [x - bay * 0.08, top], [x, top + 2]),
      cubic([x, top + 2], [x + bay * 0.08, top], [x + bay * 0.48, top + body * 0.2], [x + bay * 0.42, bottom - 10]),
      'Z',
    ].join(' ')
    parts.push(solid(`volute-${index}`, d, element.secondary, { salt: 20 + index }))
    parts.push(opening(`eye-${index}`, disk(x, top + body * 0.55, bay * 0.1), mixHex(SHED_BLUE, SHED_INK, 0.45)))
  }
  return sheet(element, parts, left + width + 12, bottom + 6, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, body, 0)
}

function steppedAttic(element: ArchitecturalElement): Graphic {
  const width = lerp(150, 260, element.width)
  const body = lerp(80, 140, element.height)
  const left = 16
  const bottom = body + 14
  const steps = [
    [left, bottom - 8],
    [left, bottom - body * 0.35],
    [left + width * 0.18, bottom - body * 0.35],
    [left + width * 0.18, bottom - body * 0.62],
    [left + width * 0.36, bottom - body * 0.62],
    [left + width * 0.36, bottom - body * 0.88],
    [left + width * 0.64, bottom - body * 0.88],
    [left + width * 0.64, bottom - body * 0.62],
    [left + width * 0.82, bottom - body * 0.62],
    [left + width * 0.82, bottom - body * 0.35],
    [left + width, bottom - body * 0.35],
    [left + width, bottom - 8],
  ] as Array<[number, number]>
  const parts: DrawPart[] = [
    solid('steps', poly(steps, 18, 0.35), element.primary, { salt: 18 }),
    opening('niche', roundArch(left + width * 0.4, bottom - body * 0.7, width * 0.2, body * 0.28), element.secondary),
  ]
  return sheet(element, parts, left + width + 10, bottom + 6, left + width / 2, bottom, { x: left, y: bottom - body, w: width, h: body }, body * 0.4, 0)
}

function parapet(element: ArchitecturalElement): Graphic {
  const width = lerp(180, 320, element.width)
  const body = lerp(48, 90, element.height)
  const left = 14
  const bottom = body + 12
  const top = bottom - body
  const parts: DrawPart[] = [solid('wall', facade(left, top, width, body, 19, 0.5), element.primary, { salt: 19 })]
  const count = 6
  const bay = width / count
  for (let index = 0; index < count; index += 1) {
    const x = left + bay * index + bay * 0.22
    parts.push(opening(`blind-${index}`, roundArch(x, top + body * 0.18, bay * 0.56, body * 0.7), element.secondary))
  }
  return sheet(element, parts, left + width + 8, bottom + 4, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, 0)
}

function gothicRoof(element: ArchitecturalElement): Graphic {
  const width = lerp(120, 220, element.width)
  const rise = lerp(90, 180, element.height) * lerp(0.75, 1, element.roof)
  const left = 20
  const bottom = rise + 16
  const parts: DrawPart[] = [
    solid('gable', poly([[left, bottom], [left + width, bottom], [left + width / 2, bottom - rise]], 21, 0.4), element.primary, { salt: 21 }),
    hairline('rafter', `M${n(left + 10)} ${n(bottom - 8)} L${n(left + width / 2)} ${n(bottom - rise + 8)} L${n(left + width - 10)} ${n(bottom - 8)}`),
    construction('axis', `M${n(left + width / 2)} ${n(bottom - rise)} L${n(left + width / 2)} ${n(bottom)}`),
  ]
  return sheet(element, parts, left + width + 12, bottom + 6, left + width / 2, bottom, { x: left, y: bottom - rise, w: width, h: rise }, rise, 0)
}

function townhouseRoof(element: ArchitecturalElement): Graphic {
  const width = lerp(110, 200, element.width)
  const rise = lerp(70, 130, element.height)
  const left = 18
  const bottom = rise + 18
  const eave = bottom - rise * 0.15
  const parts: DrawPart[] = [
    solid('gable', poly([[left, bottom], [left + width, bottom], [left + width - 8, eave], [left + width / 2, bottom - rise], [left + 8, eave]], 22, 0.35), element.primary, { salt: 22 }),
    opening('dormer', lancet(left + width / 2 - 10, bottom - rise * 0.55, 20, rise * 0.28), element.secondary),
    construction('ridge', `M${n(left + width / 2)} ${n(bottom - rise)} L${n(left + width / 2)} ${n(bottom)}`),
  ]
  return sheet(element, parts, left + width + 10, bottom + 6, left + width / 2, bottom, { x: left, y: bottom - rise, w: width, h: rise }, rise, 0)
}

function renaissanceRoof(element: ArchitecturalElement): Graphic {
  const width = lerp(200, 360, element.width)
  const body = lerp(50, 90, element.height)
  const left = 16
  const bottom = body + 14
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('hip', poly([[left, bottom], [left + width, bottom], [left + width - 18, top + 8], [left + 18, top + 8]], 23, 0.3), element.primary, { salt: 23 }),
    solid('rail', poly([[left + 10, top + 8], [left + width - 10, top + 8], [left + width - 14, top], [left + 14, top]], 24, 0.25), SHED_LIMESTONE, { salt: 24 }),
  ]
  for (let index = 0; index < 8; index += 1) {
    const x = left + 22 + index * ((width - 44) / 7)
    parts.push(hairline(`baluster-${index}`, `M${n(x)} ${n(top)} L${n(x)} ${n(top + 8)}`))
  }
  return sheet(element, parts, left + width + 8, bottom + 4, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, body * 0.4, 0)
}

function smallRoof(element: ArchitecturalElement): Graphic {
  const width = lerp(60, 110, element.width)
  const rise = lerp(36, 70, element.height)
  const left = 12
  const bottom = rise + 12
  const parts: DrawPart[] = [
    solid('cap', poly([[left, bottom], [left + width, bottom], [left + width * 0.72, bottom - rise * 0.7], [left + width / 2, bottom - rise], [left + width * 0.28, bottom - rise * 0.7]], 25, 0.3), element.secondary, { salt: 25 }),
  ]
  return sheet(element, parts, left + width + 8, bottom + 4, left + width / 2, bottom, { x: left, y: bottom - rise, w: width, h: rise }, rise, 0)
}

function gothicHelmet(element: ArchitecturalElement): Graphic {
  const width = lerp(70, 120, element.width)
  const rise = lerp(140, 240, element.height)
  const left = 16
  const bottom = rise + 14
  const cx = left + width / 2
  const neck = bottom - rise * 0.42
  const parts: DrawPart[] = [
    solid(
      'needle',
      [
        `M${n(left)} ${n(bottom)}`,
        cubic([left, bottom], [left + width * 0.2, neck], [cx - width * 0.08, neck - rise * 0.1], [cx, bottom - rise]),
        cubic([cx, bottom - rise], [cx + width * 0.08, neck - rise * 0.1], [left + width - width * 0.2, neck], [left + width, bottom]),
        'Z',
      ].join(' '),
      element.secondary,
      { salt: 26 },
    ),
    construction('axis', `M${n(cx)} ${n(bottom - rise)} L${n(cx)} ${n(bottom)}`),
  ]
  return sheet(element, parts, left + width + 10, bottom + 4, cx, bottom, { x: left, y: bottom - rise, w: width, h: rise }, rise, 0)
}

function krakowCrown(element: ArchitecturalElement): Graphic {
  const width = lerp(90, 150, element.width)
  const rise = lerp(100, 170, element.height)
  const left = 18
  const bottom = rise + 16
  const cx = left + width / 2
  const gallery = bottom - rise * 0.28
  const parts: DrawPart[] = [
    solid('drum', poly([[left + 8, bottom], [left + width - 8, bottom], [left + width - 4, gallery], [left + 4, gallery]], 27, 0.3), element.primary, { salt: 27 }),
    solid('spire', poly([[cx - width * 0.16, gallery], [cx + width * 0.16, gallery], [cx, bottom - rise]], 28, 0.3), element.secondary, { salt: 28 }),
  ]
  for (const side of [-1, 1]) {
    const x = cx + side * width * 0.38
    parts.push(solid(`pinnacle-${side}`, poly([[x - 4, gallery], [x + 4, gallery], [x, gallery - 22]], 29, 0.2), SHED_LIMESTONE, { salt: 29 }))
  }
  parts.push(hairline('gallery', `M${n(left + 4)} ${n(gallery)} L${n(left + width - 4)} ${n(gallery)}`))
  return sheet(element, parts, left + width + 10, bottom + 4, cx, bottom, { x: left, y: bottom - rise, w: width, h: rise }, rise, 0)
}

function wawelHelmet(element: ArchitecturalElement): Graphic {
  const width = lerp(110, 180, element.width)
  const rise = lerp(50, 90, element.height)
  const left = 16
  const bottom = rise + 20
  const cx = left + width / 2
  const parts: DrawPart[] = [
    solid('hip', poly([[left, bottom - 8], [left + width, bottom - 8], [left + width * 0.78, bottom - rise], [left + width * 0.22, bottom - rise]], 30, 0.3), element.secondary, { salt: 30 }),
    solid('lantern', poly([[cx - 8, bottom - rise], [cx + 8, bottom - rise], [cx + 6, bottom - rise - 16], [cx - 6, bottom - rise - 16]], 31, 0.2), element.primary, { salt: 31 }),
    solid('cap', poly([[cx - 10, bottom - rise - 16], [cx + 10, bottom - rise - 16], [cx, bottom - rise - 28]], 32, 0.2), SHED_LIMESTONE, { salt: 32 }),
  ]
  return sheet(element, parts, left + width + 8, bottom + 4, cx, bottom, { x: left, y: bottom - rise - 28, w: width, h: rise + 28 }, rise, 0)
}

function starOrnament(element: ArchitecturalElement): Graphic {
  const size = lerp(48, 90, Math.max(element.width, element.height))
  const cx = 16 + size / 2
  const bottom = size + 12
  const points: Array<[number, number]> = []
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? size * 0.42 : size * 0.18
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    points.push([cx + Math.cos(angle) * radius, bottom - size * 0.55 + Math.sin(angle) * radius])
  }
  const parts: DrawPart[] = [
    solid('star', poly(points, 33, 0.25), element.primary, { salt: 33 }),
    solid('stem', poly([[cx - 3, bottom - 8], [cx + 3, bottom - 8], [cx + 3, bottom - size * 0.28], [cx - 3, bottom - size * 0.28]], 34, 0.15), element.secondary, { salt: 34 }),
  ]
  return sheet(element, parts, cx + size / 2 + 8, bottom + 4, cx, bottom, { x: cx - size / 2, y: bottom - size, w: size, h: size }, size * 0.2, 0)
}

function crestOrnament(element: ArchitecturalElement): Graphic {
  const width = lerp(70, 130, element.width)
  const body = lerp(36, 64, element.height)
  const left = 12
  const bottom = body + 10
  const mid = bottom - body * 0.45
  const parts: DrawPart[] = [
    solid(
      'crest',
      [
        `M${n(left)} ${n(mid)}`,
        cubic([left, mid], [left + width * 0.2, bottom - body], [left + width * 0.35, bottom - 6], [left + width / 2, bottom - body * 0.7]),
        cubic([left + width / 2, bottom - body * 0.7], [left + width * 0.65, bottom - 6], [left + width * 0.8, bottom - body], [left + width, mid]),
        `L${n(left + width)} ${n(bottom)} L${n(left)} ${n(bottom)} Z`,
      ].join(' '),
      element.primary,
      { salt: 35 },
    ),
  ]
  return sheet(element, parts, left + width + 8, bottom + 4, left + width / 2, bottom, { x: left, y: bottom - body, w: width, h: body }, body, 0)
}

function reliefOrnament(element: ArchitecturalElement): Graphic {
  const width = lerp(64, 120, element.width)
  const body = lerp(48, 90, element.height)
  const left = 12
  const bottom = body + 10
  const top = bottom - body
  const parts: DrawPart[] = [
    solid('panel', poly([[left, top + 6], [left + width, top], [left + width - 4, bottom], [left + 4, bottom - 4]], 36, 0.3), element.secondary, { salt: 36 }),
    opening('medallion', disk(left + width / 2, top + body * 0.48, Math.min(width, body) * 0.22), element.primary),
    hairline('frame', poly([[left + 6, top + 10], [left + width - 8, top + 6], [left + width - 10, bottom - 6], [left + 8, bottom - 8]], 37, 0.2)),
  ]
  return sheet(element, parts, left + width + 8, bottom + 4, left + width / 2, bottom, { x: left, y: top, w: width, h: body }, 0, 0)
}

export function buildCatalogSilhouette(element: ArchitecturalElement): Graphic | null {
  switch (element.catalogId) {
    case 'townhouse-base':
      return townhouseBase(element)
    case 'renaissance-base':
      return renaissanceBase(element)
    case 'gothic-base':
      return gothicBase(element)
    case 'gate-base':
      return gateBase(element)
    case 'defensive-gate':
      return defensiveGate(element)
    case 'townhouse-floor':
      return townhouseFloor(element)
    case 'renaissance-floor':
      return renaissanceFloor(element)
    case 'gothic-windows':
      return gothicWindows(element)
    case 'balcony-floor':
      return balconyFloor(element)
    case 'single-arch':
      return archRow(element, 1, false, false)
    case 'three-arch':
      return archRow(element, 3, false, false)
    case 'courtyard-arcade':
      return archRow(element, 4, false, true)
    case 'pointed-arcade':
      return archRow(element, 3, true, false)
    case 'sukiennice-attic':
      return sukienniceAttic(element)
    case 'stepped-attic':
      return steppedAttic(element)
    case 'parapet':
      return parapet(element)
    case 'gothic-roof':
      return gothicRoof(element)
    case 'townhouse-roof':
      return townhouseRoof(element)
    case 'renaissance-roof':
      return renaissanceRoof(element)
    case 'small-roof':
      return smallRoof(element)
    case 'gothic-helmet':
      return gothicHelmet(element)
    case 'krakow-crown':
      return krakowCrown(element)
    case 'wawel-helmet':
      return wawelHelmet(element)
    case 'star':
      return starOrnament(element)
    case 'crest':
      return crestOrnament(element)
    case 'relief':
      return reliefOrnament(element)
    default:
      return null
  }
}
