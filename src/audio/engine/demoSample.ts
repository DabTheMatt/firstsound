/**
 * Original FIELD demonstration sample.
 * Four equal bars (80 BPM) so each region loops in time and reads differently
 * on a waveform and an FFT: bass/percussion, mid melody, bright texture, full mix.
 */

export const DEMO_SAMPLE_SECONDS = 12
export const DEMO_SECTION_SECONDS = 3
export const DEMO_FILE_NAME = 'field_demo.wav'

const BEAT = 0.75
const TWO_PI = Math.PI * 2

export type DemoChannels = {
  left: Float32Array
  right: Float32Array
  sampleRate: number
}

type Rng = { next: () => number }

function rng(seed: number): Rng {
  let s = seed >>> 0 || 1
  return {
    next: () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0
      return s / 4294967296
    },
  }
}

function attackDecay(t: number, attack: number, decay: number): number {
  if (t < 0) return 0
  if (t < attack) {
    const p = t / attack
    return p * p * (3 - 2 * p)
  }
  return Math.exp(-(t - attack) * decay)
}

function panGains(pan: number): [number, number] {
  const p = Math.max(-1, Math.min(1, pan))
  const angle = ((p + 1) * Math.PI) / 4
  return [Math.cos(angle), Math.sin(angle)]
}

function writePair(left: Float32Array, right: Float32Array, i: number, l: number, r: number): void {
  left[i] = (left[i] ?? 0) + l
  right[i] = (right[i] ?? 0) + r
}

type ToneOpts = {
  t0: number
  freq: number
  amp: number
  attack: number
  decay: number
  harmonics: number[]
  harmTilt: number
  pan: number
  detuneCents?: number
  until?: number
}

function addTone(left: Float32Array, right: Float32Array, sr: number, opts: ToneOpts): void {
  const [gL, gR] = panGains(opts.pan)
  const detune = Math.pow(2, (opts.detuneCents ?? 0) / 1200)
  const start = Math.max(0, Math.floor(opts.t0 * sr))
  const tail = opts.attack + 6 / Math.max(0.5, opts.decay)
  const until = opts.until ?? opts.t0 + tail
  const end = Math.min(left.length, Math.floor(until * sr), start + Math.ceil(tail * sr))
  const fade = Math.max(1, Math.floor(0.02 * sr))
  const phasesL = opts.harmonics.map(() => 0)
  const phasesR = opts.harmonics.map(() => 0)
  for (let i = start; i < end; i++) {
    const t = (i - start) / sr
    let env = attackDecay(t, opts.attack, opts.decay)
    const remain = end - i
    if (remain < fade) env *= remain / fade
    if (t > opts.attack && env < 1e-5) break
    let sampleL = 0
    let sampleR = 0
    for (let h = 0; h < opts.harmonics.length; h++) {
      const weight = opts.harmonics[h] ?? 0
      if (weight === 0) continue
      const harmEnv = Math.exp(-t * opts.harmTilt * h)
      const freq = opts.freq * (h + 1)
      phasesL[h] = (phasesL[h]! + (TWO_PI * freq) / sr) % TWO_PI
      phasesR[h] = (phasesR[h]! + (TWO_PI * freq * detune) / sr) % TWO_PI
      sampleL += Math.sin(phasesL[h]!) * weight * harmEnv
      sampleR += Math.sin(phasesR[h]!) * weight * harmEnv
    }
    const gain = opts.amp * env
    writePair(left, right, i, sampleL * gain * gL, sampleR * gain * gR)
  }
}

/** Pitch-swept kick: sub body plus a short low click. Stays below the mid band. */
function addKick(left: Float32Array, right: Float32Array, sr: number, t0: number, amp: number): void {
  const start = Math.max(0, Math.floor(t0 * sr))
  const end = Math.min(left.length, start + Math.floor(0.42 * sr))
  let phase = 0
  for (let i = start; i < end; i++) {
    const t = (i - start) / sr
    const freq = 46 + 95 * Math.exp(-t * 38)
    phase += (TWO_PI * freq) / sr
    const body = Math.sin(phase) * Math.exp(-t * 7.5)
    const click = Math.sin(TWO_PI * 145 * t) * Math.exp(-t * 160)
    const s = amp * (body * 0.92 + click * 0.22)
    writePair(left, right, i, s, s)
  }
}

