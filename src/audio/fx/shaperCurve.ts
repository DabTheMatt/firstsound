const shaperCurveKey = new WeakMap<WaveShaperNode, string>()

/**
 * WaveShaper curves are static transfers. Assign one only when the transfer
 * changes so offline engines that reject a second write (and live graphs)
 * keep the curve that matches the current parameters.
 */
export function setShaperCurve(shaper: WaveShaperNode, key: string, curve: Float32Array): void {
  if (shaperCurveKey.get(shaper) === key) return
  const copy = new Float32Array(curve.length)
  copy.set(curve)
  shaper.curve = copy
  shaperCurveKey.set(shaper, key)
}
