import { describe, expect, it } from 'vitest'
import { defaultEqBands } from '../engine/eqBands'
import {
  addMixLayer,
  applyLayerFocus,
  defaultMixLayers,
  detectLayerFocus,
  duplicateMixLayer,
  eqForFocus,
  layerMixGain,
  MAX_MIX_LAYERS,
  parseMixLayers,
  patchMixLayer,
  removeMixLayer,
  splitFrequencyLayers,
} from './layers'

describe('mix layers', () => {
  it('starts with a dry original at unity mix', () => {
    const layers = defaultMixLayers()
    expect(layers).toHaveLength(1)
    expect(layers[0]?.name).toBe('Original')
    expect(layers[0]?.mix).toBe(100)
    expect(layers[0]?.insert).toBe('none')
    expect(layerMixGain(layers[0]!, layers)).toBe(1)
  })

  it('adds a delay copy mixed under the original', () => {
    const next = addMixLayer(defaultMixLayers(), 'delay')
    expect(next).toHaveLength(2)
    expect(next[1]?.insert).toBe('delay')
    expect(next[1]?.mix).toBe(28)
    expect(next[0]?.mix).toBe(100)
  })

  it('splits the original into lows and highs copies', () => {
    const next = splitFrequencyLayers(defaultMixLayers())
    expect(next).toHaveLength(2)
    expect(detectLayerFocus(next[0]!.eq)).toBe('lows')
    expect(detectLayerFocus(next[1]!.eq)).toBe('highs')
    expect(next[0]?.mix).toBe(100)
    expect(next[1]?.mix).toBe(100)
  })

  it('keeps soloed layers and mutes the rest', () => {
    let layers = addMixLayer(defaultMixLayers(), 'copy')
    layers = patchMixLayer(layers, layers[1]!.id, { solo: true, mix: 40 })
    expect(layerMixGain(layers[0]!, layers)).toBe(0)
    expect(layerMixGain(layers[1]!, layers)).toBeCloseTo(0.4)
  })

  it('refuses to drop the last layer', () => {
    const layers = defaultMixLayers()
    expect(removeMixLayer(layers, layers[0]!.id)).toHaveLength(1)
  })

  it('caps the rack size', () => {
    let layers = defaultMixLayers()
    for (let i = 0; i < 10; i++) layers = addMixLayer(layers, 'copy')
    expect(layers.length).toBe(MAX_MIX_LAYERS)
  })

  it('duplicates a layer with its EQ and insert', () => {
    let layers = applyLayerFocus(defaultMixLayers(), 'layer-1', 'lows')
    layers = patchMixLayer(layers, 'layer-1', { insert: 'delay', mix: 70 })
    const next = duplicateMixLayer(layers, 'layer-1')
    expect(next).toHaveLength(2)
    expect(next[1]?.insert).toBe('delay')
    expect(detectLayerFocus(next[1]!.eq)).toBe('lows')
    expect(next[1]?.id).not.toBe(next[0]?.id)
  })

  it('round-trips a saved rack', () => {
    const layers = addMixLayer(defaultMixLayers(), 'highs')
    const parsed = parseMixLayers(JSON.parse(JSON.stringify(layers)))
    expect(parsed).toEqual(layers)
  })

  it('rejects a malformed rack', () => {
    expect(parseMixLayers([{ name: 'x' }])).toBeNull()
    expect(parseMixLayers([])).toBeNull()
  })

  it('maps focus chips onto EQ bands', () => {
    expect(eqForFocus('full')).toEqual(defaultEqBands())
    expect(eqForFocus('lows')[0]?.type).toBe('lowpass')
    expect(eqForFocus('highs')[0]?.type).toBe('highpass')
    expect(eqForFocus('mids')[0]?.type).toBe('highpass')
    expect(eqForFocus('mids')[1]?.type).toBe('lowpass')
  })
})