function addHat(
  left: Float32Array,
  right: Float32Array,
  sr: number,
  t0: number,
  amp: number,
  open: boolean,
  seed: number,
): void {
  const noise = rng(seed)
  const dur = open ? 0.18 : 0.045
  const start = Math.max(0, Math.floor(t0 * sr))
  const end = Math.min(left.length, start + Math.ceil(dur * sr))
  let xL = 0
  let xR = 0
  let yL = 0
  let yR = 0
  const cutoff = open ? 6200 : 7800
  const alpha = Math.exp((-TWO_PI * cutoff) / sr)
  for (let i = start; i < end; i++) {
    const t = (i - start) / sr
    const env = Math.exp(-t * (open ? 18 : 70))
    const nL = noise.next() * 2 - 1
    const nR = noise.next() * 2 - 1
    yL = alpha * (yL + nL - xL)
    yR = alpha * (yR + nR - xR)
    xL = nL
    xR = nR
    const sL = yL * amp * env
    const sR = yR * amp * env
    writePair(left, right, i, sL, sR)
  }
}

function addAir(left: Float32Array, right: Float32Array, sr: number, t0: number, t1: number, amp: number, seed: number): void {
  const noise = rng(seed)
  const start = Math.max(0, Math.floor(t0 * sr))
  const end = Math.min(left.length, Math.floor(t1 * sr))
  let x1L = 0
  let x1R = 0
  let x2L = 0
  let x2R = 0
  let y1L = 0
  let y1R = 0
  let y2L = 0
  let y2R = 0
  const alpha = Math.exp((-TWO_PI * 5000) / sr)
  const fade = Math.floor(0.03 * sr)
  for (let i = start; i < end; i++) {
    const nL = noise.next() * 2 - 1
    const nR = noise.next() * 2 - 1
    y1L = alpha * (y1L + nL - x1L)
    x1L = nL
    y2L = alpha * (y2L + y1L - x2L)
    x2L = y1L
    y1R = alpha * (y1R + nR - x1R)
    x1R = nR
    y2R = alpha * (y2R + y1R - x2R)
    x2R = y1R
    let env = 1
    const rel = i - start
    const tail = end - i
    if (rel < fade) env *= rel / fade
    if (tail < fade) env *= tail / fade
    writePair(left, right, i, y2L * amp * env, y2R * amp * env)
  }
}

function bass(left: Float32Array, right: Float32Array, sr: number, t0: number, freq: number, amp: number, until: number): void {
  addTone(left, right, sr, {
    t0,
    freq,
    amp,
    attack: 0.012,
    decay: 2.4,
    harmonics: [1, 0.16, 0.045],
    harmTilt: 6,
    pan: 0,
    until,
  })
}

function pluck(left: Float32Array, right: Float32Array, sr: number, t0: number, freq: number, amp: number, pan: number, until: number): void {
  addTone(left, right, sr, {
    t0,
    freq,
    amp,
    attack: 0.006,
    decay: 3.6,
    harmonics: [1, 0.42, 0.16, 0.05],
    harmTilt: 4.5,
    pan,
    detuneCents: pan * 4,
    until,
  })
}

function bell(left: Float32Array, right: Float32Array, sr: number, t0: number, freq: number, amp: number, pan: number, until: number): void {
  addTone(left, right, sr, {
    t0,
    freq,
    amp,
    attack: 0.004,
    decay: 3.1,
    harmonics: [1, 0.55, 0.28, 0.12],
    harmTilt: 2.2,
    pan,
    detuneCents: pan * 6,
    until,
  })
}

function chordStab(left: Float32Array, right: Float32Array, sr: number, t0: number, freqs: number[], amp: number, until: number): void {
  const pans = [-0.35, 0, 0.35]
  freqs.forEach((freq, i) => {
    addTone(left, right, sr, {
      t0,
      freq,
      amp,
      attack: 0.008,
      decay: 2.8,
      harmonics: [1, 0.62, 0.34, 0.16, 0.07],
      harmTilt: 1.6,
      pan: pans[i] ?? 0,
      detuneCents: (pans[i] ?? 0) * 5,
      until,
    })
  })
}

