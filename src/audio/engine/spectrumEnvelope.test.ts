import { describe, expect, it } from 'vitest'
import { hzToX } from './freqScale'
import { logBandEdgesHz } from './spectrumBands'
import {
  fillSpectrumEnvelope,
  fillSpectrumXY,
  spectrumEnvelopePoints,
  strokeSpectrumEnvelope,
  strokeSpectrumXY,
  writeSpectrumBinLine,
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
    const pts = spectrumEnvelopePoints([-100, -40], edges, 20, 20000, {
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
