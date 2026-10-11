import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../engine/AudioEngine'
import { snapshotFromCapture } from '../engine/sampleEdit'

function tone(seconds: number, sampleRate = 48000): Float32Array[] {
  const frames = Math.round(seconds * sampleRate)
  const data = new Float32Array(frames)
  data.fill(0.2)
  return [data]
}

describe('engine user markers', () => {
  it('keeps ids, seeks without changing speed, and refuses another file', () => {
    const engine = new AudioEngine()
    expect(engine.addUserMarker(0.2, 'Early').ok).toBe(false)
    expect(engine.loadPcm(tone(2), 48000, 'take.wav')).toBe(true)
    const speed = engine.getSnapshot().params.speed
    const pitch = engine.getSnapshot().params.pitch
    const added = engine.addUserMarker(0.5, 'Bass entrance', 'low note')
    expect(added.ok).toBe(true)
    if (!added.ok) return
    expect(engine.getSnapshot().playing).toBe(false)
    expect(engine.getSnapshot().params.speed).toBe(speed)
    expect(engine.getSnapshot().params.pitch).toBe(pitch)
    expect(engine.getSnapshot().params.start).toBeLessThan(engine.getSnapshot().params.end)

    const renamed = engine.updateUserMarker(added.id, { name: 'Bass' })
    expect(renamed.ok).toBe(true)
    expect(engine.getSnapshot().userMarkers[0]?.id).toBe(added.id)
    expect(engine.getSnapshot().userMarkers[0]?.description).toBe('low note')

    const rejected = engine.updateUserMarker(added.id, { timeSeconds: 9, name: 'Nope' })
    expect(rejected.ok).toBe(false)
    expect(engine.getSnapshot().userMarkers[0]?.timeSeconds).toBeCloseTo(0.5)
    expect(engine.getSnapshot().userMarkers[0]?.name).toBe('Bass')

    expect(engine.goToUserMarker(added.id)?.timeSeconds).toBeCloseTo(0.5)
    expect(engine.getSnapshot().playing).toBe(false)
    expect(engine.getSnapshot().params.speed).toBe(speed)

    const preset = engine.toPreset()
    expect(engine.loadPcm(tone(2), 48000, 'other.wav')).toBe(true)
    expect(engine.getSnapshot().userMarkers).toEqual([])
    engine.applyPreset(preset)
    expect(engine.getSnapshot().userMarkers).toEqual([])

    expect(engine.loadPcm(tone(2), 48000, 'take.wav')).toBe(true)
    engine.applyPreset(preset)
    expect(engine.getSnapshot().userMarkers.map((marker) => marker.id)).toEqual([added.id])
    expect(engine.getSnapshot().userMarkers[0]?.name).toBe('Bass')
    expect(engine.getSnapshot().userMarkers[0]?.description).toBe('low note')
  })

  it('remaps markers with a timeline edit and restores them from the sample snapshot', () => {
    const engine = new AudioEngine()
    expect(engine.loadPcm(tone(2), 48000, 'take.wav')).toBe(true)
    const added = engine.addUserMarker(1.5, 'Later')
    expect(added.ok).toBe(true)
    const early = engine.addUserMarker(0.2, 'Early')
    expect(early.ok).toBe(true)
    const before = engine.captureSampleEdit()
    expect(before?.markers?.map((marker) => marker.name)).toEqual(['Early', 'Later'])
    engine.seekSeconds(1, 'sample')
    expect(engine.insertSilenceAtPlayhead()).toBe(true)
    const times = engine.getSnapshot().userMarkers.map((marker) => marker.timeSeconds)
    expect(times[0]).toBeCloseTo(0.2)
    expect(times[1]).toBeCloseTo(2.5)
    expect(engine.getSnapshot().userMarkers.map((marker) => marker.id)).toEqual([
      early.ok ? early.id : '',
      added.ok ? added.id : '',
    ])
    engine.restoreSamplePcm(snapshotFromCapture(before!))
    expect(engine.getSnapshot().userMarkers.map((marker) => marker.timeSeconds)).toEqual([0.2, 1.5])
  })

  it('drops a marker inside a cut and ignores a malformed preset', () => {
    const engine = new AudioEngine()
    expect(engine.loadPcm(tone(2), 48000, 'take.wav')).toBe(true)
    engine.addUserMarker(0.2, 'Keep')
    engine.addUserMarker(1.2, 'Gone')
    engine.setRegion(1, 1.5)
    expect(engine.deleteSampleSelection()).toBe(true)
    expect(engine.getSnapshot().userMarkers.map((marker) => marker.name)).toEqual(['Keep'])
    const preset = engine.toPreset()
    engine.applyPreset({ ...preset, markers: { nope: true } })
    expect(engine.getSnapshot().userMarkers.map((marker) => marker.name)).toEqual(['Keep'])
    expect(engine.deleteUserMarker(engine.getSnapshot().userMarkers[0]!.id)).toBe(true)
    expect(engine.getSnapshot().userMarkers).toEqual([])
    expect(engine.getSnapshot().selectedMarkerId).toBeNull()
  })
})
