import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AUTOMATION_PALETTE, automationColor } from '../../audio/automation/automation'
import styles from './AutomationColorPicker.module.css'

type Props = {
  anchor: HTMLElement | null
  value: number
  label: string
  optionLabel: (index: number) => string
  onPick: (index: number) => void
  onClose: () => void
}

const MENU_WIDTH = 116
const MENU_HEIGHT = 116

/** Compact palette popover. Uses the automation line tokens so themes stay in sync. */
export function AutomationColorPicker({ anchor, value, label, optionLabel, onPick, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const place = () => {
      const rect = anchor.getBoundingClientRect()
      const margin = 8
      let left = rect.left
      if (left + MENU_WIDTH > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - MENU_WIDTH - margin)
      let top = rect.bottom + 6
      if (top + MENU_HEIGHT > window.innerHeight - margin) top = Math.max(margin, rect.top - MENU_HEIGHT - 6)
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (node && (anchor?.contains(node) || menuRef.current?.contains(node))) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  if (!pos) return null
  return createPortal(
    <div ref={menuRef} className={styles.menu} role="listbox" aria-label={label} style={{ top: pos.top, left: pos.left }}>
      {AUTOMATION_PALETTE.map((_, index) => {
        const selected = index === value
        return (
          <button
            key={index}
            type="button"
            role="option"
            className={styles.swatch}
            aria-selected={selected}
            aria-label={optionLabel(index + 1)}
            title={optionLabel(index + 1)}
            style={{ background: automationColor(index) }}
            onClick={() => onPick(index)}
          />
        )
      })}
    </div>,
    document.body,
  )
}
