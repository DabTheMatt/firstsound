import type { ShedLoadStatus } from './persistence'
import styles from './ShedView.module.css'

type Copy = {
  toolbar: string
  zoomIn: string
  zoomOut: string
  resetView: string
  addElement: string
  panLeft: string
  panRight: string
  panUp: string
  panDown: string
  panLeftShort: string
  panRightShort: string
  panUpShort: string
  panDownShort: string
  saved: string
  restored: string
  savedHint: string
  transparency: string
}

type Props = {
  copy: Copy
  status: ShedLoadStatus
  libraryOpen: boolean
  transparent: boolean
  onToggleTransparency: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onPan: (direction: 'left' | 'right' | 'up' | 'down') => void
  onAdd: () => void
}

export function SceneToolbar({
  copy,
  status,
  libraryOpen,
  transparent,
  onToggleTransparency,
  onZoomIn,
  onZoomOut,
  onResetView,
  onPan,
  onAdd,
}: Props) {
  const statusText = status === 'restored' ? copy.restored : copy.saved
  return (
    <div className={styles.toolbar} role="toolbar" aria-label={copy.toolbar}>
      <button type="button" className={styles.tool} onClick={onZoomIn}>
        {copy.zoomIn}
      </button>
      <button type="button" className={styles.tool} onClick={onZoomOut}>
        {copy.zoomOut}
      </button>
      <button type="button" className={styles.tool} onClick={onResetView}>
        {copy.resetView}
      </button>
      <button type="button" className={styles.tool} aria-label={copy.panLeft} onClick={() => onPan('left')}>
        {copy.panLeftShort}
      </button>
      <button type="button" className={styles.tool} aria-label={copy.panRight} onClick={() => onPan('right')}>
        {copy.panRightShort}
      </button>
      <button type="button" className={styles.tool} aria-label={copy.panUp} onClick={() => onPan('up')}>
        {copy.panUpShort}
      </button>
      <button type="button" className={styles.tool} aria-label={copy.panDown} onClick={() => onPan('down')}>
        {copy.panDownShort}
      </button>
      <button type="button" className={styles.tool} aria-expanded={libraryOpen} aria-controls="shed-library" onClick={onAdd}>
        {copy.addElement}
      </button>
      <button type="button" className={styles.tool} aria-pressed={transparent} onClick={onToggleTransparency}>
        {copy.transparency}
      </button>
      <p className={styles.status} role="status" aria-describedby="shed-save-hint">
        {statusText}
      </p>
      <p id="shed-save-hint" className={styles.srOnly}>
        {copy.savedHint}
      </p>
    </div>
  )
}
