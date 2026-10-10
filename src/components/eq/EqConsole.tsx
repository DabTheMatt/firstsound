import { useEffect, useState } from 'react'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import { eqStripKey, planEqBandInsert, type EqFilterType } from '../../audio/engine/eqBands'
import {
  clampEqOverlayFocus,
  eqOverlayIncludes,
  eqOverlayOptions,
  loadEqOverlayFocus,
  persistEqOverlayFocus,
  subscribeEqOverlayFocus,
} from '../../audio/engine/eqOverlayFocus'
import { engine, useEngine } from '../../hooks/useEngine'
import { eqStripHeading } from './eqBandStyle'
import { EqBandStrip } from './EqBandStrip'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import { EqLayoutButton } from './EqLayoutButton'
import { EnterFocusButton } from '../focus/EnterFocusButton'
import styles from './EqConsole.module.css'

type Props = {
  onFocusModule?: (instanceId: string) => void
  onEnterFocus?: () => void
  onShowInspector?: () => void
}

/** Mixer-style EQ strips under the FFT: one column per enabled band. */
export function EqConsole({ onFocusModule, onEnterFocus, onShowInspector }: Props) {
  const snap = useEngine()
  const eqs = snap.chain.filter((m) => m.type === 'eq')
  const many = eqs.length > 1
  const [focusRaw, setFocusRaw] = useState(() => loadEqOverlayFocus())
  const focus = clampEqOverlayFocus(focusRaw, snap.chain)
  const [selected, setSelected] = useState<EqBandSelection | null>(null)

  useEffect(() => subscribeEqOverlayFocus(setFocusRaw), [])
  useEffect(() => subscribeEqBandSelection(setSelected), [])

  const visible = eqs.filter((mod) => eqOverlayIncludes(focus, mod.instanceId))

  return (
    <div className={styles.console} aria-label="EQ control center">
      {onEnterFocus ? <EnterFocusButton corner label="EQ" onClick={onEnterFocus} /> : null}
      {onShowInspector ? (
        <div className={styles.layoutFloat}>
          <EqLayoutButton to="inspector" onClick={onShowInspector} />
        </div>
      ) : null}
      {many ? (
      <div className={styles.consoleHead}>
        <span className={styles.headActions}>
          <label className={styles.focus}>
              EQ
              <select
                aria-label="EQ overlay"
                value={focus}
                onChange={(event) => {
                  setFocusRaw(event.target.value)
                  persistEqOverlayFocus(clampEqOverlayFocus(event.target.value, snap.chain))
                }}
              >
                {eqOverlayOptions(snap.chain).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
          </label>
        </span>
      </div>
      ) : null}
      <div className={styles.strips}>
        <div className={styles.stripRow}>
        {eqs.length === 0 ? (
          <AddEqStrip
            instanceId={null}
            label="EQ · ADD"
            chainLength={snap.chain.length}
            onFocusModule={onFocusModule}
          />
        ) : null}
        {visible.flatMap((mod) => {
          const bands = snap.eqById[mod.instanceId]?.bands ?? []
          const eqNumber = eqs.findIndex((item) => item.instanceId === mod.instanceId) + 1
          let visibleNumber = 0
          const enabled = bands.flatMap((band, index) => {
            if (band.type === 'off') return []
            visibleNumber += 1
            const bandNumber = visibleNumber
            return [
              <EqBandStrip
                key={eqStripKey(mod.instanceId, band)}
                snap={snap}
                instanceId={mod.instanceId}
                index={index}
                band={band}
                label={eqStripHeading(eqs.length, eqNumber, bandNumber)}
                selected={selected?.instanceId === mod.instanceId && selected.index === index}
              />,
            ]
          })
          const canAdd = planEqBandInsert(bands) != null
          return [
            ...enabled,
            canAdd ? (
              <AddEqStrip
                key={`${mod.instanceId}-add`}
                instanceId={mod.instanceId}
                label="EQ · ADD"
                chainLength={snap.chain.length}
                onFocusModule={onFocusModule}
              />
            ) : null,
          ]
        })}
        </div>
      </div>
    </div>
  )
}

function AddEqStrip({
  instanceId,
  label,
  chainLength,
  onFocusModule,
}: {
  instanceId: string | null
  label: string
  chainLength: number
  onFocusModule?: (instanceId: string) => void
}) {
  const [picked, setPicked] = useState<EqFilterType>('off')
  return (
    <article className={`${styles.strip} ${styles.stripAdd}`}>
      <header className={styles.stripHead}>
        <span className={styles.stripLabel}>{label}</span>
      </header>
      <EqFilterTypeMenu
        value={picked}
        onChange={(type) => {
          setPicked('off')
          if (type === 'off') return
          let id = instanceId
          if (!id) {
            id = engine.insertModule('eq', Math.max(0, chainLength - 2))
            if (id) onFocusModule?.(id)
          }
          if (!id) return
          const next = engine.createEqStrip(type, id)
          if (next != null) selectEqBand({ instanceId: id, index: next })
        }}
      />
    </article>
  )
}