function renderVoices(left: Float32Array, right: Float32Array, sr: number): void {
  const s1 = 0
  const s2 = DEMO_SECTION_SECONDS
  const s3 = DEMO_SECTION_SECONDS * 2
  const s4 = DEMO_SECTION_SECONDS * 3
  const end = DEMO_SAMPLE_SECONDS

  for (let beat = 0; beat < 4; beat++) addKick(left, right, sr, s1 + beat * BEAT, beat % 2 === 0 ? 0.72 : 0.5)
  bass(left, right, sr, s1, 55, 0.34, s2)
  bass(left, right, sr, s1 + 1 * BEAT, 55, 0.22, s2)
  bass(left, right, sr, s1 + 2 * BEAT, 43.65, 0.32, s2)
  bass(left, right, sr, s1 + 3 * BEAT, 49, 0.3, s2)

  const melody: Array<[number, number, number]> = [
    [0, 220, -0.4],
    [1, 261.63, 0.25],
    [2, 329.63, -0.2],
    [4, 392, 0.4],
    [5, 329.63, -0.3],
    [6, 293.66, 0.15],
    [7, 261.63, -0.35],
  ]
  for (const [step, freq, pan] of melody) {
    pluck(left, right, sr, s2 + step * (BEAT / 2), freq, 0.38, pan, s3)
  }
  addTone(left, right, sr, {
    t0: s2,
    freq: 220,
    amp: 0.07,
    attack: 0.04,
    decay: 0.22,
    harmonics: [1, 0.2],
    harmTilt: 1,
    pan: -0.15,
    until: s3,
  })
  addTone(left, right, sr, {
    t0: s2,
    freq: 329.63,
    amp: 0.05,
    attack: 0.05,
    decay: 0.22,
    harmonics: [1],
    harmTilt: 0,
    pan: 0.2,
    detuneCents: 3,
    until: s3,
  })

  const bells: Array<[number, number, number]> = [
    [0, 2093, -0.55],
    [1, 2637, 0.5],
    [2, 3135.96, -0.35],
    [3, 2349.32, 0.6],
  ]
  for (const [beat, freq, pan] of bells) bell(left, right, sr, s3 + beat * BEAT, freq, 0.46, pan, s4)
  for (let step = 0; step < 8; step++) {
    const open = step % 2 === 1
    addHat(left, right, sr, s3 + step * (BEAT / 2), open ? 0.24 : 0.15, open, 0x51f000 + step * 17)
  }
  addAir(left, right, sr, s3 + 0.02, s3 + DEMO_SECTION_SECONDS - 0.02, 0.07, 0xA11)

  for (let beat = 0; beat < 4; beat++) {
    const t = s4 + beat * BEAT
    if (beat % 2 === 0) {
      addKick(left, right, sr, t, 0.62)
      bass(left, right, sr, t, beat === 0 ? 55 : 43.65, 0.28, end)
      chordStab(left, right, sr, t, beat === 0 ? [220, 261.63, 329.63] : [174.61, 220, 261.63], 0.16, end)
      bell(left, right, sr, t, beat === 0 ? 1760 : 2093, 0.1, beat === 0 ? -0.4 : 0.45, end)
    } else {
      addTone(left, right, sr, {
        t0: t,
        freq: 180,
        amp: 0.22,
        attack: 0.004,
        decay: 9,
        harmonics: [1, 0.4, 0.15],
        harmTilt: 3,
        pan: 0,
        until: end,
      })
      addHat(left, right, sr, t, 0.2, true, 0x5a0000 + beat)
      bell(left, right, sr, t + 0.02, beat === 1 ? 2637 : 3136, 0.12, beat === 1 ? 0.4 : -0.45, end)
    }
    addHat(left, right, sr, t + BEAT / 2, 0.08, false, 0x330000 + beat)
  }
  addTone(left, right, sr, {
    t0: s4,
    freq: 880,
    amp: 0.05,
    attack: 0.03,
    decay: 0.35,
    harmonics: [1, 0.3],
    harmTilt: 1,
    pan: 0.25,
    detuneCents: 4,
    until: end,
  })
}

function applyEdgeFades(left: Float32Array, right: Float32Array, sr: number): void {
  const edge = Math.floor(0.012 * sr)
  const n = left.length
  for (let i = 0; i < edge; i++) {
    const g = i / edge
    left[i] = (left[i] ?? 0) * g
    right[i] = (right[i] ?? 0) * g
    const j = n - 1 - i
    left[j] = (left[j] ?? 0) * g
    right[j] = (right[j] ?? 0) * g
  }
}

function normalize(left: Float32Array, right: Float32Array, peakTarget: number): void {
  let peak = 0
  for (let i = 0; i < left.length; i++) {
    const a = Math.abs(left[i] ?? 0)
    const b = Math.abs(right[i] ?? 0)
    if (a > peak) peak = a
    if (b > peak) peak = b
  }
  if (peak < 1e-6) return
  const gain = peakTarget / peak
  for (let i = 0; i < left.length; i++) {
    left[i] = (left[i] ?? 0) * gain
    right[i] = (right[i] ?? 0) * gain
  }
}

export function renderDemoSample(sampleRate: number): DemoChannels {
  const sr = Math.max(8000, Math.floor(sampleRate))
  const length = Math.floor(DEMO_SAMPLE_SECONDS * sr)
  const left = new Float32Array(length)
  const right = new Float32Array(length)
  renderVoices(left, right, sr)
  applyEdgeFades(left, right, sr)
  normalize(left, right, 0.82)
  return { left, right, sampleRate: sr }
}
