import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useA11ySettings } from './useA11ySettings'
import styles from './ControlTooltip.module.css'

type Props = {
  text: string
  children: ReactNode
}

export function ControlTooltip({ text, children }: Props) {
  const id = useId()
  const { settings } = useA11ySettings()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div
      className={styles.wrap}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      {children}
      <p id={id} className="sr-only">
        {text}
      </p>
      {settings.showDescriptions && open ? (
        <span className={styles.tip} role="tooltip">
          {text}
        </span>
      ) : null}
    </div>
  )
}

export function descriptionIdFrom(labelId: string): string {
  return `${labelId}-desc`
}
