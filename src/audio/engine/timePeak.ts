/** Peak dBFS from an AnalyserNode time-domain buffer. Same reading as the loudness meter. */
export function timeDomainPeakDb(
  node: AnalyserNode | null,
  scratch: { data: Float32Array | null },
): number {
  if (!node) return Number.NEGATIVE_INFINITY
  if (!scratch.data || scratch.data.length !== node.fftSize) scratch.data = new Float32Array(node.fftSize)
  const buf = scratch.data
  node.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>)
  let peak = 0
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i] ?? 0)
    if (a > peak) peak = a
  }
  if (!(peak > 0)) return Number.NEGATIVE_INFINITY
  return 20 * Math.log10(peak)
}

export function louderPeakDb(a: number, b: number): number {
  if (!Number.isFinite(a)) return b
  if (!Number.isFinite(b)) return a
  return a > b ? a : b
}
