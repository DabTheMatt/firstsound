export type ParamMapping = 'linear' | 'log'

export type ParamId =
  | 'start'
  | 'end'
  | 'speed'
  | 'pitch'
  | 'gain'
  | 'grainSize'
  | 'density'
  | 'position'
  | 'scatter'
  | 'grainPitch'
  | 'pitchSpread'
  | 'filterCutoff'
  | 'filterReso'

export type FilterType = 'off' | 'lowpass' | 'highpass' | 'bandpass'

export type ParamDef = {
  id: ParamId
  label: string
  min: number
  max: number
  defaultValue: number
  unit: string
  mapping: ParamMapping
  step?: number
}

export type EngineMode = 'playback' | 'grain'

export type PresetV1 = {
  instrument: 'field'
  version: 1
  loop: boolean
  engineMode: EngineMode
  params: Record<ParamId, number>
  // Optional so presets saved before these modules existed still load.
  filterType?: FilterType
  reverse?: boolean
}
