import { selectEqBand } from '../../audio/engine/eqBandSelection'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { EnterFocusButton } from '../focus/EnterFocusButton'
import { Spectrum } from '../waveform/Spectrum'
import styles from './PhoneEqGraph.module.css'

type Props = {
  instanceId?: string
  onSelectModule?: (instanceId: string) => void
  phoneFocus?: boolean
  onEnterFocus?: () => void
}

/** Phone EQ workspace: realtime spectrum, EQ response, and band nodes. */
export function PhoneEqGraph({ instanceId, onSelectModule, phoneFocus = false, onEnterFocus }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const eq = snap.chain.find((mod) => mod.instanceId === instanceId && mod.type === 'eq')
    ?? snap.chain.find((mod) => mod.type === 'eq')

  return (
    <div className={styles.stage} data-phone-eq="">
      {onEnterFocus && !phoneFocus ? <EnterFocusButton corner label="EQ" onClick={onEnterFocus} /> : null}
      <Spectrum active phoneEq phoneFocus={phoneFocus} />
      {eq ? null : (
        <button
          type="button"
          className={styles.add}
          onClick={() => {
            const created = engine.insertModule('eq', Math.max(0, snap.chain.length - 2))
            if (!created) return
            const index = engine.createEqStrip('peaking', created)
            if (index != null) selectEqBand({ instanceId: created, index })
            onSelectModule?.(created)
          }}
        >
          {t.mobile.addEq}
        </button>
      )}
    </div>
  )
}
