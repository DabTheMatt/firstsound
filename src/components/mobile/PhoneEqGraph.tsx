import { selectEqBand } from '../../audio/engine/eqBandSelection'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { Spectrum } from '../waveform/Spectrum'
import styles from './PhoneEqGraph.module.css'

type Props = {
  instanceId?: string
  onSelectModule?: (instanceId: string) => void
  phoneFocus?: boolean
}

/** Phone EQ workspace: realtime spectrum, EQ response, and band nodes. */
export function PhoneEqGraph({ instanceId, onSelectModule, phoneFocus = false }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const eq = snap.chain.find((mod) => mod.instanceId === instanceId && mod.type === 'eq')
    ?? snap.chain.find((mod) => mod.type === 'eq')

  return (
    <div className={styles.stage} data-phone-eq="">
      <Spectrum active phoneEq phoneFocus={phoneFocus} />
      {eq ? null : (
        <button
          type="button"
          className={styles.add}
          onClick={() => {
            const created = engine.insertModule('eq', Math.max(0, snap.chain.length - 2))
            if (!created) return
            selectEqBand({ instanceId: created, index: 0 })
            onSelectModule?.(created)
          }}
        >
          {t.mobile.addEq}
        </button>
      )}
    </div>
  )
}
