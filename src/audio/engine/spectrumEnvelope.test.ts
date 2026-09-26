import { describe, expect, it } from 'vitest'
import { hzToX, xToHz, type FreqScaleKind } from './freqScale'
import { SPECTRUM_FLOOR_DB, bandPeakDb, logBandEdgesHz } from './spectrumBands'
import {
  fillSpectrumEnvelope,
  fillSpectrumXY,
  spectrumCurvePointCount,
  spectrumEnvelopePoints,
  strokeSpectrumEnvelope,
  strokeSpectrumXY,
  writeSpectrumBinLine,
  writeSpectrumCurve,
} from './spectrumEnvelope'

describe('spectrumEnvelopePoints', () => {
  it('maps louder bands higher on the plot and follows log frequency', () => {
    const edges = logBandEdgesHz(20, 20000, 4)
    const dbs = [-6, -20, -40, -80]
    const pts = spectrumEnvelopePoints(dbs, edges, 20, 20000, {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    })
    expect(pts).toHaveLength(8)
    expect(pts[0]!.x).toBeLessThan(pts[7]!.x)
    expect(pts[0]!.y).toBeLessThan(pts[7]!.y)
    expect(pts[0]!.y).toBeCloseTo(6, 0)
    expect(pts[1]!.y).toBeCloseTo(pts[0]!.y)
    expect(pts[0]!.x).toBeCloseTo(0, 0)
    expect(pts[7]!.x).toBeCloseTo(100, 0)
  })

  it('clamps silence to the floor', () => {
    const edges = logBandEdgesHz(20, 20000, 2)
    const pts = spectrumEnvelopePoints([-120, 20], edges, 20, 20000, {
      left: 10,
      right: 110,
      top: 10,
      bottom: 110,
    })
    expect(pts[0]!.y).toBe(110)
    expect(pts[1]!.y).toBe(110)
    expect(pts[2]!.y).toBe(10)
    expect(pts[3]!.y).toBe(10)
  })

  it('lifts bands by a meter-align offset', () => {
    const edges = logBandEdgesHz(20, 20000, 2)
    const raw = spectrumEnvelopePoints([-48, -60], edges, 20, 20000, {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    }, 0, -60)
    const aligned = spectrumEnvelopePoints([-48, -60], edges, 20, 20000, {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    }, 0, -60, 39)
    expect(aligned[0]!.y).toBeLessThan(raw[0]!.y)
    expect(aligned[0]!.y).toBeCloseTo(15)
  })

  it('keeps quiet bins that sit under the display floor', () => {
    const edges = logBandEdgesHz(20, 20000, 3)
    const pts = spectrumEnvelopePoints([-80, -48, -100], edges, 20, 20000, {
      left: 0,
      right: 90,
      top: 0,
      bottom: 60,
    }, 0, -60, 0)
    expect(pts).toHaveLength(6)
    expect(pts[0]!.y).toBe(60)
    expect(pts[2]!.y).toBeCloseTo(48)
    expect(pts[4]!.y).toBe(60)
    const lifted = spectrumEnvelopePoints([-80, -48, -100], edges, 20, 20000, {
      left: 0,
      right: 90,
      top: 0,
      bottom: 60,
    }, 0, -60, 30)
    expect(lifted[0]!.y).toBeCloseTo(50)
    expect(lifted[2]!.y).toBeCloseTo(18)
    expect(lifted[4]!.y).toBe(60)
  })

  it('does not lift a floor band when aligning', () => {
    const edges = logBandEdgesHz(20, 20000, 2)
    const pts = spectrumEnvelopePoints([SPECTRUM_FLOOR_DB, -40], edges, 20, 20000, {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    }, 0, -100, 20)
    expect(pts[0]!.y).toBe(100)
    expect(pts[1]!.y).toBe(100)
    expect(pts[2]!.y).toBeCloseTo(20)
  })
})

