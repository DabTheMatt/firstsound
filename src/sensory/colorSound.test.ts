import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../audio/parameters/definitions'
import { defaultEqBands } from '../audio/engine/eqBands'
import { factoryChain } from '../audio/chain/chain'
import { AudioEngine } from '../audio/engine/AudioEngine'
import { applySensorySession, captureDsp } from './applySensory'
import {
  applyColorSound,
  approachColorSound,
  colorSoundIsNeutral,
  colorSoundRgb,
  colorTimbre,
  mapColorToSound,
  NEUTRAL_COLOR_SOUND,
} from './colorSound'
import { dspSnapshotsEqual, mapSensoryToDsp, snapshotFromEngine } from './mapping/mappingEngine'
import { defaultSensoryValues, patchSensoryValue } from './sensoryState'

function baseDsp() {
  return snapshotFromEngine({
    params: defaultParamValues(),
    eqBands: defaultEqBands(),
    chain: factoryChain(),
  })
}

function paint(color: { x: number; y: number }, values = defaultSensoryValues()) {
  return applyColorSound(mapSensoryToDsp(baseDsp(), values), color, values)
}

describe('color sound mapping', () => {
  it('is identity at the neutral center', () => {
    const values = defaultSensoryValues()
    const mapped = mapSensoryToDsp(baseDsp(), values)
    const colored = applyColorSound(mapped, NEUTRAL_COLOR_SOUND, values)
    expect(colorSoundIsNeutral(NEUTRAL_COLOR_SOUND)).toBe(true)
    expect(colorTimbre(NEUTRAL_COLOR_SOUND).air).toBeCloseTo(0, 5)
    expect(dspSnapshotsEqual(mapped, colored)).toBe(true)
    expect(colored).toBe(mapped)
  })

  it('keeps a character morph intact at rest and darkens its air when the pad goes dark', () => {
    const values = patchSensoryValue(defaultSensoryValues(), 'character', 0.7)
    const mapped = mapSensoryToDsp(baseDsp(), values)
    expect(dspSnapshotsEqual(mapped, applyColorSound(mapped, NEUTRAL_COLOR_SOUND, values))).toBe(true)
    const dark = applyColorSound(mapped, { x: 0.5, y: 0.08 }, values)
    expect(dark.eqBands[3]!.gain).toBeLessThan(mapped.eqBands[3]!.gain)
  })

  it('maps light upward and dark downward without swapping effect types', () => {
    const dark = paint({ x: 0.5, y: 0.06 })
    const light = paint({ x: 0.5, y: 0.94 })
    expect(light.eqBands[3]!.gain).toBeGreaterThan(dark.eqBands[3]!.gain)
    expect(light.eqBands[3]!.gain).toBeGreaterThan(0.8)
    expect(dark.eqBands[3]!.gain).toBeLessThan(-1)
    expect(dark.bypass.filter).toBe(false)
    expect(dark.params.filterKind).toBe(0)
    expect(dark.params.filterCutoff).toBeLessThan(4000)
    expect(light.bypass.filter).not.toBe(false)
    expect(dark.reverbType).toBe(light.reverbType)
    expect(dark.distortionType).toBe(light.distortionType)
  })

  it('warms red, opens yellow-green, and gives blue more space', () => {
    const red = paint({ x: 0.02, y: 0.5 })
    const yellow = paint({ x: 0.17, y: 0.5 })
    const blue = paint({ x: 0.68, y: 0.5 })
    const violet = paint({ x: 0.84, y: 0.5 })
    expect(red.params.saturation).toBeGreaterThan(blue.params.saturation)
    expect(red.eqBands[0]!.gain).toBeGreaterThan(blue.eqBands[0]!.gain)
    expect(yellow.eqBands[2]!.gain).toBeGreaterThan(red.eqBands[2]!.gain)
    expect(blue.params.reverbWet).toBeGreaterThan(red.params.reverbWet)
    expect(blue.bypass.reverb).toBe(false)
    expect(violet.eqBands[2]!.q).toBeGreaterThan(1)
    expect(red.params.filterKind).toBe(blue.params.filterKind)
  })

  it('wraps hue so the red edge agrees with itself', () => {
    const a = colorTimbre({ x: 0.01, y: 0.5 })
    const b = colorTimbre({ x: 0.99, y: 0.5 })
    expect(Math.abs(a.sat - b.sat)).toBeLessThan(4)
    expect(Math.abs(a.low - b.low)).toBeLessThan(1.6)
  })

  it('gives each hue a different continuous character', () => {
    const at = (x: number, y = 0.5) => mapColorToSound(x, y)
    const red = at(0.02)
    const yellow = at(0.16)
    const green = at(0.34)
    const blue = at(0.67)
    const violet = at(0.84)
    expect(red.low).toBeGreaterThan(blue.low + 0.25)
    expect(red.saturation).toBeGreaterThan(blue.saturation + 0.2)
    expect(yellow.presence).toBeGreaterThan(red.presence + 0.15)
    expect(yellow.air).toBeGreaterThan(red.air)
    expect(green.body).toBeGreaterThan(yellow.body)
    expect(blue.space).toBeGreaterThan(green.space)
    expect(blue.width).toBeGreaterThan(red.width + 0.2)
    expect(violet.texture).toBeGreaterThan(blue.texture + 0.25)
    expect(at(0.5, 0.08).air).toBeLessThan(at(0.5, 0.92).air - 0.4)
    expect(at(0.5, 0.08).depth).toBeGreaterThan(at(0.5, 0.92).depth)
    const seam = Math.abs(at(0).saturation - at(0.999).saturation)
    const span = Math.abs(red.saturation - blue.saturation)
    expect(seam).toBeLessThan(span * 0.35)
  })

  it('moves continuously across the field', () => {
    const samples: number[] = []
    for (let i = 0; i <= 40; i++) {
      const hue = i / 40
      const dsp = paint({ x: hue, y: 0.32 })
      const air = dsp.eqBands[3]?.gain ?? 0
      const prev = samples[samples.length - 1]
      if (prev != null) expect(Math.abs(air - prev)).toBeLessThan(1.25)
      expect(Number.isFinite(dsp.params.filterCutoff)).toBe(true)
      expect(Number.isFinite(dsp.params.saturation)).toBe(true)
      expect(Number.isFinite(dsp.params.reverbWet)).toBe(true)
      samples.push(air)
    }
  })

  it('tilts an active filter feeling instead of replacing its type', () => {
    const values = patchSensoryValue(defaultSensoryValues(), 'dark', 0.85)
    const mapped = mapSensoryToDsp(baseDsp(), values)
    const darker = applyColorSound(mapped, { x: 0.5, y: 0.12 }, values)
    const brighter = applyColorSound(mapped, { x: 0.5, y: 0.88 }, values)
    expect(darker.params.filterKind).toBe(mapped.params.filterKind)
    expect(brighter.params.filterKind).toBe(mapped.params.filterKind)
    expect(brighter.params.filterCutoff).toBeGreaterThan(darker.params.filterCutoff)
  })

  it('glides the pad position instead of snapping', () => {
    let cursor = NEUTRAL_COLOR_SOUND
    const target = { x: 0.1, y: 0.9 }
    cursor = approachColorSound(cursor, target, 30)
    expect(cursor.x).toBeLessThan(0.5)
    expect(cursor.x).toBeGreaterThan(0.2)
    expect(cursor.y).toBeGreaterThan(0.5)
    expect(cursor.y).toBeLessThan(0.85)
    for (let i = 0; i < 30; i++) cursor = approachColorSound(cursor, target, 40)
    expect(cursor.x).toBeCloseTo(target.x, 2)
    expect(cursor.y).toBeCloseTo(target.y, 2)
  })

  it('paints a light top and a warm red edge', () => {
    const dark = colorSoundRgb({ x: 0.5, y: 0 })
    const light = colorSoundRgb({ x: 0.5, y: 1 })
    const red = colorSoundRgb({ x: 0, y: 0.55 })
    const blue = colorSoundRgb({ x: 0.66, y: 0.55 })
    const luma = (c: { r: number; g: number; b: number }) => c.r + c.g + c.b
    expect(luma(light)).toBeGreaterThan(luma(dark))
    expect(red.r).toBeGreaterThan(red.b)
    expect(blue.b).toBeGreaterThan(red.b)
  })
})

