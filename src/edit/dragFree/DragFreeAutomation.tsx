import { useEffect, useId, useRef, useState } from 'react'
import { announce } from '../../a11y/liveRegion'
import { assistedEditorsEnabled } from '../../a11y/settings'
import { useA11ySettings } from '../../a11y/useA11ySettings'
import { formatAccessibleValue } from '../../a11y/valueText'
import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { AssistedParameterEditor } from './AssistedParameterEditor'
import { automationDisplayValue, automationNormalizedValue, validatePlayhead, type EditError } from './edits'
import { formatEditTime, parseEditTime, speakEditTime } from './timeEntry'
import { TimeField } from './TimeField'
import styles from './DragFree.module.css'

type Props = {
  onCommit: () => void
}

export function DragFreeAutomation({ onCommit }: Props) {
  const { settings } = useA11ySettings()
  if (!assistedEditorsEnabled(settings)) return null
  return <AutomationBody onCommit={onCommit} />
}

function AutomationBody({ onCommit }: Props) {
  const { t, locale, paramLabel } = useI18n()
  const snap = useEngine()
  const copy = t.dragFree
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [pointId, setPointId] = useState<string | null>(null)
  const [timeDraft, setTimeDraft] = useState('')
  const [error, setError] = useState<EditError | 'format' | 'negative' | null>(null)
  const [missing, setMissing] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const firstRef = useRef<HTMLButtonElement | null>(null)
  const paramId = snap.automation.selectedParamId
  const lane = snap.automation.lanes.find((item) => item.paramId === paramId) ?? null
  const nodes = [...(lane?.nodes ?? [])].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
  const selected = nodes.find((node) => node.id === pointId) ?? null
  const duration = snap.duration > 0 ? snap.duration : Math.max(snap.params.end, 0)

  useEffect(() => {
    if (open) firstRef.current?.focus()
  }, [open])

  const message =
    error === 'format'
      ? copy.errFormat
      : error === 'negative'
        ? copy.errNegative
        : error === 'past'
          ? copy.errPast
          : error === 'missing'
            ? copy.noSample
            : null

  const liveNode = (id: string) => {
    const doc = engine.getSnapshot().automation
    const current = doc.lanes.find((item) => item.paramId === doc.selectedParamId)
    return current?.nodes.find((node) => node.id === id) ?? null
  }

  const move = (id: string, time: number, normalized: number) => {
    const before = liveNode(id)
    if (!before) {
      setMissing(true)
      setPointId(null)
      return
    }
    engine.moveAutomationNode(id, time, normalized)
    const after = liveNode(id)
    onCommit()
    setMissing(false)
    setError(null)
    if (after) setTimeDraft(formatEditTime(after.time))
    if (after && Math.abs(after.time - time) > 0.0006) announce(copy.nudgedPoint)
    else announce(copy.appliedPoint)
  }

  const applyTime = () => {
    if (!selected) return
    const parsed = parseEditTime(timeDraft)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    const checked = validatePlayhead(parsed.seconds, duration)
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    move(selected.id, checked.value, selected.value)
  }

  const add = () => {
    if (!lane || !(duration > 0)) return
    const head = engine.getSourcePlayheadSeconds()
    const checked = validatePlayhead(head, duration)
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    const value = toNormalized(snap.params[paramId], PARAMS[paramId])
    const id = engine.addAutomationNode(checked.value, value)
    if (!id) return
    setPointId(id)
    onCommit()
    announce(copy.appliedPoint)
  }

  const remove = () => {
    if (!selected) return
    const index = nodes.findIndex((node) => node.id === selected.id)
    engine.deleteAutomationNode(selected.id)
    onCommit()
    const rest = nodes.filter((node) => node.id !== selected.id)
    const next = rest[index] ?? rest[index - 1] ?? null
    setPointId(next?.id ?? null)
    announce(copy.deletedPoint)
    window.setTimeout(() => firstRef.current?.focus(), 0)
  }

  return (
    <section className={styles.panel} aria-labelledby={titleId} data-drag-free="automation">
      <h2 id={titleId} className={styles.note}>
        {copy.automation}
      </h2>
      {!lane ? <p className={styles.note}>{copy.noLane}</p> : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          aria-expanded={open}
          disabled={!lane}
          onClick={(event) => {
            triggerRef.current = event.currentTarget
            setOpen((value) => !value)
            if (open) triggerRef.current?.focus()
          }}
        >
          {copy.editPoint}
        </button>
        <button type="button" className={styles.button} disabled={!lane || !(duration > 0)} onClick={add}>
          {copy.addPoint}
        </button>
      </div>
      {open && lane && nodes.length === 0 ? <p className={styles.note}>{copy.noPoints}</p> : null}
      {open && lane ? (
        <ul className={styles.list}>
          {nodes.map((node, index) => (
            <li key={node.id}>
              <button
                ref={index === 0 ? firstRef : undefined}
                type="button"
                className={styles.button}
                aria-pressed={node.id === pointId}
                aria-label={copy.pointSr(index + 1, speakEditTime(node.time, locale))}
                onClick={() => {
                  setPointId(node.id)
                  setTimeDraft(formatEditTime(node.time))
                  setMissing(false)
                  setError(null)
                }}
              >
                {index + 1} · {formatEditTime(node.time)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {missing ? (
        <p className={styles.error} role="alert">
          {copy.noPoints}
        </p>
      ) : null}
      {message ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
      {open && selected ? (
        <div className={styles.form}>
          <p className={styles.note}>{paramLabel(paramId)}</p>
          <TimeField
            label={copy.pointTime}
            spoken={copy.pointSr(nodes.findIndex((node) => node.id === selected.id) + 1, speakEditTime(selected.time, locale))}
            value={timeDraft}
            onChange={setTimeDraft}
            onEnter={applyTime}
          />
          <button type="button" className={styles.apply} onClick={applyTime}>
            {copy.apply}
          </button>
          <PointValue
            paramId={paramId}
            normalized={selected.value}
            index={nodes.findIndex((node) => node.id === selected.id) + 1}
            onApply={(display) => move(selected.id, selected.time, automationNormalizedValue(paramId, display))}
          />
          <button type="button" className={styles.button} onClick={remove}>
            {copy.deletePoint}
          </button>
        </div>
      ) : null}
    </section>
  )
}

function PointValue({
  paramId,
  normalized,
  index,
  onApply,
}: {
  paramId: ParamId
  normalized: number
  index: number
  onApply: (display: number) => void
}) {
  const { t, locale } = useI18n()
  const display = automationDisplayValue(paramId, normalized)
  return (
    <AssistedParameterEditor
      label={t.dragFree.pointValue}
      def={PARAMS[paramId]}
      value={display}
      spoken={t.dragFree.valueSr(index, formatAccessibleValue(display, PARAMS[paramId], locale))}
      onApply={onApply}
    />
  )
}
