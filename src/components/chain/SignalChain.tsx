import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  INSERTABLE_TYPES,
  isFixedType,
  MAX_CHAIN_MIDDLE,
  moduleLabel,
  type ChainModule,
  type ModuleType,
} from '../../audio/chain/chain'
import { announce, useA11ySettings } from '../../a11y'
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
  const { settings } = useA11ySettings()
  const lowVision = settings.lowVision
  const [reorder, setReorder] = useState(false)
  const [gapAt, setGapAt] = useState<number | null>(null)
  const [addAt, setAddAt] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const drag = useRef<{ id: string; from: number } | null>(null)
  const hoverIndex = useRef<number | null>(null)
  const press = useRef<number | null>(null)
  const chainRef = useRef(chain)
  useEffect(() => {
    chainRef.current = chain
  }, [chain])
  const middle = chain.filter((m) => !isFixedType(m.type)).length
  const canAdd = middle < MAX_CHAIN_MIDDLE

  const closeAdd = () => {
    setAddAt(null)
    setMenuPos(null)
  }

  useEffect(() => {
    if (addAt == null) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeAdd()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addAt])

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

  const markDrop = (index: number) => {
    const mod = chain[index]
    if (!drag.current || !mod) return
    if (isFixedType(mod.type)) {
      const dest = index - 1
      if (dest < 1) return
      hoverIndex.current = dest
      setGapAt(index)
      return
    }
    hoverIndex.current = index
    setGapAt(index)
  }

  const beginReorder = (index: number) => {
    const mod = chain[index]
    if (!mod || isFixedType(mod.type)) return
    drag.current = { id: mod.instanceId, from: index }
    hoverIndex.current = index
    setGapAt(index)
    setReorder(true)
    closeAdd()
  }

  const finishReorder = () => {
    const active = drag.current
    const dest = hoverIndex.current
    const live = chainRef.current
    drag.current = null
    hoverIndex.current = null
    setGapAt(null)
    setReorder(false)
    if (!active || dest == null) return
    const from = live.findIndex((m) => m.instanceId === active.id)
    if (from < 0 || dest === from) return
    if (isFixedType(live[dest]?.type ?? 'gain')) return
    engine.reorderModules(from, dest)
    const moved = live[from]
    const other = live[dest]
    if (!moved || !other) return
    announce(
      dest < from
        ? t.chain.movedBefore(moduleName(moved.type), moduleName(other.type))
        : t.chain.movedAfter(moduleName(moved.type), moduleName(other.type)),
    )
  }

  useEffect(() => {
    if (!reorder) return
    document.documentElement.dataset.chainDrag = '1'
    const end = () => finishReorder()
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      delete document.documentElement.dataset.chainDrag
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [reorder])

  const openInsert = (afterIndex: number, anchor: HTMLButtonElement) => {
    if (!canAdd) return
    if (addAt === afterIndex) {
      closeAdd()
      return
    }
    const rect = anchor.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 })
    setAddAt(afterIndex)
  }

  const insert = (type: ModuleType) => {
    if (addAt == null) return
    const id = engine.insertModule(type, addAt)
    closeAdd()
    if (id) onSelect(id)
  }

  return (
    <nav
      className={`${styles.chain} ${reorder ? styles.reordering : ''} ${minimal ? styles.minimal : ''}`}
      aria-label={t.chain.aria}
    >
      {chain.map((mod, index) => {
        const fixed = isFixedType(mod.type)
        const selected = mod.instanceId === selectedId
        const enabled = fixed || !mod.bypassed
        const label = moduleLabel(mod, chain, t.modules)
        const prev = chain[index - 1]
        return (
          <Fragment key={mod.instanceId}>
            {prev ? (
              <span className={`${styles.insertSlot} ${reorder && gapAt === index ? styles.dropSlot : ''}`}>
                <button
                  type="button"
                  className={`${styles.add} ${addAt === index - 1 ? styles.addOpen : ''}`}
                  aria-label={t.chain.addAfter(moduleLabel(prev, chain, t.modules))}
                  aria-expanded={addAt === index - 1}
                  aria-haspopup="menu"
                  title={t.chain.addAfter(moduleLabel(prev, chain, t.modules))}
                  disabled={!canAdd}
                  onPointerEnter={() => markDrop(index)}
                  onClick={(event) => {
                    event.stopPropagation()
                    openInsert(index - 1, event.currentTarget)
                  }}
                >
                  +
                </button>
              </span>
            ) : null}
            <div
              className={`${styles.tile} ${selected ? styles.selected : ''} ${enabled ? styles.enabled : styles.bypassed} ${fixed ? styles.locked : styles.movable}`}
              title={fixed ? label : t.chain.dragHint}
              onPointerEnter={() => markDrop(index)}
            >
              <button
                type="button"
                className={styles.tab}
                aria-pressed={selected}
                title={label}
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
                }}
                onPointerCancel={() => {
                  if (press.current) window.clearTimeout(press.current)
                  press.current = null
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
                {label}
              </button>
              {lowVision && !fixed ? (
                <span className={styles.stateTag}>{mod.bypassed ? t.chain.bypassedTag : t.inspector.active}</span>
              ) : null}
              {lowVision && !fixed ? (
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
          </Fragment>
        )
      })}
      {addAt != null && menuPos
        ? createPortal(
            <>
              <button type="button" className={styles.scrim} aria-label={t.chain.addEffect} onClick={closeAdd} />
              <div className={styles.menu} role="menu" style={{ top: menuPos.top, left: menuPos.left }}>
                {INSERTABLE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={() => insert(type)}
                  >
                    {t.modules[type]}
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </nav>
  )
}
