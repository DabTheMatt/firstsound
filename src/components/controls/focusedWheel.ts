import { useEffect, useRef, type RefObject } from 'react'

/**
 * Wheel may edit a parameter only after that control is the active element
 * (click or keyboard). Hover-only wheel events must keep scrolling.
 */
export function shouldConsumeParameterWheel(activeElement: unknown, control: unknown): boolean {
  return control != null && activeElement === control
}

/**
 * A pointer press outside the control clears wheel ownership.
 * Keyboard focus is left to the browser (Tab / arrows).
 */
export function shouldBlurFocusedControl(
  activeElement: unknown,
  control: unknown,
  pointerInsideControl: boolean,
): boolean {
  return control != null && activeElement === control && !pointerInsideControl
}

/** pointerdown preventDefault suppresses the browser's own focus. */
export function focusParameterControl(control: HTMLElement): void {
  if (typeof document !== 'undefined' && document.activeElement === control) return
  control.focus({ preventScroll: true })
}

type ArmedControl = {
  control: HTMLElement
  root: () => HTMLElement
}

const armed = new Set<ArmedControl>()

function pointerInside(root: HTMLElement, target: EventTarget | null): boolean {
  return target instanceof Node && root.contains(target)
}

function onDocumentPointerDown(event: PointerEvent): void {
  const active = document.activeElement
  for (const entry of [...armed]) {
    if (!shouldBlurFocusedControl(active, entry.control, pointerInside(entry.root(), event.target))) {
      continue
    }
    entry.control.blur()
  }
}

function retain(entry: ArmedControl): void {
  armed.add(entry)
  if (armed.size === 1) document.addEventListener('pointerdown', onDocumentPointerDown, true)
}

function release(entry: ArmedControl): void {
  armed.delete(entry)
  if (armed.size === 0) document.removeEventListener('pointerdown', onDocumentPointerDown, true)
}

type Options = {
  /** Clicks inside this element keep the control armed. Defaults to the wheel target. */
  blurRootRef?: RefObject<HTMLElement | null>
}

/**
 * Adjusts `controlRef` from the wheel only while it is focused.
 * Unfocused wheel events are left alone so the inspector can scroll.
 */
export function useFocusedWheel(
  controlRef: RefObject<HTMLElement | null>,
  onAdjust: (event: WheelEvent) => void,
  options?: Options,
): void {
  const onAdjustRef = useRef(onAdjust)
  const blurRootRef = options?.blurRootRef

  useEffect(() => {
    onAdjustRef.current = onAdjust
  })

  useEffect(() => {
    const control = controlRef.current
    if (!control) return
    const entry: ArmedControl = {
      control,
      root: () => blurRootRef?.current ?? control,
    }
    const onWheel = (event: WheelEvent) => {
      if (!shouldConsumeParameterWheel(document.activeElement, control)) return
      event.preventDefault()
      onAdjustRef.current(event)
    }
    retain(entry)
    control.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      control.removeEventListener('wheel', onWheel)
      release(entry)
    }
  }, [controlRef, blurRootRef])
}
