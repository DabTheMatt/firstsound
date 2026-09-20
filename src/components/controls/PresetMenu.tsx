import type { ReactNode } from 'react'
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
  onApply: (id: string) => void
}

export function PresetMenu({ label, categories, presets, selectedId, onApply }: Props) {
  const grouped = categories
    .map((category) => ({
      category,
      items: presets.filter((p) => p.category === category),
    }))
    .filter((g) => g.items.length > 0)
  return (
    <label className={styles.field} title={label}>
      {label}
      <select
        className={styles.select}
        aria-label={label}
        value={selectedId ?? ''}
        onChange={(event) => {
          if (event.target.value) onApply(event.target.value)
        }}
      >
        <option value="">Choose a preset</option>
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
    </label>
  )
}

export function presetHint(text: string): ReactNode {
  return <p className={styles.help}>{text}</p>
}
