import { useRef, useState } from 'react'
import { isFixedType, MODULE_LABELS, type ChainModule } from '../../audio/chain/chain'
import { engine } from '../../hooks/useEngine'
import styles from './SignalChain.module.css'

type Props = {
  chain: ChainModule[]
  selectedId: string
  onSelect: (instanceId: string) => void
  touch: boolean
}

export function SignalChain({ chain, selectedId, onSelect, touch }: Props) {
  const [reorder, setReorder] = useState(false)
  const drag = useRef<{ id: string; from: number } | null>(null)
  const press = useRef<number | null>(null)

  const beginReorder = (index: number) => {
    const mod = chain[index]
    if (!mod || isFixedType(mod.type)) return
    drag.current = { id: mod.instanceId, from: index }
    setReorder(true)
  }

  return (
    <nav className={`${styles.chain} ${reorder ? styles.reordering : ''}`} aria-label="Signal chain">
      {chain.map((mod, index) => {
        const fixed = isFixedType(mod.type)
        const active = mod.instanceId === selectedId
        return (
          <div key={mod.instanceId} className={styles.item}>
            {index > 0 ? (
              <span className={styles.arrow} aria-hidden="true">
                <svg viewBox="0 0 14 16" width="14" height="16">
                  <path
                    d="M2 8h8M7 4l4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : null}
            <button
              type="button"
              className={`${styles.tab} ${active ? styles.active : ''} ${mod.bypassed ? styles.bypassed : ''} ${fixed && reorder ? styles.locked : ''}`}
              aria-pressed={active}
              onPointerDown={(event) => {
                if (fixed) return
                if (touch) {
                  press.current = window.setTimeout(() => beginReorder(index), 420)
                  return
                }
                if (event.button !== 0) return
                beginReorder(index)
              }}
              onPointerUp={() => {
                if (press.current) {
                  window.clearTimeout(press.current)
                  press.current = null
                }
                drag.current = null
                setReorder(false)
              }}
              onPointerCancel={() => {
                if (press.current) window.clearTimeout(press.current)
                press.current = null
                drag.current = null
                setReorder(false)
              }}
              onPointerEnter={() => {
                if (!drag.current || drag.current.id === mod.instanceId) return
                const from = chain.findIndex((m) => m.instanceId === drag.current?.id)
                if (from >= 0) engine.reorderModules(from, index)
              }}
              onClick={() => {
                if (press.current) {
                  window.clearTimeout(press.current)
                  press.current = null
                }
                onSelect(mod.instanceId)
              }}
              onContextMenu={(event) => {
                if (fixed) return
                event.preventDefault()
                engine.setModuleBypass(mod.instanceId, !mod.bypassed)
              }}
            >
              {MODULE_LABELS[mod.type]}
            </button>
          </div>
        )
      })}
    </nav>
  )
}