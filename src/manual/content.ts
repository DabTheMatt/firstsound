/**
 * In-app FIELD manual.
 *
 * When a user-facing FIELD feature, control, workflow, or shortcut changes,
 * update the corresponding Manual section in this file in the same task/commit.
 */
import type { Locale } from '../i18n/locale'

export type ManualSection = {
  id: string
  title: string
  body: string[]
}

export type ManualCopy = {
  title: string
  search: string
  empty: string
  close: string
  sections: ManualSection[]
}

const en: ManualSection[] = [
  {
    id: 'overview',
    title: 'FIELD overview',
    body: [
      'FIELD is a browser instrument for one loaded sample. You edit the waveform, run it through a serial audio chain, and shape it with automation, LFOs, and Random.',
      'The engine owns playback and DSP. The screen only shows and edits that state. Switching theme, opening this manual, or moving a panel does not rebuild the audio graph.',
    ],
  },
  {
    id: 'start',
    title: 'Getting started',
    body: [
      'Choose Technical, Simple, or Sensory when FIELD opens. Simple is a quick editor for finishing a sample. Technical is the full editor. Sensory shapes sound by feeling. All three use the same engine.',
      'Grant audio when the browser asks. If the status says audio is blocked, interact with the page again so the AudioContext can start.',
    ],
  },
  {
    id: 'simple',
    title: 'Simple — Quick Editor',
    body: [
      'Simple finishes a recording without a mixing desk. The empty waveform offers Load sample and Generate demo sample. Drag with the mouse to select a region, then trim. Touch still pans the view. Fade in and fade out are rows of curves: none is a hard edge, and each next icon is a longer, gentler slope. The curve is the same one Technical uses.',
      'Sound is one character at a time: Natural, More bass, Less bass, Brighter, Warmer, Less harsh, Clearer, or Softer. Amount scales that character. Natural clears it. Even out raises the selection to a steady peak. Gain, under Level, is the input level in decibels. Choosing a character again replaces the previous one.',
      'Effects holds Reverb and Delay. Each stays off until you enable it. Small, Medium, and Large are spaces. Short, Medium, and Long are echoes. Amount is how much of that effect you hear. It does not change tone. While delay is on, the waveform draws a fading mark for each reflection.',
      'Original and After compare the loaded material with the current Simple result. Switching them does not clear your settings. Export writes that result, including trim, fades, tone, reverb, and delay. With tail keeps the decay of delay and reverb. Without tail ends at the sample.',
      'Simple and Technical share one audio engine. A tone, reverb, or delay you set here is the same processing Technical shows in more detail. If the project already has processing Simple cannot represent, Simple leaves it in place and says advanced processing is active. Reset changes clears fades, tone, reverb, and delay. It does not replace the loaded file.',
    ],
  },
  {
    id: 'guided-tasks',
    title: 'Guided Tasks',
    body: [
      'Guided Tasks is Learn by doing. Open it from the menu, or from Guide me in Simple. It is a guidance layer over FIELD. It is not a fourth mode and it is not a separate editor. Simple, Technical, and Sensory stay as they are.',
      'Start from what you want to do. Each step asks for one action in the real editor. A step finishes when that action happens. Next does not mark an editing step complete by itself. Informational steps use Next. Skip is only on steps that are optional. Show me where outlines the control. The rest of the interface stays usable.',
      'The panel can sit docked, floating, or minimized. Minimize pauses the guidance and keeps the step. Playback and editing continue. Exit leaves the guide and remembers the task. Opening Guided Tasks again resumes it. Restart clears the guide only. It does not reload the sample, reset gain, or remove effects. Back shows the previous instruction and does not undo an edit.',
      'If a task fits Simple or Technical better, FIELD asks before switching. The sound stays as it is. If Focus hides the control, the guide asks before leaving Focus. If no sample is loaded, load one or generate the existing demo sample. A sample that is already loaded is not replaced.',
      'Why and Learn more open the same short explanations as Learn Audio. The first lines stay plain. A practical note and an optional technical note stay tucked away until you ask.',
    ],
  },
  {
    id: 'learn-audio',
    title: 'Learn Audio',
    body: [
      'Learn Audio is the topic library. Open it from Guided Tasks. You can read it with no task running. The topics are waveform, amplitude, gain, decibels, clipping, selection, trim, fade, frequency, EQ, reverb, delay, pitch, speed, reverse, and export.',
      'Waveform height is amplitude, not a full measure of loudness. Gain changes level. EQ changes frequency balance and does not remove all noise. Reverb adds reflected sound. Delay repeats the sound later. Speed, pitch, and reverse are different moves.',
    ],
  },
  {
    id: 'technical-interface',
    title: 'Technical interface',
    body: [
      'Technical has two presentations. Classic is the current layout. Workspace (Experimental) reorganizes the same Technical controls: a chain, one active workspace (Wave, EQ, FFT, Auto, or Hearing), contextual controls, and transport. It uses the same audio engine and the same features.',
      'Focus Mode is that same workspace without the surrounding chrome. Enter Focus from the workspace header. Exit Focus returns the chrome without changing the sound, the selection, or the playhead. FFT Focus shows the spectrum. Analyzer settings open from a control on that bar and close again over the graph.',
      'Workspace is experimental. Settings → Technical interface → Classic switches back immediately. The choice is saved in this browser. It does not add another mode beside Simple, Technical, and Sensory.',
      'Workspace views change the picture only. Wave, FFT, Auto, and Hearing leave the inspector on the last selected effect. EQ does the same until an equalizer is in the chain, and then the EQ view shows the equalizer inspector. Analyzer settings stay on the FFT bar: Before, After, Both, 2D / 3D, and the settings menu. That menu uses the same compact rows as the workspace bar: a short label and the choices beside it. Color there is Off, Level, or Frequency, and it paints the 2D bars as well as the 3D ridges. Display rows for grid, scale, color, regions, bars, line, and legend stay on the EQ graph and use those same rows. Color On there paints those bars in region hues. Color Off keeps the theme color. Hearing keeps that same effect. The loudness words sit beside the output meter on the right.',
      'EQ in Workspace opens in the inspector. Each filter is one full-width row: a type selector and the knobs that filter uses. Add band creates the next filter. The graph uses the full height above the transport. An icon in the inspector opens vertical strips under the graph; drag the bar between them to change that panel’s height. An icon at the corner of the strip panel returns to the inspector. FIELD remembers that choice only for EQ. Adding or selecting another effect shows that effect’s inspector.',
    ],
  },
  {
    id: 'load',
    title: 'Loading audio',
    body: [
      'Load sample is the primary action. It opens a file picker. You can also drop a file onto the editor.',
      'Four track squares sit beside the chain. An empty slot stays nearly invisible. Loading a sample lights that slot’s square in its color from the active theme. The first sample lights square 1. Empty slots do not keep a dimmer copy of that color.',
      'Safari on iPhone and iPad decodes WAV, AIFF, MP3, M4A/AAC, and CAF. OGG and WebM usually fail there.',
    ],
  },
  {
    id: 'demo',
    title: 'Generating demo audio',
    body: [
      'Generate demo sample synthesizes a new stereo buffer in the browser. It is not a downloaded file, and each press is different.',
      'Length is between 12 and 24 seconds. The material mixes texture, pulses, tones, transients, and a quieter region so selection, fades, EQ, delay, reverb, and meters have something to work on. The peak sits near −6 dBFS.',
    ],
  },
  {
    id: 'transport',
    title: 'Transport',
    body: [
      'Play/Pause, Stop, and Loop stay on the transport. Play from start jumps to the beginning of the sample rather than the selection. Dragging the playhead while audio plays fades the jump, so the move does not click.',
      'On a narrow desktop the secondary actions compress, then move into More. They do not wrap onto a second row. The phone transport keeps large targets and does not force the full desktop labels.',
    ],
  },
  {
    id: 'wave',
    title: 'Waveform editing',
    body: [
      'Drag across the waveform to set the selection. Drag the edges to resize it. Pinch with two fingers to zoom. Scroll or drag to pan when the view is zoomed. Loading a second sample fits SINGLE to the file you are editing, so the selection can cover any part of that file.',
      'The overview under the wave shows the whole sample. Fit returns the view to the full duration.',
      'SINGLE / WAVE draws the cached source peaks times Input Gain. The linear scale is 10^(dB/20), so +6 dB is about twice as tall and −6 dB is about half. Peaks that pass the lane are clipped only in the drawing. The source buffer is not re-analysed when Gain moves. Later effects and the output fader stay on the meters.',
    ],
  },
  {
    id: 'selection',
    title: 'Selection',
    body: [
      'Sel start and Sel end move the playhead to the selection edges. Copy, cut, paste, delete, mute, trim, and insert silence use the current selection.',
      'Loop plays the selection when Loop is on.',
    ],
  },
  {
    id: 'fades',
    title: 'Fade in / Fade out',
    body: [
      'With a selection, the top of each edge is the fade handle. Drag it to lengthen the fade. In WAVE Focus the handles sit below the focus toolbar so the toolbar does not cover them.',
      'Fade curve and bend live with the sample edit controls.',
    ],
  },
  {
    id: 'loop',
    title: 'Loop',
    body: ['Loop repeats the current selection. Turn it off to play through the rest of the sample.'],
  },
  {
    id: 'input',
    title: 'Input controls',
    body: [
      'The start of the chain is the input gain. It changes the audio level and the SINGLE / WAVE height together. Make mono folds the sample to one channel. Record captures the microphone into the sample slot when the browser allows it.',
    ],
  },
  {
    id: 'chain',
    title: 'Audio chain',
    body: [
      'Modules run in series from input to output. Add, remove, bypass, and reorder them from the chain. Each added effect is its own instance with its own settings, even when the type matches one already in the chain. Input, each effect, and output take the selected track’s color, the same color as the Wave, EQ, and other view tabs.',
    ],
  },
  {
    id: 'fx-edit',
    title: 'Adding, removing, and reordering effects',
    body: [
      'Insert a module from the chain. Select it to edit that instance. A second Delay, EQ, Filter, Reverb, or Compressor starts from its own defaults and does not copy the first instance.',
      'Presets apply to the instance you are editing.',
    ],
  },
  {
    id: 'eq',
    title: 'EQ',
    body: [
      'Each EQ instance has its own bands. Band and comb gain run from −24 dB to +24 dB. Focus lists every active band on the left of the graph: color, name, frequency, and type. Choosing a row or a graph node selects the same band. The knobs stay on the center of the graph when the filter type changes. The list does not shift them.',
      'Focus lists the filters on the left of the graph, with the type beside the frequency. The knobs sit on the center of the screen and float over the grid. The plot stops under those knobs, so a bar at the top of the scale ends before them. Range, in the graph menu, is 60, 90, or 120 dB. It is how far down the spectrum bars reach. It does not scale the EQ curve. The knobs sit level with the top of that menu. The focus control sits above the ••• menu when that menu is on the graph. The filter type menu is in the band header, next to the band name. The pointer shows frequency first, then the note, for example 440 Hz · A4. The focus control on the EQ graph opens EQ Focus. The graph menu sets grid density 6, 12, or 24, the axis scale Lin, Log, or Mel, the spectrum layer Before, After, or Both, and frequency color on or off. Hover a setting name to read what it does. Freq nodes colors each EQ handle by the region it sits in. Regions tints the spectrum columns. Legend draws that color key at the lower left of the EQ graph. Guides, when on, add a landmark under the pointer: kick boom near 80–100 Hz, voice around 1 kHz, snare crack around 2–5 kHz, air above 12 kHz. Those notes follow Sound On Sound (Senior and White, Using EQ, August 2001) and the iZotope EQ cheat sheet. They are places to listen, not rules. Frequency guide lines use the usual round frequencies on a logarithmic axis unless Lin is selected, and the numbers sit under the axis line.',
      'The horizontal lines on the EQ graph are filter gain, every 6 dB from −24 to +24. A bell at +24 dB peaks on the +24 line. The stroke stays inside the chart, so the top is not sliced flat. A flat stretch sitting on that +24 line means the filters together go past +24 dB, so the drawing stops at the chart. It is not a sign that the audio is distorting. Each band’s own gain still stops at +24 dB. Spectrum bars use the separate Range scale, with 0 dB at the top of their scale.',
      'Snap, beside the graph menu, pauses playback and holds the FFT and the EQ graph where they are. The spectrum does not fall to silence while the hold is on. Play releases the hold and starts the graphs moving again.',
    ],
  },
  {
    id: 'filter',
    title: 'Filter',
    body: ['Filter is a separate module from EQ. Cutoff, resonance, drive, mix, and its LFO belong to that filter instance.'],
  },
  {
    id: 'comp',
    title: 'Compressor',
    body: [
      'Each compressor instance has its own Threshold, Ratio, Attack, Release, Knee, and Makeup. It is not the master safety limiter. Threshold is the level where reduction starts. Ratio, from 1:1 to 20:1, sets how hard the signal is turned down above that. Attack and Release are shown in milliseconds and applied in seconds. Knee 0 dB is a hard corner; a higher knee softens the transition.',
      'Makeup sits after the compressor. It changes the output level and does not change the gain-reduction meter. Auto Makeup is a fixed estimate from Threshold and Ratio. Turn it off to use Makeup by hand. It is not a live loudness matcher.',
      'Low Cut is the frequency below which the compressor does not react. Sound under that cutoff goes around the compressor and is not reduced. At the minimum, shown as Off, the whole signal is compressed.',
      'Curve is the Threshold, Ratio, and Knee map: input level across, output level up. Needle shows the same gain reduction as a moving needle. It rests at 0 and swings only while the compressor is reducing gain. IN is the level into the compressor, OUT is after Makeup, and GR is the compressor’s own reduction in dB. At rest GR stays at 0. Presets such as Gentle, Vocal, Punch, Tight, and Limit are starting points, not mastering settings. A second compressor does not share the first one’s settings.',
    ],
  },
  {
    id: 'delay',
    title: 'Delay',
    body: ['Time, feedback, and wet are per delay instance. In stereo, LEFT and RIGHT start below the mono/stereo switch with a shared gap. Kill FX cuts delay and reverb tails without removing the modules.'],
  },
  {
    id: 'reverb',
    title: 'Reverb',
    body: [
      'Each reverb instance keeps its own size, decay, wet mix, and impulse response. The dry path and the reverberated path are separate, then summed.',
      'When Dry and Wet are linked they are one Mix. The percentages are that mix position: 35% Wet means Dry 65% and Wet 35%. FIELD applies an equal-power crossfade, dry = cos(mix × π/2) and wet = sin(mix × π/2), so the middle does not drop the way a straight linear blend does. The wet impulse is scaled once from its own energy, so a full-scale source mixed in does not slam the sum into clipping. A fixed ceiling after that sum catches the peaks equal-power mixing can still add. Neither step is a live loudness control, and neither keeps every source at the same loudness. Unlink Dry and Wet to set them as independent levels. The output can then get louder or quieter.',
      'Reverb Randomize changes creative parameters such as Mix, decay, size, pre-delay, damping, and width. When Dry and Wet are linked, Randomize moves that one Mix percentage. The equal-power dry and wet gains are derived from Mix and are not drawn on their own. Chaos may pick more extreme settings, including a fully wet mix. It does not randomize the internal wet-return gain, impulse normalization, or whether the reverb is bypassed.',
    ],
  },
  {
    id: 'dist',
    title: 'Distortion and other modules',
    body: [
      'Distortion, grain, and mid/side are separate module types. Kill noise mutes the distortion noise generator only. Mid/side edits width and the mid and side levels.',
    ],
  },
  {
    id: 'auto',
    title: 'Automation',
    body: [
      'AUTO draws lanes over time. The lane title is the effect and parameter, for example EQ frequency. The track badge stays beside that name and does not cover it.',
      'Drag to add or move points. Segment curves can be linear, smooth, or stepped. An automation lane stays attached to the effect instance that owned it.',
    ],
  },
  {
    id: 'lfo',
    title: 'Modulation / LFO',
    body: [
      'The LFO control center and the per-module LFO slots modulate parameters of the instance in focus. Two delays do not share one LFO bank.',
      'Assignment uses a stable parameter id. A route on Delay B does not move Delay A. An EQ band route also stores that band id.',
      'The value order is base, then automation while playing, then Random, then the LFO around that center, then the parameter range. One resolver feeds DSP, the knob, the readout, and the EQ node.',
      'Rate, depth, and shape stay on the route while it is bypassed. Remove is separate and clears the route. The knob needle and the number show the current effective value. A thin arc shows the real range from the center, depth, and bounds. A small wave mark means an LFO is connected. Pause freezes the phase, the DSP value, and the visuals together. Resume continues from that phase.',
      'Tap cycle, on an LFO slot, sets the rate from the time between taps. It uses the same gesture as Tap tempo and writes the existing rate control.',
    ],
  },
  {
    id: 'random',
    title: 'Random',
    body: [
      'Random offsets parameters inside their allowed ranges. The safety limiter is excluded so Random cannot push it into an unsafe setting.',
      'On a linked reverb, Randomize changes Mix. Dry and Wet percentages stay one position, and the equal-power gains are calculated afterwards. Internal return gain is not a Random target.',
    ],
  },
  {
    id: 'chaos',
    title: 'Chaos',
    body: [
      'Chaos is the button immediately left of Settings. Turning it on enables the chain safety limiter if that limiter was bypassed or missing. It does not add a second limiter, and it does not add makeup gain.',
      'If you bypass the limiter while Chaos stays on, FIELD leaves that choice until you leave Chaos and enter it again.',
      'Chaos can randomize more extreme reverb settings than a normal Randomize pass. It still changes Mix as one control when Dry and Wet are linked, and it does not randomize internal gain staging or bypass the effect.',
    ],
  },
  {
    id: 'views',
    title: 'WAVE, FFT, EQ, and AUTO',
    body: [
      'WAVE shows the sample. FFT shows the spectrum of the playing audio. EQ opens the equalizer workspace. AUTO opens automation. These are views of the same project, and choosing one does not replace the inspector. 3D Spectral History is a view inside FFT, not another workspace.',
    ],
  },
  {
    id: 'fft-3d',
    title: 'FFT → 3D Spectral History',
    body: [
      'Open 3D Spectral History from the 3D label in FFT. 2D returns to the ordinary analyzer. The 2D / 3D switch stays on the FFT bar. In FFT Focus that switch is inside the settings menu, so the spectrum fills the screen. Frequency runs left to right, level rises in dB, and time recedes backward. The front ridge is now. Older ridges fade as they move back. They stay until they leave the history window.',
      'History is 1, 2, 5, or 10 seconds of real playback. Five seconds is the default. The picture keeps the same depth; a longer history means each step back is more time, not a bigger scene. The view uses the same FFT as the 2D analyzer: FFT size, smoothing, range, and frequency scale. It measures the audio. It does not draw the EQ response. Source is the tap before the effect chain. Output, the default in 3D, is the tap after the chain. Both keeps Output in front and draws Source as a thinner ridge.',
      'Front, Angled, and Top are the views. Angled is the default. Front is for reading the current spectrum. Top lays frequency across and time away from now, with level in the strength of the line. Drag on the graph nudges the camera. Pinch or the wheel zooms, inside a limited range. Reset View returns to Angled. Freeze holds the ridges while audio continues. Pause and Stop also leave the picture where it is, because history follows playback time. Clear History, in the ••• menu, drops only the stored ridges.',
      'Ridges glide backward with playback time. A new slice eases out of now instead of stepping the whole picture. Point at a ridge to read frequency, note, level, and age, for example 440 Hz · A4, −18.2 dB, −1.8 s. Time labels sit inside the graph, on the left depth edge: NOW at the front, then −1, −2, and the far edge of the history. Lines are the default. Surface fills under each ridge and stays filled when color is on. Color, in the analyzer settings, is Off, Level, or Frequency. It paints the 2D bars and the 3D ridges. Level runs from the theme’s violet curve through cyan to gold. Frequency uses the same band hues as the 2D analyzer. Density and peak trails are in that menu too. A small screen draws fewer ridges. The history buffer has a fixed size and starts empty after a reload. Reduced motion skips camera glide; the spectrum itself still updates, because it is the measurement.',
    ],
  },
  {
    id: 'focus',
    title: 'Focus mode',
    body: [
      'Focus mode fills the editor with one task: wave, FFT, EQ, or automation. Exit returns to the normal layout. In WAVE Focus, fade handles are inset below the toolbar. In FFT Focus the spectrum is the picture. Layer, 2D / 3D, history, and display open from the settings control on the focus bar.',
      'EQ Focus knobs are a larger, quieter dial with a dark translucent face and thin marks. The indicator follows the effective value, including LFO motion. The small mark under a knob follows the LFO wave shape. Knobs and their readouts stay neutral. Only the band name and number use the band color, unless frequency color is on. The filter type menu sits in the band header. EQ Focus does not show the Hearing Access readout.',
    ],
  },
  {
    id: 'meter',
    title: 'Output meter',
    body: [
      'The output meter follows the master signal. Range, directly under the meter, selects −60, −100, or −120 dB. OUT and Monitor sit below that control.',
    ],
  },
  {
    id: 'out',
    title: 'OUT / Monitor',
    body: ['OUT is the master output gain. Monitor sets how loud the input is while recording. Neither control is the meter range.'],
  },
  {
    id: 'export',
    title: 'Export',
    body: ['Export writes a WAV of the processed sample or the current selection, using the chain and automation that are in the project.'],
  },
  {
    id: 'themes',
    title: 'Themes',
    body: [
      'Themes are grouped: Monochromatic, Color, Light, and Eyes friendly. Eyes friendly includes Soft Slate, Warm Paper, and Dusk. Ordinary text aims for at least 4.5:1 contrast, and important boundaries for at least 3:1.',
      'The choice is stored with the other FIELD preferences. Changing it does not restart playback.',
    ],
  },
  {
    id: 'keys',
    title: 'Keyboard shortcuts',
    body: [
      'Space plays or pauses, except while typing. Escape closes menus and dialogs.',
      'Ctrl+Z or Cmd+Z undoes. Shift+Ctrl+Z or Shift+Cmd+Z redoes.',
      'Tab moves between controls. Arrow keys change a focused knob or slider. Shift+Arrow is a finer step. Home and End jump to the ends. Page Up and Page Down take a larger step. Delete or Backspace resets the focused parameter.',
      'Transport shortcuts can be turned off in Settings.',
    ],
  },
  {
    id: 'gestures',
    title: 'Mobile gestures',
    body: [
      'Drag on the waveform to draw or resize a selection. Drag a fade handle at the top of a selection edge. Pinch to zoom. Drag the playhead to scrub.',
      'A finger or pencil drag on a knob changes that parameter. The page stays still while the contact is on the dial. Scroll from the panel around the knobs.',
      'A finger or an Apple Pencil on the EQ or FFT graph does not zoom the page. Pinch still zooms the waveform.',
      'The phone transport uses large hit targets. Focus mode uses a full-height toolbar above the wave, not on top of the fade handles.',
    ],
  },
  {
    id: 'a11y',
    title: 'Accessibility',
    body: [
      'Settings includes larger interface, stronger focus, tooltips, reduced motion, screen-reader optimizations, and Hearing Access. Controls keep names and keyboard access.',
    ],
  },
  {
    id: 'reset',
    title: 'Reset',
    body: [
      'Reset application, in the top bar, returns FIELD to a clean session without reloading the page. It stops audio, drops the loaded sample, clears effects, automation, modulation, and editing state.',
      'If the session already has work, FIELD asks you to confirm. An empty session resets immediately.',
    ],
  },
  {
    id: 'perf',
    title: 'Performance indicator',
    body: [
      'The header shows UI load, a smoothed estimate of main-thread event-loop delay. It is not the operating system’s process CPU percentage. Browsers do not expose that figure to a page.',
      'Memory, when the browser provides it, is the JavaScript heap, not the whole machine.',
    ],
  },
  {
    id: 'hearing',
    title: 'Hearing Access',
    body: [
      'Hearing Access is an accessibility layer, not a fourth editing mode. Turn it on in Settings → Accessibility → Hearing Access. It stays available in Simple, Technical, and Sensory. Off is the default. FIELD does not infer a disability from this switch.',
      'The panel opens from the Hearing Access button, an ear icon immediately to the left of Export. Enlarge grows it; Restore returns the default size. Each corner has a resize handle, and the size and position are remembered. Drag the header to detach the panel; Dock puts it back. When the panel is small, the scrolling text keeps a margin beside the scrollbar. Tags share one height and wrap onto another row without a scrollbar. Sound is the live reading and Original → heard. Events lists measured moments — click a row to move the playhead; an empty list means this scope has no qualifying attack, gap, or clip. Space is stereo balance, width, correlation, and mid/side, plus a head picture that follows the playhead. Dynamics is level, crest, and full-scale clipping. Compare is a table per active effect. Haptics can send a test pulse when the browser exposes vibration. Longer explanations sit behind the information button.',
      'Choose a profile. Assisted listening adds measurements beside ordinary monitoring. Visual first prioritizes the sound map, fingerprint, events, space, dynamics, and numbers when auditory monitoring is not reliable. Visual + haptic adds optional pulses on devices that actually support vibration.',
      'The sound map shows time, frequency region, and energy. Regions are SUB, BASS, LOW MID, MID, HIGH MID, HIGH, and AIR. Each region has a label, a vertical position, a texture, and a color taken from the active theme. Color is never the only channel, so the map stays readable in Black & White, Noire, and Eyes Friendly themes. Attacks are thin vertical lines at the time they happen, drawn through the band rows. The rows sit edge to edge, so there is no square grid to line up with. Click a line to mark the start of that attack on the waveform and move the playhead. The line icon under the wave legend shows or hides that mark. The view does not zoom. It does not edit the audio.',
      'Original → heard is the only band picture in Sound. It puts the sample or selection before effects and what you hear after pitch and EQ on one bar per band. Levels run from −96 dB to 0 dB, so a quieter high band stays visible beside a louder bass band. Peak, RMS, and crest stay in Dynamics. The dimmer bar is the original and a tick marks its end. The brighter bar is what you hear after pitch and the current EQ curve. A bright extension past the tick is a boost. A dim tail past the brighter bar is a cut. Its color follows the theme and the band name stays beside it.',
      'Live descriptions such as BASS-HEAVY, HIGH-BAND ENERGY, AIR ENERGY, LEFT-HEAVY, RIGHT-HEAVY, LOW CORRELATION, CLIPPING, NEAR FULL SCALE, DC OFFSET, or WIDE STEREO come from documented thresholds, with hysteresis so labels do not flicker. WIDE STEREO and NARROW STEREO never appear together: when the measurement crosses to the other side, the old label is replaced at once. The same is true of LOUD and QUIET. Each label has an explanation that includes the measured value. Every tag has the same height in the panel and in Hearing Access focus, and extra tags wrap onto another row without a scrollbar. Note tags and character tags follow the playhead. A partial or a character such as TONAL, NOISE-LIKE, PERCUSSIVE, SUSTAINED, BRIGHT, DULL, HARMONIC, or INHARMONIC is listed while that moment is under the playhead, not for the whole sample at once. Click a note tag to hear a short synthesized sine of that frequency. The preview stays quiet, high frequencies are much quieter still, and a limiter caps it. It is not the sample itself and it does not pass through the instrument output. A Notes control above the tags sets how many partials of the current moment are listed. A strict setting keeps the loudest one or two. A sensitive setting includes quieter partials, up to about six, and the same note is listed once. Silence does not invent a note. FIELD does not call a sound good, bad, warm, or professional.',
      'Before / after compares the measured buffer with the change implied by the active effect: EQ magnitude, gain, compressor gain reduction, delay repeats, reverb tail, and stereo width or balance. Compare shows each active effect as its own table, with the measure, the before value, the after value, and the change. Delay times and reverb decay follow the same parameters as the DSP. Reverb duration is parameter-derived. It is not a measured RT60.',
      'The dynamics map marks quiet, loud, transient, and actual full-scale clipping on a thin waveform strip labeled LEVEL. Bar height is the peak of that time slice. A triangle is a short attack. An exclamation mark is full-scale clipping. The strip sits under the waveform and above the time ruler, so it does not cover the chart. Marks sit in their own row above the level bars. Loud audio below full scale is not labeled as clipping. Attacks on the sound map are thin vertical lines at the measured time. Each band row uses a fixed loudness scale, so a quieter high band stays visible beside a louder bass band. A bass-heavy sample can still be mostly bass. That is the level, not a hidden high. On the waveform a transient is a thin vertical line, the same mark Input → Mark transients uses. One hit can still light several triangles on the level strip. Event detection can mark transients, silence, loud events, low-frequency events, tonal stretches, possible clicks, and possible clipping. Choose Show or an event row to move the playhead. Nothing is rewritten automatically.',
      'The space map reports balance, width, correlation, and mid/side energy, including a neutral warning when correlation suggests a mono-compatibility issue. A head picture, seen from above, follows the playhead. Spread follows width, and a hollow mark has low correlation. The field sits apart from the head and runs in time from top to bottom. A longer mark is wider. The marks follow pan, mid/side width, balance, and Haas, and a delay that replaces one channel. The sample balance stays listed beside the heard balance. A mono file stays narrow, and pan still places it. EQ assistance shows the selected band’s frequency, note, region, gain, Q, and the frequency span the real filter response actually moves. Longer explanations sit behind the information button.',
      'Show, on a mixing-assistant finding, frames that time span on the waveform and moves the playhead. It does not edit the audio. The Hearing icon beside the other view icons opens Hearing Access focus: the sound map after pitch, the live tags, a loudness meter, a head that follows playback, and the space field, using the same focus chrome as Wave, EQ, FFT, and automation. That view does not show the EQ strips. Drag across the waveform there to select a fragment. Releasing that drag turns the selection into the loop. A click only moves the playhead. Drag the bar under the waveform to give the wave most of the screen, or to shrink it. Heard, width, correlation, room, and distance sit in one row. Each value has a fixed width, so a change does not slide the others. A vertical loudness rail sits on the right. It uses the same peak reading as the main meter and names the level: quiet, medium, loud, very loud, or clipping, on a scale from −60 dBFS to 0. While audio plays, the bars follow the output. While it is stopped, the bars rest at silence, so a hot sample peak is not labeled very loud. The sample peak and RMS stay listed as numbers. The legend under the time scale turns the dashed transient lines and the chart symbols on or off. Those lines stay hidden until Input → Mark transients is on, and the same dashed line is used in the wave view and in Hearing focus. Sensitivity for those marks sits on its own row under Detect tempo and Tap tempo, so the slider stays clear of the tap button. The space field follows pan, mid/side, and delay, including a delay that lands on one channel. On the head, a larger reverb size or a greater distance draws a smaller head. The picture has no room outline and no side dots. The source stays in front of the head and moves toward the front as reverb distance rises. Wet does not move the source. When wet is above zero, the sound map carries energy forward by the decay and dulls the high rows as the source moves farther away. The space field draws a short tail under each mark. Wet at zero leaves those charts unchanged. The right edge of the space field uses the same split: a longer line is a larger room, and the dot is the source distance. A focus icon in the top-left corner of the wave, the EQ strips, the automation view, and the Hearing Access panel opens that view. On the spectrum and the EQ graph it sits above the ••• menu. In Hearing Access focus the corner of the wave stays clear, and Panel opens the full Hearing Access panel. On wave, spectrum, and automation focus the readout sits under the focus bar so it does not cover play and exit. EQ Focus leaves that readout off.  Fit, zoom out, and zoom in sit on that view. Double-click zooms the waveform to the selection; double-click again fits the sample. The EQ comparison stays in the panel.',
      'Monitoring assistance is a bounded low/mid/high emphasis on the speaker path only, after the safety gain and before the hardware output. It is not a hearing aid. It is not included in export. Exported audio is rendered by the offline engine, which never inserts this filter.',
      'Haptics are optional. FIELD treats vibration as available when the browser exposes it, and a Test pulse checks whether this device accepts one pattern. Unsupported browsers say so instead of pretending. Intensity is off, low, medium, or high. Pulses during playback need intensity above off. They are rate-limited. Frequency haptics are experimental and can be disabled.',
      'The visual mixing assistant lists technical conditions such as possible clipping, low-frequency energy, channel imbalance, low correlation, dynamic range, long silence, and DC offset. Show moves the playhead. It does not fix the audio.',
      'In Focus mode Hearing Access stays a single readout on the active graph: waveform peak and scope, dominant spectrum frequency, or the automation parameter’s stored and effective values. EQ Focus does not show that readout. The graph remains the main surface.',
      'Limitations: Hearing Access provides visual, numerical, and optional tactile representations of measurable audio properties. It does not reproduce every perceptual aspect of hearing and does not guarantee that a mix will sound subjectively correct to every listener. Monitoring assistance is not a medical hearing device. Voice/background figures, when shown, are estimates and are omitted when the spectrum is a narrow tone or otherwise inconclusive.',
    ],
  },
  {
    id: 'trouble',
    title: 'Troubleshooting',
    body: [
      'If you hear nothing, check that a sample is loaded, the chain is not fully bypassed, and OUT is up. If audio is blocked, click the page and press play again.',
      'Kill FX clears delay and reverb tails. Reset application clears the session when the project itself is wedged. Refresh app in the installed view only reloads the installed shell and its caches.',
    ],
  },
]

