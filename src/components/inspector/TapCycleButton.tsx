import { useRef, useState } from 'react'
import { LFO_RATE_MAX, LFO_RATE_MIN, clampLfoRate } from '../../audio/fx/lfo'
import { addCycleTap, emptyTapCycle, type TapCycleState } from '../../audio/fx/tapCycle'

type Props = {
  onRate: (hz: number) => void
  className?: string
}

/** Sets an existing LFO rate from tap intervals. Does not touch the oscillator. */
export function TapCycleButton({ onRate, className }: Props) {
  const taps = useRef<TapCycleState>(emptyTapCycle())
  const [count, setCount] = useState(0)

  const tap = () => {
    const next = addCycleTap(taps.current, performance.now() / 1000, LFO_RATE_MIN, LFO_RATE_MAX)
    taps.current = next.state
    setCount(next.state.times.length)
    if (next.hz != null) onRate(clampLfoRate(next.hz))
  }

  return (
    <button
      type="button"
      className={className}
      title="Tap once per cycle. The gap sets the LFO rate, the same way tap tempo sets BPM."
      onClick={tap}
    >
      Tap cycle{count > 0 ? ` · ${count}` : ''}
    </button>
  )
}
