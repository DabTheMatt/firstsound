import { useEffect, useRef, useState } from 'react'
import { isDocumentHidden, paintIntervalMs } from '../../app/frameBudget'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import { engine, useEngine } from '../../hooks/useEngine'
import { ValueKnob } from '../controls/ValueKnob'
import {
  dbToMeterPct,
  fallHoldDb,
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
  const snap = useEngine()
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const leftHoldRef = useRef<HTMLDivElement>(null)
  const rightHoldRef = useRef<HTMLDivElement>(null)
  const [clipped, setClipped] = useState(false)
  const hold = useRef({ l: Number.NEGATIVE_INFINITY, r: Number.NEGATIVE_INFINITY, t: 0 })

  useEffect(() => {
    let frame = 0
    let last = 0
    const leftBuf = { data: null as Float32Array | null }
    const rightBuf = { data: null as Float32Array | null }
    const tick = (now: number) => {
      if (isDocumentHidden() || now - last < paintIntervalMs(engine.getSnapshot().playing)) {
        frame = requestAnimationFrame(tick)
        return
      }
      last = now
      const { left, right } = engine.getChannelAnalysers()
      const minDb = meterDbMin(range)
      const l = peakDb(left, leftBuf)
      const r = peakDb(right ?? left, rightBuf)
      const dt = hold.current.t ? (now - hold.current.t) / 1000 : 0
      hold.current.t = now
      hold.current.l = fallHoldDb(hold.current.l, l, dt)
      hold.current.r = fallHoldDb(hold.current.r, r, dt)
      if (leftRef.current) leftRef.current.style.height = `${dbToMeterPct(l, minDb)}%`
      if (rightRef.current) rightRef.current.style.height = `${dbToMeterPct(r, minDb)}%`
      if (leftHoldRef.current) {
        leftHoldRef.current.style.bottom = `${dbToMeterPct(hold.current.l, minDb)}%`
        leftHoldRef.current.style.opacity = Number.isFinite(hold.current.l) ? '1' : '0'
      }
      if (rightHoldRef.current) {
        rightHoldRef.current.style.bottom = `${dbToMeterPct(hold.current.r, minDb)}%`
        rightHoldRef.current.style.opacity = Number.isFinite(hold.current.r) ? '1' : '0'
      }
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
      <div className={styles.clipRow}>
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
      </div>
      <div className={styles.body}>
        <div className={styles.scale} aria-hidden="true">
          <div
            className={styles.sweetBracket}
            title="−12 to −6 dB"
            style={{ bottom: `${sweet.bottom}%`, height: `${sweet.height}%` }}
          />
          {marks.map((mark) => {
            const edge = mark.db === 0 ? 'top' : mark.db === minDb ? 'bottom' : 'mid'
            return (
              <span
                key={mark.db}
                className={`${styles.tick} ${styles[edge]} ${mark.label ? styles.major : styles.minor}`}
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
            <div ref={leftRef} className={styles.fill} />
            <div ref={leftHoldRef} className={styles.hold} />
            <span>{stereo ? 'L' : 'M'}</span>
          </div>
          {stereo ? (
            <div className={styles.lane}>
              <LaneHashes marks={marks} minDb={minDb} />
              <div ref={rightRef} className={styles.fill} />
              <div ref={rightHoldRef} className={styles.hold} />
              <span>R</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.outKnob}>
        <ValueKnob
          label="Out"
          valueText={formatParamValue(snap.params.outputGain, PARAMS.outputGain)}
          normalized={toNormalized(snap.params.outputGain, PARAMS.outputGain)}
          min={PARAMS.outputGain.min}
          max={PARAMS.outputGain.max}
          now={Number(snap.params.outputGain.toFixed(3))}
          onChange={(n) => engine.setParam('outputGain', fromNormalized(n, PARAMS.outputGain))}
          onReset={() => engine.resetParam('outputGain')}
        />
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

function peakDb(node: AnalyserNode | null, scratch: { data: Float32Array | null }): number {
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
