import { engine } from '../../hooks/useEngine'
import { beginTrackLoad, isLatestTrackLoad } from './loadQueue'

/**
 * One load path for the file button and for a drop.
 * `trackId` is the id captured when the user asked to load, not whatever
 * happens to be selected when the bytes arrive.
 * The newest deliberate load wins. An older read cannot land later.
 */
export async function loadAudioFileIntoTrack(trackId: string, file: File): Promise<boolean> {
  const token = beginTrackLoad(trackId)
  let data: ArrayBuffer
  try {
    const raw = await file.arrayBuffer()
    data = raw.byteLength > 0 ? raw.slice(0) : raw
  } catch {
    return false
  }
  if (!isLatestTrackLoad(trackId, token)) return false
  await engine.unlock()
  if (!isLatestTrackLoad(trackId, token)) return false
  return engine.loadTrackArrayBuffer(trackId, data, file.name)
}

/** Clear the picker after the bytes have been copied so the same file can be chosen again. */
export function releaseFileInput(input: HTMLInputElement | null): void {
  if (input) input.value = ''
}
