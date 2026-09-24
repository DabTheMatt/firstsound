import { useEffect, useState } from 'react'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import { moduleLabel } from '../../audio/chain/chain'
import { EQ_MAX_BANDS, type EqFilterType } from '../../audio/engine/eqBands'
import {
  clampEqOverlayFocus,
  eqOverlayIncludes,
  eqOverlayOptions,
  loadEqOverlayFocus,
  persistEqOverlayFocus,
  subscribeEqOverlayFocus,
} from '../../audio/engine/eqOverlayFocus'
import { engine, useEngine } from '../../hooks/useEngine'
import { EqBandStrip } from './EqBandStrip'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import styles from './EqConsole.module.css'

type Props = {
  onFocusModule?: (instanceId: string) => void
}

/** Mixer-style EQ strips under the FFT: one column per enabled band. */
export function EqConsole({ onFocusModule }: Props) {
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
      {many ? (
        <div className={styles.consoleHead}>
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
        </div>
      ) : null}
      <div className={styles.strips}>
        {eqs.length === 0 ? (
          <AddEqStrip
            instanceId={null}
            index={-1}
            label="EQ · ADD"
            chainLength={snap.chain.length}
            onFocusModule={onFocusModule}
          />
        ) : null}
        {visible.flatMap((mod) => {
          const bands = snap.eqById[mod.instanceId]?.bands ?? []
          const name = many ? moduleLabel(mod, snap.chain) : 'EQ'
          const enabled = bands.flatMap((band, index) =>
            band.type === 'off'
              ? []
              : [
                  <EqBandStrip
                    key={`${mod.instanceId}-${index}`}
                    snap={snap}
                    instanceId={mod.instanceId}
                    index={index}
                    band={band}
                    label={`${name} · ${index + 1}`}
                    selected={selected?.instanceId === mod.instanceId && selected.index === index}
                  />,
                ],
          )
          const offIndex = bands.findIndex((b) => b.type === 'off')
          const canAdd = offIndex >= 0 || bands.length < EQ_MAX_BANDS
          return [
            ...enabled,
            canAdd ? (
              <AddEqStrip
                key={`${mod.instanceId}-add`}
                instanceId={mod.instanceId}
                index={offIndex}
                label="EQ · ADD"
                chainLength={snap.chain.length}
                onFocusModule={onFocusModule}
              />
            ) : null,
          ]
        })}
      </div>
    </div>
  )
}

function AddEqStrip({
  instanceId,
  index,
  label,
  chainLength,
  onFocusModule,
}: {
  instanceId: string | null
  index: number
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
          const apply = (bandIndex: number) => {
            const slope = type === 'highpass' || type === 'lowpass' ? 48 : undefined
            engine.setEqBand(bandIndex, slope ? { type, slope } : { type }, id!)
            selectEqBand({ instanceId: id!, index: bandIndex })
          }
          if (index >= 0) {
            apply(index)
            return
          }
          const next = engine.addEqBand(id)
          if (next != null) apply(next)
        }}
      />
    </article>
  )
}
