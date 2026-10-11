# FIELD accessibility audit

Audit date: 2026-10-11

Tested application version: 0.28.0

The 0.21.3 baseline below is kept. FIELD ACCESS 20C is recorded in its own section. This is still not a WCAG conformance claim.

This document is a baseline for FIELD ACCESS. It is not a WCAG conformance claim. Automated checks cannot prove WCAG 2.2 Level AA.

## Result split

| Kind | Result |
| --- | --- |
| Automated tests | PASS — `npm run test:a11y`, 60 Playwright tests, axe-core 4.13 |
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

## Findings fixed in 0.21.3

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
| F9 | HIGH | 2.1.4, 3.2.2 | Space shortcut | Space toggles transport only when focus is not on a button, switch, slider, menu, or text field, and not inside a dialog. A focused button keeps Space for itself. Settings can turn transport shortcuts off. |
| F10 | MEDIUM | 2.4.3 | Dialogs and Guided Tasks | Settings, Manual, and Export move focus in and return it to the trigger. Escape minimizes Guided Tasks even after Show me where moves attention. Focus is not moved on every tutorial step. |
| F11 | MEDIUM | 2.2.2, 2.3.1 | Reduced motion | The FIELD switch and `prefers-reduced-motion` both reduce decorative motion, including Sensory scenes and spectral camera glide. Meters, waveform, and spectrum still draw. Audio processing is unchanged. |
| F12 | LOW | 1.4.3 | Light themes | `color-scheme` follows the theme (Warm Paper, Manga, Light Studio) instead of forcing dark. |
| F13 | HIGH | 2.5.8, 2.4.7 | EQ Focus transport | Play sat under the corner Exit Focus control (visible hit about 36×6). Transport in EQ Focus is inset so the corner control and the Hold / graph menu keep that corner. Graph menu buttons use the shared focus outline again. |

Reproduction for F1 before the fix: open Technical on Studio Dark and run axe. Inactive tabs and knob labels reported `#737570` on `#151616` at 3.89:1.

## Remaining issues

### R1 — Canvas handles are still pointer targets

- Severity: MEDIUM
- WCAG: 2.1.1, 2.5.7
- Component: waveform fade handles and automation points drawn on the canvas
- What works: the waveform region is named with the file, duration, channels, sample rate, playhead, and selection. Arrow keys, Home, and End move the playhead. Drag-Free Editing and Accessible Waveform Navigation set the selection, fades, trim, and landmarks from the keyboard. Guided Tasks accept those edits.
- What remains: dragging a handle on the canvas is still a pointer gesture. The keyboard path is a separate control, not a focusable handle on the drawing.

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

No CRITICAL issue remains in the scanned states. No HIGH automated failure remains open. R2 stays HIGH because assistive-technology behavior was not manually verified. R1 is MEDIUM: the keyboard path exists, and the canvas handles are still pointer targets.

## Remediation backlog

| Task | Remaining work |
| --- | --- |
| 19A Assisted Controls | Non-drag ways to set EQ and effect parameters beyond the current knobs |
| 19B Drag-Free Editing | Selection, fades, and automation points without a drag |
| 19C Pointer Assistance | Target size and pointer cancellation on graph handles |
| 20A Keyboard-First | Full keyboard maps for the waveform, EQ graph, and automation |
| 20B Screen Reader Support | AT testing and announcement tuning |
| 20C Accessible Waveform | Shipped in 0.26.0. Canvas handles remain pointer targets (R1). Detection is approximate. |
| 22A Interface Scaling | Shipped as Interface Size and Text Size. The narrow header can still scroll at 320px (R4). 200% browser zoom was not rechecked here. |
| 22B High Visibility | Shipped in 0.28.0 as an opt-in visual layer. See the 22B section. It is not a WCAG conformance claim. |
| 22C Sensory Comfort | Shipped in 0.29.0. See the 22C section. Decorative canvas motion in Sensory is reduced, not removed from the mode. |

## FIELD ACCESS preferences

Checked independently and together, including after reload:

- Reduced Motion → `data-reduce-motion`
- Enhanced Focus Visibility → `data-focus="enhanced"` (ring at least 2px on Studio Dark, Soft Slate, Warm Paper, Dusk)
- Larger Controls → `data-ui-scale="large"`
- High Visibility Controls → `data-high-visibility` (off until turned on)
- Accessible Waveform Navigation → `data-wave-nav` (off until turned on; keyboard and screen reader access to the waveform stay available either way)

Playback kept the Pause control while the three switches were turned on. The OS reduced-motion emulation and the FIELD switch were both checked. Sensory canvas stayed on screen.

## Keyboard and focus covered by tests

