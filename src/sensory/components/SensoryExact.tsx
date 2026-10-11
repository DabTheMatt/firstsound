import { assistedEditorsEnabled } from '../../a11y/settings'
import { useA11ySettings } from '../../a11y/useA11ySettings'
import { SENSORY_AXES, type SensoryAxisId } from '../sensoryParameters'
import { clampSensoryValue } from '../sensoryState'
import { AssistedParameterEditor } from '../../edit/dragFree/AssistedParameterEditor'
import { useI18n } from '../../i18n'
import styles from '../../edit/dragFree/DragFree.module.css'

type Props = {
  axisId: SensoryAxisId | null
  value: number
  onChange: (value: number) => void
  onCommit: () => void
}

/** Exact entry for the feeling that is already selected. The picture stays. */
export function SensoryExact({ axisId, value, onChange, onCommit }: Props) {
  const { settings } = useA11ySettings()
  const { t } = useI18n()
  if (!assistedEditorsEnabled(settings) || !axisId) return null
  const axis = SENSORY_AXES[axisId]
  const min = axis.kind === 'bipolar' ? -1 : 0
  return (
    <section className={styles.panel} aria-label={t.dragFree.sensoryExact} data-drag-free="sensory">
      <AssistedParameterEditor
        label={t.dragFree.sensoryExact}
        range={{ min, max: 1, step: 0.01 }}
        value={value}
        spoken={axis.ariaLabel}
        onApply={(next) => {
          onChange(clampSensoryValue(axisId, next))
          onCommit()
        }}
      />
    </section>
  )
}
