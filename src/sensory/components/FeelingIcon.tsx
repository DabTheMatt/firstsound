import type { SensoryFeeling } from '../sensoryFeelings'
import { panNorm } from '../visualization/sensoryVisualState'
import styles from './FeelingRail.module.css'

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function fill01(feeling: SensoryFeeling, amount: number): number {
  return feeling.kind === 'bipolar' ? (amount + 1) / 2 : clamp(amount, 0, 1)
}

type Props = {
  feeling: SensoryFeeling
  amount: number
  livePanPct: number
}

/** Compact glyph for one feeling. Amount is drawn inside the icon, never as a slider. */
export function FeelingIcon({ feeling, amount, livePanPct }: Props) {
  const a = fill01(feeling, amount)
  const visual = feeling.visual
  return (
    <span className={styles.iconWell}>
      <svg className={styles.meter} viewBox="0 0 28 28" aria-hidden="true">
        {visual === 'character' ? (
          <path
            d={`M3 ${18 - a * 4} C 8 ${20 + a * 4}, 12 ${10 - a * 8}, 16 ${14 + a * 2} S 24 ${8 + a * 6}, 25 ${12 - a * 3}`}
            className={styles.wave}
          />
        ) : visual === 'space' ? (
          <>
            <ellipse cx="14" cy="16" rx={5 + a * 7} ry={(5 + a * 7) * 0.42} className={styles.arc} opacity={0.28 + a * 0.45} />
            <ellipse cx="14" cy="16" rx={3 + a * 4} ry={(3 + a * 4) * 0.42} className={styles.arc} opacity={0.5 + a * 0.4} />
            <circle cx="14" cy="16" r={2 + a} className={styles.knob} />
          </>
        ) : visual === 'echo' ? (
          [0, 1, 2].map((i) => (
            <rect
              key={i}
              x={5 + i * 7}
              y={6 + i * 3}
              width="5"
              height={16 - i * 4}
              rx="1.5"
              className={a > 0.06 + i * 0.28 ? styles.knob : styles.track}
              opacity={a > 0.06 + i * 0.28 ? 1 - i * 0.18 : 0.3}
            />
          ))
        ) : visual === 'grain' ? (
          Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={4 + i * 3.2}
              y="6"
              width="2.2"
              height="16"
              className={i < Math.max(1, Math.round(1 + a * 6)) ? styles.knob : styles.track}
              opacity={i < Math.max(1, Math.round(1 + a * 6)) ? 1 : 0.28}
            />
          ))
        ) : visual === 'dirt' ? (
          <path d={`M4 22 L8 ${22 - (6 + a * 12) * 0.4} L14 ${22 - (6 + a * 12)} L20 ${22 - (6 + a * 12) * 0.55} L24 22 Z`} className={styles.jag} />
        ) : visual === 'tight' ? (
          <>
            <path d={`M${7 - a * 2} 6 L${11 - a * 2} 14 L${7 - a * 2} 22`} className={styles.brace} />
            <rect x={14 - (8 - a * 5) / 2} y="9" width={8 - a * 5} height="10" rx="2" className={styles.knob} />
            <path d={`M${21 + a * 2} 6 L${17 + a * 2} 14 L${21 + a * 2} 22`} className={styles.brace} />
          </>
        ) : visual === 'mod' ? (
          <>
            <path
              d={`M4 14 C 8 ${14 - (3 + a * 6)}, 12 ${14 + (3 + a * 6)}, 16 14 S 24 ${14 - (3 + a * 6)}, 24 14`}
              className={styles.wave}
            />
            <path d={`M4 ${18 - a * 4} C 8 20, 12 8, 16 14 S 24 20, 24 ${18 - a * 4}`} className={styles.waveSoft} />
          </>
        ) : visual === 'pan' ? (
          <>
            <path d="M5 14 H23" className={styles.waveSoft} />
            <circle cx={14 + panNorm(livePanPct) * 8} cy="14" r={4 + a * 1.4} className={styles.knob} />
            <circle cx="14" cy="14" r="2" className={styles.track} />
          </>
        ) : visual === 'veil' ? (
          <>
            <rect x="5" y="6" width="18" height="16" rx="2" className={styles.arc} opacity={0.25 + a * 0.2} />
            <rect x="7" y="8" width="14" height="12" rx="2" className={styles.track} opacity={0.45 + a * 0.4} />
            <rect x="9" y={10 + (1 - a) * 4} width="10" height={8 * a + 2} rx="1" className={styles.knob} opacity={0.35 + a * 0.55} />
          </>
        ) : visual === 'halo' ? (
          <>
            <circle cx="14" cy="14" r={5 + a * 6} className={styles.arc} opacity={0.22 + a * 0.4} />
            <circle cx="14" cy="14" r={3 + a * 3} className={styles.arc} opacity={0.5} />
            <circle cx="14" cy="14" r={2 + a} className={styles.knob} />
          </>
        ) : visual === 'well' ? (
          <>
            <path d={`M6 8 L6 ${12 + a * 6} Q 14 ${22 + a * 2} 22 ${12 + a * 6} L22 8`} className={styles.brace} />
            <ellipse cx="14" cy={12 + a * 6} rx={8 - a} ry={2 + a} className={styles.arc} />
          </>
        ) : (
          <>
            <circle cx={10 - a * 3} cy="14" r={4 + a} className={styles.knob} opacity={0.55 + a * 0.4} />
            <circle cx={18 + a * 3} cy="14" r={4 + a} className={styles.knob} opacity={0.55 + a * 0.4} />
          </>
        )}
      </svg>
    </span>
  )
}
