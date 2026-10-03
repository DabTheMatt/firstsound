import { sliderModulationMarks } from './modulationModel'
import styles from './Modulation.module.css'

type Props = {
  center: number
  range: { min: number; max: number } | null
  live: number | null
}

/** Range band plus a thumb on the current effective value. */
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
      <span className={styles.trackThumb} aria-hidden="true" style={{ left: `${marks.thumb * 100}%` }} />
    </>
  )
}
