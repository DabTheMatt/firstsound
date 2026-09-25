import { describe, expect, it } from 'vitest'
import { logBandEdgesHz } from './spectrumBands'
import { fillSpectrumEnvelope, spectrumEnvelopePoints, strokeSpectrumEnvelope } from './spectrumEnvelope'

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
      bezierCurveTo: (_c1x: number, _c1y: number, _c2x: number, _c2y: number, x: number, y: number) =>
        ops.push(`b${x},${y}`),
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
    expect(ops).toContain('b10,20')
    expect(ops).toContain('b20,8')
    expect(ops).toContain('stroke')
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
