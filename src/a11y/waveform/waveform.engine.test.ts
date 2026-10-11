import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../../audio/engine/AudioEngine'
import { validateSelection } from '../../edit/dragFree/edits'
import { stepTimeline } from './time'

describe('keyboard waveform workflow', () => {
  it('moves the real playhead, edits the selection, previews, and trims', async () => {
    const engine = new AudioEngine()
    const rate = 48000
    const data = new Float32Array(rate)
    data.fill(0.25)
    expect(engine.loadPcm([data], rate, 'field-recording.wav')).toBe(true)
    const duration = engine.getSnapshot().duration
    expect(engine.getSnapshot().sampleRate).toBe(rate)

    engine.seekSeconds(0, 'sample')
    expect(engine.getSourcePlayheadSeconds()).toBeCloseTo(0, 5)

    const forward = stepTimeline(engine.getSourcePlayheadSeconds(), 1, duration, 0.1, rate)
    expect(forward.ok).toBe(true)
    if (!forward.ok) return
    engine.seekSeconds(forward.value, 'sample')
    expect(engine.getSourcePlayheadSeconds()).toBeCloseTo(forward.value, 5)

    const started = validateSelection(engine.getSourcePlayheadSeconds(), Math.min(duration, engine.getSourcePlayheadSeconds() + 0.4), duration)
    expect(started.ok).toBe(true)
    if (!started.ok) return
    engine.setRegion(started.value.start, started.value.end)
    expect(engine.getSnapshot().params.start).toBeCloseTo(started.value.start, 4)

    const again = stepTimeline(engine.getSourcePlayheadSeconds(), 1, duration, 0.1, rate)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    engine.seekSeconds(again.value, 'sample')
    const ended = validateSelection(started.value.start, engine.getSourcePlayheadSeconds(), duration)
    expect(ended.ok).toBe(true)
    if (!ended.ok) return
    engine.setRegion(ended.value.start, ended.value.end)
    expect(engine.getSnapshot().canClearSelection).toBe(true)
    expect(engine.getSnapshot().params.end).toBeCloseTo(ended.value.end, 4)

    await engine.playSelection()
    expect(engine.getSnapshot().previewPlaying).toBe(true)
    engine.stopPreview()
    expect(engine.getSnapshot().previewPlaying).toBe(false)

    const before = engine.getSnapshot().duration
    expect(await engine.trimPlayRegion()).toBe(true)
    expect(engine.getSnapshot().duration).toBeLessThan(before - 0.05)
    expect(engine.getSnapshot().fileName).toContain('trim')
  })
})
