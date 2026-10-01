import { useEffect, useState } from 'react'
import { eqColorIndex } from '../../audio/chain/chain'
import { eqInstanceUsesSharedLfo } from '../../audio/engine/eqOverlayFocus'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { EqCurve } from '../inspector/EqCurve'
import styles from './PhoneEqSurface.module.css'

type Props = {
  onAdded?: (instanceId: string) => void
}

/** Large EQ graph for the phone workspace. Band parameters stay in the sheet. */
export function PhoneEqSurface({ onAdded }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const eq = snap.chain.find((mod) => mod.type === 'eq')
  const [selected, setSelected] = useState<EqBandSelection | null>(null)

  useEffect(() => subscribeEqBandSelection(setSelected), [])

  if (!eq) {
    return (
      <div className={styles.empty}>
        <p>{t.waveform.eqTitle}</p>
        <button
          type="button"
          onClick={() => {
            const id = engine.ensureModule('eq')
            if (id) onAdded?.(id)
          }}
        >
          {t.waveform.eqAdd}
        </button>
      </div>
    )
  }

  const state = snap.eqById[eq.instanceId]
  const bands = state?.bands ?? snap.eqBands
  const index = selected?.instanceId === eq.instanceId ? selected.index : 0

  return (
    <div className={styles.surface}>
      <EqCurve
        fill
        bands={bands}
        sampleRate={snap.sampleRate}
        selectedBand={index}
        comb={state?.comb}
        toneIndex={eqColorIndex(snap.chain, eq.instanceId)}
        modulate={eqInstanceUsesSharedLfo(snap.chain, eq.instanceId)}
        onSelectBand={(band) => selectEqBand({ instanceId: eq.instanceId, index: band })}
        onDragBand={(band, patch) => engine.setEqBand(band, patch, eq.instanceId)}
      />
    </div>
  )
}
