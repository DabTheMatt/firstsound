import { useState } from 'react'
import { useA11ySettings } from '../../a11y/useA11ySettings'
import { useI18n } from '../../i18n'
import type { DspSnapshot } from '../../sensory/mapping/mappingEngine'
import { DragFreeAutomation } from './DragFreeAutomation'
import { DragFreeEq } from './DragFreeEq'
import { DragFreeWave } from './DragFreeWave'
import styles from './DragFree.module.css'

type FadePatch = { fadeIn?: number; fadeOut?: number; fadeFocus?: 'in' | 'out' }

export type DragFreeSurface = 'wave' | 'eq' | 'auto'

export function dragFreeSurface(input: { focus: string | null; workspace: string; viz: string }): DragFreeSurface {
  if (input.focus === 'eq') return 'eq'
  if (input.focus === 'auto') return 'auto'
  if (input.focus) return 'wave'
  if (input.workspace === 'eq' || input.viz === 'eq-split') return 'eq'
  if (input.workspace === 'auto' || input.viz === 'automation') return 'auto'
  return 'wave'
}

type Props = {
  surface: DragFreeSurface
  fadeIn: number
  fadeOut: number
  onFades: (patch: FadePatch) => void
  onFadesCommit: () => void
  onRegionCommit: () => void
  onTrim: () => void
  onAutomationCommit: () => void
  onDspGesture: (before: DspSnapshot, after: DspSnapshot) => void
}

/** Contextual editors for the workspace that is already open. */
export function DragFreeDock({
  surface,
  fadeIn,
  fadeOut,
  onFades,
  onFadesCommit,
  onRegionCommit,
  onTrim,
  onAutomationCommit,
  onDspGesture,
}: Props) {
  const { settings } = useA11ySettings()
  const { t } = useI18n()
  const [waveOpen, setWaveOpen] = useState(false)
  if (!settings.dragFreeEditing) return null
  const wave = (
    <DragFreeWave
      fadeIn={fadeIn}
      fadeOut={fadeOut}
      onFades={onFades}
      onFadesCommit={onFadesCommit}
      onRegionCommit={onRegionCommit}
      onTrim={onTrim}
    />
  )
  return (
    <>
      {surface === 'eq' ? <DragFreeEq onDspGesture={onDspGesture} /> : null}
      {surface === 'auto' ? <DragFreeAutomation onCommit={onAutomationCommit} /> : null}
      {surface === 'wave' ? wave : null}
      {surface !== 'wave' ? (
        <div className={styles.panel}>
          <button type="button" className={styles.button} aria-expanded={waveOpen} onClick={() => setWaveOpen((open) => !open)}>
            {t.dragFree.editTimes}
          </button>
          {waveOpen ? wave : null}
        </div>
      ) : null}
    </>
  )
}
