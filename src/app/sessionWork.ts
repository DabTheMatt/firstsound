export type SessionWorkSnap = {
  sampleLoaded: boolean
  fileName: string
  recording: boolean
  chain: readonly { type: string }[]
  automation: { lanes: readonly unknown[] }
  random: { chaos: boolean }
}

/** True when Reset would discard something the user can hear or edit. */
export function sessionHasWork(snap: SessionWorkSnap): boolean {
  const inserts = snap.chain.some((mod) => mod.type !== 'gain' && mod.type !== 'output')
  return snap.sampleLoaded || snap.fileName.trim().length > 0 || snap.recording || inserts || snap.automation.lanes.length > 0 || snap.random.chaos
}
