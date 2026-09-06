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
    expect(pts).toHaveLength(4)
    expect(pts[0]!.x).toBeLessThan(pts[3]!.x)
    expect(pts[0]!.y).toBeLessThan(pts[3]!.y)
    expect(pts[0]!.y).toBeCloseTo(6, 0)
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
    expect(pts[1]!.y).toBe(10)
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
})

describe('strokeSpectrumEnvelope', () => {
  it('strokes a path through the points', () => {
    const ops: string[] = []
    const ctx = {
      beginPath: () => ops.push('begin'),
      moveTo: (x: number, y: number) => ops.push(`m${x},${y}`),
      quadraticCurveTo: () => ops.push('q'),
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
    expect(ops).toContain('stroke')
    expect(ops.at(-2)).toBe('l20,8')
  })
})

describe('fillSpectrumEnvelope', () => {
  it('closes the envelope to the plot floor', () => {
    const ops: string[] = []
    const ctx = {
      beginPath: () => ops.push('begin'),
      moveTo: (x: number, y: number) => ops.push(`m${x},${y}`),
      lineTo: (x: number, y: number) => ops.push(`l${x},${y}`),
      quadraticCurveTo: () => ops.push('q'),
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
