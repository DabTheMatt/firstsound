import { PARAMS } from '../parameters/definitions'
import { fromNormalized, toNormalized } from '../parameters/mapping'

/**
 * Stereo-stage pad.
 * X = width (L/R speaker spread).
 * Y follows xyFromClient (1 at the top): far/side at the top, near/mid at the bottom.
 */
export function padFromMidSide(width: number, balance: number): { x: number; y: number } {
  return {
    x: toNormalized(width, PARAMS.msWidth),
    y: 1 - toNormalized(balance, PARAMS.msBalance),
  }
}

export function midSideFromPad(nx: number, ny: number): { msWidth: number; msBalance: number } {
  const x = Math.min(1, Math.max(0, nx))
  const y = Math.min(1, Math.max(0, ny))
  return {
    msWidth: fromNormalized(x, PARAMS.msWidth),
    msBalance: fromNormalized(1 - y, PARAMS.msBalance),
  }
}
