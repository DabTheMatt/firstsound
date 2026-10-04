/**
 * Re-export of the engine-owned monitor tap.
 * Coefficients and the audition processor live in `src/audio/engine/hearingMonitor.ts`
 * so export rendering never imports them.
 */
export {
  MONITOR_BANDS,
  MONITOR_DB_LIMIT,
  applyMonitorToChannel,
  clampMonitorDb,
  monitorCurves,
  type MonitorBiquad,
  type MonitorEmphasis,
} from '../audio/engine/hearingMonitor'
