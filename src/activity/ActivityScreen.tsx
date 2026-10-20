import { useEffect, useState } from 'react'
import { ActivityView } from './ActivityView'
import { loadActivity, type LoadedActivity } from './loadActivity'
import { ACTIVITY_DATA_SOURCE } from './source'

/**
 * Activity destination. The configured source is loaded once.
 * The first paint is the loading state, never demonstration data.
 */
export function ActivityScreen() {
  const [state, setState] = useState<{ status: 'loading' } | LoadedActivity>({ status: 'loading' })

  useEffect(() => {
    let live = true
    void loadActivity({ source: ACTIVITY_DATA_SOURCE }).then((result) => {
      if (live) setState(result)
    })
    return () => {
      live = false
    }
  }, [])

  if (state.status === 'loading') return <ActivityView status="loading" />
  if (state.status === 'error') return <ActivityView status="error" errorCode={state.code} />
  if (state.source === 'static-snapshot') return <ActivityView publicSnapshot={state.snapshot} />
  return <ActivityView snapshot={state.snapshot} />
}
