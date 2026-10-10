# FIELD accessibility audit

Audit date: 2026-10-10

Tested application version: 0.20.1

This document is a baseline for FIELD ACCESS. It is not a WCAG conformance claim. Automated checks cannot prove WCAG 2.2 Level AA.

## Result split

| Kind | Result |
| --- | --- |
| Automated tests | PASS — `npm run test:a11y`, 32 Playwright tests, axe-core 4.13 |
| Manual assistive technology | NOT TESTED — no NVDA, VoiceOver, JAWS, or TalkBack session |
| Known limitations | Documented below. They are not hidden by disabled axe rules. |

## Environments

- Playwright 1.64 Chromium, headless, Linux
- Desktop viewport 1280×800 unless a test sets another size
- Locales forced to English in the harness (`field.uiLocale`)
- Audio sample: in-app **Generate demo sample** (synthesized in the browser). No network file, no microphone, no native file dialog
- Themes by stable id: `studio-dark`, `soft-slate`, `warm-paper`, `dusk`, plus the low-vision preference (`data-low-vision`)
- Viewports: 320×568, 375×667, 390×844, 430×932, 768×1024, 1280×800, 1440×900

Browser zoom at 200% and reflow under OS text-spacing overrides were not executed. Viewport checks are a proxy, not a full 1.4.4 / 1.4.10 / 1.4.12 pass.

## Tools

- `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`
- Playwright keyboard and focus assertions
- Vitest for pure helpers (`transportSpaceSuppressed`, `effectiveMotionReduced`, theme contrast)
- Command: `npm run test:a11y` (non-zero exit on failure). `npm test` stays the unit suite. CI (`.github/workflows/pages.yml`) installs Chromium and runs `npm run test:a11y` before the production build. axe is not in the production render loop.

## WCAG 2.2 AA used as the reference

1.1.1, 1.3.1, 1.3.2, 1.3.5, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12, 1.4.13, 2.1.1, 2.1.2, 2.1.4, 2.2.2, 2.3.1, 2.4.3, 2.4.6, 2.4.7, 2.4.11, 2.5.1, 2.5.2, 2.5.7, 2.5.8, 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.3.1, 3.3.2, 4.1.2, 4.1.3.

1.3.5 applies only where a control collects a user-purpose field. Export’s name field is a file name, not an autofill purpose.

## States scanned with axe

- Technical workspace, initial
- Simple: Edit, Sound, Effects
- Sensory
- Settings and the Accessibility Center
- Manual dialog
- Guided Tasks library and the first waveform step
- Export dialog
- Technical Focus Mode on EQ
- `studio-dark`, `soft-slate`, `warm-paper`, `dusk`
- Low vision preference

No rule was disabled. No blanket exclusion was added for canvas, SVG, or a workspace.

## Findings fixed in 0.20.1

| ID | Severity | WCAG | Component | What changed |
| --- | --- | --- | --- | --- |
| F1 | HIGH | 1.4.3 | Theme tokens `--text-muted` | Muted text was about 3.4:1 on Studio Dark panel surfaces. Tokens were lifted to at least 4.5:1 against app, panel, elevated, and control surfaces. Custom themes mix muted text less far toward the canvas (`customMutedColor`). |
| F2 | HIGH | 1.4.3 | Warm Paper accent and track colors | Accent and track hues used as text failed on the paper surfaces. Light-theme text colors were darkened. Swatches stay in the same hue. |
| F3 | MEDIUM | 1.4.3, 1.4.1 | Record control | The word Record used `--danger` (4.45:1 on Soft Slate and Dusk, 3.18:1 on Warm Paper). The label now uses `--text-primary`. The mark stays danger-colored, so state is not color alone. |
| F4 | HIGH | 4.1.2 | Sensory overview strip | `aria-label` sat on a generic `div`. The strip is `role="group"` with that name. |
| F5 | HIGH | 4.1.2 | Waveform fade and region handles | `aria-label` on generic `div`s was invalid. Labels were removed. `title` remains for pointer hover. Keyboard operation is still missing (see R1). |
| F6 | MEDIUM | 4.1.2 | Transient markers | Markers were `role="slider"` without a value or keyboard access. They are `aria-hidden`. |
| F7 | HIGH | 4.1.2 | Guided Tasks progress | The progressbar had a value but no accessible name. It is named by the visible step label. |
| F8 | MEDIUM | 2.4.11, 1.4.10 | Header at 320×568 and 1280×800 | Settings was clipped. The phone header scrolls sideways. At 1280 the bar tightens padding before Settings crosses the edge. |
| F9 | HIGH | 2.1.4, 3.2.2 | Space shortcut | Space still toggles transport, including on a focused button outside a dialog. It does not fire while typing, on a checkbox or radio, or inside a dialog, menu, or alertdialog. Settings can turn transport shortcuts off. |
| F10 | MEDIUM | 2.4.3 | Dialogs and Guided Tasks | Settings, Manual, and Export move focus in and return it to the trigger. Escape minimizes Guided Tasks even after Show me where moves attention. Focus is not moved on every tutorial step. |
| F11 | MEDIUM | 2.2.2, 2.3.1 | Reduced motion | The FIELD switch and `prefers-reduced-motion` both reduce decorative motion, including Sensory scenes and spectral camera glide. Meters, waveform, and spectrum still draw. Audio processing is unchanged. |
| F12 | LOW | 1.4.3 | Light themes | `color-scheme` follows the theme (Warm Paper, Manga, Light Studio) instead of forcing dark. |

