/**
 * Seeded FIELD demonstration sample.
 * Each call builds a new 12–24 s stereo buffer meant to exercise editing,
 * dynamics, filtering, space, and metering. Nothing keeps running after render.
 *
 * When this generator's musical contract changes, update the Manual section
 * in src/manual/content.ts in the same task.
 */

export const DEMO_DURATION_MIN = 12
export const DEMO_DURATION_MAX = 24

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

type Role = 'intro' | 'hit' | 'quiet' | 'bass' | 'dense' | 'stereo' | 'tail'

function midiHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}

function shuffleRoles(random: Rng): Role[] {
  const roles: Role[] = ['intro', 'hit', 'quiet', 'bass', 'dense', 'stereo', 'tail']
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1))
    const swap = roles[i]!
    roles[i] = roles[j]!
    roles[j] = swap
  }
  return roles
}

function paintRole(
  role: Role,
  left: Float32Array,
  right: Float32Array,
  sr: number,
  t0: number,
  t1: number,
  random: Rng,
  root: number,
  seed: number,
): void {
  const span = Math.max(0.4, t1 - t0)
  const pulse = 0.32 + random.next() * 0.28
  if (role === 'intro') {
    addAir(left, right, sr, t0, t1, 0.045 + random.next() * 0.03, seed ^ 0x11a)
    addTone(left, right, sr, {
      t0,
      freq: midiHz(root + 12),
      amp: 0.08,
      attack: Math.min(0.4, span * 0.25),
      decay: 0.6,
      harmonics: [1, 0.2, 0.05],
      harmTilt: 2,
      pan: -0.35,
      detuneCents: 6,
      until: t1,
    })
    return
  }
  if (role === 'quiet') {
    pluck(left, right, sr, t0 + span * 0.35, midiHz(root + 24), 0.08, -0.2, t1)
    pluck(left, right, sr, t0 + span * 0.7, midiHz(root + 19), 0.05, 0.45, t1)
    return
  }
  if (role === 'bass') {
    const notes = [0, 0, -5, 7]
    for (let i = 0; i < notes.length; i++) {
      const when = t0 + (span * i) / notes.length
      bass(left, right, sr, when, midiHz(root + (notes[i] ?? 0) - 24), 0.28 + random.next() * 0.08, t1)
      if (i % 2 === 0) addKick(left, right, sr, when, 0.42)
    }
    return
  }
  if (role === 'hit') {
    const steps = Math.max(4, Math.floor(span / pulse))
    for (let i = 0; i < steps; i++) {
      const when = t0 + i * pulse
      if (when >= t1) break
      if (i % 4 === 0) addKick(left, right, sr, when, 0.55)
      addHat(left, right, sr, when + pulse * 0.5, i % 2 ? 0.16 : 0.09, i % 3 === 2, seed + i * 19)
    }
    return
  }
  if (role === 'dense') {
    chordStab(left, right, sr, t0, [midiHz(root), midiHz(root + 7), midiHz(root + 10)], 0.12, t1)
    chordStab(left, right, sr, t0 + span * 0.5, [midiHz(root + 5), midiHz(root + 12), midiHz(root + 15)], 0.1, t1)
    const steps = Math.max(3, Math.floor(span / (pulse * 0.5)))
    for (let i = 0; i < steps; i++) {
      const when = t0 + i * pulse * 0.5
      if (when >= t1) break
      addHat(left, right, sr, when, 0.08, i % 2 === 1, seed + 400 + i)
      if (i % 4 === 0) addKick(left, right, sr, when, 0.36)
    }
    return
  }
  if (role === 'stereo') {
    const highs = [24, 31, 36, 27]
    highs.forEach((semi, i) => {
      const pan = i % 2 === 0 ? -0.72 : 0.7
      bell(left, right, sr, t0 + (span * i) / highs.length, midiHz(root + semi), 0.16, pan, t1)
    })
    addTone(left, right, sr, {
      t0,
      freq: midiHz(root + 12),
      amp: 0.05,
      attack: 0.05,
      decay: 0.4,
      harmonics: [1, 0.3],
      harmTilt: 1,
      pan: 0.55,
      detuneCents: 8,
      until: t1,
    })
    return
  }
  addTone(left, right, sr, {
    t0,
    freq: midiHz(root),
    amp: 0.1,
    attack: 0.08,
    decay: 1.2,
    harmonics: [1, 0.25, 0.08],
    harmTilt: 1.4,
    pan: 0.15,
    detuneCents: -5,
    until: t1,
  })
  addAir(left, right, sr, t0, t1, 0.03, seed ^ 0x77)
  bell(left, right, sr, t0 + span * 0.2, midiHz(root + 36), 0.08, -0.4, t1)
}

function renderSeeded(left: Float32Array, right: Float32Array, sr: number, seed: number, seconds: number): void {
  const random = rng(seed)
  const roles = shuffleRoles(random)
  const weights = roles.map(() => 0.55 + random.next())
  const weightSum = weights.reduce((sum, value) => sum + value, 0)
  const root = 48 + Math.floor(random.next() * 12)
  let cursor = 0
  roles.forEach((role, index) => {
    const slice = (weights[index]! / weightSum) * seconds
    const end = index === roles.length - 1 ? seconds : cursor + slice
    paintRole(role, left, right, sr, cursor, end, random, root, seed + index * 97)
    cursor = end
  })
}

/** Display name for a generated buffer. Stable for a given seed. */
export function demoSampleName(seed: number): string {
  const n = (Math.abs(Math.floor(seed)) % 900) + 100
  return `Texture ${n}`
}

/** Duration in seconds, uniformly inside 12–24 for this seed. */
export function demoDurationSeconds(seed: number): number {
  return DEMO_DURATION_MIN + rng(seed ^ 0x9e3779b9).next() * (DEMO_DURATION_MAX - DEMO_DURATION_MIN)
}

function peakTargetFor(seed: number): number {
  const db = -7.2 + rng(seed ^ 0x51ed).next() * 2.4
  return 10 ** (db / 20)
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

export function renderDemoSample(sampleRate: number, seed = 1): DemoChannels {
  const sr = Math.max(8000, Math.floor(sampleRate))
  const safeSeed = Math.floor(seed) || 1
  const seconds = demoDurationSeconds(safeSeed)
  const length = Math.max(1, Math.floor(seconds * sr))
  const left = new Float32Array(length)
  const right = new Float32Array(length)
  renderSeeded(left, right, sr, safeSeed, seconds)
  applyEdgeFades(left, right, sr)
  normalize(left, right, peakTargetFor(safeSeed))
  return { left, right, sampleRate: sr }
}
