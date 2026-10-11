import { describe, expect, it, vi } from 'vitest'
import { PARAMS } from '../audio/parameters/definitions'
import { PARAM_DESCRIPTIONS, SENSORY_DESCRIPTIONS } from './descriptions'
import { accessibilityOwnsSpace, applySliderKey, isImeEvent, isSpaceKey, isTypingFromTag, isTransportShortcutTarget, spaceTogglesTransport, transportSpaceSuppressed } from './keyboard'
import { fracToTime } from '../components/waveform/viewport'
import { xToHz } from '../audio/engine/freqScale'
import {
  A11Y_STORAGE_KEY,
  A11Y_STORAGE_KEY_V1,
  applyA11yDom,
  appliedSensoryPresentation,
  clampScale,
  DEFAULT_A11Y_SETTINGS,
  highVisibilityEnabled,
  effectiveMotionReduced,
  motionReduced,
  parseA11ySettings,
  persistA11ySettings,
  readStoredA11ySettings,
} from './settings'
import { formatAccessibleValue } from './valueText'
import { SENSORY_AXIS_IDS } from '../sensory/sensoryParameters'
import { EN, PL } from '../i18n/messages'
import { parseLocale } from '../i18n/locale'
import { parseThemePreference, THEME_IDS } from '../theme/tokens'

describe('accessibility descriptions', () => {
  it('covers every engine parameter in both locales', () => {
    for (const id of Object.keys(PARAMS) as (keyof typeof PARAMS)[]) {
      const entry = PARAM_DESCRIPTIONS[id]
      expect(entry, id).toBeTruthy()
      expect(entry.en.length).toBeGreaterThan(12)
      expect(entry.pl.length).toBeGreaterThan(12)
      expect(entry.en.toLowerCase()).not.toContain('okrągła')
      expect(entry.pl.toLowerCase()).not.toContain('gałka służąca')
    }
  })

  it('covers every sensory axis', () => {
    for (const id of SENSORY_AXIS_IDS) {
      expect(SENSORY_DESCRIPTIONS[id].en).toBeTruthy()
      expect(SENSORY_DESCRIPTIONS[id].pl).toBeTruthy()
    }
  })
})

describe('slider keyboard', () => {
  it('moves, clamps, pages, and resets', () => {
    expect(applySliderKey({ key: 'ArrowUp', shiftKey: false }, 0.5)).toEqual({
      kind: 'value',
      normalized: 0.52,
    })
    expect(applySliderKey({ key: 'ArrowLeft', shiftKey: true }, 0.5)).toEqual({
      kind: 'value',
      normalized: 0.496,
    })
    expect(applySliderKey({ key: 'Home', shiftKey: false }, 0.4)).toEqual({ kind: 'value', normalized: 0 })
    expect(applySliderKey({ key: 'End', shiftKey: false }, 0.4)).toEqual({ kind: 'value', normalized: 1 })
    expect(applySliderKey({ key: 'PageUp', shiftKey: false }, 0.5)?.kind).toBe('value')
    expect(applySliderKey({ key: 'Delete', shiftKey: false }, 0.5)).toEqual({ kind: 'reset' })
    expect(applySliderKey({ key: 'ArrowUp', shiftKey: false }, 0.99)).toEqual({
      kind: 'value',
      normalized: 1,
    })
  })

  it('uses space for transport except while typing text', () => {
    expect(isTransportShortcutTarget(null)).toBe(true)
    expect(isSpaceKey({ code: 'Space', key: 'Unidentified' })).toBe(true)
    expect(isSpaceKey({ key: ' ' })).toBe(true)
    expect(isSpaceKey({ key: 'Spacebar' })).toBe(true)
    expect(isSpaceKey({ key: 'Enter' })).toBe(false)
    expect(isTypingFromTag('BUTTON')).toBe(false)
    expect(isTypingFromTag('A')).toBe(false)
    expect(isTypingFromTag('INPUT', 'file')).toBe(false)
    expect(isTypingFromTag('INPUT', '')).toBe(false)
    expect(isTypingFromTag('INPUT', 'checkbox')).toBe(false)
    expect(isTypingFromTag('INPUT', 'range')).toBe(false)
    expect(isTypingFromTag('SELECT')).toBe(false)
    expect(isTypingFromTag('INPUT', 'text')).toBe(true)
    expect(isTypingFromTag('INPUT', 'search')).toBe(true)
    expect(isTypingFromTag('TEXTAREA')).toBe(true)
    expect(isTypingFromTag('DIV', '', true)).toBe(true)
  })

  it('uses Space for play and pause until a special accessibility option is on', () => {
    const plain = {
      keyboardFirst: false,
      dragFreeEditing: false,
      screenReaderOptimizations: false,
      accessibleWaveform: false,
    }
    expect(accessibilityOwnsSpace(plain)).toBe(false)
    expect(accessibilityOwnsSpace({ ...plain, keyboardFirst: true })).toBe(true)
    expect(accessibilityOwnsSpace({ ...plain, dragFreeEditing: true })).toBe(true)
    expect(accessibilityOwnsSpace({ ...plain, screenReaderOptimizations: true })).toBe(true)
    expect(accessibilityOwnsSpace({ ...plain, accessibleWaveform: true })).toBe(true)
    expect(spaceTogglesTransport(null, false)).toBe(true)
    expect(spaceTogglesTransport(null, true)).toBe(true)
  })

  it('keeps Space for checkboxes, radios, and dialogs', () => {
    expect(transportSpaceSuppressed({ tagName: 'BUTTON' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'DIV', role: 'slider' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'DIV', role: 'menuitem' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'INPUT', inputType: 'checkbox' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'INPUT', inputType: 'radio' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'INPUT', inputType: 'text' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'DIV', role: 'switch' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'BUTTON', inDialog: true })).toBe(true)
    expect(isTransportShortcutTarget(null)).toBe(true)
  })

  it('ignores keys while an IME composition is active', () => {
    expect(isImeEvent({ isComposing: true, key: 'a' })).toBe(true)
    expect(isImeEvent({ key: 'Process' })).toBe(true)
    expect(isImeEvent({ isComposing: false, key: 'a' })).toBe(false)
  })
})

