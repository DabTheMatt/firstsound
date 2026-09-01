import { useEffect, useRef, useState } from 'react'
import { engine } from '../../hooks/useEngine'
import {
  dbToMeterPct,
  meterDbMin,
  meterScaleMarks,
  meterSweetBand,
  type MeterRange,
  type MeterScaleMark,
} from '../../app/editorState'
import styles from './MeterStrip.module.css'

type Props = {
  channels: number
  range: MeterRange
  onRange: (range: MeterRange) => void
}

export function MeterStrip({ channels, range, onRange }: Props) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
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
      if (leftRef.current) leftRef.current.style.height = `${dbToMeterPct(l, minDb)}%`
      if (rightRef.current) rightRef.current.style.height = `${dbToMeterPct(r, minDb)}%`
      if (l >= -0.1 || r >= -0.1) {
        setClipped(true)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [range])

  const stereo = channels !== 1
  const minDb = meterDbMin(range)
  const marks = meterScaleMarks(minDb)
  const sweet = meterSweetBand(minDb)

  return (
    <div className={styles.strip}>
      <button
        type="button"
        className={`${styles.clip} ${clipped ? styles.clipOn : ''}`}
        aria-label="Reset clip"
        title="Reset clip indicator"
        onClick={() => setClipped(false)}
      >
        <span className={styles.led} aria-hidden="true" />
        <span className={styles.clipLabel}>Clip</span>
      </button>
      <div className={styles.body}>
        <div className={styles.scale} aria-hidden="true">
          {marks.map((mark) => {
            const edge = mark.db === 0 ? 'top' : mark.db === minDb ? 'bottom' : 'mid'
            return (
              <span
                key={mark.db}
                className={`${styles.tick} ${styles[edge]} ${mark.label ? styles.major : styles.minor} ${mark.db === -12 || mark.db === -6 ? styles.sweetTick : ''}`}
                style={{ bottom: `${dbToMeterPct(mark.db, minDb)}%` }}
              >
                {mark.label ? (mark.db === 0 ? '0' : `${mark.db}`) : null}
              </span>
            )
          })}
        </div>
        <div className={styles.meters}>
          <div className={styles.lane}>
            <LaneHashes marks={marks} minDb={minDb} />
            <div
              className={styles.zone}
              title="−12 to −6 dB"
              style={{ bottom: `${sweet.bottom}%`, height: `${sweet.height}%` }}
            />
            <div ref={leftRef} className={styles.fill} />
            <span>{stereo ? 'L' : 'M'}</span>
          </div>
          {stereo ? (
            <div className={styles.lane}>
              <LaneHashes marks={marks} minDb={minDb} />
              <div
                className={styles.zone}
                title="−12 to −6 dB"
                style={{ bottom: `${sweet.bottom}%`, height: `${sweet.height}%` }}
              />
              <div ref={rightRef} className={styles.fill} />
              <span>R</span>
            </div>
          ) : null}
        </div>
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

function LaneHashes({ marks, minDb }: { marks: MeterScaleMark[]; minDb: number }) {
  return (
    <div className={styles.hashes} aria-hidden="true">
      {marks.map((mark) => (
        <i
          key={mark.db}
          className={mark.label ? styles.hashMajor : styles.hashMinor}
          style={{ bottom: `${dbToMeterPct(mark.db, minDb)}%` }}
        />
      ))}
    </div>
  )
}

function peakDb(node: AnalyserNode | null): number {
  if (!node) return Number.NEGATIVE_INFINITY
  const buf = new Float32Array(node.fftSize)
  node.getFloatTimeDomainData(buf)
  let peak = 0
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i] ?? 0)
    if (a > peak) peak = a
  }
  if (!(peak > 0)) return Number.NEGATIVE_INFINITY
  return 20 * Math.log10(peak)
}
