/**
 * Before / After rows. A row is omitted when the change is below the reporting threshold
 * or the metric does not apply to the effect.
 */

import type { EqBand } from '../audio/engine/eqBands'
import type { BufferAnalysis, StereoMetrics } from './analyze'
import { eqBandDeltas } from './eqAssist'
import type { CompressorPicture, ReverbPicture } from './effectViz'
import { formatDb, formatDbDelta, formatHz } from './levels'

export type CompareRow = {
  id: string
  label: string
  before: string
  after: string
}

export type CompareEffect = 'eq' | 'gain' | 'compressor' | 'delay' | 'reverb' | 'stereo'

function changed(before: number | null, after: number | null, min: number): boolean {
  if (before === null || after === null) return false
  return Math.abs(after - before) >= min
}

function row(id: string, label: string, before: string, after: string): CompareRow {
  return { id, label, before, after }
}

export function gainCompare(before: BufferAnalysis, gainDb: number): CompareRow[] {
  if (Math.abs(gainDb) < 0.05 || before.silent) return []
  const rows: CompareRow[] = []
  if (before.peakDbfs !== null) {
    rows.push(row('peak', 'PEAK', formatDb(before.peakDbfs), formatDb(before.peakDbfs + gainDb)))
  }
  if (before.rmsDbfs !== null) {
    rows.push(row('rms', 'RMS', formatDb(before.rmsDbfs), formatDb(before.rmsDbfs + gainDb)))
  }
  return rows
}

export function eqCompare(analysis: BufferAnalysis, bands: readonly EqBand[], sampleRate: number): CompareRow[] {
  return eqBandDeltas(analysis, bands, sampleRate)
    .filter((band) => band.deltaDb !== null && Math.abs(band.deltaDb) >= 0.4)
    .map((band) =>
      row(
        band.id,
        `${band.label} ENERGY`,
        band.beforeDb === null ? '—' : `${band.beforeDb.toFixed(1)} dB`,
        band.deltaDb === null ? '—' : formatDbDelta(band.deltaDb),
      ),
    )
}

export function compressorCompare(before: BufferAnalysis, picture: CompressorPicture): CompareRow[] {
  const rows: CompareRow[] = []
  if (before.peakDbfs !== null && picture.points.length) {
    const outPeak = picture.points.reduce<number | null>((best, point) => {
      if (point.outputDb === null) return best
      return best === null ? point.outputDb : Math.max(best, point.outputDb)
    }, null)
    if (outPeak !== null && changed(before.peakDbfs, outPeak, 0.4)) {
      rows.push(row('peak', 'PEAK', formatDb(before.peakDbfs), formatDb(outPeak)))
    }
  }
  if (picture.peaksReduced) {
    rows.push(row('max-gr', 'MAX GAIN REDUCTION', '0 dB', formatDbDelta(picture.maxReductionDb)))
    rows.push(row('avg-gr', 'AVERAGE GAIN REDUCTION', '0 dB', formatDbDelta(picture.averageReductionDb)))
  }
  if (before.crestDb !== null && picture.peaksReduced) {
    rows.push(row('dynamics', 'PEAKS REDUCED', `${before.crestDb.toFixed(1)} dB crest`, 'Gain reduction on peaks'))
  }
  return rows
}

export function delayCompare(firstRepeatSec: number | null, feedback: number, wet: number): CompareRow[] {
  if (firstRepeatSec === null) return []
  return [
    row('repeat', 'FIRST REPEAT', 'direct', `${Math.round(firstRepeatSec * 1000)} ms`),
    row('feedback', 'FEEDBACK', '—', `${Math.round(feedback)}%`),
    row('wet', 'WET', 'dry', `${Math.round(wet)}%`),
  ]
}

export function reverbCompare(picture: ReverbPicture): CompareRow[] {
  return [
    row('direct', 'DIRECT', '100%', `${Math.round(picture.direct * 100)}%`),
    row('wet', 'WET', '0%', `${Math.round(picture.wet * 100)}%`),
    row('tail', 'TAIL', '—', `${picture.duration.toFixed(2)} s parameter-derived`),
    row('early', 'EARLY REFLECTIONS', '—', `${picture.early.length}`),
  ]
}

export function stereoCompare(before: StereoMetrics | null, after: StereoMetrics | null): CompareRow[] {
  if (!before || !after) return []
  const rows: CompareRow[] = []
  if (Math.abs(before.balance - after.balance) >= 0.04) {
    rows.push(
      row(
        'balance',
        'BALANCE',
        balanceText(before),
        balanceText(after),
      ),
    )
  }
  if (Math.abs(before.width - after.width) >= 0.03) {
    rows.push(row('width', 'WIDTH', `${Math.round(before.width * 100)}%`, `${Math.round(after.width * 100)}%`))
  }
  if (Math.abs(before.correlation - after.correlation) >= 0.05) {
    rows.push(
      row('correlation', 'CORRELATION', before.correlation.toFixed(2), after.correlation.toFixed(2)),
    )
  }
  return rows
}

function balanceText(metrics: StereoMetrics): string {
  if (metrics.balanceSide === 'C') return 'CENTER'
  return `${metrics.balanceSide} ${Math.round(metrics.balancePct)}%`
}

export function dominantCompare(beforeHz: number | null, afterHz: number | null): CompareRow[] {
  if (beforeHz === null || afterHz === null || Math.abs(afterHz - beforeHz) < 3) return []
  return [row('dominant', 'DOMINANT FREQUENCY', formatHz(beforeHz), formatHz(afterHz))]
}
