import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../engine/AudioEngine'
import { reconstructionError } from './bands'

function sine(freq: number, frames: number, sampleRate: number, amp = 0.5): Float32Array {
  const out = new Float32Array(frames)
  for (let i = 0; i < frames; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate)
  return out
}

describe('spectral bands in the engine', () => {
  it('reconstructs, mixes, and exports the audible sum', async () => {
    const engine = new AudioEngine()
    const sampleRate = 22050
    const frames = 4096
    const channel = sine(80, frames, sampleRate, 0.4)
    expect(engine.loadPcm([channel], sampleRate)).toBe(true)
    expect(engine.getSnapshot().spectral.enabled).toBe(false)
    expect(engine.getSnapshot().spectral.analyser).toBe('sum')
    expect(engine.getSnapshot().spectral.bands).toHaveLength(4)

    engine.setSpectralEnabled(true)
    const snap = engine.getSnapshot().spectral
    expect(snap.enabled).toBe(true)
    expect(snap.ready).toBe(true)
    const report = engine.spectralReconstruction()
    expect(report).not.toBeNull()
    expect(report!.lag).toBe(0)
    expect(report!.rmsDb).toBeLessThan(-90)
    expect(Math.abs(report!.gainDb)).toBeLessThan(0.05)

    const unity = engine.audibleChannel(0)!
    expect(reconstructionError(channel, unity).rmsDb).toBeLessThan(-90)

    engine.setSpectralBand('sub-bass', { mute: true })
    engine.setSpectralBand('low-mid', { mute: true })
    engine.setSpectralBand('high-mid', { mute: true })
    engine.setSpectralBand('high', { mute: true })
    const silent = engine.audibleChannel(0)!
    expect(reconstructionError(channel, silent).rms).toBeGreaterThan(0.05)
    let silentPeak = 0
    for (let i = 0; i < silent.length; i++) silentPeak = Math.max(silentPeak, Math.abs(silent[i] ?? 0))
    expect(silentPeak).toBeLessThan(1e-5)

    engine.setSpectralBand('sub-bass', { mute: false, solo: true })
    const solo = engine.audibleChannel(0)!
    expect(reconstructionError(channel, solo).rms).toBeLessThan(0.08)

    engine.setSpectralAnalyser('high')
    expect(engine.getSnapshot().spectral.analyser).toBe('high')
    engine.setParam('gain', 0)

    engine.setSpectralAnalyser('sum')
    engine.setSpectralBand('sub-bass', { solo: false, mute: false })
    engine.setSpectralBand('low-mid', { mute: false })
    engine.setSpectralBand('high-mid', { mute: false })
    engine.setSpectralBand('high', { mute: false })

    const exported = await engine.exportWav({
      name: 'bands',
      sampleRate: 'original',
      bitDepth: 32,
      applyFades: false,
      applyGain: false,
      applyReverse: false,
      applyNormalize: false,
      scope: 'project',
    })
    expect(exported).not.toBeNull()
    const bytes = await exported!.blob.arrayBuffer()
    const view = new DataView(bytes)
    const decoded = new Float32Array(frames)
    let offset = 44
    for (let i = 0; i < frames; i++) {
      decoded[i] = view.getFloat32(offset, true)
      offset += 4
    }
    expect(reconstructionError(channel, decoded).rmsDb).toBeLessThan(-60)

    engine.setSpectralBand('sub-bass', { mute: true })
    engine.setSpectralBand('low-mid', { mute: true })
    engine.setSpectralBand('high-mid', { mute: true })
    engine.setSpectralBand('high', { mute: true })
    const mutedExport = await engine.exportWav({
      name: 'muted-bands',
      sampleRate: 'original',
      bitDepth: 32,
      applyFades: false,
      applyGain: false,
      applyReverse: false,
      applyNormalize: false,
      scope: 'project',
    })
    const mutedBytes = await mutedExport!.blob.arrayBuffer()
    const mutedView = new DataView(mutedBytes)
    let mutedPeak = 0
    offset = 44
    for (let i = 0; i < frames; i++) {
      mutedPeak = Math.max(mutedPeak, Math.abs(mutedView.getFloat32(offset, true)))
      offset += 4
    }
    expect(mutedPeak).toBeLessThan(1e-4)

    const before = engine.getSnapshot().spectral
    engine.setSpectralBand('high', { gainDb: -6, mute: false })
    engine.replaceSpectral(before)
    expect(engine.getSnapshot().spectral.bands[3]!.gainDb).toBe(0)
    expect(engine.getSnapshot().spectral.bands.every((band) => band.mute)).toBe(true)
  })
})
