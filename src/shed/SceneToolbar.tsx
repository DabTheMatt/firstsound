import type { ShedLoadStatus } from './persistence'
import styles from './ShedView.module.css'

type Copy = {
  toolbar: string
  zoomIn: string
  zoomOut: string
  resetView: string
  addElement: string
  saved: string
  restored: string
  savedHint: string
}

type Props = {
  copy: Copy
  status: ShedLoadStatus
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onAdd: () => void
}

export function SceneToolbar({ copy, status, onZoomIn, onZoomOut, onResetView, onAdd }: Props) {
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
      <button type="button" className={styles.tool} onClick={onAdd}>
        {copy.addElement}
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
