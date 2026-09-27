import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import {
  coverFrame,
  getVizBackground,
  grainTileUrl,
  subscribeVizBackground,
  veilOpacity,
  VIZ_BG_GRAYSCALE_FILTER,
  type VizBackgroundState,
} from './vizBackground'
import styles from './VizBackground.module.css'

function useVizBackground(): VizBackgroundState {
  return useSyncExternalStore(subscribeVizBackground, getVizBackground, getVizBackground)
}

type Props = {
  /** `plot` keeps the waveform ruler on the theme background. */
  inset?: 'fill' | 'plot'
}

/**
 * Photo under the graph. Pointers pass through to the canvas and handles.
 * Cover crop is remeasured whenever the visualization box changes.
 */
export function VizBackground({ inset = 'fill' }: Props) {
  const state = useVizBackground()
  const layerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useLayoutEffect(() => {
    const layer = layerRef.current
    const img = imgRef.current
    if (!layer || !img || !state.imageUrl) return
    const apply = () => {
      const rect = layer.getBoundingClientRect()
      const naturalWidth = img.naturalWidth
      const naturalHeight = img.naturalHeight
      if (naturalWidth < 1 || naturalHeight < 1 || rect.width < 1 || rect.height < 1) return
      const frame = coverFrame(naturalWidth, naturalHeight, rect.width, rect.height)
      img.style.width = `${frame.width}px`
      img.style.height = `${frame.height}px`
      img.style.left = `${frame.left}px`
      img.style.top = `${frame.top}px`
    }
    img.addEventListener('load', apply)
    if (img.complete) apply()
    const observer = new ResizeObserver(apply)
    observer.observe(layer)
    return () => {
      img.removeEventListener('load', apply)
      observer.disconnect()
    }
  }, [state.imageUrl])

  if (!state.imageUrl) return null
  const veil = veilOpacity(state.opacity)
  const grain = state.opacity > 0 && state.grain > 0 ? grainTileUrl() : ''
  return (
    <div
      ref={layerRef}
      className={`${styles.layer} ${inset === 'plot' ? styles.plotInset : ''}`}
      data-viz-bg=""
      data-opacity={state.opacity}
      data-grain={state.grain}
      aria-hidden="true"
    >
      <img
        ref={imgRef}
        className={styles.image}
        src={state.imageUrl}
        alt=""
        draggable={false}
        decoding="async"
        style={{ opacity: state.opacity, filter: VIZ_BG_GRAYSCALE_FILTER }}
      />
      {veil > 0 ? <div className={styles.veil} style={{ opacity: veil }} /> : null}
      {grain ? (
        <div
          className={styles.grain}
          style={{ opacity: state.grain, backgroundImage: `url("${grain}")` }}
        />
      ) : null}
    </div>
  )
}
