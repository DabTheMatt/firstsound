import { automationEffectGroups, effectKindForParam } from '../../audio/automation/automation'
import type { FxLfoKind } from '../../audio/fx/lfo'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n/messages'
import styles from './AutomationInspector.module.css'

function effectLabel(kind: FxLfoKind, modules: Messages['modules'], comb: string): string {
  if (kind === 'input') return modules.gain
  if (kind === 'eqcf') return comb
  if (kind.startsWith('eq')) return `${modules.eq} ${kind.slice(2)}`
  return modules[kind as keyof Messages['modules']] ?? kind
}

export function AutomationInspector() {
  const { t, paramLabel } = useI18n()
  const snap = useEngine()
  const groups = automationEffectGroups()
  const selected = snap.automation.selectedParamId
  const effect = effectKindForParam(selected) ?? groups[0]?.kind ?? 'input'
  const params = groups.find((group) => group.kind === effect)?.paramIds ?? []
  const lane = snap.automation.lanes.find((item) => item.paramId === selected)

  const chooseEffect = (kind: FxLfoKind) => {
    const group = groups.find((item) => item.kind === kind)
    const next = group?.paramIds.includes(selected) ? selected : group?.paramIds[0]
    if (next) engine.setAutomationParam(next)
  }

  return (
    <div className={styles.bar} role="group" aria-label={t.waveform.automationTitle}>
      <label className={styles.field}>
        <span>{t.waveform.automationEffect}</span>
        <select value={effect} onChange={(event) => chooseEffect(event.target.value as FxLfoKind)}>
          {groups.map((group) => (
            <option key={group.kind} value={group.kind}>
              {effectLabel(group.kind, t.modules, t.waveform.automationComb)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>{t.waveform.automationParameter}</span>
        <select
          value={selected}
          onChange={(event) => engine.setAutomationParam(event.target.value as ParamId)}
        >
          {params.map((id) => (
            <option key={id} value={id}>
              {paramLabel(id)}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.hint}>
        {t.waveform.automationHint}
        {lane && lane.nodes.length > 0 ? ` · ${lane.nodes.length}` : ''}
      </p>
    </div>
  )
}
