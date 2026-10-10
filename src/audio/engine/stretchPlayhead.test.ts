import 'node-web-audio-api/polyfill.js'
import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import { stretchLookahead, stretchWindow, GRAIN_OVERLAP_DEFAULT } from './stretch'

function tone(seconds: number, sampleRate: number): Float32Array[] {
  const frames = Math.round(sampleRate * seconds)
  const data = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate
    data[i] = 0.25 * Math.sin(2 * Math.PI * (80 + t * 40) * t)
  }
  return [data, data]
}

function installTimers(): void {
  const host = window as Window & {
    setInterval?: typeof setInterval
    clearInterval?: typeof clearInterval
  }
  if (typeof host.setInterval !== 'function') {
    host.setInterval = ((fn: TimerHandler, ms?: number) => setInterval(fn, ms)) as typeof setInterval
    host.clearInterval = ((id: number) => clearInterval(id)) as typeof clearInterval
  }
}

describe('pause holds the sounding stretch grain', () => {
  it('parks on the grain that has started, not the lookahead slice', async () => {
    installTimers()
    const engine = new AudioEngine()
    engine.useOfflineGraph(new OfflineAudioContext(2, 44100 * 3, 44100))
    const id = engine.getSnapshot().tracks[0]!.id
    expect(engine.loadTrackPcm(id, tone(2, 44100), 44100, 'glide.wav')).toBe(true)
    engine.setParam('pitch', 5)
    const start = engine.getSnapshot().params.start
    await engine.play()
    const heard = engine.getPlayheadSeconds()
    const queued = stretchLookahead(stretchWindow(GRAIN_OVERLAP_DEFAULT).hopSec)
    expect(Math.abs(heard - start)).toBeLessThan(0.02)
    expect(queued).toBeGreaterThan(0.05)

    engine.pause()
    expect(engine.getSnapshot().playing).toBe(false)
    expect(engine.getPlayheadSeconds()).toBeCloseTo(heard, 3)

    await engine.play()
    expect(engine.getPlayheadSeconds()).toBeCloseTo(heard, 2)
  })
})
