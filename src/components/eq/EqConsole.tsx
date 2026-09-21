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
import { useI18n } from '../../i18n'
import { eqTone, readThemeColors } from '../../theme'
import { EqBandStrip } from './EqBandStrip'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import styles from './EqConsole.module.css'

type Props = {
  onFocusModule?: (instanceId: string) => void
}

/** Mixer-style EQ strips under the FFT: one column per enabled band. */
export function EqConsole({ onFocusModule }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const eqs = snap.chain.filter((m) => m.type === 'eq')
  const many = eqs.length > 1
  const [focusRaw, setFocusRaw] = useState(() => loadEqOverlayFocus())
  const focus = clampEqOverlayFocus(focusRaw, snap.chain)

  useEffect(() => subscribeEqOverlayFocus(setFocusRaw), [])

  const visible = eqs.filter((mod) => eqOverlayIncludes(focus, mod.instanceId))
  const needsEq = eqs.length === 0
  const bypassed = visible.filter((mod) => mod.bypassed)
  const canEnable = needsEq || bypassed.length > 0

  const enableEq = () => {
    if (needsEq) {
      const id = engine.insertModule('eq', Math.max(0, snap.chain.length - 2))
      if (id) onFocusModule?.(id)
      return
    }
    for (const mod of bypassed) engine.setModuleBypass(mod.instanceId, false)
    const first = visible[0] ?? eqs[0]
    if (first) onFocusModule?.(first.instanceId)
  }

  return (
    <div className={styles.console} aria-label="EQ control center">
      <div className={styles.consoleHead}>
        <button
          type="button"
          className={`${styles.enable} ${canEnable ? styles.enableOff : styles.enableOn}`}
          aria-pressed={!canEnable}
          onClick={enableEq}
        >
          {needsEq ? t.waveform.eqAdd : canEnable ? t.waveform.eqEnable : t.waveform.eqOn}
        </button>
        {many ? (
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
        ) : null}
      </div>
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
