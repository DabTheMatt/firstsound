import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { defaultAutomation } from '../automation/automation'
import { factoryChain, type ChainModule, type ModuleType } from '../chain/chain'
import type { OfflineContextFactory, ProcessingSnapshot } from '../engine/offlineRender'
import { renderProcessedPcm } from '../engine/offlineRender'
import { defaultParamValues } from '../parameters/definitions'
import type { Pcm } from '../samplePrep/types'
import { defaultFxLfos } from './lfo'

const SR = 22050
const factory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate) as unknown as ReturnType<OfflineContextFactory>

function noise(seconds: number, amp: number): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  let s = 1
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647
    ch[i] = ((s / 2147483647) * 2 - 1) * amp
  }
  return { sampleRate: SR, channels: [ch, ch.slice()] }
}

function peak(ch: Float32Array): number {
  let m = 0
  for (let i = 0; i < ch.length; i++) m = Math.max(m, Math.abs(ch[i] ?? 0))
  return m
}

function rms(ch: Float32Array, start: number, end: number): number {
  let sum = 0
  let n = 0
  for (let i = start; i < end; i++) {
    const x = ch[i] ?? 0
    sum += x * x
    n++
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
}

function hotFraction(ch: Float32Array): number {
  let hot = 0
  for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i] ?? 0) > 0.96) hot += 1
  return ch.length > 0 ? hot / ch.length : 0
}

function chain(enabled: ModuleType[]): ChainModule[] {
  const on = new Set(enabled)
  return factoryChain().map((mod) => ({
    ...mod,
    bypassed: mod.type !== 'gain' && mod.type !== 'output' && !on.has(mod.type),
  }))
}

async function renderWet(wet: number): Promise<Float32Array> {
  const params = {
    ...defaultParamValues(),
    gain: 0,
    outputGain: 0,
    reverbWet: wet,
    reverbDry: 100 - wet,
    reverbCorrelate: 1,
  }
  const snap: ProcessingSnapshot = {
    chain: chain(['reverb']),
    params,
    automation: defaultAutomation(),
    fxLfos: defaultFxLfos(),
    eqById: {},
    eqChannelMode: 'shared',
    primaryEqId: 'eq-1',
    distortionType: 'clip',
    distortionNoiseKind: 'white',
    delayType: 'digital',
    reverbType: 'hall',
    voiceGain: 1,
    masterGain: 1,
    noiseMuted: true,
    noiseFadeTau: 0.012,
  }
  const pcm = await renderProcessedPcm(noise(0.7, 0.85), snap, { factory })
  return pcm.channels[0] ?? new Float32Array()
}

describe('reverb wet headroom', () => {
  it('keeps a hot hall mix under full scale without gutting the wet return', async () => {
    const dry = await renderWet(0)
    const mid = await renderWet(64)
    const wet = await renderWet(100)
    const from = Math.floor(0.08 * SR)
    const to = Math.floor(0.62 * SR)
    const dryRms = rms(dry, from, to)
    const wetRms = rms(wet, from, to)
    expect(peak(dry)).toBeGreaterThan(0.7)
    expect(peak(dry)).toBeLessThan(1)
    expect(peak(mid)).toBeLessThan(0.999)
    expect(peak(wet)).toBeLessThan(0.999)
    expect(wetRms).toBeGreaterThan(dryRms * 0.45)
    expect(wetRms).toBeLessThan(dryRms * 1.15)
    expect(hotFraction(mid)).toBeLessThan(0.05)
    expect(rms(mid, from, to)).toBeGreaterThan(dryRms * 0.55)
  }, 30000)
})
