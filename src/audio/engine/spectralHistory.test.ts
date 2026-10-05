import { describe, expect, it } from 'vitest'
import { createSpectralHistoryRuntime, paintSpectralHistory } from '../../components/waveform/spectralHistoryDraw'
import { readThemeColors } from '../../theme/theme'
import { logSpectrumHz, sampleLogSpectrumDb } from './spectrumEnvelope'
import { defaultSpectrumPrefs, loadSpectrumPrefs, SPECTRUM_PREF_KEY } from './spectrumPrefs'
import {
  SpectralFrameBuffer,
  SpectralHistoryClock,
  clampSpectralCamera,
  dbToSpectralLevel,
  formatSpectralReadout,
  nearestSpectralHit,
  projectSpectralPoint,
  interpolateSpectralFrame,
  selectSpectralSlices,
  spectralAgeOpacity,
  spectralCameraEases,
  spectralCaptureInterval,
  spectralHistoryAriaLabel,
  spectralLevelColor,
  spectralPointCount,
  spectralScrollAge,
  spectralSliceTarget,
  spectralTimeLabels,
  SPECTRAL_HISTORY_CAPACITY,
  setSpectralHistoryFrozen,
} from './spectralHistory'

const plot = { left: 40, top: 20, right: 840, bottom: 420 }

describe('spectral history ring', () => {
  it('keeps a fixed buffer and drops the oldest frame', () => {
    const buffer = new SpectralFrameBuffer(4, 3)
    const block = buffer.valueBuffer
    for (let i = 0; i < 6; i++) buffer.push([i, i + 1, i + 2], i)
    expect(buffer.count).toBe(4)
    expect(buffer.capacity).toBe(4)
    expect(buffer.valueBuffer).toBe(block)
    expect(buffer.timeAt(0)).toBe(2)
    expect(buffer.valueAt(0, 0)).toBe(2)
    expect(buffer.timeAt(3)).toBe(5)
    expect(buffer.valueAt(3, 2)).toBe(7)
  })

  it('does not grow past the shared capacity', () => {
    const buffer = new SpectralFrameBuffer()
    expect(buffer.capacity).toBe(SPECTRAL_HISTORY_CAPACITY)
    const block = buffer.valueBuffer
    for (let i = 0; i < SPECTRAL_HISTORY_CAPACITY + 30; i++) buffer.push([i], i / 10)
    expect(buffer.count).toBe(SPECTRAL_HISTORY_CAPACITY)
    expect(buffer.valueBuffer).toBe(block)
  })

  it('clear drops frames without allocating a new store', () => {
    const buffer = new SpectralFrameBuffer(8, 4)
    const block = buffer.valueBuffer
    buffer.push([1, 2, 3, 4], 1)
    buffer.clear()
    expect(buffer.count).toBe(0)
    expect(buffer.valueBuffer).toBe(block)
  })
})

describe('spectral history clock', () => {
  it('advances by elapsed playback time, not by frame count', () => {
    const clock = new SpectralHistoryClock()
    expect(clock.tick(0.5, true, false, 0.4)).toBe(true)
    expect(clock.now).toBeCloseTo(0.5)
    expect(clock.tick(0.1, true, false, 0.4)).toBe(false)
    expect(clock.now).toBeCloseTo(0.6)
    expect(clock.tick(0.4, true, false, 0.4)).toBe(true)
    expect(clock.now).toBeCloseTo(1)
  })

  it('pause and freeze do not age history', () => {
    const clock = new SpectralHistoryClock()
    clock.tick(1, true, false, 10)
    const at = clock.now
    expect(clock.tick(5, false, false, 0.05)).toBe(false)
    expect(clock.tick(5, true, true, 0.05)).toBe(false)
    expect(clock.now).toBe(at)
  })
})