const pl: ManualSection[] = [
  {
    id: 'overview',
    title: 'Przegląd FIELD',
    body: [
      'FIELD to instrument w przeglądarce dla jednego wczytanego sampla. Edytujesz falę, przepuszczasz ją przez szeregowy łańcuch i kształtujesz automatyzacją, LFO i Random.',
      'Silnik prowadzi odtwarzanie i DSP. Ekran tylko pokazuje i zmienia ten stan. Zmiana motywu, otwarcie podręcznika albo przesunięcie panelu nie przebudowuje grafu audio.',
    ],
  },
  {
    id: 'start',
    title: 'Pierwsze kroki',
    body: [
      'Na starcie wybierz Technical, Simple albo Sensory. Simple to szybki edytor wykończenia sampla. Technical to pełny edytor. Sensoryczny kształtuje dźwięk odczuciem. Wszystkie trzy korzystają z tego samego silnika.',
      'Zezwól na dźwięk, gdy przeglądarka zapyta. Jeśli status mówi, że audio jest zablokowane, kliknij stronę jeszcze raz, żeby AudioContext mógł wystartować.',
    ],
  },
  {
    id: 'simple',
    title: 'Simple — szybki edytor',
    body: [
      'Simple wykańcza nagranie bez stołu mikserskiego. Pusta fala ma Wczytaj sample i Wygeneruj sample demo. Przeciągnięcie myszą zaznacza fragment, potem można go przyciąć. Dotyk nadal przesuwa widok. Płynny początek i płynny koniec to rzędy krzywych: brak to twarda krawędź, a każda kolejna ikona jest dłuższa i łagodniejsza. Krzywa zanikania jest ta sama co w Technical.',
      'Brzmienie to jedna barwa naraz: Naturalnie, Więcej basu, Mniej basu, Jaśniej, Cieplej, Mniej ostro, Czyściej albo Miękcej. Ilość skaluje tę barwę. Naturalnie ją zdejmuje. Wyrównaj podnosi zaznaczenie do równego szczytu. Gain pod Poziomem to poziom wejścia w decybelach. Wybranie innej barwy zastępuje poprzednią.',
      'Efekty to pogłos i opóźnienie. Każdy jest wyłączony, dopóki go nie włączysz. Mały, Średni i Duży to przestrzenie. Krótkie, Średnie i Długie to echa. Ilość mówi, jak słyszalny jest dany efekt. Nie zmienia barwy. Gdy opóźnienie jest włączone, fala rysuje blednący znacznik każdego odbicia.',
      'Oryginał i Po porównują wczytany materiał z bieżącym wynikiem Simple. Przełączenie nie kasuje ustawień. Eksport zapisuje ten wynik: przycięcie, zaniki, barwę, pogłos i opóźnienie. Z ogonem zostawia wybrzmienie delay i pogłosu. Bez ogona kończy się razem z samplem.',
      'Simple i Technical korzystają z jednego silnika audio. Barwa, pogłos albo opóźnienie ustawione tutaj to ta sama obróbka, którą Technical pokazuje dokładniej. Jeśli projekt ma już obróbkę, której Simple nie umie pokazać, zostawia ją i mówi, że aktywna jest zaawansowana obróbka. Resetuj zmiany czyści zaniki, barwę, pogłos i opóźnienie. Nie podmienia wczytanego pliku.',
    ],
  },
  {
    id: 'guided-tasks',
    title: 'Zadania z przewodnikiem',
    body: [
      'Zadania z przewodnikiem to uczenie się przez działanie. Otwierasz je z menu albo przyciskiem Prowadź mnie w trybie Prostym. To warstwa prowadzenia nad FIELD. To nie jest czwarty tryb i nie jest osobny edytor. Prosty, Techniczny i Sensoryczny zostają, jakie są.',
      'Zaczynasz od tego, co chcesz zrobić. Każdy krok prosi o jedną czynność w prawdziwym edytorze. Krok kończy się, gdy ta czynność się wydarzy. Dalej nie oznacza samo z siebie, że edycja jest gotowa. Kroki informacyjne używają Dalej. Pomiń jest tylko przy krokach opcjonalnych. Pokaż gdzie obrysowuje kontrolkę. Reszta interfejsu zostaje używalna.',
      'Panel może być zadokowany, unoszony albo zminimalizowany. Minimalizacja zatrzymuje prowadzenie i zostawia krok. Odtwarzanie i edycja idą dalej. Wyjście zostawia przewodnik i pamięta zadanie. Ponowne otwarcie wznawia je. Ponowne rozpoczęcie czyści tylko przewodnik. Nie wczytuje sampla od nowa, nie zeruje gainu i nie usuwa efektów. Wstecz pokazuje poprzednią instrukcję i nie cofa edycji.',
      'Jeśli zadanie lepiej pasuje do Prostego albo Technicznego, FIELD pyta przed przełączeniem. Dźwięk zostaje, jaki jest. Jeśli Focus chowa kontrolkę, przewodnik pyta, zanim wyjdzie z Focus. Gdy nie ma sampla, wczytaj go albo wygeneruj istniejącą próbkę demo. Wczytany sample nie jest podmieniany.',
      'Dlaczego i Dowiedz się więcej otwierają te same krótkie wyjaśnienia co Poznaj dźwięk. Pierwsze zdania są zwykłe. Praktyczna uwaga i opcjonalna uwaga techniczna czekają, aż o nie poprosisz.',
    ],
  },
  {
    id: 'learn-audio',
    title: 'Poznaj dźwięk',
    body: [
      'Poznaj dźwięk to biblioteka tematów. Otwierasz ją z Zadań z przewodnikiem. Możesz czytać bez uruchomionego zadania. Tematy to fala, amplituda, gain, decybele, przesterowanie, zaznaczenie, przycięcie, zanikanie, częstotliwość, EQ, pogłos, delay, wysokość, szybkość, odwrócenie i eksport.',
      'Wysokość fali to amplituda, nie pełna miara głośności. Gain zmienia poziom. EQ zmienia balans częstotliwości i nie usuwa całego szumu. Pogłos dodaje dźwięk odbić. Delay powtarza dźwięk później. Szybkość, wysokość i odwrócenie to różne ruchy.',
    ],
  },
  {
    id: 'technical-interface',
    title: 'Interfejs techniczny',
    body: [
      'Technical ma dwa układy. Klasyczny to dotychczasowy widok. Workspace (eksperymentalny) układa te same kontrolki inaczej: łańcuch, jeden aktywny obszar (Fala, EQ, FFT, Auto albo Hearing), kontrolki kontekstu i transport. Korzysta z tego samego silnika i tych samych funkcji.',
      'Tryb Focus to ten sam obszar bez otaczającej ramki. Wejście jest w nagłówku obszaru. Wyjście przywraca ramkę i nie zmienia dźwięku, zaznaczenia ani głowicy. FFT Focus pokazuje widmo. Ustawienia analizatora otwierają się z kontrolki na tym pasku i zamykają się nad wykresem.',
      'Workspace jest eksperymentalny. Ustawienia → Interfejs techniczny → Klasyczny wraca od razu. Wybór zostaje w tej przeglądarce. To nie jest kolejny tryb obok Prostego, Technical i Sensorycznego.',
      'Widoki Workspace zmieniają tylko obraz. Fala, FFT, Auto i Hearing zostawiają inspektor na ostatnio wybranym efekcie. EQ robi to samo, dopóki korektora nie ma w łańcuchu — wtedy widok EQ pokazuje inspektor korektora. Ustawienia analizatora zostają na pasku FFT: Before, After, Both, 2D / 3D i menu ustawień. To menu używa tych samych zwartych rzędów co pasek Workspace: krótka etykieta i wybory obok niej. Kolor to Off, Level albo Frequency i maluje zarówno słupki 2D, jak i granie 3D. Rzędy wyświetlania — siatka, skala, kolor, regiony, słupki, linia i legenda — zostają na wykresie EQ i korzystają z tych samych rzędów. Kolor On maluje tamte słupki barwami regionów. Kolor Off zostawia kolor motywu. Hearing zostawia ten sam efekt. Słowa głośności stoją obok wskaźnika wyjścia po prawej.',
      'EQ w Workspace otwiera się w inspektorze. Każdy filtr to jeden rząd na całą szerokość: selektor typu i gałki tego filtra. Dodaj pasmo tworzy kolejny filtr. Wykres zajmuje całą wysokość nad transportem. Ikona w inspektorze otwiera pionowe paski pod wykresem; przeciągnięcie belki między nimi zmienia wysokość tego panelu. Ikona w rogu panelu pasków wraca do inspektora. Ten wybór jest pamiętany tylko dla EQ. Dodanie albo zaznaczenie innego efektu pokazuje jego inspektor.',
    ],
  },
  {
    id: 'load',
    title: 'Wczytywanie audio',
    body: [
      'Wczytaj sample jest główną akcją. Otwiera wybór pliku. Plik można też upuścić na edytor.',
      'Cztery kwadraty ścieżek stoją przy łańcuchu. Pusty slot zostaje prawie niewidoczny. Wczytanie sampla zapala kwadrat tego slotu kolorem ścieżki z palety aktywnego motywu. Pierwszy sample zapala kwadrat 1. Puste sloty nie trzymają przygaszonej wersji tego koloru.',
      'Safari na iPhonie i iPadzie dekoduje WAV, AIFF, MP3, M4A/AAC i CAF. OGG i WebM zwykle tam nie działają.',
    ],
  },
  {
    id: 'demo',
    title: 'Generowanie audio demo',
    body: [
      'Wygeneruj sample demo syntezuje nowy bufor stereo w przeglądarce. To nie jest pobierany plik i każde naciśnięcie daje inny materiał.',
      'Długość wynosi od 12 do 24 sekund. Są w nim faktura, impulsy, tony, transjenty i cichszy odcinek, żeby dało się sprawdzić zaznaczenie, fade, EQ, delay, pogłos i mierniki. Szczyt leży około −6 dBFS.',
    ],
  },
  {
    id: 'transport',
    title: 'Transport',
    body: [
      'Play/Pause, Stop i Loop zostają na transporcie. Play from start skacze na początek sampla, nie zaznaczenia. Przeciąganie głowicy w trakcie odtwarzania wygasza skok, więc ruch nie trzaska.',
      'Na węższym pulpicie akcje drugorzędne najpierw się zagęszczają, potem wchodzą do Więcej. Nie zawijają się do drugiego rzędu. Transport telefonu ma duże cele i nie wciska pełnych etykiet pulpitu.',
    ],
  },
  {
    id: 'wave',
    title: 'Edycja fali',
    body: [
      'Przeciągnij po fali, aby ustawić zaznaczenie. Krawędzie zmieniają jego długość. Uszczypnięcie dwoma palcami przybliża. Przewijanie albo przeciąganie przesuwa widok, gdy jest przybliżony. Wczytanie drugiego sampla dopasowuje SINGLE do edytowanego pliku, więc zaznaczenie może objąć dowolny jego fragment.',
      'Pasek pod falą pokazuje cały sample. Fit wraca do pełnej długości.',
      'Widok SINGLE / WAVE rysuje zapamiętane szczyty źródła razy Input Gain. Skala liniowa to 10^(dB/20): +6 dB jest około dwa razy wyższe, −6 dB około dwa razy niższe. Szczyty, które wychodzą poza pas, są obcinane tylko na rysunku. Ruch Gain nie analizuje bufora od nowa. Dalsze efekty i tłumik wyjścia widać na miernikach.',
    ],
  },
  {
    id: 'selection',
    title: 'Zaznaczenie',
    body: [
      'Sel start i Sel end stawiają głowicę na krawędziach zaznaczenia. Kopiuj, wytnij, wklej, usuń, wycisz, przytnij i wstaw ciszę używają bieżącego zaznaczenia.',
      'Loop odtwarza zaznaczenie, gdy pętla jest włączona.',
    ],
  },
  {
    id: 'fades',
    title: 'Fade in / Fade out',
    body: [
      'Przy zaznaczeniu góra każdej krawędzi jest uchwytem fade. Przeciągnij go, aby wydłużyć zanik. W trybie WAVE Focus uchwyty są pod paskiem Focus, więc pasek ich nie zasłania.',
      'Krzywa i wygięcie fade są przy kontrolkach edycji sampla.',
    ],
  },
  {
    id: 'loop',
    title: 'Pętla',
    body: ['Loop powtarza bieżące zaznaczenie. Wyłączenie puszcza resztę sampla.'],
  },
  {
    id: 'input',
    title: 'Wejście',
    body: [
      'Początek łańcucha to wzmocnienie wejścia. Zmienia poziom audio i wysokość fali w SINGLE / WAVE. Make mono składa sample do jednego kanału. Nagrywanie zapisuje mikrofon w slocie sampla, gdy przeglądarka na to pozwala.',
    ],
  },
  {
    id: 'chain',
    title: 'Łańcuch audio',
    body: [
      'Moduły idą szeregowo od wejścia do wyjścia. Dodajesz, usuwasz, omijasz i zmieniasz ich kolejność w łańcuchu. Każdy dodany efekt jest osobną instancją, nawet gdy typ już jest w łańcuchu. Wejście, każdy efekt i wyjście biorą kolor wybranej ścieżki, ten sam co zakładki Wave, EQ i pozostałe widoki.',
    ],
  },
  {
    id: 'fx-edit',
    title: 'Dodawanie, usuwanie i kolejność efektów',
    body: [
      'Wstaw moduł z łańcucha. Wybierz go, aby edytować tę instancję. Drugi Delay, EQ, Filter, Reverb albo Compressor startuje od własnych wartości domyślnych i nie kopiuje pierwszego.',
      'Presety dotyczą instancji, którą edytujesz.',
    ],
  },
  {
    id: 'eq',
    title: 'EQ',
    body: [
      'Każda instancja EQ ma własne pasma. Gain pasma i grzebienia sięga od −24 dB do +24 dB. Focus pokazuje listę aktywnych filtrów po lewej stronie wykresu: kolor, nazwę, częstotliwość i typ. Wiersz i węzeł na wykresie wybierają to samo pasmo. Pokrętła zostają na środku wykresu przy zmianie typu. Lista ich nie przesuwa.',
      'Lista filtrów stoi po lewej stronie wykresu, a typ jest obok częstotliwości. Pokrętła są na środku ekranu i unoszą się nad siatką. Wykres kończy się pod tymi gałkami, więc słupek na szczycie skali staje przed nimi. Zakres w menu wykresu to 60, 90 albo 120 dB. To głębokość słupków widma, a nie skala krzywej EQ. Gałki są na wysokości górnej krawędzi tego menu. Ikona focus stoi nad menu •••, gdy to menu jest na wykresie. Menu typu filtra jest w nagłówku pasma, przy nazwie. Wskaźnik pokazuje najpierw częstotliwość, potem nutę, na przykład 440 Hz · A4. Przycisk focus na wykresie EQ otwiera EQ Focus. Menu wykresu ustawia gęstość 6, 12 albo 24, skalę Lin, Log albo Mel, warstwę widma Before, After albo Both oraz kolor częstotliwości włącza albo wyłącza. Najechanie na nazwę ustawienia pokazuje, co ono robi. Freq nodes koloruje uchwyty EQ według regionu częstotliwości. Regions barwi słupki widma. Legend rysuje ten klucz kolorów w lewym dolnym rogu wykresu EQ. Guides, gdy są włączone, dopisują punkt odniesienia pod wskaźnikiem: boom stopy koło 80–100 Hz, głos koło 1 kHz, trzask werbla koło 2–5 kHz, powietrze powyżej 12 kHz. Te opisy idą za Sound On Sound (Senior i White, Using EQ, sierpień 2001) oraz ściągą EQ iZotope. To miejsca do słuchania, nie reguły. Pionowe prowadnice używają zwykłych okrągłych częstotliwości i leżą logarytmicznie, dopóki nie wybierzesz Lin. Liczby stoją pod poziomą osią.',
      'Poziome linie na wykresie EQ to wzmocnienie filtra, co 6 dB od −24 do +24. Bell na +24 dB szczytuje na linii +24. Kreska mieści się w wykresie, więc czubek nie jest ścinany na płasko. Płaski odcinek leżący na linii +24 oznacza, że filtry razem wychodzą poza +24 dB i rysunek staje na granicy wykresu. To nie jest znak, że dźwięk się przesterowuje. Gain pojedynczego pasma i tak kończy się na +24 dB. Słupki widma mają osobną skalę Range, z 0 dB na szczycie tej skali.',
      'Snap, obok menu wykresu, pauzuje odtwarzanie i zatrzymuje wykresy FFT oraz EQ w miejscu. Widmo nie opada do ciszy, dopóki zatrzymanie trwa. Play puszcza zatrzymanie i wykresy znowu idą.',
    ],
  },
  {
    id: 'filter',
    title: 'Filter',
    body: ['Filter jest osobnym modułem, nie EQ. Cutoff, rezonans, drive, mix i jego LFO należą do tej instancji filtra.'],
  },
  {
    id: 'comp',
    title: 'Compressor',
    body: [
      'Każda instancja kompresora ma własny Threshold, Ratio, Attack, Release, Knee i Makeup. To nie jest główny limiter bezpieczeństwa. Threshold to poziom, od którego zaczyna się redukcja. Ratio od 1:1 do 20:1 określa, jak mocno sygnał powyżej progu jest ściszany. Attack i Release są pokazane w milisekundach, a w DSP liczone w sekundach. Knee 0 dB to ostre kolano; wyższe kolano łagodzi przejście.',
      'Makeup jest za kompresorem. Zmienia poziom wyjścia i nie rusza miernika redukcji wzmocnienia. Auto Makeup to stałe oszacowanie z Threshold i Ratio. Wyłącz je, żeby ustawić Makeup ręcznie. To nie jest żywy dopasowywacz głośności.',
      'Low Cut to częstotliwość, poniżej której kompresor nie reaguje. Dźwięk pod tym odcięciem omija kompresor i nie jest ściszany. Przy minimum, pokazywanym jako Off, kompresowany jest cały sygnał.',
      'Curve to mapa Threshold, Ratio i Knee: poziom wejścia w poziomie, poziom wyjścia w pionie. Needle pokazuje tę samą redukcję wzmocnienia jako wychylającą się wskazówkę. W spoczynku stoi na 0 i rusza się tylko wtedy, gdy kompresor rzeczywiście redukuje wzmocnienie. IN to poziom wchodzący do kompresora, OUT jest po Makeup, a GR to własna redukcja kompresora w dB. W spoczynku GR zostaje na 0. Presety takie jak Gentle, Vocal, Punch, Tight i Limit są punktami startowymi, nie ustawieniami masteringowymi. Drugi kompresor nie dzieli ustawień z pierwszym.',
    ],
  },
  {
    id: 'delay',
    title: 'Delay',
    body: ['Czas, feedback i wet są osobne dla każdej instancji delay. W stereo panele LEFT i RIGHT zaczynają się pod przełącznikiem mono/stereo ze wspólnym odstępem. Kill FX ucina ogony delay i pogłosu bez usuwania modułów.'],
  },
  {
    id: 'reverb',
    title: 'Pogłos',
    body: [
      'Każda instancja pogłosu trzyma własny rozmiar, wybrzmienie, miks wet i własną odpowiedź impulsową. Ścieżka dry i ścieżka pogłosu są osobne, a potem sumowane.',
      'Gdy Dry i Wet są zlinkowane, to jeden Mix. Procenty opisują pozycję miksu: 35% Wet oznacza Dry 65% i Wet 35%. FIELD stosuje crossfade o stałej mocy, dry = cos(mix × π/2) i wet = sin(mix × π/2), więc środek nie zapada się tak jak przy zwykłym liniowym blendzie. Odpowiedź impulsowa wet jest skalowana raz, według własnej energii, więc pełnoskalowe źródło wmiksowane w pogłos nie wbija sumy w clipping. Stały pułap za tą sumą łapie szczyty, które miks o stałej mocy nadal może dodać. Żaden z tych kroków nie jest żywym dopasowaniem głośności i żaden nie utrzymuje tej samej głośności dla każdego źródła. Odłącz Dry i Wet, żeby ustawić je jako niezależne poziomy. Wyjście może wtedy stać się głośniejsze albo cichsze.',
      'Randomize pogłosu zmienia parametry kreatywne: Mix, wybrzmienie, rozmiar, pre-delay, tłumienie i szerokość. Gdy Dry i Wet są zlinkowane, Randomize rusza ten jeden procent Mix. Wzmocnienia dry i wet o stałej mocy wynikają z Mix i nie są losowane osobno. Chaos może wybrać bardziej skrajne ustawienia, także pełny wet. Nie losuje wewnętrznego wzmocnienia powrotu wet, normalizacji impulsu ani obejścia pogłosu.',
    ],
  },
  {
    id: 'dist',
    title: 'Distortion i inne moduły',
    body: [
      'Distortion, grain i mid/side to osobne typy. Kill noise wycisza tylko generator szumu w Distortion. Mid/side zmienia szerokość oraz poziomy mid i side.',
    ],
  },
  {
    id: 'auto',
    title: 'Automatyzacja',
    body: [
      'AUTO rysuje linie w czasie. Tytuł linii to efekt i parametr, na przykład częstotliwość EQ. Znacznik ścieżki stoi obok tej nazwy i jej nie zasłania.',
      'Przeciąganie dodaje albo przesuwa punkty. Odcinek może być liniowy, gładki albo schodkowy. Linia zostaje przy instancji efektu, do której należała.',
    ],
  },
  {
    id: 'lfo',
    title: 'Modulacja / LFO',
    body: [
      'Centrum LFO i sloty przy module modulują parametry instancji, która jest w fokusie. Dwa delaye nie dzielą jednego banku LFO.',
      'Przypisanie używa stabilnego identyfikatora parametru. Trasa na Delay B nie rusza Delay A. Trasa pasma EQ zapisuje też identyfikator tego pasma.',
      'Kolejność: baza, potem automatyka gdy transport gra, potem Random, potem LFO wokół tego środka, potem zakres parametru. Jedno rozwiązanie zasila DSP, pokrętło, odczyt i węzeł EQ.',
      'Rate, depth i shape zostają na trasie, gdy jest ona ominięta. Usunięcie jest osobną czynnością i czyści trasę. Wskazówka i liczba pokazują bieżącą wartość skuteczną. Cienki łuk pokazuje realny zakres ze środka, głębokości i granic. Mały znak fali oznacza podłączone LFO. Pauza zatrzymuje fazę, wartość DSP i obraz razem. Wznowienie jedzie od tej fazy.',
      'Tap cycle przy slocie LFO ustawia rate z czasu między stuknięciami. Działa jak Tap tempo i zapisuje istniejący parametr rate.',
    ],
  },
  {
    id: 'random',
    title: 'Random',
    body: [
      'Random odchyla parametry w dozwolonych zakresach. Limiter bezpieczeństwa jest wyłączony z losowania, więc Random nie ustawi go niebezpiecznie.',
      'Na zlinkowanym pogłosie Randomize zmienia Mix. Procenty Dry i Wet zostają jedną pozycją, a wzmocnienia o stałej mocy są liczone potem. Wewnętrzne wzmocnienie powrotu nie jest celem Random.',
    ],
  },
  {
    id: 'chaos',
    title: 'Chaos',
    body: [
      'Chaos jest przyciskiem bezpośrednio na lewo od Ustawień. Włączenie go uruchamia limiter bezpieczeństwa w łańcuchu, jeśli był ominięty albo go nie było. Nie dodaje drugiego limitera i nie podbija makeup.',
      'Jeśli ominiesz limiter, gdy Chaos nadal jest włączony, FIELD zostawia ten wybór, dopóki nie wyjdziesz z Chaos i nie wejdziesz ponownie.',
      'Chaos może losować bardziej skrajny pogłos niż zwykłe Randomize. Przy zlinkowanych Dry i Wet nadal zmienia jeden Mix i nie losuje wewnętrznego gain staging ani obejścia efektu.',
    ],
  },
  {
    id: 'views',
    title: 'WAVE, FFT, EQ i AUTO',
    body: [
      'WAVE pokazuje sample. FFT pokazuje widmo odtwarzanego audio. EQ otwiera warsztat korektora. AUTO otwiera automatyzację. To widoki tego samego projektu i wybór widoku nie podmienia inspektora. 3D Spectral History jest widokiem wewnątrz FFT, a nie osobnym warsztatem.',
    ],
  },
  {
    id: 'fft-3d',
    title: 'FFT → 3D Spectral History',
    body: [
      '3D Spectral History otwiera napis 3D w FFT. 2D wraca do zwykłego analizatora. Przełącznik 2D / 3D zostaje na pasku FFT. W FFT Focus ten przełącznik jest w menu ustawień, więc widmo wypełnia ekran. Częstotliwość biegnie od lewej do prawej, poziom rośnie w dB, a czas cofa się w głąb. Przednia grań to teraz. Starsze granie bledną, gdy oddalają się do tyłu. Znikają dopiero po wyjściu z okna historii.',
      'Historia to 1, 2, 5 albo 10 sekund rzeczywistego odtwarzania. Domyślnie jest 5 sekund. Głębokość obrazu zostaje ta sama: dłuższa historia oznacza więcej czasu na tej samej osi, a nie większą scenę. Widok korzysta z tego samego FFT co analizator 2D: rozmiar FFT, wygładzanie, zakres i skala częstotliwości. Mierzy audio. Nie rysuje krzywej EQ. Source to odczep przed łańcuchem efektów. Output, domyślny w 3D, to odczep za łańcuchem. Both zostawia Output z przodu, a Source rysuje cieńszą granią.',
      'Front, Angled i Top to widoki kamery. Angled jest domyślny. Front służy do czytania bieżącego widma. Top kładzie częstotliwość w poziomie, a czas w głąb od teraz; poziom widać w sile linii. Przeciągnięcie po wykresie lekko rusza kamerę. Uszczypnięcie albo kółko przybliża, w ograniczonym zakresie. Reset View wraca do Angled. Freeze zatrzymuje granie, a audio gra dalej. Pauza i Stop też zostawiają obraz w miejscu, bo historia idzie za czasem odtwarzania. Clear History, w menu •••, kasuje tylko zapisane granie.',
      'Granie suną do tyłu razem z czasem odtwarzania. Nowy przekrój wychodzi z teraz płynnie, zamiast przestawiać cały obraz. Wskazanie grani czyta częstotliwość, nutę, poziom i wiek, na przykład 440 Hz · A4, −18.2 dB, −1.8 s. Podpisy czasu są w środku wykresu, przy lewej krawędzi głębi: NOW z przodu, potem −1, −2 i koniec historii. Domyślne są linie. Surface wypełnia obszar pod granią i zostaje, także przy włączonym kolorze. Kolor, w ustawieniach analizatora, to Off, Level albo Frequency. Maluje słupki 2D i granie 3D. Level biegnie od fioletu krzywej motywu przez cyjan do złota. Frequency używa tych samych barw pasm co analizator 2D. Gęstość i ślady szczytów są w tym samym menu. Mały ekran rysuje mniej grani. Bufor historii ma stały rozmiar i po odświeżeniu strony zaczyna się pusty. Ograniczenie ruchu wyłącza poślizg kamery; samo widmo dalej się aktualizuje, bo jest pomiarem.',
    ],
  },
  {
    id: 'focus',
    title: 'Tryb Focus',
    body: [
      'Focus wypełnia edytor jednym zadaniem: fala, FFT, EQ albo automatyzacja. Wyjście wraca do zwykłego układu. W WAVE Focus uchwyty fade są odsunięte pod pasek narzędzi. W FFT Focus widmo jest obrazem. Warstwa, 2D / 3D, historia i wyświetlanie otwierają się z kontrolki ustawień na pasku focus.',
      'Pokrętła EQ Focus są większe i cichsze: ciemna, lekko przezroczysta tarcza i cienkie kreski. Wskazówka śledzi wartość skuteczną, także przy LFO. Mały znak pod pokrętłem podąża za kształtem fali LFO. Pokrętła i odczyty zostają neutralne. Kolor pasma ma tylko nazwa i numer, chyba że włączony jest kolor częstotliwości. Menu typu filtra jest w nagłówku pasma. EQ Focus nie pokazuje odczytu Hearing Access.',
    ],
  },
  {
    id: 'meter',
    title: 'Miernik wyjścia',
    body: [
      'Miernik wyjścia śledzi sygnał master. Zakres, bezpośrednio pod miernikiem, wybiera −60, −100 albo −120 dB. OUT i Monitor są pod tą kontrolką.',
    ],
  },
  {
    id: 'out',
    title: 'OUT / Monitor',
    body: ['OUT to wzmocnienie wyjścia master. Monitor ustawia głośność wejścia w trakcie nagrania. Żadna z tych gałek nie jest zakresem miernika.'],
  },
  {
    id: 'export',
    title: 'Eksport',
    body: ['Eksport zapisuje WAV przetworzonego sampla albo bieżącego zaznaczenia, z łańcuchem i automatyzacją projektu.'],
  },
  {
    id: 'themes',
    title: 'Motywy',
    body: [
      'Motywy są w grupach: Monochromatyczne, Kolor, Jasne i Przyjazne oczom. W grupie przyjaznej oczom są Soft Slate, Warm Paper i Dusk. Zwykły tekst celuje w kontrast co najmniej 4.5:1, a istotne krawędzie w co najmniej 3:1.',
      'Wybór jest pamiętany razem z innymi preferencjami FIELD. Zmiana nie restartuje odtwarzania.',
    ],
  },
  {
    id: 'keys',
    title: 'Skróty klawiszowe',
    body: [
      'Spacja odtwarza albo pauzuje, poza pisaniem. Escape zamyka menu i okna.',
      'Ctrl+Z albo Cmd+Z cofa. Shift+Ctrl+Z albo Shift+Cmd+Z ponawia.',
      'Tab przechodzi między kontrolkami. Strzałki zmieniają gałkę albo suwak w fokusie. Shift+strzałka to mniejszy krok. Home i End skaczą na krańce. Page Up i Page Down robią większy krok. Delete albo Backspace resetuje parametr w fokusie.',
      'Skróty transportu można wyłączyć w Ustawieniach.',
    ],
  },
  {
    id: 'gestures',
    title: 'Gesty na telefonie',
    body: [
      'Przeciągnij po fali, aby narysować albo zmienić zaznaczenie. Przeciągnij uchwyt fade u góry krawędzi. Uszczypnięcie przybliża. Przeciągnięcie głowicy przewija.',
      'Przeciągnięcie palcem albo piórkiem po gałce zmienia ten parametr. Ekran zostaje w miejscu, dopóki kontakt jest na gałce. Przewijanie zostaje na panelu wokół gałek.',
      'Palec albo piórko na wykresie EQ albo FFT nie przybliża strony. Uszczypnięcie nadal przybliża falę.',
      'Transport telefonu ma duże cele. Focus używa pełnej wysokości paska nad falą, nie na uchwytach fade.',
    ],
  },
  {
    id: 'a11y',
    title: 'Dostępność',
    body: [
      'Ustawienia zawierają większy interfejs, mocniejszy fokus, podpowiedzi, ograniczenie ruchu, optymalizacje czytnika ekranu i Hearing Access. Kontrolki zachowują nazwy i obsługę klawiaturą.',
    ],
  },
  {
    id: 'reset',
    title: 'Reset',
    body: [
      'Reset aplikacji na górnym pasku wraca do czystej sesji FIELD bez przeładowania strony. Zatrzymuje dźwięk, usuwa sample, czyści efekty, automatyzację, modulację i stan edycji.',
      'Gdy w sesji jest już praca, FIELD prosi o potwierdzenie. Pusta sesja resetuje się od razu.',
    ],
  },
  {
    id: 'perf',
    title: 'Wskaźnik wydajności',
    body: [
      'Nagłówek pokazuje obciążenie UI: wygładzone opóźnienie pętli zdarzeń wątku głównego. To nie jest procent CPU procesu w systemie. Przeglądarka nie udostępnia tej liczby stronie.',
      'Pamięć, gdy przeglądarka ją podaje, to sterta JavaScript, nie cała maszyna.',
    ],
  },
  {
    id: 'hearing',
    title: 'Hearing Access',
    body: [
      'Hearing Access to warstwa dostępności, a nie czwarty tryb edycji. Włącza się ją w Ustawienia → Dostępność → Hearing Access. Działa w trybach Prosty, Sterowanie i Słuch. Domyślnie jest wyłączona. FIELD nie wnioskuje z tego przełącznika o niepełnosprawności.',
      'Panel otwiera przycisk Hearing Access, ikona ucha tuż na lewo od Export. Enlarge powiększa okno, Restore wraca do rozmiaru domyślnego. Każdy róg ma uchwyt zmiany rozmiaru, a rozmiar i pozycja zostają zapamiętane. Przeciągnięcie nagłówka odpina panel; Dock stawia go z powrotem. Gdy okno jest małe, treść ma margines obok paska przewijania. Tagi mają jedną wysokość i zawijają się w kolejny rząd bez paska przewijania. Sound to odczyt na żywo i Original → heard. Events to lista zmierzonych momentów — klik wiersza przesuwa głowicę; pusta lista znaczy, że w tym zakresie nie ma ataku, przerwy ani clippingu. Space to balans, szerokość, korelacja i mid/side oraz obraz głowy podążający za głowicą. Dynamics to poziom, crest i clipping pełnej skali. Compare to tabela dla każdego włączonego efektu. Haptics może wysłać impuls testowy, gdy przeglądarka udostępnia wibrację. Dłuższe wyjaśnienia są pod przyciskiem informacji.',
      'Profil wybiera użytkownik. Assisted listening dokłada pomiary do zwykłego odsłuchu. Visual first stawia na mapę dźwięku, odcisk, zdarzenia, przestrzeń, dynamikę i liczby, gdy odsłuch nie jest wiarygodny. Visual + haptic dodaje opcjonalne impulsy tam, gdzie urządzenie naprawdę ma wibrację.',
      'Mapa dźwięku pokazuje czas, region częstotliwości i energię. Regiony to SUB, BASS, LOW MID, MID, HIGH MID, HIGH i AIR. Każdy ma etykietę, pozycję, fakturę i kolor wzięty z aktywnego motywu. Sam kolor nic nie znaczy, więc mapa zostaje czytelna w motywach Black & White, Noire i Eyes Friendly. Ataki to cienkie pionowe linie w czasie, w którym się pojawiają, przez wiersze pasm. Wiersze stykają się krawędziami, więc nie ma siatki kwadratów do wyrównania. Klik linii stawia znak na początku tego ataku na fali i przesuwa głowicę. Ikona linii pod legendą fali pokazuje albo ukrywa ten znak. Widok się nie przybliża. Nie edytuje audio.',
      'Original → heard to jedyny obraz pasm w Sound. Składa próbkę albo zaznaczenie przed efektami i to, co słychać po pitchu i EQ, na jednym pasku pasma. Poziomy idą od −96 dB do 0 dB, więc cichsze wysokie pasmo zostaje widoczne obok głośnego basu. Peak, RMS i crest zostają w Dynamics. Bledszy pasek to oryginał, a kreska oznacza jego koniec. Jaśniejszy pasek to to, co słychać po pitchu i aktualnej krzywej EQ. Jasne przedłużenie za kreską to podbicie. Bledsza resztka za jaśniejszym paskiem to tłumienie. Kolor idzie z motywu, a nazwa pasma zostaje obok.',
      'Opisy na żywo, takie jak BASS-HEAVY, HIGH-BAND ENERGY, AIR ENERGY, LEFT-HEAVY, RIGHT-HEAVY, LOW CORRELATION, CLIPPING, NEAR FULL SCALE, DC OFFSET albo WIDE STEREO, wynikają z opisanych progów i histerezy, żeby etykiety nie mrugały. WIDE STEREO i NARROW STEREO nie pojawiają się razem: gdy pomiar przechodzi na drugą stronę, stara etykieta znika od razu. To samo dotyczy LOUD i QUIET. Każda etykieta ma wyjaśnienie z wartością pomiaru. Każdy tag ma tę samą wysokość w panelu i w focusie Hearing Access, a dodatkowe tagi zawijają się w kolejny rząd bez paska przewijania. Tagi nut i charakteru podążają za głowicą. Składowa albo charakter, taki jak TONAL, NOISE-LIKE, PERCUSSIVE, SUSTAINED, BRIGHT, DULL, HARMONIC albo INHARMONIC, pojawia się, gdy ten moment jest pod głowicą, a nie dla całej próbki naraz. Klik tagu nuty odtwarza krótki zsyntezowany sinus tej częstotliwości. Podgląd jest cichy, wysokie częstotliwości są jeszcze cichsze, a limiter go ogranicza. To nie jest sama próbka i nie przechodzi przez wyjście instrumentu. Suwak Notes nad tagami ustawia, ile składowych bieżącego momentu widać. Niska czułość zostawia najgłośniejszą jedną albo dwie. Wysoka dodaje cichsze, do około sześciu, a ta sama nuta pojawia się raz. Cisza nie wymyśla nuty. FIELD nie nazywa dźwięku dobrym, złym, ciepłym ani profesjonalnym.',
      'Before / after porównuje zmierzony bufor ze zmianą wynikającą z aktywnego efektu: magnituda EQ, gain, redukcja wzmocnienia kompresora, powtórzenia delay, ogon pogłosu oraz szerokość lub balans. Compare pokazuje każdy włączony efekt jako osobną tabelę: miara, wartość przed, wartość po i zmiana. Czasy delay i decay pogłosu biorą się z tych samych parametrów co DSP. Czas pogłosu wynika z parametrów. To nie jest zmierzony RT60.',
      'Mapa dynamiki oznacza ciche, głośne, transjent i rzeczywiste przesterowanie pełnej skali na cienkim pasku fali podpisanym LEVEL. Wysokość słupka to szczyt tego odcinka czasu. Trójkąt to krótki atak. Wykrzyknik to clipping pełnej skali. Pasek leży pod falą i nad linijką czasu, więc nie zasłania wykresu. Znaki stoją we własnym rzędzie nad słupkami poziomu. Głośny materiał poniżej pełnej skali nie jest clippingiem. Na fali transjent to cienka pionowa linia, ten sam znak co Input → Mark transients. Każdy wiersz pasma używa stałej skali głośności, więc cichsze wysokie pasmo zostaje widoczne obok głośniejszego basu. Próbka z mocnym basem nadal może być głównie basem. To jest poziom, a nie ukryte wysokie. Jedno uderzenie może zapalić kilka trójkątów na pasku poziomu. Na mapie dźwięku atak to cienka pionowa linia w zmierzonym czasie. Detekcja zdarzeń może oznaczyć transjent, ciszę, głośne zdarzenie, niską częstotliwość, odcinek tonalny, możliwy klik i możliwe clipping. Show albo wiersz zdarzenia przesuwa głowicę. Audio nie jest przepisywane samo.',
      'Mapa przestrzeni podaje balans, szerokość, korelację i energię mid/side, w tym neutralne ostrzeżenie, gdy korelacja sugeruje problem zgodności z mono. Obraz głowy, widziany z góry, podąża za głowicą. Rozpiętość idzie za szerokością, a pusty znacznik ma niską korelację. Pole jest oddzielone od głowy i biegnie w czasie z góry na dół. Dłuższy znacznik jest szerszy. Znaczniki podążają za panoramą, szerokością, balansem i Haasem mid/side oraz delayem, który zastępuje jeden kanał. Balans próbki zostaje obok słyszanego balansu. Plik mono zostaje wąski, a panorama i tak go ustawia. Pomoc EQ pokazuje częstotliwość, nutę, region, gain, Q i zakres, który naprawdę rusza odpowiedź filtra. Dłuższe wyjaśnienia są pod przyciskiem informacji.',
      'Show przy warunku asystenta kadruje ten zakres na fali i przesuwa głowicę. Nie edytuje audio. Ikona Hearing obok pozostałych widoków otwiera Focus Hearing Access: mapę dźwięku po pitchu, tagi na żywo, wskaźnik głośności, głowę podążającą za odtwarzaniem i pole przestrzeni, w tej samej ramce co Fala, EQ, FFT i automatyzacja. Ten widok nie pokazuje pasków EQ. Przeciągnięcie po fali w tym widoku zaznacza fragment. Puszczenie zamienia zaznaczenie w pętlę. Klik tylko przesuwa głowicę. Pasek pod falą może oddać fali większość ekranu albo ją zmniejszyć. Heard, szerokość, korelacja, room i distance stoją w jednym rzędzie. Każda wartość ma stałą szerokość, więc zmiana jednej nie przesuwa pozostałych. Pionowy wskaźnik głośności stoi po prawej. Korzysta z tego samego odczytu szczytu co główny miernik i nazywa poziom: cicho, średnio, głośno, bardzo głośno albo clipping, na skali od −60 dBFS do 0. W trakcie odtwarzania słupki śledzą wyjście. Gdy odtwarzanie stoi, słupki opadają do ciszy, więc gorący szczyt próbki nie jest nazywany very loud. Szczyt próbki i RMS zostają wypisane jako liczby. Legenda pod skalą czasu włącza i wyłącza przerywane linie transjentów oraz symbole na wykresie. Linie są ukryte, dopóki nie włączysz Input → Mark transients, i ta sama przerywana linia jest w widoku fali oraz w Hearing focus. Czułość tych znaków stoi we własnym rzędzie pod Detect tempo i Tap tempo, żeby suwak nie wchodził pod przycisk tap. Pole przestrzeni podąża za panoramą, mid/side i delayem, także gdy delay wpada w jeden kanał. Na głowie większy reverb size albo większa odległość rysuje mniejszą głowę. Obraz nie ma obrysu pokoju ani kropek po bokach. Źródło stoi przed głową i idzie do przodu, gdy rośnie reverb distance. Wet nie przesuwa źródła. Gdy wet jest powyżej zera, mapa dźwięku przenosi energię do przodu zgodnie z decay i tłumi wysokie wiersze, gdy źródło jest dalej. Pole przestrzeni rysuje krótki ogon pod każdym znacznikiem. Wet równe zero zostawia te wykresy bez zmian. Prawa krawędź pola przestrzeni dzieli to tak samo: dłuższa linia to większy pokój, a kropka to odległość źródła. Ikona focus w lewym górnym rogu fali, pasków EQ, widoku automatyzacji i panelu Hearing Access otwiera ten widok. Na widmie i wykresie EQ stoi nad menu •••. W focusie Hearing Access róg fali zostaje pusty, a Panel otwiera pełny panel Hearing Access. Na focusie fali, widma i automatyzacji odczyt stoi pod belką, żeby nie zasłaniać odtwarzania i wyjścia. EQ Focus tego odczytu nie pokazuje.  Na tym widoku są Fit, oddalenie i przybliżenie. Podwójne kliknięcie przybliża falę do zaznaczenia, kolejne dopasowuje całą próbkę. Porównanie EQ zostaje w panelu.',
      'Monitoring assistance to ograniczone podbicie low/mid/high tylko na ścieżce odsłuchu, za safety gain i przed wyjściem sprzętowym. To nie jest aparat słuchowy. Nie wchodzi do eksportu. Eksport renderuje silnik offline, który tego filtra nie wstawia.',
      'Haptyka jest opcjonalna. FIELD uznaje wibrację za dostępną, gdy przeglądarka ją udostępnia, a Test pulse sprawdza, czy urządzenie przyjmuje jeden wzorzec. Przeglądarka bez wibracji mówi o tym wprost. Intensywność: off, low, medium, high. Impulsy w trakcie odtwarzania wymagają intensywności powyżej off. Mają limit częstości. Frequency haptics są eksperymentalne i można je wyłączyć.',
      'Visual mixing assistant wymienia warunki techniczne: możliwe clipping, energia niskich częstotliwości, nierównowaga kanałów, niska korelacja, zakres dynamiki, długa cisza i offset DC. Show przesuwa głowicę. Nie naprawia audio.',
      'W trybie Focus Hearing Access zostaje jednym odczytem na aktywnym wykresie: szczyt i zakres fali, dominująca częstotliwość widma albo wartość zapisana i efektywna parametru automacji. EQ Focus tego odczytu nie pokazuje. Wykres pozostaje główną powierzchnią.',
      'Ograniczenia: Hearing Access daje wizualną, liczbową i opcjonalnie dotykową reprezentację mierzalnych właściwości dźwięku. Nie odtwarza każdego percepcyjnego aspektu słyszenia i nie gwarantuje, że miks będzie subiektywnie poprawny dla każdego słuchacza. Monitoring assistance nie jest medycznym urządzeniem słuchowym. Liczby voice/background, jeśli się pojawią, są szacunkiem i są pomijane, gdy widmo jest wąskim tonem albo wynik jest niejednoznaczny.',
    ],
  },
  {
    id: 'trouble',
    title: 'Rozwiązywanie problemów',
    body: [
      'Gdy nic nie słychać, sprawdź, czy sample jest wczytany, łańcuch nie jest cały ominięty i OUT jest podniesione. Gdy audio jest zablokowane, kliknij stronę i naciśnij play jeszcze raz.',
      'Kill FX czyści ogony delay i pogłosu. Reset aplikacji czyści sesję, gdy projekt się zakleszczy. Odśwież aplikację w widoku zainstalowanym przeładowuje tylko zainstalowaną powłokę i jej cache.',
    ],
  },
]

export const MANUAL: Record<Locale, ManualCopy> = {
  en: {
    title: 'Manual',
    search: 'Search manual',
    empty: 'No matching section.',
    close: 'Close manual',
    sections: en,
  },
  pl: {
    title: 'Podręcznik',
    search: 'Szukaj w podręczniku',
    empty: 'Brak pasującej sekcji.',
    close: 'Zamknij podręcznik',
    sections: pl,
  },
}
