import type { LfoShape } from '../../audio/fx/lfo'
import { LFO_SHAPES } from '../../audio/fx/lfo'
import styles from './LfoShapePicker.module.css'

type Props = {
  value: LfoShape
  onChange: (shape: LfoShape) => void
  compact?: boolean
}

export function LfoShapePicker({ value, onChange, compact = false }: Props) {
  return (
    <div
      className={`${styles.group} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label="LFO shape"
    >
      {LFO_SHAPES.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            className={`${styles.btn} ${active ? styles.on : ''}`}
            onClick={() => onChange(opt.value)}
          >
            <LfoShapeIcon shape={opt.value} />
          </button>
        )
      })}
    </div>
  )
}

export function LfoShapeIcon({ shape }: { shape: LfoShape }) {
  return (
    <svg viewBox="0 0 24 16" width="22" height="14" aria-hidden="true">
      <path
        d={LFO_ICON_PATH[shape]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const LFO_ICON_PATH: Record<LfoShape, string> = {
  sine: 'M2 8 C6 0 8 16 12 8 S18 16 22 8',
  triangle: 'M2 12 L8 4 L16 12 L22 4',
  square: 'M2 12 V4 H12 V12 H22',
  saw: 'M3 12 V4 L21 12',
  snh: 'M2 11 H7 V4 H12 V12 H17 V7 H22',
}
