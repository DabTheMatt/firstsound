/**
 * Buffer helpers kept free of Web Audio types so they stay unit-testable and
 * reusable outside the browser engine (e.g. a future native port).
 */

/** Return a new array with samples in reverse order (non-mutating). */
export function reverseChannel(input: Float32Array): Float32Array {
  const out = new Float32Array(input.length)
  const last = input.length - 1
  for (let i = 0; i < input.length; i++) {
    out[i] = input[last - i]
  }
  return out
}

/**
 * Map a forward-time position (seconds) to its position inside a time-reversed
 * copy of the same buffer. Playing the reversed copy forward from this point
 * reproduces the original audio played backwards.
 */
export function reverseTime(seconds: number, duration: number): number {
  return Math.max(0, duration - seconds)
}

/**
 * Build a ping-pong window: samples [startIdx, endIdx) forwards followed by the
 * same samples backwards. Looping this buffer plays the region back and forth
 * seamlessly (the turnaround samples are shared, avoiding a click).
 */
export function pingPongChannel(
  input: Float32Array,
  startIdx: number,
  endIdx: number,
): Float32Array {
  const s = Math.max(0, Math.min(startIdx, input.length))
  const e = Math.max(s, Math.min(endIdx, input.length))
  const region = e - s
  const out = new Float32Array(region * 2)
  for (let i = 0; i < region; i++) {
    const sample = input[s + i]
    out[i] = sample
    out[region * 2 - 1 - i] = sample
  }
  return out
}
