import { createContext, useContext, useMemo, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { fxLfoIsActive, fxLfoKindForParam, isFxLfoTarget, lfoBinding } from '../../audio/fx/lfo'
import type { ParamId } from '../../audio/parameters/types'
import { guideTargetAttrs, guideTargetForParam } from '../../guide/targets'
import { engine, useEngine } from '../../hooks/useEngine'
import { useFxLfoConnect } from '../inspector/FxLfoConnect'
import styles from './ParamControl.module.css'

type Props = {
  id: ParamId
  /** When false, keep connect-picking but hide the parameter modulation affordance. */
  afford?: boolean
  /** Stretch with a parent fader column instead of shrinking to the knob size. */
  fill?: boolean
  children: ReactNode
}

const ModulationParamContext = createContext<ParamId | null>(null)

export function useModulationParamId(): ParamId | null {
  return useContext(ModulationParamContext)
}

export type ModulationScope = {
  instanceId?: string
  bandId?: string
  /** Secondary EQ leaves this false so an unscoped route stays on the primary instance. */
  includeUnscoped?: boolean
}

const ModulationScopeContext = createContext<ModulationScope>({})

export function useModulationScope(): ModulationScope {
  return useContext(ModulationScopeContext)
}

export function ModulationScopeProvider({
  instanceId,
  bandId,
  includeUnscoped = true,
  children,
}: ModulationScope & { children: ReactNode }) {
  const value = useMemo(
    () => ({ instanceId, bandId, includeUnscoped }),
    [instanceId, bandId, includeUnscoped],
  )
  return <ModulationScopeContext.Provider value={value}>{children}</ModulationScopeContext.Provider>
}

export function LfoParamShell({ id, afford = true, fill = false, children }: Props) {
  const snap = useEngine()
  const scope = useModulationScope()
  const { armed, setArmed } = useFxLfoConnect()
  const kind = fxLfoKindForParam(id)
  const pickable = Boolean(armed && kind && armed.kind === kind && isFxLfoTarget(kind, id))
  const binding = lfoBinding(snap.fxLfos, id)
  const active = Boolean(binding && fxLfoIsActive(binding.lfo))
  const onPickCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pickable || !kind || !armed) return
    event.preventDefault()
    event.stopPropagation()
    engine.setFxLfo(kind, armed.slot, {
      target: id,
      instanceId: scope.instanceId,
      bandId: scope.bandId,
    })
    setArmed(null)
  }
  const className = [styles.wrap, fill ? styles.fill : '', pickable ? styles.pickable : '', active ? styles.mapped : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div
      className={className}
      data-param-id={id}
      {...guideTargetAttrs(guideTargetForParam(id), '2', scope.instanceId)}
      data-lfo-pickable={pickable ? 'true' : 'false'}
      data-lfo-mapped={active ? 'true' : 'false'}
      data-modulation-active={active ? 'true' : 'false'}
      onPointerDownCapture={onPickCapture}
    >
      <ModulationParamContext.Provider value={afford ? id : null}>{children}</ModulationParamContext.Provider>
    </div>
  )
}
