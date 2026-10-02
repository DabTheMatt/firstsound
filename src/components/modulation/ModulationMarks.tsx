import { sliderModulationMarks } from './modulationModel'
import styles from './Modulation.module.css'

type Props = {
  center: number
  range: { min: number; max: number } | null
  live: number | null
}

/** Range band, stored-center thumb, and optional live tick. The thumb does not follow the LFO. */
export function ModulationMarks({ center, range, live }: Props) {
  const marks = sliderModulationMarks({ center, range, live })
  if (!marks.range) return null
  return (
    <>
      <span
        className={styles.trackRange}
        aria-hidden="true"
        style={{ left: `${marks.range.left}%`, width: `${marks.range.width}%` }}
      />
      {marks.live != null ? (
        <span className={styles.trackLive} aria-hidden="true" style={{ left: `${marks.live * 100}%` }} />
      ) : null}
      <span className={styles.trackThumb} aria-hidden="true" style={{ left: `${marks.thumb * 100}%` }} />
    </>
  )
}