- Tab and Shift+Tab
- Enter opens Settings; Escape returns focus to Settings
- Space turns on the Reduced Motion switch and does not start playback
- Space types into the Export name field and does not toggle transport; Escape returns focus to Export
- Mode radios keep focus
- Enter Focus and Exit Focus move focus to the matching control
- Guided Tasks: Learn more, Show me where, Escape minimizes, restore, Next, Exit returns to Guide me
- No keyboard trap was observed in those flows

## FIELD ACCESS 20C — accessible waveform (0.26.0)

Implemented on the existing playhead, selection, loop, and transport. There is no second timeline and no second waveform drawing.

Navigation: go to start, go to end, go to a typed time, step backward, step forward, go to selection start, go to selection end. Steps are 10 seconds, 1 second, 100 milliseconds, 10 milliseconds, and 1 sample. One sample uses the loaded buffer’s sample rate and integer frames. The millisecond steps do not claim sample accuracy. Invalid times are rejected. The open tools sit in a scrollable sheet so a narrow viewport and Focus mode do not clip them. Closing the sheet returns focus to the button that opened it. The waveform itself stays the existing view.

The waveform region name is `Waveform, <file>.` Its description includes channel count, duration, sample rate, playhead, and selection. The description is not an `aria-live` region. Read playhead position speaks the time only when activated. Repeated steps are throttled. Analysis progress is not announced per chunk.

Selection editing reuses drag-free validation: set start or end at the playhead, type both times, clear, and preview with the existing selection player. Preview does not start on focus. Trim, fade in, fade out, normalize, loop, and export selection call the existing actions in the modes that already have them. Sensory keeps navigation and selection and does not gain a new trim.

Landmarks: recording start and end, selection edges, and loop edges are exact timeline times. Detected transients reuse the editor onset detector and are not beats or named events. Possible silence is RMS under about −48 dBFS for at least 120 ms, not absolute silence. Level changes are short-term RMS jumps of at least 12 dB, capped so a noisy file does not produce thousands of rows. Structural boundaries are not removed by density thinning. Loading another recording invalidates the previous result. A finished scan is cached by buffer revision, rate, length, and channel count, so a UI or mode change does not scan again. The scan yields between chunks, or uses a worker for recordings up to eight minutes, and does not run on the audio thread.

Signal inspection, in Technical, reports peak and RMS in dBFS over a 50 ms window around the playhead, per channel for stereo. It is not LUFS.

Manual assistive technology: NOT TESTED. No VoiceOver, TalkBack, NVDA, or JAWS session was run for 20C. Semantics were checked in the DOM and with the automated suite.

## DSP

No DSP, routing, effect, modulation, automation, offline render, or export signal-processing code was changed. EQ arrow keys call the existing parameter API. Reduced motion only skips decorative animation.

## FIELD ACCESS 22B — high visibility controls (0.28.0)

High Visibility Controls is Settings → Accessibility → Visual comfort. The stored flag is `highVisibility` on the existing FIELD ACCESS record. Default is off. `data-high-visibility` is `on` or `off`. Restore accessibility defaults sets it back to off. Reset application returns the whole FIELD ACCESS record to its defaults, including High Visibility, Interface Size, and Text Size, and it also clears the session. Reload and mode changes keep the flag.

What got clearer, using shape, weight, or a label as well as color:

- Switches, pressed toggles, the transport circle, knobs (edge, needle, dashed modulation arc), and slider tracks with a thumb at the value
- Drag-free inputs, step buttons, disabled buttons, and error text
- Playhead: thicker line, theme text color, top triangle. The time stays the center of the line (`translateX(-50%)`). The line does not receive pointer events
- Selection: square caps and an inset edge. Trim uses a bracket. Fade in and fade out keep separate dash patterns. Loop edges, where a track loop exists, use a diamond and a dashed line
- EQ nodes: band number, circle when idle, rounded square when selected, dashed when bypassed. The response keeps its theme color with a light text-colored halo on the selected curve. The 0 dB line is dashed and labeled. Frequency and gain mapping is unchanged
- Automation: circle versus diamond, dashed inactive lane. Interpolation is unchanged
- Effect chain: Active / Bypassed text, dashed bypass, solid selected bar. Move buttons keep their existing behavior
- Meters: scale marks, channel letters, square clip light plus the existing Clip label. The clip latch is still the meter’s own detection
- FFT: slightly stronger axis and 0 dB lines. Spectral drawing is otherwise the same
- Hearing Access: existing symbols, plus a square behind a clip mark and stronger tag text
- Sensory: a quiet inset edge on editable controls. The scene is not turned into a technical graph
- Guided Tasks: a static dashed outline, separate from the keyboard focus ring. No flash. Reduced Motion still strips animation
- Focus Mode, Simple, Technical, and Sensory share the same flag