describe('log spectrum resampling', () => {
  it('places 100 Hz left of 1 kHz and ignores energy above Nyquist', () => {
    const sr = 44100
    const bins = new Float32Array(1024).fill(-120)
    const out = new Float32Array(64)
    sampleLogSpectrumDb(bins, sr, 20, 30000, out, 'log')
    const nyquist = sr / 2
    for (let i = 0; i < out.length; i++) {
      const hz = logSpectrumHz(i, out.length, 20, nyquist, 'log')
      expect(hz).toBeLessThanOrEqual(nyquist + 1)
    }
    const i100 = out.findIndex((_, i) => logSpectrumHz(i, out.length, 20, 20000, 'log') >= 100)
    const i1k = out.findIndex((_, i) => logSpectrumHz(i, out.length, 20, 20000, 'log') >= 1000)
    expect(i100).toBeGreaterThanOrEqual(0)
    expect(i1k).toBeGreaterThan(i100)
  })

  it('does not paint a low-frequency wall from one bass bin', () => {
    const sr = 44100
    const fft = 2048
    const bins = new Float32Array(fft / 2).fill(-120)
    const bin = Math.round((60 * fft) / sr)
    bins[bin] = -6
    const out = new Float32Array(96)
    sampleLogSpectrumDb(bins, sr, 20, 20000, out, 'log')
    const near = (hz: number) => {
      let best = 0
      let err = Infinity
      for (let i = 0; i < out.length; i++) {
        const d = Math.abs(logSpectrumHz(i, out.length, 20, 20000, 'log') - hz)
        if (d < err) {
          err = d
          best = i
        }
      }
      return out[best] ?? Number.NaN
    }
    let peakHz = 0
    let peakDb = -200
    for (let i = 0; i < out.length; i++) {
      const db = out[i] ?? -200
      if (db > peakDb) {
        peakDb = db
        peakHz = logSpectrumHz(i, out.length, 20, 20000, 'log')
      }
    }
    expect(peakHz).toBeGreaterThan(40)
    expect(peakHz).toBeLessThan(120)
    expect(near(20) === -6 || !Number.isFinite(near(20)) || near(20) < -60).toBe(true)
    expect(near(2000)).toBeLessThan(-80)
    const loud = [...out].filter((db) => Number.isFinite(db) && db > -40).length
    expect(loud).toBeLessThan(12)
  })
})

describe('3D projection', () => {
  const camera = { preset: 'angled' as const, yaw: 0, pitch: 0, zoom: 1 }

  it('maps frequency right, level up, and age backward', () => {
    const low = projectSpectralPoint(0.1, 0.2, 0, plot, camera)
    const high = projectSpectralPoint(0.9, 0.2, 0, plot, camera)
    const quiet = projectSpectralPoint(0.5, 0.05, 0, plot, camera)
    const loud = projectSpectralPoint(0.5, 0.95, 0, plot, camera)
    const now = projectSpectralPoint(0.5, 0, 0, plot, camera)
    const past = projectSpectralPoint(0.5, 0, 1, plot, camera)
    expect(high.x).toBeGreaterThan(low.x)
    expect(loud.y).toBeLessThan(quiet.y)
    expect(past.y).toBeLessThan(now.y)
  })

  it('keeps the same scene depth for every history duration', () => {
    const front = projectSpectralPoint(0.4, 0, 0, plot, camera)
    const back = projectSpectralPoint(0.4, 0, 1, plot, camera)
    const depth = Math.hypot(front.x - back.x, front.y - back.y)
    expect(depth).toBeGreaterThan(80)
    expect(projectSpectralPoint.length).toBe(5)
  })

  it('uses less depth in front view and a time axis in top view', () => {
    const angled = Math.abs(
      projectSpectralPoint(0.5, 0, 0, plot, camera).y - projectSpectralPoint(0.5, 0, 1, plot, camera).y,
    )
    const front = Math.abs(
      projectSpectralPoint(0.5, 0, 0, plot, { ...camera, preset: 'front' }).y -
        projectSpectralPoint(0.5, 0, 1, plot, { ...camera, preset: 'front' }).y,
    )
    expect(angled).toBeGreaterThan(front * 1.5)
    const topNow = projectSpectralPoint(0.5, 0.2, 0, plot, { ...camera, preset: 'top' })
    const topPast = projectSpectralPoint(0.5, 0.2, 1, plot, { ...camera, preset: 'top' })
    const topLoud = projectSpectralPoint(0.5, 1, 0.4, plot, { ...camera, preset: 'top' })
    const topQuiet = projectSpectralPoint(0.5, 0, 0.4, plot, { ...camera, preset: 'top' })
    expect(Math.abs(topPast.y - topNow.y)).toBeGreaterThan(Math.abs(topLoud.y - topQuiet.y) * 3)
  })

  it('clamps yaw, pitch, and zoom', () => {
    const camera = clampSpectralCamera({ preset: 'angled', yaw: 4, pitch: -3, zoom: 9 })
    expect(camera.yaw).toBe(1)
    expect(camera.pitch).toBe(-1)
    expect(camera.zoom).toBe(1.4)
  })
})

