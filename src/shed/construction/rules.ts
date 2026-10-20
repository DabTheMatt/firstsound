import type { AttachmentType, ConstructionRole } from '../model'

/**
 * What a supporting role may carry on each anchor.
 * Variants narrow this further through the anchors listed on a catalog entry.
 */
export const CONSTRUCTION_RULES: Record<ConstructionRole, Partial<Record<AttachmentType, readonly ConstructionRole[]>>> = {
  ground: {
    LEFT: ['ground', 'arcade', 'gate'],
    RIGHT: ['ground', 'arcade', 'gate'],
    TOP: ['upper', 'arcade', 'attic', 'tower', 'roof'],
  },
  upper: {
    LEFT: ['upper'],
    RIGHT: ['upper'],
    TOP: ['upper', 'attic', 'roof', 'tower'],
  },
  arcade: {
    LEFT: ['arcade', 'ground', 'gate'],
    RIGHT: ['arcade', 'ground', 'gate'],
    TOP: ['ground', 'upper', 'attic'],
  },
  gate: {
    LEFT: ['ground', 'gate', 'arcade'],
    RIGHT: ['ground', 'gate', 'arcade'],
    TOP: ['upper', 'attic', 'tower', 'roof'],
  },
  attic: {
    TOP: ['roof', 'ornament', 'tower'],
  },
  roof: {
    TOP: ['ornament'],
  },
  tower: {
    LEFT: ['tower', 'ground', 'gate'],
    RIGHT: ['tower', 'ground', 'gate'],
    TOP: ['tower', 'helmet'],
  },
  helmet: {
    TOP: ['ornament'],
  },
  ornament: {},
}

export function childRoles(parent: ConstructionRole, attachment: AttachmentType): readonly ConstructionRole[] {
  return CONSTRUCTION_RULES[parent][attachment] ?? []
}

export function canAttach(parent: ConstructionRole, attachment: AttachmentType, child: ConstructionRole): boolean {
  return childRoles(parent, attachment).includes(child)
}

/** Horizontal growth stays on a storey that already has a support, or on a tower that stands on the ground. */
export function allowsLateral(role: ConstructionRole, grounded: boolean): boolean {
  if (role === 'ground' || role === 'upper' || role === 'arcade' || role === 'gate') return true
  if (role === 'tower') return grounded
  return false
}
