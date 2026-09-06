import { useEffect, useState } from 'react'
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
import { eqTone, readThemeColors } from '../../theme'
import { EqBandStrip } from './EqBandStrip'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import styles from './EqConsole.module.css'

/** Mixer-style EQ strips under the FFT: one column per enabled band. */
export function EqConsole() {
  const snap = useEngine()
  const eqs = snap.chain.filter((m) => m.type === 'eq')
  const many = eqs.length > 1
  const [focusRaw, setFocusRaw] = useState(() => loadEqOverlayFocus())
  const focus = clampEqOverlayFocus(focusRaw, snap.chain)

  useEffect(() => subscribeEqOverlayFocus(setFocusRaw), [])

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
        {visible.flatMap((mod) => {
          const bands = snap.eqById[mod.instanceId]?.bands ?? []
          const name = many ? moduleLabel(mod, snap.chain) : 'EQ'
          const toneIndex = eqs.findIndex((m) => m.instanceId === mod.instanceId)
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
                    toneIndex={Math.max(0, toneIndex)}
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
                label={`${name} · add`}
                toneIndex={Math.max(0, toneIndex)}
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
  toneIndex,
}: {
  instanceId: string
  index: number
  label: string
  toneIndex: number
}) {
  const [picked, setPicked] = useState<EqFilterType>('off')
  const tone = eqTone(toneIndex, readThemeColors())
  return (
    <article className={`${styles.strip} ${styles.stripOff}`} style={{ ['--eq-instance' as string]: tone.curve }}>
      <header className={styles.stripHead}>
        <span className={styles.stripLabel}>{label}</span>
      </header>
      <EqFilterTypeMenu
        value={picked}
        onChange={(type) => {
          setPicked('off')
          if (type === 'off') return
          if (index >= 0) {
            engine.setEqBand(index, { type }, instanceId)
            return
          }
          const next = engine.addEqBand(instanceId)
          if (next != null) engine.setEqBand(next, { type }, instanceId)
        }}
      />
    </article>
  )
}