describe('history presentation', () => {
  it('scrolls ridge ages continuously and carries a slice across the step boundary', () => {
    const duration = 5
    const slices = 20
    const step = duration / slices
    const now = 3.1
    const before = spectralScrollAge(2, slices, now, duration)
    const after = spectralScrollAge(2, slices, now + 0.016, duration)
    expect(after - before).toBeCloseTo(0.016, 3)
    const edge = Math.ceil(now / step) * step
    const leaving = spectralScrollAge(0, slices, edge - 1e-4, duration)
    const continued = spectralScrollAge(1, slices, edge + 1e-4, duration)
    expect(Math.abs(continued - leaving)).toBeLessThan(0.002)
  })

  it('lerps a stored spectrum instead of jumping to the next frame', () => {
    const buffer = new SpectralFrameBuffer(4, 2)
    buffer.push([0, -10], 0)
    buffer.push([10, -20], 1)
    const times = new Float64Array([0, 1])
    const out = new Float32Array(2)
    expect(interpolateSpectralFrame(buffer, times, 2, 0.25, out)).toBe(true)
    expect(out[0]).toBeCloseTo(2.5)
    expect(out[1]).toBeCloseTo(-12.5)
    expect(interpolateSpectralFrame(buffer, times, 2, 4, out)).toBe(false)
  })

  it('maps level color from the cool ridge to the warm ridge', () => {
    const quiet = spectralLevelColor('#aeb5b6', '#e8e6df', '#e6ad48', 0)
    const loud = spectralLevelColor('#aeb5b6', '#e8e6df', '#e6ad48', 1)
    expect(quiet.toLowerCase()).toBe('#aeb5b6')
    expect(loud.toLowerCase()).toBe('#e6ad48')
    expect(quiet).not.toBe(loud)
  })

  it('fades older ridges smoothly', () => {
    const now = spectralAgeOpacity(0)
    const mid = spectralAgeOpacity(0.5)
    const old = spectralAgeOpacity(1)
    expect(now).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(old)
    expect(old).toBeGreaterThan(0.05)
  })

  it('asks for fewer slices on a phone and more history without changing the capture meaning', () => {
    const desktop = spectralSliceTarget({
      durationSec: 5,
      density: 'auto',
      plotWidth: 1000,
      plotHeight: 500,
      mobile: false,
      both: false,
    })
    const phone = spectralSliceTarget({
      durationSec: 5,
      density: 'auto',
      plotWidth: 360,
      plotHeight: 220,
      mobile: true,
      both: false,
    })
    const ten = spectralSliceTarget({
      durationSec: 10,
      density: 'auto',
      plotWidth: 1000,
      plotHeight: 500,
      mobile: false,
      both: false,
    })
    expect(phone).toBeLessThan(desktop)
    expect(ten).toBeGreaterThan(desktop)
    expect(phone).toBeLessThanOrEqual(42)
    expect(spectralPointCount(360, true)).toBeLessThan(spectralPointCount(1200, false))
    expect(spectralCaptureInterval(10, ten)).toBeGreaterThan(0)
    expect(spectralCaptureInterval(1, 26)).not.toBe(spectralCaptureInterval(10, ten))
  })

  it('selects a window of real timestamps and keeps the newest frame', () => {
    const times = [0, 0.5, 1, 1.5, 2, 2.5, 3]
    const picked = selectSpectralSlices(times, times.length, 3, 2, 3)
    expect(picked[0]).toBeGreaterThan(0)
    expect(times[picked[0]!]).toBeGreaterThanOrEqual(1)
    expect(picked[picked.length - 1]).toBe(6)
  })

  it('labels time as now at the front and the history length at the back', () => {
    const labels = spectralTimeLabels(5, 6)
    expect(labels[0]).toEqual({ ageSec: 0, text: 'NOW' })
    expect(labels[labels.length - 1]?.text).toBe('-5s')
  })

  it('formats frequency, level, note, and age', () => {
    const lines = formatSpectralReadout(440, -18.2, 1.84)
    expect(lines[0]).toContain('440')
    expect(lines[0]).toContain('A4')
    expect(lines[1]).toBe('-18.2 dB')
    expect(lines[2]).toBe('-1.8 s')
    expect(formatSpectralReadout(1000, -12, 0)[2]).toBe('NOW')
    expect(dbToSpectralLevel(0, -90)).toBe(1)
    expect(dbToSpectralLevel(-90, -90)).toBe(0)
  })

  it('names the view for a screen reader', () => {
    expect(spectralHistoryAriaLabel(5, false)).toContain('frequency, level and the last 5 seconds')
    expect(spectralHistoryAriaLabel(5, true)).toContain('frozen')
  })

  it('skips camera easing when reduced motion is requested', () => {
    expect(spectralCameraEases(true)).toBe(false)
    expect(spectralCameraEases(false)).toBe(true)
  })

  it('hits the nearest ridge without requiring the tooltip to own the pointer', () => {
    const hit = nearestSpectralHit(
      [
        { x: 10, y: 10, hz: 100, db: -40, ageSec: 1 },
        { x: 40, y: 12, hz: 440, db: -12, ageSec: 0.2 },
      ],
      38,
      14,
      12,
    )
    expect(hit?.hz).toBe(440)
    expect(nearestSpectralHit([{ x: 0, y: 0, hz: 20, db: -90, ageSec: 0 }], 40, 40, 8)).toBeNull()
  })
})

