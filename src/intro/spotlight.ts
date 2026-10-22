import type { TourId } from './copy'

/** Existing controls only. A missing target simply draws no ring. */
export const TOUR_SPOTLIGHT: Record<TourId, string | null> = {
  sound: '[data-guide-target="waveform.main"], [data-load-sample]',
  modes: '[data-mode-switch]',
  edit: '[data-stable-region="transport"]',
  tone: '[data-guide-target="technical.effectChain"], [data-guide-target="effect.reverb"], [data-guide-target="effect.eq"]',
  access: '[data-settings-toggle]',
  look: '[data-theme-trigger]',
  save: '[data-export-open], [data-simple-export], [data-guide-target="export.open"]',
  together: null,
}

export type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

type Box = {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

export function visibleBox(box: Box, viewportHeight: number, viewportWidth: number): boolean {
  return box.width > 8 && box.height > 8 && box.bottom > 0 && box.right > 0 && box.top < viewportHeight && box.left < viewportWidth
}

export function spotlightRect(box: Box, margin = 6): SpotlightRect {
  return {
    top: Math.max(0, box.top - margin),
    left: Math.max(0, box.left - margin),
    width: box.width + margin * 2,
    height: box.height + margin * 2,
  }
}

export function findSpotlight(selector: string | null): HTMLElement | null {
  if (!selector || typeof document === 'undefined') return null
  const nodes = document.querySelectorAll<HTMLElement>(selector)
  const height = window.innerHeight
  const width = window.innerWidth
  for (const node of nodes) {
    const box = node.getBoundingClientRect()
    if (visibleBox(box, height, width)) return node
  }
  return null
}
