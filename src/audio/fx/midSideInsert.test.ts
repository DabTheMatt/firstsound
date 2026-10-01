import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../engine/AudioEngine'

describe('mid/side insertion', () => {
  it('adds, edits, and removes mid/side repeatedly without stalling', async () => {
    if (typeof window.setTimeout !== 'function') {
      window.setTimeout = setTimeout as typeof window.setTimeout
    }
    const engine = new AudioEngine()
    await engine.unlock()
    await engine.loadDemoTone()
    const started = performance.now()
    const initial = engine.getSnapshot().chain.filter((mod) => mod.type === 'midside').length
    for (let i = 0; i < 10; i++) {
      const id = engine.insertModule('midside', 0)
      expect(id).toBeTruthy()
      engine.setParam('msWidth', 40 + i)
      engine.setParam('msBalance', i % 2 === 0 ? -30 : 30)
      engine.setParam('msMidGain', -3)
      engine.setParam('msSideGain', 2)
      const snap = engine.getSnapshot()
      expect(snap.chain.filter((mod) => mod.type === 'midside')).toHaveLength(initial + 1)
      engine.togglePlay()
      engine.pause()
      engine.toggleModuleBypass(id!)
      engine.toggleModuleBypass(id!)
      engine.removeModule(id!)
      await new Promise((resolve) => setTimeout(resolve, 40))
      const after = engine.getSnapshot().chain.filter((mod) => mod.type === 'midside')
      expect(after).toHaveLength(initial)
      expect(after.some((mod) => mod.instanceId === id)).toBe(false)
    }
    expect(performance.now() - started).toBeLessThan(3000)
  })
})
