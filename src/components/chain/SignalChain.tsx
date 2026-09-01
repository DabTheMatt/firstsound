import { useRef, useState } from 'react'
import {
  INSERTABLE_TYPES,
  isFixedType,
  MAX_CHAIN_MIDDLE,
  MODULE_LABELS,
  moduleLabel,
  type ChainModule,
  type ModuleType,
} from '../../audio/chain/chain'
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
  const [openAdd, setOpenAdd] = useState<number | null>(null)
  const drag = useRef<{ id: string; from: number } | null>(null)
  const press = useRef<number | null>(null)
  const middle = chain.filter((m) => !isFixedType(m.type)).length
  const canAdd = middle < MAX_CHAIN_MIDDLE

  const beginReorder = (index: number) => {
    const mod = chain[index]
    if (!mod || isFixedType(mod.type)) return
    drag.current = { id: mod.instanceId, from: index }
    setReorder(true)
    setOpenAdd(null)
  }

  const insert = (type: ModuleType, afterIndex: number) => {
    const id = engine.insertModule(type, afterIndex)
    setOpenAdd(null)
    if (id) onSelect(id)
  }

  return (
    <nav className={`${styles.chain} ${reorder ? styles.reordering : ''}`} aria-label="Signal chain">
      {chain.map((mod, index) => {
        const fixed = isFixedType(mod.type)
        const active = mod.instanceId === selectedId
        return (
          <div key={mod.instanceId} className={styles.item}>
            {index > 0 ? (
              <span className={styles.gap}>
                {canAdd ? (
                  <span className={`${styles.addWrap} ${openAdd === index - 1 ? styles.addOpen : ''}`}>
                    <button
                      type="button"
                      className={styles.add}
                      aria-label="Add effect"
                      aria-expanded={openAdd === index - 1}
                      title="Add effect"
                      onClick={(event) => {
                        event.stopPropagation()
                        setOpenAdd((cur) => (cur === index - 1 ? null : index - 1))
                      }}
                    >
                      +
                    </button>
                    {openAdd === index - 1 ? (
                      <div className={styles.menu} role="menu">
                        {INSERTABLE_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            role="menuitem"
                            className={styles.menuItem}
                            onClick={(event) => {
                              event.stopPropagation()
                              insert(type, index - 1)
                            }}
                          >
                            {MODULE_LABELS[type]}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </span>
                ) : (
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
                )}
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
                setOpenAdd(null)
                onSelect(mod.instanceId)
              }}
              onContextMenu={(event) => {
                if (fixed) return
                event.preventDefault()
                engine.setModuleBypass(mod.instanceId, !mod.bypassed)
              }}
            >
              {moduleLabel(mod, chain)}
            </button>
            {mod.type === 'delay' || mod.type === 'reverb' ? (
              <button
                type="button"
                className={styles.kill}
                aria-label={`Kill ${MODULE_LABELS[mod.type]}`}
                title={`Kill ${MODULE_LABELS[mod.type]} tails`}
                onClick={(event) => {
                  event.stopPropagation()
                  engine.killFx(mod.type === 'delay' ? 'delay' : 'reverb')
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