describe('strokeSpectrumEnvelope', () => {
  it('strokes a path through the points', () => {
    const ops: string[] = []
    const ctx = {
      beginPath: () => ops.push('begin'),
      moveTo: (x: number, y: number) => ops.push(`m${x},${y}`),
      quadraticCurveTo: () => ops.push('q'),
      bezierCurveTo: () => ops.push('bezier'),
      lineTo: (x: number, y: number) => ops.push(`l${x},${y}`),
      stroke: () => ops.push('stroke'),
    } as unknown as CanvasRenderingContext2D
    strokeSpectrumEnvelope(ctx, [
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 8 },
    ])
    expect(ops[0]).toBe('begin')
    expect(ops[1]).toBe('m0,10')
    expect(ops).toContain('l10,20')
    expect(ops).toContain('l20,8')
    expect(ops).not.toContain('bezier')
    expect(ops).toContain('stroke')
  })
})

describe('writeSpectrumBinLine', () => {
  const plot = { left: 0, right: 1000, top: 0, bottom: 100 }

  function points(dbs: Float32Array, sampleRate: number, minHz: number, maxHz: number) {
    const out = new Float32Array(dbs.length * 2)
    const count = writeSpectrumBinLine(dbs, sampleRate, minHz, maxHz, plot, out)
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < count; i++) pts.push({ x: out[i * 2]!, y: out[i * 2 + 1]! })
    return pts
  }

  it('draws one vertex at the bin frequency, not a flat bar top', () => {
    const dbs = new Float32Array(16).fill(-80)
    dbs[4] = -6
    dbs[5] = -40
    const pts = points(dbs, 3200, 20, 1500)
    const peak = pts.reduce((best, p) => (p.y < best.y ? p : best))
    expect(pts.filter((p) => Math.abs(p.y - peak.y) < 0.01)).toHaveLength(1)
    expect(peak.x).toBeCloseTo(hzToX(400, 20, 1500, 0, 1000, 'log'), 4)
    const next = pts.find((p) => p.x > peak.x + 0.01)
    expect(next!.y).toBeGreaterThan(peak.y + 20)
    expect(pts.every((p, i) => i === 0 || p.x > pts[i - 1]!.x)).toBe(true)
  })

  it('keeps the valley between two partials instead of the band maximum', () => {
    const dbs = new Float32Array(32).fill(-90)
    dbs[10] = -12
    dbs[12] = -70
    dbs[16] = -18
    const pts = points(dbs, 3200, 20, 2000)
    const yAt = (hz: number) => {
      const x = hzToX(hz, 20, 2000, 0, 1000, 'log')
      return pts.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best)).y
    }
    expect(yAt(600)).toBeGreaterThan(yAt(500) + 30)
    expect(yAt(600)).toBeGreaterThan(yAt(800) + 30)
    expect(yAt(500)).toBeLessThan(yAt(800))
  })

  it('clamps silence to the floor and lifts an aligned bin', () => {
    const dbs = new Float32Array(8)
    dbs[2] = -120
    dbs[3] = -48
    const floor = points(dbs, 1600, 20, 800)
    const binHz = (i: number) => (i * 1600) / 16
    const at = (pts: { x: number; y: number }[], hz: number) =>
      pts.reduce((best, p) => {
        const x = hzToX(hz, 20, 800, 0, 1000, 'log')
        return Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best
      })
    expect(at(floor, binHz(2)).y).toBe(100)
    expect(at(floor, binHz(3)).y).toBeCloseTo(48)
    const lifted = new Float32Array(16)
    const raw = new Float32Array(16)
    writeSpectrumBinLine(dbs, 1600, 20, 800, plot, raw, 0, -60, 0)
    writeSpectrumBinLine(dbs, 1600, 20, 800, plot, lifted, 0, -60, 30)
    const x300 = hzToX(300, 20, 800, 0, 1000, 'log')
    const yOf = (xy: Float32Array) => {
      let best = 0
      let bestDx = Infinity
      for (let i = 0; i < xy.length; i += 2) {
        const dx = Math.abs((xy[i] ?? 0) - x300)
        if (dx < bestDx) {
          bestDx = dx
          best = xy[i + 1] ?? 0
        }
      }
      return best
    }
    expect(yOf(lifted)).toBeLessThan(yOf(raw))
    expect(yOf(lifted)).toBeCloseTo(30)
  })
})

