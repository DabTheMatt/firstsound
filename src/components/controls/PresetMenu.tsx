import type { ReactNode } from 'react'
import { EFFECT_DEFAULT_ID } from '../../audio/fx/effectDefaults'
import styles from '../inspector/Inspector.module.css'

export type PresetOption = {
  id: string
  name: string
  category: string
  hint?: string
}

type Props = {
  label: string
  categories: string[]
  presets: PresetOption[]
  selectedId?: string | null
  /** True when the effect is already sitting on its original parameter values. */
  matchesDefault?: boolean
  onApply: (id: string) => void
  onDefault: () => void
}

export function PresetMenu({
  label,
  categories,
  presets,
  selectedId,
  matchesDefault = false,
  onApply,
  onDefault,
}: Props) {
  const grouped = categories
    .map((category) => ({
      category,
      items: presets.filter((p) => p.category === category),
    }))
    .filter((g) => g.items.length > 0)
  const value = selectedId || (matchesDefault ? EFFECT_DEFAULT_ID : '')
  const active = Boolean(value)
  return (
    <label className={styles.field} title={label}>
      {label}
      <select
        className={`${styles.select} ${active ? styles.selectOn : ''}`}
        aria-label={label}
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (!next) return
          if (next === EFFECT_DEFAULT_ID) onDefault()
          else onApply(next)
        }}
      >
        <option value="" disabled>
          Choose a preset
        </option>
        <option value={EFFECT_DEFAULT_ID}>Default</option>
        {grouped.map((group) => (
          <optgroup key={group.category} label={group.category}>
            {group.items.map((item) => (
              <option key={item.id} value={item.id} title={item.hint}>
                {item.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {matchesDefault && !selectedId ? <p className={styles.selectCurrent}>Default</p> : null}
    </label>
  )
}

export function presetHint(text: string): ReactNode {
  return <p className={styles.help}>{text}</p>
}