describe('accessible value text', () => {
  it('speaks units instead of raw numbers', () => {
    expect(formatAccessibleValue(-6, PARAMS.gain, 'en')).toContain('decibels')
    expect(formatAccessibleValue(-6, PARAMS.gain, 'pl')).toContain('decybeli')
    expect(formatAccessibleValue(2400, PARAMS.filterCutoff, 'en')).toContain('kilohertz')
    expect(formatAccessibleValue(-30, PARAMS.pan, 'en')).toContain('left')
    expect(formatAccessibleValue(7, PARAMS.pitch, 'en')).toContain('plus')
    expect(formatAccessibleValue(7, PARAMS.pitch, 'pl')).toContain('półtonów')
  })
})

describe('a11y settings and i18n', () => {
  it('parses stored accessibility flags', () => {
    expect(parseA11ySettings({ reduceMotion: true, extra: 1 }).reduceMotion).toBe(true)
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: true })
    expect(effectiveMotionReduced()).toBe(true)
    expect(appliedSensoryPresentation().motionReduced).toBe(true)
    expect(appliedSensoryPresentation().active).toBe(false)
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, sensoryComfort: true })
    expect(appliedSensoryPresentation().calmMeters).toBe(true)
    expect(appliedSensoryPresentation().motionReduced).toBe(false)
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: false })
    expect(effectiveMotionReduced()).toBe(false)
    expect(appliedSensoryPresentation().active).toBe(false)
    expect(parseA11ySettings(null).shortcutsEnabled).toBe(true)
    expect(parseA11ySettings(null).dragFreeEditing).toBe(false)
    expect(parseA11ySettings(null).keyboardFirst).toBe(false)
    expect(parseA11ySettings({ keyboardFirst: true }).keyboardFirst).toBe(true)
    expect(parseA11ySettings(null).accessibleWaveform).toBe(false)
    expect(parseA11ySettings(null).sensoryComfort).toBe(false)
    expect(parseA11ySettings({ sensoryComfort: true, visualActivity: 'nope', calmMeters: false }).sensoryComfort).toBe(true)
    expect(parseA11ySettings({ sensoryComfort: true, visualActivity: 'nope', calmMeters: false }).visualActivity).toBe('low')
    expect(parseA11ySettings({ sensoryComfort: true, visualActivity: 'nope', calmMeters: false }).calmMeters).toBe(false)
    expect(parseA11ySettings({ sensoryComfort: 'yes' }).sensoryComfort).toBe(false)
    expect(parseA11ySettings({ accessibleWaveform: true }).accessibleWaveform).toBe(true)
    expect(parseA11ySettings(null).highVisibility).toBe(false)
    expect(parseA11ySettings({ highVisibility: true }).highVisibility).toBe(true)
    expect(parseA11ySettings(null).attentionFocus).toBe(false)
    expect(parseA11ySettings(null).attentionStrength).toBe('subtle')
    expect(parseA11ySettings(null).attentionHighlight).toBe(true)
    expect(parseA11ySettings(null).attentionReduce).toBe(true)
    expect(parseA11ySettings(null).predictableLayout).toBe(false)
    expect(parseA11ySettings(null).stablePanels).toBe(true)
    expect(parseA11ySettings(null).rememberWorkspaceLayout).toBe(true)
    expect(parseA11ySettings(null).reduceLayoutMovement).toBe(true)
    expect(parseA11ySettings({ predictableLayout: true, stablePanels: false }).predictableLayout).toBe(true)
    expect(parseA11ySettings({ predictableLayout: true, stablePanels: false }).stablePanels).toBe(false)
    expect(parseA11ySettings({ predictableLayout: 'yes' }).predictableLayout).toBe(false)
    expect(parseA11ySettings({ attentionFocus: true, attentionStrength: 'clear', attentionHighlight: false }).attentionFocus).toBe(true)
    expect(parseA11ySettings({ attentionStrength: 'nope' }).attentionStrength).toBe('subtle')
    expect(parseA11ySettings(null).lowVision).toBe(false)
  })

  it('looks up localized chrome copy', () => {
    expect(PL.a11y.skipToMain).toContain('Przejdź')
    expect(EN.a11y.theme).toContain('Low Vision')
    expect(PL.a11y.theme).toContain('słabowidzący')
    expect(EN.a11y.accessTitle).toBe('FIELD ACCESS')
    expect(PL.a11y.accessTitle).toBe('FIELD ACCESS')
    expect(PL.a11y.reduceMotion).toContain('Ogranicz ruch')
    expect(PL.a11y.focus).toContain('fokus')
    expect(PL.a11y.larger).toContain('Większe')
    expect(PL.a11y.restore).toContain('dostępności')
    expect(EN.a11y.reducedMotionSystem.toLowerCase()).toContain('device')
    expect(EN.a11y.dragFree).toBe('Drag-Free Editing')
    expect(EN.a11y.dragFreeHelp).toContain('buttons and exact values')
    expect(PL.a11y.dragFree).toBe('Edytowanie bez przeciągania')
    expect(PL.a11y.dragFreeHelp).toContain('bez przeciągania')
    expect(EN.a11y.interfaceSize).toBe('Interface Size')
    expect(EN.a11y.interfaceSizeHelp).toBe('Adjust the size of interface controls and surrounding UI elements.')
    expect(EN.a11y.textSize).toBe('Text Size')
    expect(EN.a11y.textSizeHelp).toBe('Increase text size without enlarging the entire interface.')
    expect(PL.a11y.interfaceSize).toBe('Rozmiar interfejsu')
    expect(PL.a11y.interfaceSizeHelp).toBe('Zmień wielkość kontrolek i elementów interfejsu.')
    expect(PL.a11y.textSize).toBe('Rozmiar tekstu')
    expect(PL.a11y.textSizeHelp).toBe('Powiększ tekst niezależnie od wielkości całego interfejsu.')
    expect(EN.a11y.keyboardFirst).toBe('Keyboard-First')
    expect(EN.a11y.keyboardFirstHelp).toContain('without a mouse')
    expect(PL.a11y.keyboardFirst).toBe('Obsługa klawiaturą')
    expect(PL.a11y.keyboardFirstHelp).toBe('Nawiguj i edytuj dźwięk bez używania myszy.')
    expect(EN.a11y.waveformNav).toBe('Accessible Waveform Navigation')
    expect(EN.a11y.waveformNavHelp).toBe('Navigate recordings using time, keyboard controls and audio landmarks.')
    expect(PL.a11y.waveformNav).toBe('Dostępna nawigacja po nagraniu')
    expect(PL.a11y.waveformNavHelp).toBe('Poruszaj się po nagraniu za pomocą czasu, klawiatury i punktów charakterystycznych.')
    expect(EN.a11y.highVisibility).toBe('High Visibility Controls')
    expect(EN.a11y.highVisibilityHelp).toBe('Make important controls, selections and editing handles easier to see.')
    expect(PL.a11y.highVisibility).toBe('Zwiększona widoczność kontrolek')
    expect(PL.a11y.highVisibilityHelp).toBe('Popraw widoczność kontrolek, zaznaczeń i uchwytów edycyjnych.')
    expect(EN.a11y.attentionFocus).toBe('Attention Focus')
    expect(EN.a11y.attentionFocusHelp).toBe('Highlight controls related to your current editing activity.')
    expect(EN.a11y.cognitive).toBe('Cognitive & attention')
    expect(PL.a11y.attentionFocus).toBe('Koncentracja uwagi')
    expect(PL.a11y.attentionFocusHelp).toBe('Wyróżniaj elementy związane z aktualnie wykonywaną czynnością.')
    expect(PL.a11y.attentionSubtle).toBe('Subtelna')
    expect(PL.a11y.attentionClear).toBe('Wyraźna')
    expect(EN.a11y.predictableLayout).toBe('Predictable Layout')
    expect(EN.a11y.predictableLayoutHelp).toBe('Keep tools and panels in consistent locations while you work.')
    expect(PL.a11y.predictableLayout).toBe('Przewidywalny układ')
    expect(PL.a11y.predictableLayoutHelp).toBe('Zachowuj stałe rozmieszczenie narzędzi i paneli podczas pracy.')
    expect(EN.a11y.stablePanels).toBe('Stable Panels')
    expect(EN.a11y.rememberLayout).toBe('Remember Workspace Layout')
    expect(EN.a11y.reduceLayout).toBe('Reduce Layout Movement')
    expect(EN.a11y.restoreLayout).toBe('Restore workspace layout')
    expect(PL.a11y.stablePanels).toBe('Stabilne panele')
    expect(PL.a11y.rememberLayout).toBe('Zapamiętaj układ obszaru roboczego')
    expect(PL.a11y.reduceLayout).toBe('Ogranicz ruch układu')
    expect(PL.a11y.restoreLayout).toBe('Przywróć układ obszaru roboczego')
    expect(EN.a11y.sensoryComfort).toBe('Sensory Comfort')
    expect(EN.a11y.sensoryComfortHelp).toBe('Reduce unnecessary motion, visual intensity and distractions.')
    expect(PL.a11y.sensoryComfort).toBe('Komfort sensoryczny')
    expect(PL.a11y.sensoryComfortHelp).toBe('Ogranicz zbędny ruch, intensywność wizualną i elementy rozpraszające.')
    expect(EN.chain.moveBefore('Reverb', 'Delay')).toBe('Move Reverb before Delay')
    expect(EN.chain.movedBefore('Delay', 'Reverb')).toBe('Delay moved before Reverb.')
  })

  it('keeps Low Vision out of the color theme catalog', () => {
    expect(parseLocale('pl')).toBe('pl')
    expect(parseLocale('de')).toBe(null)
    expect(parseThemePreference('low-vision')).toBe('studio-dark')
    expect(THEME_IDS).not.toContain('low-vision')
    expect(parseA11ySettings({ lowVision: true }).lowVision).toBe(true)
  })

  it('ignores invalid values and unknown keys', () => {
    const parsed = parseA11ySettings({
      reduceMotion: 'yes',
      enhancedFocus: true,
      largerInterface: 1,
      extra: true,
      version: 1,
    })
    expect(parsed.reduceMotion).toBe(false)
    expect(parsed.enhancedFocus).toBe(true)
    expect(parsed.largerInterface).toBe(false)
    expect(parsed.highVisibility).toBe(false)
    expect(parsed.shortcutsEnabled).toBe(true)
    expect(parsed.interfaceScale).toBe(1)
    expect(parsed.textScale).toBe(1)
    expect('extra' in parsed).toBe(false)
  })

  it('keeps interface size and text size independent, clamped, and compatible with older stores', () => {
    expect(parseA11ySettings({}).interfaceScale).toBe(1)
    expect(parseA11ySettings({}).textScale).toBe(1)
    expect(parseA11ySettings({ largerInterface: true }).interfaceScale).toBe(1)
    const mixed = parseA11ySettings({ interfaceScale: 1.25, textScale: 2, reduceMotion: true })
    expect(mixed.interfaceScale).toBe(1.25)
    expect(mixed.textScale).toBe(2)
    expect(mixed.reduceMotion).toBe(true)
    expect(mixed.largerInterface).toBe(false)
    expect(parseA11ySettings({ interfaceScale: 9, textScale: 0 }).interfaceScale).toBe(1.5)
    expect(parseA11ySettings({ interfaceScale: 9, textScale: 0 }).textScale).toBe(1)
    expect(parseA11ySettings({ interfaceScale: '1.13', textScale: 'nope' }).interfaceScale).toBe(1.15)
    expect(parseA11ySettings({ interfaceScale: '1.13', textScale: 'nope' }).textScale).toBe(1)
    expect(clampScale(1.5, 1, 1.5)).toBe(1.5)
    expect(clampScale(2, 1, 2)).toBe(2)
  })

  it('maps waveform, EQ, and automation coordinates from the rendered fraction', () => {
    const view = { start: 0, end: 8 }
    expect(fracToTime(100 / 400, view)).toBeCloseTo(fracToTime(150 / 600, view))
    expect(xToHz(100, 20, 20000, 0, 400, 'log')).toBeCloseTo(xToHz(150, 20, 20000, 0, 600, 'log'))
    const valueFromY = (y: number, height: number) => 1 - Math.min(1, Math.max(0, y / Math.max(1, height)))
    expect(valueFromY(40, 160)).toBeCloseTo(valueFromY(60, 240))
  })


  it('treats system reduced motion as effective even when the toggle is off', () => {
    expect(motionReduced({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: false }, true)).toBe(true)
    expect(motionReduced({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: false }, false)).toBe(false)
    expect(motionReduced({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: true }, false)).toBe(true)
  })

  it('stores a versioned payload and falls back from corrupt JSON', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    persistA11ySettings({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: true })
    const raw = store.get(A11Y_STORAGE_KEY_V1)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw ?? '{}').version).toBe(1)
    expect(readStoredA11ySettings().reduceMotion).toBe(true)
    store.set(A11Y_STORAGE_KEY_V1, '{')
    expect(readStoredA11ySettings().reduceMotion).toBe(false)
    store.delete(A11Y_STORAGE_KEY_V1)
    store.set(A11Y_STORAGE_KEY, JSON.stringify({ largerInterface: true, nope: 4 }))
    expect(readStoredA11ySettings().largerInterface).toBe(true)
    vi.unstubAllGlobals()
  })

  it('writes the high-visibility flag without turning it on by default', () => {
    const root = {
      dataset: {} as Record<string, string>,
      style: { setProperty: () => undefined, removeProperty: () => undefined },
    }
    vi.stubGlobal('document', { documentElement: root })
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, highVisibility: true })
    expect(root.dataset.highVisibility).toBe('on')
    expect(highVisibilityEnabled()).toBe(true)
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS })
    expect(root.dataset.highVisibility).toBe('off')
    expect(highVisibilityEnabled()).toBe(false)
    expect(DEFAULT_A11Y_SETTINGS.highVisibility).toBe(false)
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, attentionFocus: true, attentionStrength: 'clear', attentionHighlight: false, attentionReduce: true })
    expect(root.dataset.attention).toBe('on')
    expect(root.dataset.attentionStrength).toBe('clear')
    expect(root.dataset.attentionHighlight).toBe('off')
    expect(root.dataset.attentionReduce).toBe('on')
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS })
    expect(root.dataset.attention).toBe('off')
    expect(DEFAULT_A11Y_SETTINGS.attentionFocus).toBe(false)
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, predictableLayout: true })
    expect(root.dataset.predictable).toBe('on')
    expect(root.dataset.stablePanels).toBe('on')
    expect(root.dataset.rememberLayout).toBe('on')
    expect(root.dataset.reduceLayout).toBe('on')
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, predictableLayout: true, stablePanels: false, reduceLayoutMovement: false })
    expect(root.dataset.stablePanels).toBe('off')
    expect(root.dataset.reduceLayout).toBe('off')
    expect(root.dataset.rememberLayout).toBe('on')
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS })
    expect(root.dataset.predictable).toBe('off')
    expect(root.dataset.stablePanels).toBe('off')
    vi.unstubAllGlobals()
  })
})
