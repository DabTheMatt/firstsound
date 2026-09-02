import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FxLfoKind } from '../../audio/fx/lfo'

export type ArmedLfo = { kind: FxLfoKind; slot: number }

type Ctx = {
  armed: ArmedLfo | null
  setArmed: (next: ArmedLfo | null) => void
}

const FxLfoConnectContext = createContext<Ctx>({
  armed: null,
  setArmed: () => {},
})

export function FxLfoConnectProvider({ children }: { children: ReactNode }) {
  const [armed, setArmed] = useState<ArmedLfo | null>(null)
  useEffect(() => {
    if (!armed) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setArmed(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [armed])
  const value = useMemo(() => ({ armed, setArmed }), [armed])
  return <FxLfoConnectContext.Provider value={value}>{children}</FxLfoConnectContext.Provider>
}

export function useFxLfoConnect(): Ctx {
  return useContext(FxLfoConnectContext)
}