describe('writeSpectrumCurve', () => {
  const plot = { left: 0, right: 1000, top: 0, bottom: 100 }

  function readCurve(
    dbs: Float32Array,
    sampleRate: number,
    minHz: number,
    maxHz: number,
    scale: FreqScaleKind = 'log',
    width = 1000,
  ) {
    const box = { ...plot, right: width }
    const countWanted = spectrumCurvePointCount(width)
    const out = new Float32Array(countWanted * 2)
    const count = writeSpectrumCurve(dbs, sampleRate, minHz, maxHz, box, out, 0, -100, 0, scale, countWanted)
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < count; i++) pts.push({ x: out[i * 2]!, y: out[i * 2 + 1]! })
    return pts
  }

  function yToDb(y: number): number {
    return -y
  }

  it('draws one continuous curve across the plot, not a vertex per FFT bin', () => {
    const dbs = new Float32Array(2048).fill(-90)
    dbs[40] = -8
    const pts = readCurve(dbs, 48000, 20, 20000)
    expect(pts).toHaveLength(spectrumCurvePointCount(1000))
    expect(pts.length).toBeLessThan(dbs.length)
    expect(pts[0]!.x).toBeCloseTo(0, 4)
    expect(pts[pts.length - 1]!.x).toBeCloseTo(1000, 4)
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i]!.x).toBeGreaterThan(pts[i - 1]!.x)
      expect(Math.abs(pts[i]!.x - pts[i - 1]!.x)).toBeGreaterThan(0.2)
    }
  })

  it('keeps a tonal peak near its bin and does not hold a flat bar top', () => {
    const bins = 256
    const sr = 48000
    const dbs = new Float32Array(bins).fill(-96)
    const peakBin = 8
    dbs[peakBin] = -12
    const peakHz = (peakBin * sr) / (bins * 2)
    const pts = readCurve(dbs, sr, 20, 20000)
    const peak = pts.reduce((best, p) => (p.y < best.y ? p : best))
    expect(peak.y).toBeCloseTo(12, 0)
    expect(peak.x).toBeCloseTo(hzToX(peakHz, 20, 20000, 0, 1000, 'log'), 0)
    const hot = pts.filter((p) => p.y <= peak.y + 1.5)
    expect(hot.length).toBeLessThan(8)
    const edges = logBandEdgesHz(20, 20000, 24)
    let band = 0
    for (let i = 0; i < 24; i++) {
      if (peakHz >= (edges[i] ?? 0) && peakHz < (edges[i + 1] ?? Infinity)) band = i
    }
    const outline = spectrumEnvelopePoints([...bandPeakDb(dbs, sr, 24, 20, 20000)], edges, 20, 20000, plot)
    const barLeft = outline[band * 2]!.x
    const barRight = outline[band * 2 + 1]!.x
    const barTop = outline[band * 2]!.y
    expect(barRight - barLeft).toBeGreaterThan(20)
    const atLeft = pts.reduce((best, p) => (Math.abs(p.x - barLeft) < Math.abs(best.x - barLeft) ? p : best))
    expect(atLeft.y).toBeGreaterThan(barTop + 20)
    expect(hot[hot.length - 1]!.x - hot[0]!.x).toBeLessThan((barRight - barLeft) * 0.5)
  })

  it('keeps the valley between two partials', () => {
    const bins = 512
    const sr = 44100
    const dbs = new Float32Array(bins).fill(-95)
    const low = 12
    const valley = 18
    const high = 28
    dbs[low] = -10
    dbs[valley] = -72
    dbs[high] = -16
    const hzOf = (i: number) => (i * sr) / (bins * 2)
    const pts = readCurve(dbs, sr, 20, 20000)
    const yAt = (hz: number) => {
      const x = hzToX(hz, 20, 20000, 0, 1000, 'log')
      return pts.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best)).y
    }
    expect(yAt(hzOf(valley))).toBeGreaterThan(yAt(hzOf(low)) + 25)
    expect(yAt(hzOf(valley))).toBeGreaterThan(yAt(hzOf(high)) + 25)
    expect(yToDb(yAt(hzOf(valley)))).toBeLessThan(-40)
  })

  it('covers measured silence down to the floor without dropping quiet bins', () => {
    const silent = readCurve(new Float32Array(2048).fill(-100), 48000, 20, 20000)
    expect(silent.length).toBe(spectrumCurvePointCount(1000))
    expect(silent.every((p) => p.y === 100)).toBe(true)
    const dbs = new Float32Array(2048).fill(-100)
    dbs[40] = -18
    dbs[400] = -30
    const pts = readCurve(dbs, 48000, 20, 20000)
    expect(pts).toHaveLength(silent.length)
    const floorPts = pts.filter((p) => p.y > 99)
    expect(floorPts.length).toBeGreaterThan(pts.length * 0.5)
    expect(pts.some((p) => p.y < 25)).toBe(true)
  })

  it('does not connect an unresolved floor at the left edge to the first FFT bin', () => {
    const bins = 128
    const sr = 48000
    const firstHz = sr / (bins * 2)
    const dbs = new Float32Array(bins).fill(-28)
    const pts = readCurve(dbs, sr, 20, 20000)
    expect(pts.length).toBeGreaterThan(8)
    expect(pts.length).toBeLessThan(spectrumCurvePointCount(1000))
    const startHz = xToHz(pts[0]!.x, 20, 20000, 0, 1000, 'log')
    expect(startHz).toBeGreaterThan(20)
    expect(startHz).toBeLessThan(firstHz * 1.5)
    expect(pts[0]!.x).toBeGreaterThan(40)
    expect(pts[0]!.y).toBeCloseTo(28, 0)
    const dx = pts[1]!.x - pts[0]!.x
    const dy = Math.abs(pts[1]!.y - pts[0]!.y)
    expect(dx).toBeGreaterThan(0.4)
    expect(dy / dx).toBeLessThan(2)
  })

  it('places the same partial on log, linear, and mel axes', () => {
    const bins = 512
    const sr = 48000
    const dbs = new Float32Array(bins).fill(-90)
    const bin = 30
    dbs[bin] = -9
    const hz = (bin * sr) / (bins * 2)
    const xs = (['log', 'linear', 'mel'] as const).map((scale) => {
      const pts = readCurve(dbs, sr, 20, 20000, scale)
      const peak = pts.reduce((best, p) => (p.y < best.y ? p : best))
      expect(peak.y).toBeCloseTo(9, 0)
      expect(peak.x).toBeCloseTo(hzToX(hz, 20, 20000, 0, 1000, scale), 0)
      return peak.x
    })
    expect(xs[0]).not.toBeCloseTo(xs[1]!, 0)
    expect(xs[0]).not.toBeCloseTo(xs[2]!, 0)
    expect(xs[1]).not.toBeCloseTo(xs[2]!, 0)
  })

  it('matches bar peaks from the same bins without following bar edges', () => {
    const bins = 1024
    const sr = 48000
    const dbs = new Float32Array(bins).fill(-100)
    dbs[4] = -14
    dbs[48] = -22
    dbs[400] = -9
    const minHz = 20
    const maxHz = 20000
    const bands = bandPeakDb(dbs, sr, 32, minHz, maxHz)
    const pts = readCurve(dbs, sr, minHz, maxHz)
    const curveDb = (hz: number) => {
      const x = hzToX(hz, minHz, maxHz, 0, 1000, 'log')
      const y = pts.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best)).y
      return yToDb(y)
    }
    for (const bin of [4, 48, 400]) {
      const hz = (bin * sr) / (bins * 2)
      expect(curveDb(hz)).toBeCloseTo(dbs[bin]!, 0)
    }
    const edges = logBandEdgesHz(minHz, maxHz, bands.length)
    for (let b = 0; b < bands.length; b++) {
      const bar = bands[b] ?? -100
      if (bar <= -90) continue
      const lo = edges[b] ?? minHz
      const hi = edges[b + 1] ?? maxHz
      let curvePeak = -100
      for (const p of pts) {
        const hz = xToHz(p.x, minHz, maxHz, 0, 1000, 'log')
        if (hz < lo || hz > hi) continue
        curvePeak = Math.max(curvePeak, yToDb(p.y))
      }
      expect(curvePeak).toBeCloseTo(bar, 0)
    }
  })

  it('aggregates several bins in one display column to the peak', () => {
    const dbs = new Float32Array(4096).fill(-88)
    dbs[2000] = -40
    dbs[2001] = -7
    dbs[2002] = -33
    const pts = readCurve(dbs, 48000, 20, 20000, 'linear', 128)
    const peak = pts.reduce((best, p) => (p.y < best.y ? p : best))
    expect(peak.y).toBeCloseTo(7, 0)
    const hz = (2001 * 48000) / (4096 * 2)
    expect(peak.x).toBeCloseTo(hzToX(hz, 20, 20000, 0, 128, 'linear'), 0)
  })

  it('does not invent a peak between two quieter bins', () => {
    const bins = 256
    const sr = 32000
    const dbs = new Float32Array(bins).fill(-80)
    dbs[10] = -20
    dbs[14] = -28
    const pts = readCurve(dbs, sr, 20, 16000)
    const loudest = Math.min(...pts.map((p) => p.y))
    expect(loudest).toBeCloseTo(20, 0)
    expect(loudest).toBeGreaterThan(19)
  })
})