describe('applySensorySession color', () => {
  it('writes the color into the live engine and restores defaults at rest', () => {
    const engine = new AudioEngine()
    const base = captureDsp(engine)
    const model = engine.getSnapshot().distortionType
    const rest = defaultSensoryValues()
    applySensorySession(engine, base, rest, NEUTRAL_COLOR_SOUND)
    expect(engine.getSnapshot().params.saturation).toBeCloseTo(base.params.saturation)
    applySensorySession(engine, base, rest, { x: 0.02, y: 0.5 })
    const warm = engine.getSnapshot()
    expect(warm.params.saturation).toBeGreaterThan(4)
    expect(warm.chain.find((mod) => mod.type === 'distortion')?.bypassed).toBe(false)
    expect(warm.distortionType).toBe(model)
    applySensorySession(engine, base, rest, { x: 0.5, y: 0.05 })
    expect(engine.getSnapshot().chain.find((mod) => mod.type === 'filter')?.bypassed).toBe(false)
    applySensorySession(engine, base, rest, NEUTRAL_COLOR_SOUND)
    const restored = engine.getSnapshot()
    expect(restored.params.saturation).toBeCloseTo(base.params.saturation)
    expect(restored.params.filterCutoff).toBeCloseTo(base.params.filterCutoff)
    expect(restored.chain.find((mod) => mod.type === 'filter')?.bypassed).not.toBe(false)
    expect(restored.chain.find((mod) => mod.type === 'distortion')?.bypassed).not.toBe(false)
    expect(restored.distortionType).toBe(model)
  })
})
