import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_A11Y_SETTINGS, persistA11ySettings } from '../settings'
import { AccessibleWaveform } from './AccessibleWaveform'
import { resetLandmarkCache, landmarkScanCount, readLandmarkCache, recordingKey } from './cache'
import { detectLandmarks, detectLandmarksCancellable } from './detect'
import { startLandmarkJob } from './job'
import { assembleLandmarks, thinLandmarks, visibleLandmarks, neighborLandmark } from './landmarks'
import { measureWindow } from './measure'
import { formatAccessibleClock, kilohertzLabel, navStepSeconds, speakAccessibleTime, stepTimeline } from './time'
import { parseEditTime } from '../../edit/dragFree/timeEntry'
import { validatePlayhead, validateSelection } from '../../edit/dragFree/edits'

function tone(sampleRate: number, seconds: number, at: (index: number) => number): Float32Array {
  const data = new Float32Array(Math.round(seconds * sampleRate))
  for (let i = 0; i < data.length; i++) data[i] = at(i)
  return data
}

function series(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

describe('timeline navigation', () => {
  it('steps by milliseconds without drifting and rejects an invalid time', () => {
    let time = 0
    for (let i = 0; i < 10; i++) {
      const next = stepTimeline(time, 1, 5, 0.1, 48000)
      expect(next.ok).toBe(true)
      if (next.ok) time = next.value
    }
    expect(time).toBe(1)
    expect(formatAccessibleClock(12.35)).toBe('00:12.350')
    expect(formatAccessibleClock(3661.25)).toBe('1:01:01.250')
    expect(speakAccessibleTime(12.35, 'en')).toContain('12.35 seconds')
    expect(validatePlayhead(-0.01, 2).ok).toBe(false)
    expect(validatePlayhead(3, 2).ok).toBe(false)
    expect(parseEditTime('nope').ok).toBe(false)
    expect(validateSelection(1, 1, 4).ok).toBe(false)
    const start = stepTimeline(4, -1, 4, 10, 48000)
    expect(start.ok && start.value).toBe(0)
    const end = stepTimeline(4, 1, 4, 0.1, 48000)
    expect(end.ok && end.value).toBe(4)
  })

  it('moves one sample at 44.1 kHz and 48 kHz', () => {
    for (const rate of [44100, 48000]) {
      expect(navStepSeconds('sample', rate)).toBe(1 / rate)
      expect(kilohertzLabel(rate)).toBe(rate === 44100 ? '44.1' : '48')
      let time = 0
      for (let i = 0; i < 100; i++) {
        const next = stepTimeline(time, 1, 2, 1 / rate, rate)
        expect(next.ok).toBe(true)
        if (next.ok) time = next.value
      }
      expect(Math.round(time * rate)).toBe(100)
      const back = stepTimeline(2, -1, 2, 1 / rate, rate)
      expect(back.ok).toBe(true)
      if (back.ok) expect(Math.round(back.value * rate)).toBe(Math.round(2 * rate) - 1)
    }
  })
})

describe('audio landmarks', () => {
  it('marks silence, impulses, a tone, noise, and a stereo impulse', async () => {
    const rate = 48000
    const silence = await detectLandmarks([tone(rate, 1, () => 0)], rate)
    expect(silence.some((mark) => mark.type === 'low-level-start' && mark.time < 0.03)).toBe(true)
    expect(silence.some((mark) => mark.type === 'low-level-end' && Math.abs(mark.time - 1) < 0.03)).toBe(true)
    expect(silence.some((mark) => mark.type === 'transient')).toBe(false)

    const impulseAt = Math.round(0.4 * rate)
    const impulse = await detectLandmarks([tone(rate, 1, (index) => (index === impulseAt ? 1 : 0))], rate)
    const hits = impulse.filter((mark) => mark.type === 'transient').map((mark) => mark.time)
    expect(hits.some((time) => Math.abs(time - 0.4) < 0.05)).toBe(true)
    expect(hits.length).toBeLessThan(8)

    const many = await detectLandmarks(
      [tone(rate, 1, (index) => ([0.2, 0.5, 0.8].some((sec) => index === Math.round(sec * rate)) ? 1 : 0))],
      rate,
    )
    expect(many.filter((mark) => mark.type === 'transient').length).toBeGreaterThanOrEqual(2)

    const sustained = await detectLandmarks(
      [tone(rate, 1, (index) => Math.sin((2 * Math.PI * 440 * index) / rate) * 0.25)],
      rate,
    )
    expect(sustained.filter((mark) => mark.type === 'transient').length).toBeLessThan(6)
    expect(sustained.some((mark) => mark.type === 'low-level-start')).toBe(false)

    const quiet = series(3)
    const quietMarks = await detectLandmarks([tone(rate, 0.5, () => (quiet() - 0.5) * 0.0002)], rate)
    expect(quietMarks.some((mark) => mark.type === 'low-level-start')).toBe(true)

    const loud = series(9)
    const loudMarks = await detectLandmarks([tone(rate, 0.5, () => (loud() - 0.5) * 0.4)], rate)
    expect(loudMarks.some((mark) => mark.type === 'low-level-start')).toBe(false)

    const right = tone(rate, 0.2, () => 0)
    const left = tone(rate, 0.2, (index) => (index === Math.round(0.1 * rate) ? 0.8 : 0))
    const reading = measureWindow([left, right], rate, 0.1, 0.2)
    expect(reading?.channels).toHaveLength(2)
    expect(reading?.channels[0]?.peak ?? 0).toBeGreaterThan(0.5)
    expect(reading?.channels[1]?.peak ?? 1).toBeLessThan(0.01)
    expect(reading?.windowSec).toBeLessThanOrEqual(0.05 + 1e-6)
  })

  it('keeps exact boundaries and drops stale detected times', () => {
    const facts = {
      duration: 1,
      selectionStart: 0.2,
      selectionEnd: 0.5,
      selectionPartial: true,
      loopOn: true,
      loopStart: 0.2,
      loopEnd: 0.5,
    }
    const assembled = assembleLandmarks(facts, [
      { type: 'transient', time: 0.21 },
      { type: 'transient', time: 4 },
    ])
    expect(assembled.some((mark) => mark.type === 'recording-start' && mark.source === 'timeline')).toBe(true)
    expect(assembled.some((mark) => mark.type === 'recording-end')).toBe(true)
    expect(assembled.some((mark) => mark.type === 'selection-start')).toBe(true)
    expect(assembled.some((mark) => mark.type === 'loop-end')).toBe(true)
    expect(assembled.some((mark) => mark.type === 'transient' && mark.time > 1)).toBe(false)
    const thinned = thinLandmarks(assembled, false)
    expect(thinned.filter((mark) => mark.source === 'timeline')).toHaveLength(6)
    const onlySelection = visibleLandmarks(assembled, 'selection', false)
    expect(onlySelection.every((mark) => mark.type.startsWith('selection'))).toBe(true)
    expect(neighborLandmark(thinned, 0, 1)?.type).toBeTruthy()
    expect(neighborLandmark(thinned, 1, 1)).toBeNull()
  })

  it('cancels a scan and does not repeat a cached recording when only the caller changes', async () => {
    resetLandmarkCache()
    const rate = 16000
    const samples = tone(rate, 2, () => 0)
    let cancelled = false
    const pending = detectLandmarksCancellable([samples], rate, () => cancelled)
    cancelled = true
    expect(await pending).toBeNull()

    const identity = { revision: 4, sampleRate: rate, frames: samples.length, channels: 1 }
    const first = startLandmarkJob(identity, [samples], () => true)
    expect(await first.done).not.toBeNull()
    expect(landmarkScanCount()).toBe(1)
    const second = startLandmarkJob(identity, [samples], () => true)
    expect(await second.done).not.toBeNull()
    expect(landmarkScanCount()).toBe(1)
    expect(readLandmarkCache(recordingKey({ ...identity, revision: 5 }))).toBeNull()

    let current = 7
    const stale = startLandmarkJob({ ...identity, revision: 8 }, [samples], () => current === 7)
    current = 0
    expect(await stale.done).toBeNull()
  })

  it('scans a longer recording without throwing', async () => {
    const rate = 48000
    const started = performance.now()
    const marks = await detectLandmarks([tone(rate, 12, () => 0)], rate)
    expect(performance.now() - started).toBeLessThan(4000)
    expect(marks.length).toBeLessThan(20)
  })
})

describe('accessible waveform markup', () => {
  it('stays out of the tree until the preference is on', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    persistA11ySettings({ ...DEFAULT_A11Y_SETTINGS, accessibleWaveform: false })
    expect(renderToStaticMarkup(<AccessibleWaveform mode="technical" onRegionCommit={() => undefined} />)).toBe('')
    persistA11ySettings({ ...DEFAULT_A11Y_SETTINGS, accessibleWaveform: true })
    const html = renderToStaticMarkup(<AccessibleWaveform mode="simple" onRegionCommit={() => undefined} />)
    expect(html).toContain('Open waveform navigation')
    expect(html).toContain('type="button"')
    expect(html).not.toContain('aria-live')
    vi.unstubAllGlobals()
  })
})
