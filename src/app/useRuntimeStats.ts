import { useEffect, useState } from 'react'
import {
  cpuPercentFromLagMs,
  cpuPercentFromPressure,
  ema,
  formatCpu,
  formatMemory,
  type CpuSample,
  type MemorySample,
} from './runtimeStats'

type HeapMemory = {
  usedJSHeapSize: number
  jsHeapSizeLimit: number
}

type PressureRecord = { source: string; state: string }

type PressureObserverLike = {
  observe: (source: string) => Promise<void> | void
  disconnect: () => void
}

type PressureObserverCtor = new (
  callback: (records: PressureRecord[]) => void,
) => PressureObserverLike

type RuntimeLabels = {
  memoryLabel: string
  cpuLabel: string
}

function readMemory(): MemorySample {
  const mem = (performance as Performance & { memory?: HeapMemory }).memory
  return {
    usedBytes: mem?.usedJSHeapSize ?? null,
    limitBytes: mem?.jsHeapSizeLimit ?? null,
  }
}

function sampleLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now()
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      resolve(performance.now() - start)
      channel.port1.close()
      channel.port2.close()
    }
    channel.port2.postMessage(null)
  })
}

function pressureCtor(): PressureObserverCtor | null {
  const ctor = (globalThis as { PressureObserver?: PressureObserverCtor }).PressureObserver
  return ctor ?? null
}

export function useRuntimeStats(): RuntimeLabels {
  const [labels, setLabels] = useState<RuntimeLabels>({
    memoryLabel: formatMemory({ usedBytes: null, limitBytes: null }),
    cpuLabel: formatCpu({ percent: null, source: 'none' }),
  })

  useEffect(() => {
    let cancelled = false
    let lagEma: number | null = null
    let pressurePct: number | null = null
    let observer: PressureObserverLike | null = null

    const Ctor = pressureCtor()
    if (Ctor) {
      try {
        observer = new Ctor((records) => {
          const last = records[records.length - 1]
          if (last) pressurePct = cpuPercentFromPressure(last.state)
        })
        void Promise.resolve(observer.observe('cpu')).catch(() => {
          observer?.disconnect()
          observer = null
        })
      } catch {
        observer = null
      }
    }

    const publish = async () => {
      try {
        const lag = await sampleLoopLag()
        lagEma = ema(lagEma, cpuPercentFromLagMs(lag))
      } catch {
        /* MessageChannel can fail in opaque workers */
      }
      if (cancelled) return
      const cpu: CpuSample =
        pressurePct != null
          ? { percent: pressurePct, source: 'pressure' }
          : lagEma != null
            ? { percent: lagEma, source: 'lag' }
            : { percent: null, source: 'none' }
      setLabels({
        memoryLabel: formatMemory(readMemory()),
        cpuLabel: formatCpu(cpu),
      })
    }

    void publish()
    const id = window.setInterval(() => {
      void publish()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(id)
      observer?.disconnect()
    }
  }, [])

  return labels
}
