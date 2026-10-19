import type { ElementType, ParamKey } from './model'

export type InspectorField =
  | 'height'
  | 'width'
  | 'roof'
  | 'ornament'
  | 'variant'
  | ParamKey

const COMMON_SIZE: InspectorField[] = ['height', 'width', 'variant']

const BY_TYPE: Record<ElementType, InspectorField[]> = {
  tower: [...COMMON_SIZE, 'proportion', 'roof', 'windows', 'ornament'],
  facade: [...COMMON_SIZE, 'floors', 'windows', 'entrance', 'gable'],
  roof: [...COMMON_SIZE, 'pitch', 'roofline', 'ridge'],
  arcade: [...COMMON_SIZE, 'arches', 'archHeight', 'column'],
  gate: [...COMMON_SIZE, 'passage', 'crenellation'],
  attic: [...COMMON_SIZE, 'parapet', 'density'],
  ornament: [...COMMON_SIZE, 'density'],
}

export function inspectorFields(type: ElementType): InspectorField[] {
  return BY_TYPE[type]
}

export function showsField(type: ElementType, field: InspectorField): boolean {
  return BY_TYPE[type].includes(field)
}