Contrast check that was run: theme text color against the app canvas for Studio Dark (`#e8e6df` / `#151616`), Soft Slate (`#e6edf3` / `#0d1117`), Warm Paper (`#2a261f` / `#f4efe6`), and Dusk (`#ebe6e1` / `#241e28`). Each pair is above 4.5:1, which also clears the 3:1 non-text floor for edges painted in the text color. This is not a full WCAG 2.2 AA audit. Canvas antialiasing, mixed fills, and custom themes still need a person to look at them.

Manual review still required:

- Screen readers were not run (VoiceOver, TalkBack, NVDA, JAWS). Semantics were checked in the DOM: new marks are either `aria-hidden` or they repeat a state the control already exposes
- Interface Size and Text Size from 22A are in this build. High Visibility was checked with them at 100%/100%, 125%/150%, and 150%/200%, and with Larger Controls (`data-ui-scale="large"`) at 320, 375, 390, and 430 CSS pixels. Page overflow stayed within 1px. Settings can still sit in the scrolling header at 320px (R4). At 320px with Interface Size 150% and Text Size 200%, the empty Technical phone layout already stacks the load prompt, inspector actions, and transport. The same intersections are present with High Visibility off, so the preference does not add that overlap
- A person should still look at Warm Paper and Dusk with a bypassed EQ band, a selected automation point, and a clipping meter, because automated contrast does not see every canvas pixel

Known visual limits:

- Some icon-only buttons stay icon-only. They keep an accessible name, a stronger boundary, and a distinct glyph. A text label was not added where it would break the circular transport
- Fade handles on the canvas are still pointer targets. The keyboard path remains the drag-free editors
- Close EQ nodes can sit near each other. Visual rings stay about 1.5px so the hit target is not grown again on top of Larger Controls
- Guided highlight and keyboard focus can appear at the same time. The tutorial mark is dashed. The focus ring stays the focus ring

DSP modifications: none.

## FIELD ACCESS 22C — Sensory Comfort (0.29.0)

Sensory Comfort is a FIELD ACCESS preference. Default is off. It is not a fourth mode. Stored choices apply only while the master is on. Reduced Motion and `prefers-reduced-motion` stay independent: either one still removes decorative animation when Sensory Comfort is off.

Implemented controls, in Settings → Accessibility → Sensory Comfort:

- Sensory Comfort
- Visual Activity: Standard or Low
- Reduce Decorative Motion
- Calm Meters
- Calm Spectrum
- Reduce Visual Effects
- Quiet Notifications

Presentation tokens on the document: `--field-motion-duration`, `--field-motion-intensity`, `--field-glow-intensity`, `--field-visual-transition-duration`, `--field-decorative-opacity`.

What changed on screen:

- Meters keep `timeDomainPeakDb` and the clip threshold. Calm Meters quantize the drawn bar and drop the clip glow. The Clip label stays. Low Visual Activity can refresh the bar less often. The clip check still runs on the existing meter cadence.
- FFT 2D and the 3D waterfall can draw less often and with less glow. Waterfall camera glide stops while Calm Spectrum is on. FFT size, hop, and the existing visual pause are unchanged. The pause still affects the picture only.
- Sensory pulse, grain drift, lens wobble, and the LFO activity dot calm down. String positions and parameter axes stay.
- Quiet Notifications hide informational tempo notes and the hearing loop badge. Warnings, clipping, recording announcements, and the screen-reader live region stay.
- Guided Tasks use a stable outline. Show me where scrolls only when the target is outside the viewport, without a smooth-scroll animation while decorative motion is reduced. High Visibility’s dashed outline stays when that preference is also on.
- Focus Mode skips its entrance animation while decorative motion is reduced.

Remaining motion and visual limits:

- Some Sensory depth drawing still moves while playback runs when Reduce Decorative Motion is off. Low Visual Activity slows that drawing. It does not freeze the picture.
- Meter and spectrum display followers can update less often. The underlying analyser and DSP block size are not retuned. A very short peak can still fall between two visual samples, as it could before.
- Clipping is a stable label and lamp, not a flash. Color is not the only cue while Calm Meters is on, because the word Clip is primary text. High Visibility still draws the square clip mark.
- No battery measurement was taken. Lower paint rates are not a battery claim.
- Manual assistive technology: NOT TESTED. No VoiceOver, TalkBack, NVDA, or JAWS session was run for 22C. A person did not watch the screen for flashing over time. Playwright screenshots of the settings, Sensory view, and FFT were reviewed.
- Physical iPhone, iPad, and Android devices were not used. Viewport checks at 320, 375, 390, and 430 CSS pixels ran in Playwright.
- This section is not a WCAG 2.2 AA conformance claim.

Sensory Comfort works with the High Visibility layer from 22B. It does not replace those tokens, the focus ring, or the stronger control edges.

DSP modifications: none.
