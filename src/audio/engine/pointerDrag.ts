/** Primary (left) mouse / equivalent contact. Hover and other buttons do not drag. */

export function isPrimaryPointerDown(event: { button: number }): boolean {
  return event.button === 0
}

export function isPrimaryPointerHeld(event: { buttons: number }): boolean {
  return (event.buttons & 1) === 1
}
