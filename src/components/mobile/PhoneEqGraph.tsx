import { eqColorIndex } from '../../audio/chain/chain'
import { eqInstanceUsesSharedLfo } from '../../audio/engine/eqOverlayFocus'
import { selectEqBand, subscribeEqBandSelection } from '../../audio/engine/eqBandSelection'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { EqCurve } from '../inspector/EqCurve'
import styles from './PhoneEqGraph.module.css'
import { useEffect, useState } from 'react'

type Props = {
  instanceId?: string
  onGraphEdit?: () => void
  onSelectModule?: (instanceId: string) => void
}

/** Graph-first EQ workspace. Band parameters stay in the context strip. */
export function PhoneEqGraph({ instanceId, onGraphEdit, onSelectModule }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const eq = snap.chain.find((mod) => mod.instanceId === instanceId && mod.type === 'eq')
    ?? snap.chain.find((mod) => mod.type === 'eq')
  const id = eq?.instanceId ?? ''
  const st = id ? snap.eqById[id] : undefined
  const bands = st?.bands ?? []
  const [selected, setSelected] = useState(0)

  useEffect(() => subscribeEqBandSelection((next) => {
    if (next && next.instanceId === id) setSelected(next.index)
  }), [id])

  if (!eq || !st) {
    return (
      <div className={styles.empty} data-phone-eq="">
        <button
          type="button"
          onClick={() => {
            const created = engine.insertModule('eq', Math.max(0, snap.chain.length - 2))
            if (!created) return
            selectEqBand({ instanceId: created, index: 0 })
            onSelectModule?.(created)
          }}
        >
          {t.mobile.addEq}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.stage} data-phone-eq="">
      <EqCurve
        layout="fill"
        touch
        bands={bands}
        sampleRate={snap.sampleRate}
        selectedBand={selected}
        comb={st.comb}
        toneIndex={eqColorIndex(snap.chain, id)}
        modulate={eqInstanceUsesSharedLfo(snap.chain, id)}
        onSelectBand={(index) => {
          setSelected(index)
          selectEqBand({ instanceId: id, index })
        }}
        onDragBand={(index, patch) => engine.setEqBand(index, patch, id)}
        onInteract={onGraphEdit}
      />
    </div>
  )
}
