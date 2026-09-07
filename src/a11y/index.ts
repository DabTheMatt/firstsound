import { A11ySettings } from './A11ySettings'
import { ControlTooltip } from './ControlTooltip'
import { LiveAnnouncer } from './LiveAnnouncer'
import { SkipLink } from './SkipLink'
import { announce } from './liveRegion'
import { applySliderKey, isTransportShortcutTarget, isTypingTarget, scrollFocusedIntoView } from './keyboard'
import { formatAccessibleValue, formatPercentValue } from './valueText'
import { PARAM_DESCRIPTIONS, SENSORY_DESCRIPTIONS, paramDescription, sensoryDescription } from './descriptions'
import { bootstrapA11y, useA11ySettings } from './useA11ySettings'
import {
  DEFAULT_A11Y_SETTINGS,
  parseA11ySettings,
  motionReduced,
  type A11ySettings as A11ySettingsState,
} from './settings'

export {
  A11ySettings,
  ControlTooltip,
  LiveAnnouncer,
  SkipLink,
  announce,
  applySliderKey,
  isTransportShortcutTarget,
  isTypingTarget,
  scrollFocusedIntoView,
  formatAccessibleValue,
  formatPercentValue,
  PARAM_DESCRIPTIONS,
  SENSORY_DESCRIPTIONS,
  paramDescription,
  sensoryDescription,
  bootstrapA11y,
  useA11ySettings,
  DEFAULT_A11Y_SETTINGS,
  parseA11ySettings,
  motionReduced,
}

export type { A11ySettingsState }
