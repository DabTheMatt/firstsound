import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  INSERTABLE_TYPES,
  isFixedType,
  MAX_CHAIN_MIDDLE,
  moduleLabel,
  type ChainModule,
  type ModuleType,
} from '../../audio/chain/chain'
import { announce } from '../../a11y'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './SignalChain.module.css'

type Props = {
  chain: ChainModule[]
  selectedId: string
  onSelect: (instanceId: string) => void
  touch: boolean
  minimal?: boolean
}

export function SignalChain({ chain, selectedId, onSelect, touch, minimal = false }: Props) {
  const { t, moduleName } = useI18n()
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

  useEffect(() => {
    if (openAdd == null) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeAdd()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openAdd])

  const moveModule = (index: number, dir: -1 | 1) => {
    const mod = chain[index]
    if (!mod || isFixedType(mod.type)) return
    const dest = index + dir
    if (dest < 1 || dest >= chain.length - 1) return
    const other = chain[dest]
    engine.reorderModules(index, dest)
    if (!other) return
    const vars = [moduleName(mod.type), moduleName(other.type)] as const
    announce(dir < 0 ? t.chain.movedBefore(vars[0], vars[1]) : t.chain.movedAfter(vars[0], vars[1]))
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
    <nav className={`${styles.chain} ${reorder ? styles.reordering : ''} ${minimal ? styles.minimal : ''}`} aria-label={t.chain.aria}>
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
                      aria-label={t.chain.addEffect}
                      aria-expanded={openAdd === index - 1}
                      title={t.chain.addEffect}
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
                onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                  if (fixed) return
                  if ((event.altKey || event.metaKey) && event.key === 'ArrowLeft') {
                    event.preventDefault()
                    moveModule(index, -1)
                  } else if ((event.altKey || event.metaKey) && event.key === 'ArrowRight') {
                    event.preventDefault()
                    moveModule(index, 1)
                  }
                }}
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
                {moduleLabel(mod, chain, t.modules)}
                {mod.bypassed ? <span className={styles.bypassTag}>{t.chain.bypassedTag}</span> : null}
              </button>
              {!fixed ? (
                <div className={styles.moves}>
                  <button
                    type="button"
                    className={styles.move}
                    aria-label={t.chain.moveEarlier}
                    disabled={index <= 1}
                    onClick={(event) => {
                      event.stopPropagation()
                      moveModule(index, -1)
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={styles.move}
                    aria-label={t.chain.moveLater}
                    disabled={index >= chain.length - 2}
                    onClick={(event) => {
                      event.stopPropagation()
                      moveModule(index, 1)
                    }}
                  >
                    ›
                  </button>
                </div>
              ) : null}
              {!fixed ? (
                <button
                  type="button"
                  className={`${styles.power} ${mod.bypassed ? styles.powerOff : styles.powerOn}`}
                  aria-label={mod.bypassed ? t.chain.bypassOn(moduleName(mod.type)) : t.chain.bypassOff(moduleName(mod.type))}
                  aria-pressed={mod.bypassed}
                  title={mod.bypassed ? t.chain.enableShort : t.chain.bypassShort}
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
                aria-label={t.chain.kill(moduleName(mod.type))}
                title={t.chain.killTitle(moduleName(mod.type))}
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
                  {t.modules[type]}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </nav>
  )
}
