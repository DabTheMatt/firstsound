import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { defaultChain, factoryChain } from '../chain/chain'
import { ExportCheck } from '../../components/samplePrep/ExportCheck'
import { defaultPrep } from './state'
import {
  EXPORT_FORMATS,
  EXPORT_SAMPLE_RATES,
  SIMPLE_EXPORT_BIT_DEPTHS,
  SIMPLE_EXPORT_RATES,
  evaluateExportCheck,
  exportCheckAnnouncement,
  exportMeasurementKey,
  formatExportSampleRate,
  visibleExportFields,
  visibleExportIssues,
  type ExportCheckInput,
} from './exportCheck'

function input(patch: Partial<ExportCheckInput> = {}): ExportCheckInput {
  const duration = 2
  return {
    sampleLoaded: true,
    sourceSampleRate: 48000,
    sourceChannels: 2,
    bufferDuration: duration,
    regionStart: 0,
    regionEnd: duration,
    prep: defaultPrep(duration),
    scope: 'project',
    format: 'wav',
    sampleRate: 48000,
    bitDepth: 24,
    chain: defaultChain(),
    bufferRev: 3,
    processingStamp: 'mix-a',
    ...patch,
  }
}

describe('export check', () => {
  it('blocks export when no audio is loaded', () => {
    const result = evaluateExportCheck(input({ sampleLoaded: false, bufferDuration: 0, sourceSampleRate: 0 }))
    expect(result.canExport).toBe(false)
    expect(result.status).toBe('error')
    expect(result.issues.map((issue) => issue.id)).toEqual(['no-audio'])
    expect(result.measuredPeak).toBeNull()
  })

  it('rejects a reversed range without swapping the selection', () => {
    const prep = defaultPrep(2)
    prep.windowStart = 1.5
    prep.windowEnd = 0.25
    const result = evaluateExportCheck(input({ prep }))
    expect(result.canExport).toBe(false)
    expect(result.issues.some((issue) => issue.id === 'invalid-range')).toBe(true)
    expect(result.rangeStart).toBe(1.5)
    expect(result.rangeEnd).toBe(0.25)
    expect(prep.windowStart).toBe(1.5)
    expect(prep.windowEnd).toBe(0.25)
  })

  it('rejects a zero-length range', () => {
    const result = evaluateExportCheck(
      input({
        scope: 'selection',
        regionStart: 0.4,
        regionEnd: 0.4,
      }),
    )
    expect(result.canExport).toBe(false)
    expect(result.issues.some((issue) => issue.id === 'zero-length')).toBe(true)
  })

  it('rejects a range outside the audio without clamping it', () => {
    const prep = defaultPrep(2)
    prep.windowEnd = 4
    const result = evaluateExportCheck(input({ prep }))
    expect(result.canExport).toBe(false)
    expect(result.issues.some((issue) => issue.id === 'range-outside')).toBe(true)
    expect(result.rangeEnd).toBe(4)
    expect(prep.windowEnd).toBe(4)
  })

  it('accepts a full export at the file rate', () => {
    const result = evaluateExportCheck(input({ sampleRate: 'original' }))
    expect(result.canExport).toBe(true)
    expect(result.status).toBe('valid')
    expect(result.format).toBe('wav')
    expect(result.sampleRateHz).toBe(48000)
    expect(result.rateIsOriginal).toBe(true)
    expect(result.bitDepth).toBe(24)
    expect(result.bitDepthKind).toBe('pcm')
    expect(result.dither).toBe(false)
    expect(result.channels).toBe('stereo')
    expect(result.channelCount).toBe(2)
    expect(result.rangeKind).toBe('full')
    expect(result.rangeValid).toBe(true)
    expect(result.duration).toBeCloseTo(2)
    expect(result.effectsIncluded).toBe(false)
  })

  it('accepts a partial selection export', () => {
    const result = evaluateExportCheck(
      input({
        scope: 'selection',
        regionStart: 0.25,
        regionEnd: 1.25,
        requirePartial: true,
      }),
    )
    expect(result.canExport).toBe(true)
    expect(result.rangeKind).toBe('selection')
    expect(result.rangeStart).toBeCloseTo(0.25)
    expect(result.rangeEnd).toBeCloseTo(1.25)
    expect(result.duration).toBeCloseTo(1)
  })

  it('does not treat the whole file as a selection export', () => {
    const result = evaluateExportCheck(input({ scope: 'selection', requirePartial: true }))
    expect(result.canExport).toBe(false)
    expect(result.issues.some((issue) => issue.id === 'selection-not-partial')).toBe(true)
  })

  it('rejects formats this exporter cannot write', () => {
    expect(EXPORT_FORMATS).toEqual(['wav'])
    for (const format of ['mp3', 'flac', 'aiff']) {
      const result = evaluateExportCheck(input({ format }))
      expect(result.canExport, format).toBe(false)
      expect(result.formatSupported, format).toBe(false)
      expect(result.format, format).toBeNull()
      expect(result.issues.some((issue) => issue.id === 'unsupported-format')).toBe(true)
    }
  })

  it('rejects sample rates the exporter does not list', () => {
    expect(EXPORT_SAMPLE_RATES).toEqual([44100, 48000, 88200, 96000])
    const result = evaluateExportCheck(input({ sampleRate: 22050 }))
    expect(result.canExport).toBe(false)
    expect(result.issues.some((issue) => issue.id === 'unsupported-rate')).toBe(true)
    const simple = evaluateExportCheck(
      input({ sampleRate: 96000, allowedRates: SIMPLE_EXPORT_RATES }),
    )
    expect(simple.canExport).toBe(false)
    const original = evaluateExportCheck(input({ sampleRate: 'original', sourceSampleRate: 22050 }))
    expect(original.sampleRateSupported).toBe(true)
    expect(original.sampleRateHz).toBe(22050)
  })

  it('reports channel format without changing the project', () => {
    const prep = defaultPrep(2)
    prep.channelMode = 'left'
    const left = evaluateExportCheck(input({ prep, sourceChannels: 2 }))
    expect(left.channels).toBe('left')
    expect(left.channelCount).toBe(1)
    expect(prep.channelMode).toBe('left')

    const mono = evaluateExportCheck(input({ forceMono: true, prep }))
    expect(mono.channels).toBe('mono')
    expect(mono.channelCount).toBe(1)
    expect(prep.channelMode).toBe('left')

    const swap = evaluateExportCheck(input({ prep: { ...defaultPrep(2), channelMode: 'swap' }, sourceChannels: 1 }))
    expect(swap.channels).toBe('mono')
    expect(swap.channelCount).toBe(1)
    expect(swap.issues.some((issue) => issue.id === 'swap-without-pair')).toBe(true)

    const stereo = evaluateExportCheck(input({ sourceChannels: 2 }))
    expect(stereo.channels).toBe('stereo')
    expect(stereo.channelCount).toBe(2)
  })

  it('names active effects from the chain and ignores bypassed modules', () => {
    const chain = factoryChain().map((mod) => (mod.type === 'eq' || mod.type === 'reverb' ? { ...mod, bypassed: false } : mod))
    const result = evaluateExportCheck(input({ chain }))
    expect(result.effectsIncluded).toBe(true)
    expect(result.activeEffects).toEqual(['eq', 'reverb'])
    const bypassed = evaluateExportCheck(input())
    expect(bypassed.effectsIncluded).toBe(false)
    expect(bypassed.activeEffects).toEqual([])
  })

  it('distinguishes PCM, dither, and float without inventing dither', () => {
    expect(evaluateExportCheck(input({ bitDepth: 16 })).dither).toBe(true)
    expect(evaluateExportCheck(input({ bitDepth: 16 })).bitDepthKind).toBe('pcm')
    expect(evaluateExportCheck(input({ bitDepth: 24 })).dither).toBe(false)
    const float = evaluateExportCheck(input({ bitDepth: 32 }))
    expect(float.bitDepthKind).toBe('float')
    expect(float.dither).toBe(false)
    const simple = evaluateExportCheck(input({ bitDepth: 32, allowedBitDepths: SIMPLE_EXPORT_BIT_DEPTHS }))
    expect(simple.canExport).toBe(false)
    expect(simple.issues.some((issue) => issue.id === 'unsupported-depth')).toBe(true)
  })

  it('does not claim the file is clip-free when export output was not measured', () => {
    const result = evaluateExportCheck(input())
    expect(result.measuredPeak).toBeNull()
    expect(result.measurementFresh).toBe(false)
    expect(result.issues.some((issue) => issue.id === 'clip-unmeasured')).toBe(true)
    expect(result.issues.some((issue) => issue.id === 'clip-within' || issue.id === 'clip-detected')).toBe(false)
    expect(result.canExport).toBe(true)
  })

  it('drops a stale peak and keeps a fresh one', () => {
    const current = input()
    const key = exportMeasurementKey(current)
    const fresh = evaluateExportCheck(current)
    const withPeak = evaluateExportCheck({
      ...current,
      measurement: { kind: 'export-output', peak: 1.4, key },
    })
    expect(withPeak.measurementFresh).toBe(true)
    expect(withPeak.measuredPeak).toBe(1.4)
    expect(withPeak.status).toBe('warning')
    expect(withPeak.canExport).toBe(true)
    expect(withPeak.issues.some((issue) => issue.id === 'clip-detected')).toBe(true)

    const stale = evaluateExportCheck({
      ...current,
      processingStamp: 'mix-b',
      measurement: { kind: 'export-output', peak: 1.4, key },
    })
    expect(stale.measuredPeak).toBeNull()
    expect(stale.measurementFresh).toBe(false)
    expect(stale.issues.some((issue) => issue.id === 'clip-detected')).toBe(false)
    expect(stale.issues.some((issue) => issue.id === 'clip-unmeasured')).toBe(true)

    const within = evaluateExportCheck({
      ...current,
      measurement: { kind: 'export-output', peak: 0.5, key },
    })
    expect(within.measuredPeak).toBe(0.5)
    expect(within.issues.some((issue) => issue.id === 'clip-within')).toBe(true)
    expect(fresh.measuredPeak).toBeNull()
  })

  it('formats rates and hides advanced rows in simple mode', () => {
    expect(formatExportSampleRate(48000, 'en')).toBe('48 kHz')
    expect(formatExportSampleRate(44100, 'pl')).toBe('44,1 kHz')
    expect(visibleExportFields('simple')).toEqual(['format', 'range'])
    expect(visibleExportFields('technical')).toContain('depth')
    expect(visibleExportFields('sensory')).toContain('channels')
    const issues = evaluateExportCheck(
      input({
        sampleRate: 44100,
        chain: factoryChain().map((mod) => (mod.type === 'delay' ? { ...mod, bypassed: false } : mod)),
      }),
    ).issues
    const simple = visibleExportIssues('simple', issues).map((issue) => issue.id)
    expect(simple).toContain('effects-included')
    expect(simple).toContain('clip-unmeasured')
    expect(simple).not.toContain('resample')
    expect(visibleExportIssues('technical', issues).map((issue) => issue.id)).not.toContain('effects-included')
    expect(visibleExportIssues('technical', issues).map((issue) => issue.id)).toContain('resample')
  })

  it('does not repeat an unchanged warning', () => {
    const issues = evaluateExportCheck(input({ format: 'mp3' })).issues
    const first = exportCheckAnnouncement(null, 'error', issues)
    expect(first.announce).toBe('problems')
    const again = exportCheckAnnouncement(first.signature, 'error', issues)
    expect(again.announce).toBeNull()
    const recovered = exportCheckAnnouncement(first.signature, 'valid', [])
    expect(recovered.announce).toBe('recovered')
  })

  it('exposes labels and severity words for assistive technology', () => {
    const valid = evaluateExportCheck(input())
    const html = renderToStaticMarkup(<ExportCheck result={valid} mode="technical" />)
    expect(html).toContain('Export check')
    expect(html).toContain('Settings valid')
    expect(html).toContain('Info')
    expect(html).toContain('aria-labelledby')
    expect(html).toContain('data-export-check')
    expect(html).not.toContain('free of clipping is confirmed')

    const blocked = evaluateExportCheck(input({ sampleLoaded: false }))
    const errorHtml = renderToStaticMarkup(<ExportCheck result={blocked} mode="sensory" onLoadAudio={() => undefined} />)
    expect(errorHtml).toContain('Error')
    expect(errorHtml).toContain('No audio is loaded.')
    expect(errorHtml).toContain('Load audio')
    expect(errorHtml).toContain('type="button"')
    expect(errorHtml).toContain('data-severity="error"')
  })
})
