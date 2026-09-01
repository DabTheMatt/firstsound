import { useEffect, useRef, useState } from 'react'
import { engine } from '../../hooks/useEngine'
import { meterDbMin, type MeterRange } from '../../app/editorState'
import styles from './MeterStrip.module.css'

type Props = {
  channels: number
  range: MeterRange
  onRange: (range: MeterRange) => void
}

export function MeterStrip({ channels, range, onRange }: Props) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const clipRef = useRef<HTMLButtonElement>(null)
  const [clipped, setClipped] = useState(false)
  const hold = useRef({ l: 0, r: 0, t: 0 })

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const { left, right } = engine.getChannelAnalysers()
      const minDb = meterDbMin(range)
      const l = peakDb(left)
      const r = peakDb(right ?? left)
      const now = performance.now()
      if (l > hold.current.l || now - hold.current.t > 1200) hold.current.l = l
      if (r > hold.current.r || now - hold.current.t > 1200) hold.current.r = r
      if (l > hold.current.l - 0.01 && r > hold.current.r - 0.01) hold.current.t = now
      if (leftRef.current) leftRef.current.style.height = `${dbToPct(l, minDb)}%`
      if (rightRef.current) rightRef.current.style.height = `${dbToPct(r, minDb)}%`
      if (l >= -0.1 || r >= -0.1) {
        setClipped(true)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [range])

  const stereo = channels !== 1

  return (
    <div className={styles.strip}>
      <button
        ref={clipRef}
        type="button"
        className={`${styles.clip} ${clipped ? styles.clipOn : ''}`}
        aria-label="Reset clip"
        onClick={() => setClipped(false)}
      />
      <div className={styles.meters}>
        <div className={styles.lane}>
          <div ref={leftRef} className={styles.fill} />
          <span>{stereo ? 'L' : 'M'}</span>
        </div>
        {stereo ? (
          <div className={styles.lane}>
            <div ref={rightRef} className={styles.fill} />
            <span>R</span>
          </div>
        ) : null}
      </div>
      <select
        className={styles.select}
        value={range}
        aria-label="Meter range"
        onChange={(e) => onRange(e.target.value as MeterRange)}
      >
        <option value="normal">−60</option>
        <option value="field">−100</option>
        <option value="full">−120</option>
      </select>
    </div>
  )
}

function peakDb(node: AnalyserNode | null): number {
  if (!node) return -Infinity
  const buf = new Float32Array(node.fftSize)
  node.getFloatTimeDomainData(buf)
  let peak = 0
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i] ?? 0)
    if (a > peak) peak = a
  }
  if (!(peak > 0)) return -Infinity
  return 20 * Math.log10(peak)
}

function dbToPct(db: number, minDb: number): number {
  if (!Number.isFinite(db)) return 0
  return Math.min(100, Math.max(0, ((db - minDb) / (0 - minDb)) * 100))
}