Reproduction for F1 before the fix: open Technical on Studio Dark and run axe. Inactive tabs and knob labels reported `#737570` on `#151616` at 3.89:1.

## Remaining issues

### R1 — Pointer-only waveform editing

- Severity: HIGH
- WCAG: 2.1.1, 2.5.7
- Component: waveform selection, fade handles, automation points
- Steps: load a sample, try to create a selection, drag a fade, or move an automation point with the keyboard only
- What works: the waveform region is named and described with duration, playhead, and selection. Arrow keys move the playhead. Simple mode exposes region-edge sliders.
- Recommendation: do not rebuild the interaction here
- Future: 19B Drag-Free Editing, 20A Keyboard-First, 20C Accessible Waveform

### R2 — Screen reader behavior is unverified

- Severity: HIGH as a product risk, status NOT TESTED
- WCAG: 4.1.2, 4.1.3
- Component: whole UI
- Steps: not run with NVDA, VoiceOver, JAWS, or TalkBack
- What the DOM and axe show: buttons, knobs (`role="slider"` with name and value), tabs, dialogs, and Guided Tasks expose names. A polite live region announces the current Guided Tasks step, not every minor update.
- Recommendation: a real AT pass before any conformance language
- Future: 20B Screen Reader Support

### R3 — EQ graph is still mostly a pointer surface

- Severity: MEDIUM
- WCAG: 2.1.1, 2.5.7
- Component: EQ nodes in the spectrum and the inspector curve
- What works: a focused node accepts arrows for frequency and gain, and Shift+arrow for Q. Numeric knob controls have names and values.
- What does not: placing a band, dragging a node, and some type choices are still pointer gestures
- Future: 19A Assisted Controls, 19B Drag-Free Editing, 20A Keyboard-First

### R4 — Narrow header scrolls instead of reflowing

- Severity: MEDIUM
- WCAG: 1.4.10
- Component: phone header
- Steps: open Technical at 320×568. Settings sits past the first screen until the bar is scrolled. The page itself does not grow a horizontal scrollbar. Chain tabs that do not fit scroll inside the chain.
- Future: 22A Interface Scaling

### R5 — Text resize, spacing, and zoom

- Severity: MEDIUM as a test gap
- WCAG: 1.4.4, 1.4.10, 1.4.12
- Not run: 200% browser zoom, user text-spacing overrides
- What ran: the seven viewports above, including larger controls at 390×844 without page-level overflow of primary controls

### R6 — Small graph targets

- Severity: LOW
- WCAG: 2.5.8
- axe `target-size` did not fail the scanned states. Fade handles, EQ nodes, and automation points are still tighter than a comfortable 24px target and are called out for a later pass.
- Future: 19C Pointer Assistance, 22A Interface Scaling

No CRITICAL issue remains in the scanned states. No HIGH automated failure remains open. R1 and R2 stay HIGH because they are outside what this suite can close.

## Remediation backlog

| Task | Remaining work |
| --- | --- |
| 19A Assisted Controls | Non-drag ways to set EQ and effect parameters beyond the current knobs |
| 19B Drag-Free Editing | Selection, fades, and automation points without a drag |
| 19C Pointer Assistance | Target size and pointer cancellation on graph handles |
| 20A Keyboard-First | Full keyboard maps for the waveform, EQ graph, and automation |
| 20B Screen Reader Support | AT testing and announcement tuning |
| 20C Accessible Waveform | Selection, fades, playhead, and duration as a keyboard-and-SR surface |
| 22A Interface Scaling | Reflow at 320px and 200% zoom without a scrolling header |
| 22B High Visibility | Broader than the current low-vision preference and the contrast token pass |
| 22C Sensory Comfort | Further Sensory motion and flash review beyond the reduced-motion switch |

## FIELD ACCESS preferences

Checked independently and together, including after reload:

- Reduce motion → `data-reduce-motion`
- Enhanced focus → `data-focus="enhanced"` (ring at least 2px on Studio Dark, Soft Slate, Warm Paper, Dusk)
- Larger interface → `data-ui-scale="large"`

Playback kept the Pause control while the three switches were turned on. The OS reduced-motion emulation and the FIELD switch were both checked. Sensory canvas stayed on screen.

## Keyboard and focus covered by tests

- Tab and Shift+Tab
- Enter opens Settings; Escape returns focus to Settings
- Space checks Reduce motion and does not start playback
- Space types into the Export name field and does not toggle transport; Escape returns focus to Export
- Mode radios keep focus
- Enter Focus and Exit Focus move focus to the matching control
- Guided Tasks: Learn more, Show me where, Escape minimizes, restore, Next, Exit returns to Guide me
- No keyboard trap was observed in those flows

## DSP

No DSP, routing, effect, modulation, automation, offline render, or export signal-processing code was changed. EQ arrow keys call the existing parameter API. Reduced motion only skips decorative animation.
