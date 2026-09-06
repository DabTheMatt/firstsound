import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  applyFeelingAmount,
  feelingAmount,
  restFeeling,
  SENSORY_FEELINGS,
} from '../sensoryFeelings'
import type { SensoryAxisId } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import {
  amountToT,
  layoutParameterStrings,
  nearestString,
  pointAlong,
  projectT,
  stringIntersections,
  stringLabelPose,
  tToAmount,
  type ParameterStringGeom,
} from '../visualization/parameterStrings'
import styles from './ParameterStrings.module.css'

type Props = {
  values: SensoryValues
  activeId: SensoryAxisId | null
  onActive: (id: SensoryAxisId | null) => void
  onValues: (values: SensoryValues) => void
  onCommit: () => void
}

const HIT_PX = 18

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function feelingOf(id: SensoryAxisId) {
  return SENSORY_FEELINGS.find((f) => f.id === id)!
}

export function ParameterStrings({ values, activeId, onActive, onValues, onCommit }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const valuesRef = useRef(values)
  const drag = useRef<{ pointerId: number; id: SensoryAxisId } | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    valuesRef.current = values
  }, [values])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const read = () => {
      const rect = node.getBoundingClientRect()
      setSize({ w: rect.width, h: rect.height })
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const insets = useMemo(() => {
    const narrow = size.w > 0 && size.w < 720
    return {
      top: 88,
      right: narrow ? 172 : 216,
      bottom: 104,
      left: narrow ? 20 : 36,
    }
  }, [size.w])

  const geoms = useMemo(
    () => (size.w > 8 && size.h > 8 ? layoutParameterStrings(size.w, size.h, insets) : []),
    [size.w, size.h, insets],
  )
  const crosses = useMemo(() => stringIntersections(geoms), [geoms])

  const localPoint = (event: ReactPointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const applyAt = (geom: ParameterStringGeom, x: number, y: number) => {
    const feeling = feelingOf(geom.id)
    const amount = tToAmount(projectT(geom, x, y), feeling.kind)
    onActive(geom.id)
    onValues(applyFeelingAmount(valuesRef.current, feeling, amount))
  }

  const end = (event: ReactPointerEvent) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    onCommit()
  }

  const onKey = (event: KeyboardEvent<SVGLineElement>, id: SensoryAxisId) => {
    const feeling = feelingOf(id)
    const step = event.shiftKey ? 0.04 : 0.12
    const amount = feelingAmount(values, feeling)
    const lo = feeling.kind === 'bipolar' ? -1 : 0
    if (event.key === 'Home' || event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onActive(id)
      onValues(restFeeling(values, feeling))
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      onActive(id)
      onValues(applyFeelingAmount(values, feeling, clamp(amount + step, lo, 1)))
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      onActive(id)
      onValues(applyFeelingAmount(values, feeling, clamp(amount - step, lo, 1)))
    }
  }

  return (
    <div ref={wrapRef} className={styles.layer} aria-hidden={geoms.length === 0}>
      {geoms.length > 0 ? (
        <svg className={styles.svg} viewBox={`0 0 ${size.w} ${size.h}`} role="group" aria-label="Parameter strings">
          {crosses.map((hit) => {
            const hot = hit.a === activeId || hit.b === activeId
            return (
              <circle
                key={`${hit.a}-${hit.b}`}
                className={`${styles.cross} ${hot ? styles.hot : ''}`}
                cx={hit.x}
                cy={hit.y}
                r={hot ? 3.4 : 2.1}
              />
            )
          })}
          {geoms.map((geom) => {
            const feeling = feelingOf(geom.id)
            const amount = feelingAmount(values, feeling)
            const t = amountToT(amount, feeling.kind)
            const bead = pointAlong(geom, t)
            const pose = stringLabelPose(geom)
            const on = geom.id === activeId
            const lit = Math.abs(amount) > 0.04
            const tone = `${on ? styles.on : ''} ${lit ? styles.lit : ''}`
            const now = feeling.kind === 'bipolar' ? Math.round(((amount + 1) / 2) * 100) : Math.round(amount * 100)
            return (
              <g
                key={geom.id}
                data-axis={geom.id}
                className={`${styles.string} ${activeId && !on ? styles.dim : ''}`}
              >
                <line
                  className={styles.hit}
                  x1={geom.x1}
                  y1={geom.y1}
                  x2={geom.x2}
                  y2={geom.y2}
                  tabIndex={0}
                  role="slider"
                  aria-label={feeling.ariaLabel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={now}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    const p = localPoint(event)
                    const target = nearestString(geoms, p.x, p.y, HIT_PX) ?? geom
                    drag.current = { pointerId: event.pointerId, id: target.id }
                    applyAt(target, p.x, p.y)
                  }}
                  onPointerMove={(event) => {
                    const state = drag.current
                    if (!state || state.pointerId !== event.pointerId) return
                    if (event.buttons === 0) {
                      end(event)
                      return
                    }
                    const locked = geoms.find((g) => g.id === state.id)
                    if (!locked) return
                    const p = localPoint(event)
                    applyAt(locked, p.x, p.y)
                  }}
                  onPointerUp={end}
                  onPointerCancel={end}
                  onDoubleClick={(event) => {
                    event.preventDefault()
                    onActive(geom.id)
                    onValues(restFeeling(values, feeling))
                    onCommit()
                  }}
                  onKeyDown={(event) => onKey(event, geom.id)}
                  onKeyUp={(event) => {
                    if (event.key.startsWith('Arrow') || event.key === 'Home') onCommit()
                  }}
                />
                <line
                  className={`${styles.line} ${tone}`}
                  x1={geom.x1}
                  y1={geom.y1}
                  x2={geom.x2}
                  y2={geom.y2}
                  pointerEvents="none"
                />
                <circle className={`${styles.node} ${tone}`} cx={bead.x} cy={bead.y} r={on ? 5.5 : 3.6} />
                <text
                  className={`${styles.label} ${tone}`}
                  x={pose.x}
                  y={pose.y}
                  transform={`rotate(${pose.angle} ${pose.x} ${pose.y})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {feeling.label}
                </text>
              </g>
            )
          })}
        </svg>
      ) : null}
    </div>
  )
}
