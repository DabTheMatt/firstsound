import { defaultEqBands, parseEqBands, type EqBand } from '../engine/eqBands'

export const MAX_MIX_LAYERS = 6
export const MIX_LAYER_MIN = 0
export const MIX_LAYER_MAX = 150

export type MixLayerInsert = 'none' | 'delay' | 'reverb' | 'saturation'
export type MixLayerFocus = 'full' | 'lows' | 'mids' | 'highs'
export type MixLayerRecipe = 'copy' | 'lows' | 'highs' | 'delay' | 'reverb' | 'split'

export type MixLayer = {
  id: string
  name: string
  mix: number
  muted: boolean
  solo: boolean
  insert: MixLayerInsert
  eq: EqBand[]
}

export const MIX_LAYER_INSERTS: { value: MixLayerInsert; label: string }[] = [
  { value: 'none', label: 'Dry' },
  { value: 'delay', label: 'Delay' },
  { value: 'reverb', label: 'Reverb' },
  { value: 'saturation', label: 'Drive' },
]

export const MIX_LAYER_FOCUSES: { value: MixLayerFocus; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'lows', label: 'Lows' },
  { value: 'mids', label: 'Mids' },
  { value: 'highs', label: 'Highs' },
]

export function defaultMixLayers(): MixLayer[] {
  return [createOriginalLayer()]
}

export function createOriginalLayer(): MixLayer {
  return {
    id: 'layer-1',
    name: 'Original',
    mix: 100,
    muted: false,
    solo: false,
    insert: 'none',
    eq: defaultEqBands(),
  }
}

export function cloneMixLayer(layer: MixLayer): MixLayer {
  return {
    ...layer,
    eq: layer.eq.map((band) => ({ ...band })),
  }
}

export function cloneMixLayers(layers: readonly MixLayer[]): MixLayer[] {
  return layers.map(cloneMixLayer)
}

export function clampMix(value: number): number {
  if (!Number.isFinite(value)) return 100
  return Math.min(MIX_LAYER_MAX, Math.max(MIX_LAYER_MIN, value))
}

export function nextMixLayerId(layers: readonly MixLayer[]): string {
  const used = new Set(layers.map((layer) => layer.id))
  let n = 1
  while (used.has(`layer-${n}`)) n++
  return `layer-${n}`
}

export function nextMixLayerName(layers: readonly MixLayer[], base = 'Copy'): string {
  const used = new Set(layers.map((layer) => layer.name))
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}

export function eqForFocus(focus: MixLayerFocus): EqBand[] {
  const bands = defaultEqBands()
  if (focus === 'full') return bands
  if (focus === 'lows') {
    bands[0] = { type: 'lowpass', frequency: 280, gain: 0, q: 0.71, slope: 24, bypassed: false }
    return bands
  }
  if (focus === 'highs') {
    bands[0] = { type: 'highpass', frequency: 1800, gain: 0, q: 0.71, slope: 24, bypassed: false }
    return bands
  }
  bands[0] = { type: 'highpass', frequency: 220, gain: 0, q: 0.71, slope: 12, bypassed: false }
  bands[1] = { type: 'lowpass', frequency: 4200, gain: 0, q: 0.71, slope: 12, bypassed: false }
  return bands
}

export function detectLayerFocus(eq: readonly EqBand[]): MixLayerFocus {
  const active = eq.filter((band) => band.type !== 'off' && !band.bypassed)
  if (active.length === 0) return 'full'
  if (active.length === 1 && active[0]?.type === 'lowpass' && active[0].frequency <= 600) return 'lows'
  if (active.length === 1 && active[0]?.type === 'highpass' && active[0].frequency >= 800) return 'highs'
  if (
    active.length === 2 &&
    active.some((band) => band.type === 'highpass') &&
    active.some((band) => band.type === 'lowpass')
  ) {
    return 'mids'
  }
  return 'full'
}

export function layerMixGain(layer: MixLayer, layers: readonly MixLayer[]): number {
  if (layer.muted) return 0
  const anySolo = layers.some((item) => item.solo && !item.muted)
  if (anySolo && !layer.solo) return 0
  return clampMix(layer.mix) / 100
}

export function addMixLayer(
  layers: readonly MixLayer[],
  recipe: MixLayerRecipe = 'copy',
): MixLayer[] {
  if (recipe === 'split') return splitFrequencyLayers(layers)
  if (layers.length >= MAX_MIX_LAYERS) return cloneMixLayers(layers)
  const next = cloneMixLayers(layers)
  next.push(makeRecipeLayer(next, recipe))
  return next
}

export function duplicateMixLayer(layers: readonly MixLayer[], id: string): MixLayer[] {
  if (layers.length >= MAX_MIX_LAYERS) return cloneMixLayers(layers)
  const source = layers.find((layer) => layer.id === id)
  if (!source) return cloneMixLayers(layers)
  const next = cloneMixLayers(layers)
  const copy = cloneMixLayer(source)
  copy.id = nextMixLayerId(next)
  copy.name = nextMixLayerName(next, source.name)
  copy.solo = false
  next.push(copy)
  return next
}

export function removeMixLayer(layers: readonly MixLayer[], id: string): MixLayer[] {
  if (layers.length <= 1) return cloneMixLayers(layers)
  const next = layers.filter((layer) => layer.id !== id).map(cloneMixLayer)
  return next.length ? next : defaultMixLayers()
}

