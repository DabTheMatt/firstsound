import { useState } from 'react'
import { moduleLabel } from '../../audio/chain/chain'
import type { EqFilterType } from '../../audio/engine/eqBands'
import { engine, useEngine } from '../../hooks/useEngine'
import { EqBandStrip } from './EqBandStrip'
import { EqFilterTypeMenu } from './EqFilterTypeMenu'
import styles from './EqConsole.module.css'

/** Mixer-style EQ strips under the FFT: one column per enabled band. */
export function EqConsole() {
  const snap = useEngine()
  const eqs = snap.chain.filter((m) => m.type === 'eq')
  const many = eqs.length > 1

  return (
    <div className={styles.console} aria-label="EQ control center">
      <div className={styles.strips}>
        {eqs.flatMap((mod) => {
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
                  />,
                ],
          )
          const offIndex = bands.findIndex((b) => b.type === 'off')
          return [
            ...enabled,
            offIndex >= 0 ? (
              <AddEqStrip
                key={`${mod.instanceId}-add`}
                instanceId={mod.instanceId}
                index={offIndex}
                label={`${name} · add`}
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
}: {
  instanceId: string
  index: number
  label: string
}) {
  const [picked, setPicked] = useState<EqFilterType>('off')
  return (
    <article className={`${styles.strip} ${styles.stripOff}`}>
      <header className={styles.stripHead}>
        <span className={styles.stripLabel}>{label}</span>
      </header>
      <EqFilterTypeMenu
        value={picked}
        onChange={(type) => {
          setPicked('off')
          if (type !== 'off') engine.setEqBand(index, { type }, instanceId)
        }}
      />
    </article>
  )
}