describe('canvas history paint', () => {
  it('draws real FFT bins on one pass without throwing', () => {
    const calls: string[] = []
    const ctx = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'canvas') return {}
          if (prop === 'measureText') return () => ({ width: 16 })
          return (..._args: unknown[]) => {
            calls.push(String(prop))
          }
        },
      },
    ) as CanvasRenderingContext2D
    const runtime = createSpectralHistoryRuntime()
    const fft = 2048
    const bins = new Float32Array(fft / 2).fill(-120)
    const bin = Math.round((440 * fft) / 44100)
    bins[bin] = -12
    const colors = {
      textMuted: '#888888',
      textPrimary: '#eeeeee',
      spectrum: '#88aa99',
      spectrumLine: '#d0e0d4',
      borderSubtle: '#333333',
      bgApp: '#050505',
      ridgeCool: '#aeb5b6',
      ridgeMid: '#e8e6df',
      ridgeWarm: '#e6ad48',
    }
    paintSpectralHistory(ctx, 900, 420, runtime, {
      dt: 0.05,
      dpr: 1,
      cssWidth: 900,
      cssHeight: 420,
      playing: true,
      sampleRate: 44100,
      preBins: null,
      postBins: bins,
      showPre: false,
      showPost: true,
      historySec: 5,
      density: 'auto',
      drawStyle: 'lines',
      levelColor: false,
      peakTrails: false,
      cameraPreset: 'angled',
      fall: 'normal',
      range: 90,
      scale: 'log',
      colors: colors as ReturnType<typeof readThemeColors>,
      mobile: false,
      reducedMotion: true,
      layer: 'post',
    })
    expect(runtime.post.count).toBe(1)
    expect(runtime.hitCount).toBeGreaterThan(8)
    expect(calls).toContain('stroke')
    expect(runtime.clock.now).toBeCloseTo(0.05)
    paintSpectralHistory(ctx, 900, 420, runtime, {
      dt: 1,
      dpr: 1,
      cssWidth: 900,
      cssHeight: 420,
      playing: false,
      sampleRate: 44100,
      preBins: null,
      postBins: bins,
      showPre: false,
      showPost: true,
      historySec: 5,
      density: 'auto',
      drawStyle: 'lines',
      levelColor: false,
      peakTrails: false,
      cameraPreset: 'angled',
      fall: 'normal',
      range: 90,
      scale: 'log',
      colors: colors as ReturnType<typeof readThemeColors>,
      mobile: false,
      reducedMotion: true,
      layer: 'post',
    })
    expect(runtime.post.count).toBe(1)
    expect(runtime.clock.now).toBeCloseTo(0.05)
    calls.length = 0
    paintSpectralHistory(ctx, 900, 420, runtime, {
      dt: 0.05,
      dpr: 1,
      cssWidth: 900,
      cssHeight: 420,
      playing: true,
      sampleRate: 44100,
      preBins: null,
      postBins: bins,
      showPre: false,
      showPost: true,
      historySec: 5,
      density: 'auto',
      drawStyle: 'surface',
      levelColor: true,
      peakTrails: false,
      cameraPreset: 'angled',
      fall: 'normal',
      range: 90,
      scale: 'log',
      colors: colors as ReturnType<typeof readThemeColors>,
      mobile: false,
      reducedMotion: true,
      layer: 'post',
    })
    expect(calls).toContain('fill')
    expect(calls).toContain('stroke')
  })
})

describe('spectrum prefs for 3D', () => {
  it('defaults to the 2D view, five seconds, output, and angled lines', () => {
    const prefs = defaultSpectrumPrefs()
    expect(prefs.viewMode).toBe('2d')
    expect(prefs.historySec).toBe(5)
    expect(prefs.historyLayer).toBe('post')
    expect(prefs.cameraPreset).toBe('angled')
    expect(prefs.density).toBe('auto')
    expect(prefs.levelColor).toBe(false)
    expect(prefs.drawStyle).toBe('lines')
    expect(prefs.peakTrails).toBe(false)
    setSpectralHistoryFrozen(false)
  })

  it('loads older saved prefs without 3D fields', () => {
    const store = new Map<string, string>()
    const previous = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
      },
    })
    store.set(SPECTRUM_PREF_KEY, JSON.stringify({ layer: 'pre', range: 60 }))
    const prefs = loadSpectrumPrefs()
    expect(prefs.layer).toBe('pre')
    expect(prefs.range).toBe(60)
    expect(prefs.viewMode).toBe('2d')
    expect(prefs.historyLayer).toBe('post')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous })
  })
})
