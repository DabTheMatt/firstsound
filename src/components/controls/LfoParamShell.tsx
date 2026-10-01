import { createContext, useContext, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { fxLfoIsActive, fxLfoKindForParam, isFxLfoTarget, lfoBinding } from '../../audio/fx/lfo'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useFxLfoConnect } from '../inspector/FxLfoConnect'
import styles from './ParamControl.module.css'

type Props = {
  id: ParamId
  /** When false, keep connect-picking but hide the parameter modulation affordance. */
  afford?: boolean
  children: ReactNode
}

const ModulationParamContext = createContext<ParamId | null>(null)

export function useModulationParamId(): ParamId | null {
  return useContext(ModulationParamContext)
}

export function LfoParamShell({ id, afford = true, children }: Props) {
  const snap = useEngine()
  const { armed, setArmed } = useFxLfoConnect()
  const kind = fxLfoKindForParam(id)
  const pickable = Boolean(armed && kind && armed.kind === kind && isFxLfoTarget(kind, id))
  const binding = lfoBinding(snap.fxLfos, id)
  const active = Boolean(binding && fxLfoIsActive(binding.lfo))
  const onPickCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pickable || !kind || !armed) return
    event.preventDefault()
    event.stopPropagation()
    engine.setFxLfoTarget(kind, armed.slot, id)
    setArmed(null)
  }
  const className = [styles.wrap, pickable ? styles.pickable : '', active ? styles.mapped : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div
      className={className}
      data-param-id={id}
      data-lfo-pickable={pickable ? 'true' : 'false'}
      data-lfo-mapped={active ? 'true' : 'false'}
      data-modulation-active={active ? 'true' : 'false'}
      onPointerDownCapture={onPickCapture}
    >
      <ModulationParamContext.Provider value={afford ? id : null}>{children}</ModulationParamContext.Provider>
    </div>
  )
}
