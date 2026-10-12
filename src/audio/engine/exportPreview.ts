/**
 * Short export preview. Uses the same prep and offline chain as export.
 * The result is floating-point audio before WAV quantization.
 */

import { applyGain, peakAmplitude } from '../samplePrep/prepare'
import { renderPrep } from '../samplePrep/render'
import {
  DEFAULT_NORMALIZE_DBFS,
  type ExportSettings,
  type Pcm,
  type SamplePrepState,
} from '../samplePrep/types'
import { dbToGain } from '../parameters/mapping'
import { renderProcessedPcm, type ProcessedRenderOptions, type ProcessingSnapshot } from './offlineRender'

export const EXPORT_PREVIEW_SECONDS = [5, 8, 10] as const
export type ExportPreviewSeconds = (typeof EXPORT_PREVIEW_SECONDS)[number]
export const DEFAULT_EXPORT_PREVIEW_SEC = 8

const MIN_SPAN = 0.001

export type ExportPreviewAnchor = 'playhead' | 'range-start'

export type ExportPreviewPlan = {
  exportStart: number
  exportEnd: number
  /** Seconds into the prepared export, before the effect chain. */
  localStartSec: number
  /** Source length before the effect tail. */
  localDurSec: number
  anchor: ExportPreviewAnchor
  /** Playhead was outside the export range. The window stays at the range start. */
  playheadOutside: boolean
}

export function previewWasCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * Window inside the export range. A playhead outside that range does not
 * move the window to some other region without `playheadOutside`.
 */
export function planExportPreview(input: {
  exportStart: number
  exportEnd: number
  playhead: number
  durationSec: number
  reversed?: boolean
}): ExportPreviewPlan | null {
  const exportStart = input.exportStart
  const exportEnd = input.exportEnd
  if (!Number.isFinite(exportStart) || !Number.isFinite(exportEnd) || exportEnd < exportStart) return null
  const span = exportEnd - exportStart
  if (!(span > MIN_SPAN)) return null
  const requested = Number.isFinite(input.durationSec) ? Math.min(10, Math.max(MIN_SPAN, input.durationSec)) : DEFAULT_EXPORT_PREVIEW_SEC
  const playhead = input.playhead
  const inside = Number.isFinite(playhead) && playhead >= exportStart - 1e-4 && playhead < exportEnd - 1e-3
  let local = 0
  let anchor: ExportPreviewAnchor = 'range-start'
  let playheadOutside = false
  if (!inside) {
    playheadOutside = true
  } else {
    const fromStart = Math.min(span, Math.max(0, playhead - exportStart))
    local = input.reversed ? Math.max(0, span - fromStart) : fromStart
    if (local > span - MIN_SPAN) local = Math.max(0, span - MIN_SPAN)
    anchor = 'playhead'
  }
  const localDurSec = Math.min(requested, Math.max(0, span - local))
  if (!(localDurSec > MIN_SPAN)) return null
  return {
    exportStart,
    exportEnd,
    localStartSec: local,
    localDurSec,
    anchor,
    playheadOutside,
  }
}

export function previewCoversExport(plan: ExportPreviewPlan): boolean {
  const span = plan.exportEnd - plan.exportStart
  return plan.localStartSec <= 0.001 && plan.localDurSec >= span - 0.001
}

function slicePcm(pcm: Pcm, startSec: number, durSec: number): Pcm | null {
  const rate = pcm.sampleRate
  const length = pcm.channels[0]?.length ?? 0
  if (!(rate > 0) || length < 1 || !(durSec > 0)) return null
  const start = Math.max(0, Math.min(length - 1, Math.floor(startSec * rate)))
  const end = Math.max(start + 1, Math.min(length, Math.ceil((startSec + durSec) * rate)))
  if (end - start < 1) return null
  return {
    sampleRate: rate,
    channels: pcm.channels.map((ch) => ch.slice(start, end)),
  }
}

/**
 * Render the export slice the same way `renderExportPcm` renders a file.
 * Peak normalize runs only when the window is the whole export, because
 * normalize is measured on the finished file.
 */
export async function renderExportPreviewPcm(
  source: Pcm,
  prep: SamplePrepState,
  settings: ExportSettings,
  processing: ProcessingSnapshot,
  plan: ExportPreviewPlan,
  options: ProcessedRenderOptions = {},
): Promise<Pcm> {
  const prepared = renderPrep(source, prep, {
    applyFades: settings.applyFades,
    applyGain: settings.applyGain,
    applyReverse: settings.applyReverse,
    applyNormalize: false,
    applyDc: prep.removeDc,
    applyChannels: true,
    sampleRate: settings.sampleRate,
    range: { start: plan.exportStart, end: plan.exportEnd },
  })
  const sliced = slicePcm(prepared, plan.localStartSec, plan.localDurSec)
  if (!sliced) {
    return { sampleRate: prepared.sampleRate || source.sampleRate || 44100, channels: [new Float32Array()] }
  }
  const processed = await renderProcessedPcm(sliced, processing, {
    ...options,
    timelineStart: plan.exportStart + plan.localStartSec,
    clockOriginSec: plan.localStartSec,
    includeEffectTail: settings.includeEffectTail ?? options.includeEffectTail,
  })
  if (!settings.applyNormalize || !previewCoversExport(plan)) return processed
  const peak = peakAmplitude(processed.channels)
  const target = dbToGain(prep.normalizeTargetDbfs || DEFAULT_NORMALIZE_DBFS)
  if (!(peak > 1e-8)) return processed
  return { sampleRate: processed.sampleRate, channels: applyGain(processed.channels, target / peak) }
}

export function exportPreviewSignature(parts: readonly (string | number | boolean)[]): string {
  return parts.map((part) => String(part)).join('\u001f')
}