export function patchMixLayer(
  layers: readonly MixLayer[],
  id: string,
  patch: Partial<Omit<MixLayer, 'id' | 'eq'>> & { eq?: EqBand[] },
): MixLayer[] {
  return layers.map((layer) => {
    if (layer.id !== id) return cloneMixLayer(layer)
    const next = cloneMixLayer(layer)
    if (typeof patch.name === 'string' && patch.name.trim()) next.name = patch.name.trim().slice(0, 24)
    if (typeof patch.mix === 'number') next.mix = clampMix(patch.mix)
    if (typeof patch.muted === 'boolean') next.muted = patch.muted
    if (typeof patch.solo === 'boolean') next.solo = patch.solo
    if (patch.insert && isMixLayerInsert(patch.insert)) next.insert = patch.insert
    if (patch.eq) next.eq = patch.eq.map((band) => ({ ...band }))
    return next
  })
}

export function setMixLayerEqBand(
  layers: readonly MixLayer[],
  id: string,
  index: number,
  patch: Partial<EqBand>,
): MixLayer[] {
  return layers.map((layer) => {
    if (layer.id !== id) return cloneMixLayer(layer)
    const next = cloneMixLayer(layer)
    const band = next.eq[index]
    if (!band) return next
    next.eq[index] = { ...band, ...patch }
    return next
  })
}

export function applyLayerFocus(
  layers: readonly MixLayer[],
  id: string,
  focus: MixLayerFocus,
): MixLayer[] {
  return patchMixLayer(layers, id, { eq: eqForFocus(focus) })
}

export function splitFrequencyLayers(layers: readonly MixLayer[]): MixLayer[] {
  const next = cloneMixLayers(layers)
  const original = next[0]
  if (!original) return defaultMixLayers()
  original.name = 'Lows'
  original.eq = eqForFocus('lows')
  original.mix = 100
  original.muted = false
  original.insert = 'none'
  if (next.length >= MAX_MIX_LAYERS) return next
  if (!next.some((layer) => detectLayerFocus(layer.eq) === 'highs')) {
    next.push(makeRecipeLayer(next, 'highs'))
  }
  return next
}

export function parseMixLayers(raw: unknown): MixLayer[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_MIX_LAYERS) return null
  const parsed: MixLayer[] = []
  const used = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const rec = item as Partial<MixLayer>
    if (typeof rec.id !== 'string' || !rec.id || used.has(rec.id)) return null
    used.add(rec.id)
    const eq = parseEqBands(rec.eq) ?? defaultEqBands()
    parsed.push({
      id: rec.id,
      name: typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim().slice(0, 24) : 'Layer',
      mix: clampMix(typeof rec.mix === 'number' ? rec.mix : 100),
      muted: Boolean(rec.muted),
      solo: Boolean(rec.solo),
      insert: isMixLayerInsert(rec.insert) ? rec.insert : 'none',
      eq,
    })
  }
  return parsed.length ? parsed : null
}

export function mixLayersEqual(a: readonly MixLayer[], b: readonly MixLayer[]): boolean {
  if (a.length !== b.length) return false
  return a.every((layer, i) => {
    const other = b[i]
    if (!other) return false
    if (
      layer.id !== other.id ||
      layer.name !== other.name ||
      layer.mix !== other.mix ||
      layer.muted !== other.muted ||
      layer.solo !== other.solo ||
      layer.insert !== other.insert ||
      layer.eq.length !== other.eq.length
    ) {
      return false
    }
    return layer.eq.every((band, j) => {
      const o = other.eq[j]
      return (
        o &&
        band.type === o.type &&
        band.frequency === o.frequency &&
        band.gain === o.gain &&
        band.q === o.q &&
        band.slope === o.slope &&
        Boolean(band.bypassed) === Boolean(o.bypassed)
      )
    })
  })
}

function makeRecipeLayer(layers: readonly MixLayer[], recipe: Exclude<MixLayerRecipe, 'split'>): MixLayer {
  if (recipe === 'lows') {
    return {
      id: nextMixLayerId(layers),
      name: nextMixLayerName(layers, 'Lows'),
      mix: 100,
      muted: false,
      solo: false,
      insert: 'none',
      eq: eqForFocus('lows'),
    }
  }
  if (recipe === 'highs') {
    return {
      id: nextMixLayerId(layers),
      name: nextMixLayerName(layers, 'Highs'),
      mix: 100,
      muted: false,
      solo: false,
      insert: 'none',
      eq: eqForFocus('highs'),
    }
  }
  if (recipe === 'delay') {
    return {
      id: nextMixLayerId(layers),
      name: nextMixLayerName(layers, 'Delay'),
      mix: 28,
      muted: false,
      solo: false,
      insert: 'delay',
      eq: defaultEqBands(),
    }
  }
  if (recipe === 'reverb') {
    return {
      id: nextMixLayerId(layers),
      name: nextMixLayerName(layers, 'Reverb'),
      mix: 22,
      muted: false,
      solo: false,
      insert: 'reverb',
      eq: defaultEqBands(),
    }
  }
  return {
    id: nextMixLayerId(layers),
    name: nextMixLayerName(layers, 'Copy'),
    mix: 50,
    muted: false,
    solo: false,
    insert: 'none',
    eq: defaultEqBands(),
  }
}

function isMixLayerInsert(value: unknown): value is MixLayerInsert {
  return value === 'none' || value === 'delay' || value === 'reverb' || value === 'saturation'
}
