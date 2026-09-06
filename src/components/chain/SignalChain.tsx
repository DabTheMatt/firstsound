import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  minimal?: boolean
}

export function SignalChain({ chain, selectedId, onSelect, touch, minimal = false }: Props) {
  const [reorder, setReorder] = useState(false)
  const [openAdd, setOpenAdd] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const drag = useRef<{ id: string; from: number } | null>(null)
  const press = useRef<number | null>(null)
  const middle = chain.filter((m) => !isFixedType(m.type)).length
  const canAdd = middle < MAX_CHAIN_MIDDLE

  const closeAdd = () => {
    setOpenAdd(null)
    setMenuPos(null)
  }

  const beginReorder = (index: number) => {
    const mod = chain[index]
    if (!mod || isFixedType(mod.type)) return
    drag.current = { id: mod.instanceId, from: index }
    setReorder(true)
    closeAdd()
  }

  const insert = (type: ModuleType, afterIndex: number) => {
    const id = engine.insertModule(type, afterIndex)
    closeAdd()
    if (id) onSelect(id)
  }

  return (
    <nav className={`${styles.chain} ${reorder ? styles.reordering : ''} ${minimal ? styles.minimal : ''}`} aria-label="Signal chain">
      <span className={styles.fxTarget} title="Effects process the summed mix, after every track fader">
        Mix FX
      </span>
      {chain.map((mod, index) => {
        const fixed = isFixedType(mod.type)
        const active = mod.instanceId === selectedId
        return (
          <div key={mod.instanceId} className={styles.item}>
            {index > 0 ? (
              <span className={styles.gap}>
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
                        const slot = index - 1
                        if (openAdd === slot) {
                          closeAdd()
                          return
                        }
                        const rect = event.currentTarget.getBoundingClientRect()
                        setMenuPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 })
                        setOpenAdd(slot)
                      }}
                    >
                      +
                    </button>
                  </span>
                ) : null}
              </span>
            ) : null}
            <div
              className={`${styles.tile} ${active ? styles.active : ''} ${mod.bypassed ? styles.bypassed : ''} ${fixed && reorder ? styles.locked : ''}`}
            >
              <button
                type="button"
                className={styles.tab}
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
                  closeAdd()
                  onSelect(mod.instanceId)
                }}
                onContextMenu={(event) => {
                  if (fixed) return
                  event.preventDefault()
                  engine.toggleModuleBypass(mod.instanceId)
                }}
              >
                {moduleLabel(mod, chain)}
              </button>
              {!fixed ? (
                <button
                  type="button"
                  className={`${styles.power} ${mod.bypassed ? styles.powerOff : styles.powerOn}`}
                  aria-label={mod.bypassed ? `Enable ${MODULE_LABELS[mod.type]}` : `Bypass ${MODULE_LABELS[mod.type]}`}
                  title={mod.bypassed ? 'Enable' : 'Bypass'}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    engine.toggleModuleBypass(mod.instanceId)
                  }}
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                    <path
                      d="M8 2.5v5.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5.15 4.35a4.2 4.2 0 1 0 5.7 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
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
      {openAdd != null && menuPos
        ? createPortal(
            <div
              className={styles.menu}
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              {INSERTABLE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => insert(type, openAdd)}
                >
                  {MODULE_LABELS[type]}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </nav>
  )
}