describe('strokeSpectrumXY', () => {
  it('strokes a polyline through bin vertices', () => {
    const ops: string[] = []
    const ctx = {
      beginPath: () => ops.push('begin'),
      moveTo: (x: number, y: number) => ops.push(`m${x},${y}`),
      lineTo: (x: number, y: number) => ops.push(`l${x},${y}`),
      stroke: () => ops.push('stroke'),
    } as unknown as CanvasRenderingContext2D
    strokeSpectrumXY(ctx, [0, 10, 4, 2, 9, 8], 3)
    expect(ops).toEqual(['begin', 'm0,10', 'l4,2', 'l9,8', 'stroke'])
  })
})

describe('fillSpectrumXY', () => {
  it('closes the response down to the plot floor', () => {
    const ops: string[] = []
    const ctx = {
      beginPath: () => ops.push('begin'),
      moveTo: (x: number, y: number) => ops.push(`m${x},${y}`),
      lineTo: (x: number, y: number) => ops.push(`l${x},${y}`),
      closePath: () => ops.push('close'),
      fill: () => ops.push('fill'),
    } as unknown as CanvasRenderingContext2D
    fillSpectrumXY(ctx, [2, 4, 8, 6], 2, 50)
    expect(ops[0]).toBe('begin')
    expect(ops[1]).toBe('m2,50')
    expect(ops).toContain('l2,4')
    expect(ops).toContain('l8,6')
    expect(ops).toContain('l8,50')
    expect(ops.at(-1)).toBe('fill')
  })
})

describe('fillSpectrumEnvelope', () => {
  it('closes the envelope to the plot floor', () => {
    const ops: string[] = []
    const ctx = {
      beginPath: () => ops.push('begin'),
      moveTo: (x: number, y: number) => ops.push(`m${x},${y}`),
      lineTo: (x: number, y: number) => ops.push(`l${x},${y}`),
      bezierCurveTo: () => ops.push('b'),
      closePath: () => ops.push('close'),
      fill: () => ops.push('fill'),
    } as unknown as CanvasRenderingContext2D
    fillSpectrumEnvelope(ctx, [
      { x: 2, y: 4 },
      { x: 8, y: 6 },
    ], 50)
    expect(ops[0]).toBe('begin')
    expect(ops[1]).toBe('m2,50')
    expect(ops).toContain('close')
    expect(ops.at(-1)).toBe('fill')
  })
})
