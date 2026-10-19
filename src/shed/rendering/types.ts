import type { ColorTreatment, InkStyle, OrnamentId } from '../model'

/** A point in element space. Y grows downward. */
export type Point = readonly [number, number]

export type Curve =
  | { op: 'L'; to: Point }
  | { op: 'C'; c1: Point; c2: Point; to: Point }

/** Architectural contour before ink or color treatment. */
export type Contour = {
  id: string
  closed: boolean
  start: Point
  curves: Curve[]
}

export type SketchLayer = 'color' | 'ink' | 'construction' | 'ornament' | 'hatch'

export type SketchPointer = 'none' | 'fill'

export type SketchPart = {
  id: string
  d: string
  layer: SketchLayer
  fill: string
  fillOpacity?: number
  opacity?: number
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  strokeDasharray?: string
  fillRule?: 'evenodd' | 'nonzero'
  pointerEvents?: SketchPointer
}

export type Box = {
  x: number
  y: number
  w: number
  h: number
}

export type HelmetKind = 'needle' | 'lantern' | 'asymmetric'

export type WindowRhythm = 'single' | 'paired' | 'mixed'

export type SideExtension = 'none' | 'left' | 'right'

/** Structural choices driven by the element seed, not by position. */
export type TowerVariation = {
  helmet: HelmetKind
  sections: number
  rhythm: WindowRhythm
  extension: SideExtension
  arches: number
  crockets: number
  clock: boolean
  lean: number
}

export type SketchGraphic = {
  width: number
  height: number
  anchorX: number
  anchorY: number
  body: Box
  roofHeight: number
  primary: string
  secondary: string
  parts: SketchPart[]
  ornament: OrnamentId
  seed: number
  abstraction: number
  inkStyle: InkStyle
  colorTreatment: ColorTreatment
  variation: TowerVariation
}
