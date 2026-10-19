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
      'FIELD opens in Technical, on the Workspace presentation. Simple is a quick editor for finishing a sample. Technical is the full editor. Sensory shapes sound by feeling. All three use the same engine. Simple and Sensory stay in the header. A choice saved in this browser is kept.',
      'Grant audio when the browser asks. If the status says audio is blocked, interact with the page again so the AudioContext can start.',
    ],
  },
  {
    id: 'language',
    title: 'Language',
    body: [
      'FIELD can run in English or Polish. The language control shows the names English and Polski. It sits on the opening choice screen and in Settings. The choice is saved in this browser. There is no account. A browser with no saved choice stays in English.',
      'Polish uses audio terms: wzmocnienie for gain, poziom for level, głośność for volume, przesterowanie for clipping, próg for threshold, atak for attack, zwolnienie for release, and stopień kompresji for ratio. Narastanie is fade in. Wygaszanie is fade out. EQ, FFT, RMS, LUFS, dB, dBFS, Hz, kHz, Q, LFO, MIDI, WAV, MP3, FLAC, and PCM stay as written. The header keeps units such as 48 kHz. Timecode stays 00:12.450.',
      'Some controls keep a short visible label so the bars do not grow. The full Polish name is the accessible name and the tooltip. The Wave tab stays Fala. Its accessible name is Przebieg. The mode switch shows Prosty, Techn., and Sens. The accessible names are Prosty, Techniczny, and Sensoryczny.',
      'Changing language updates the interface only. It does not rebuild the audio graph, reset parameters, move the playhead, or stop playback.',
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
      'Guided Tasks is Learn by doing. It works in Simple and in Technical. Open it from the menu, from Guide me in Simple, or from Guide me in the Technical header. It is a guidance layer over FIELD. It is not a fourth mode and it is not a separate editor. Simple, Technical, and Sensory stay as they are.',
      'The same task follows the workspace you are in. In Simple, Add space says to open Effects and enable Reverb. In Technical, that task says to add Reverb in the effect chain, select that instance, and turn Wet up in its Inspector. Switching between Simple and Technical keeps the task, the step you can still do, and the steps you already finished. It does not restart the tutorial and it does not change the sound.',
      'Start from what you want to do. Each step asks for one action in the real editor. A step finishes when that action happens. Next does not mark an editing step complete by itself. Informational steps use Next. Skip is only on steps that are optional. Show me where scrolls to the control, and in Technical it can open the add menu or select the effect the step is following. It does not insert an effect or move a parameter. The rest of the interface stays usable.',
      'When a step needs an effect parameter, the guide looks for that effect. If it is missing, the step points at +. After you add it, the next step asks you to select that tile so the Inspector opens, then to move the parameter. Two effects of the same type stay distinct. The guide follows the one you added or the only one, and it does not highlight the other.',
      'The panel can sit docked, floating, or minimized. On a narrow screen it becomes a bottom sheet so the waveform, the chain, and the transport stay usable. Minimize pauses the guidance and keeps the step. Playback and editing continue. Exit leaves the guide and remembers the task. Opening Guided Tasks again resumes it. Restart clears the guide only. It does not reload the sample, reset gain, or remove effects. Back shows the previous instruction and does not undo an edit.',
      'Speed, pitch, and reverse are asked for in Technical. FIELD asks before leaving Simple for that task. The sound stays as it is. If Focus hides the control, the guide says the control is outside Focus Mode and waits. Exit Focus and show control leaves Focus only when you choose it. Playback, the selection, effects, automation, and modulation stay as they are. If no sample is loaded, load one or generate the existing demo sample. A sample that is already loaded is not replaced.',
      'Why and Learn more open the same short explanations as Learn Audio. The first lines stay plain. A practical note and an optional technical note, including frequency, gain, Q, wet, delay time, feedback, bypass, and chain order, stay tucked away until you ask.',
    ],
  },
  {
    id: 'learn-audio',
    title: 'Learn Audio',
    body: [
      'Learn Audio is the topic library. Open it from Guided Tasks. You can read it with no task running. The topics are waveform, amplitude, gain, decibels, clipping, selection, trim, fade, frequency, EQ, Q, reverb, wet and dry, delay, the effect chain, bypass, pitch, speed, reverse, and export.',
      'Waveform height is amplitude, not a full measure of loudness. Gain changes level. EQ changes frequency balance and does not remove all noise. Reverb adds reflected sound. Delay repeats the sound later. Speed, pitch, and reverse are different moves.',
    ],
  },
  {
    id: 'explain-this',
    title: 'Explain this',
    body: [
      'Explain this is a short note about the control you are using. It stays inside FIELD. Open it with F1 on the focused control. Settings can also show an info mark, ⓘ, beside an inspector heading. That mark stays hidden until Show info marks is on. Focusing or clicking a knob does not place another mark.',
      'Basic is plain language: what the control changes, what you may hear, and when it helps. Technical is the engineering note: units, range, and how the process behaves. The choice is remembered in this browser under the help level. It is not tied to Simple or Technical mode.',
      'F1 explains the focused control. Escape closes the note. Focus returns to the control only if it had moved into the note. Opening the note does not move focus by itself. Tab from the control enters the note. A screen reader hears the name and the short explanation. The longer technical text waits until you open details.',
      'More in the manual opens the matching section of this manual when one exists. English and Polish carry the same meaning. The note uses the live shortcut registry and the parameter ranges already in FIELD. Help does not stop playback, reset a parameter, or change an effect.',
    ],
  },
  {
    id: 'technical-interface',
    title: 'Technical interface',
    body: [
      'Technical has two presentations. Workspace is the default. Classic is the earlier layout. Workspace reorganizes the same Technical controls: a chain, one active workspace (Wave, EQ, FFT, Auto, or Hearing), contextual controls, and transport. It uses the same audio engine and the same features. The view background control sits on the picture bar. With the inspector hidden, Context is immediately before Guide me.',
      'Focus Mode is that same workspace without the surrounding chrome. The focus icon sits in the top-right corner of the picture in Wave, EQ, FFT, Auto, and Hearing, in the same place in Focus. On EQ and FFT, ••• sits immediately to its left. Wave keeps that ••• in the same corner outside Focus, and moves edit commands into the focus bar. The same icon leaves Focus. A view menu ends with •••: on Wave that is after Trim. Focus keeps a small transport — play, stop, and loop as bare icons, plus the time — in the top bar, in the same place for every view. The icons have no button fill and no rounded corners. Exit returns the chrome without changing the sound, the selection, or the playhead. FFT Focus shows the spectrum. Analyzer settings open from ••• at the end of the FFT bar.',
      'Workspace opens on a refresh. A Classic choice saved while Classic was the default is left behind. Settings → Technical interface switches between them immediately, and a Classic choice made from here is saved in this browser. The header shows Workspace once, beside SHED. Classic stays in Settings. It does not add another mode beside Simple, Technical, and Sensory.',
      'Workspace views change the picture only. Wave, EQ, FFT, Auto, and Hearing share one picture frame, so switching them does not move the top edge. Wave, FFT, Auto, and Hearing leave the inspector on the last selected effect. EQ shows the equalizer inspector while that picture is open, when an equalizer is in the chain. Leaving EQ, including for Wave, shows the inspector that was open before that picture. Choosing another effect while EQ is open keeps that effect. FFT keeps Before, After, Both, and 2D / 3D on the picture bar, with ••• at the end of that bar for the analyzer settings, in the same menu style as Wave. Color there is Off, Level, or Frequency, and it paints the 2D bars as well as the 3D ridges. The EQ ••• menu and the FFT ••• menu use the same display rows: grid, layer, scale, range, bars, line, legend, and guides. Each view keeps its own values. EQ Color tints those columns by region. FFT Color is Off, Level, or Frequency. Freq nodes and the EQ channel stay on the EQ menu. Changing one view does not change the other. Hearing keeps that same effect. The loudness words sit beside the output meter on the right and do not narrow the picture.',
      'EQ in Workspace opens in the inspector. Each filter is one full-width row: a type selector and the knobs that filter uses. Add band creates the next filter. The graph uses the full height above the transport. An icon in the inspector opens vertical strips under the graph; drag the bar between them to change that panel’s height. An icon at the corner of the strip panel returns to the inspector. FIELD remembers that choice only for EQ. Adding or selecting another effect shows that effect’s inspector.',
    ],
  },
  {
    id: 'load',
    title: 'Loading audio',
    body: [
      'Load sample sits in the header, immediately to the right of the loaded name. The name keeps a fixed width, so the button stays in the same place when the name changes. It opens a file picker. You can also drop a file onto the editor.',
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
      'Pause holds the sound already playing, the one on the EQ. Play and Loop continue from that sound. A slice that was only queued ahead, including the next loop pass, is not the one that resumes.',
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
      'Sel start and Sel end move the playhead to the selection edges. Copy, cut, paste, delete, mute, trim, and insert silence use the current selection. Trim is on the Wave bar, beside fade out.',
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
    body: [
      'Loop repeats the current selection. Fade in and fade out are heard on every pass, including the restart, so the join is the quiet end of the fade meeting the quiet start. Turn it off to play through the rest of the sample. In Focus the loop icon is gray while it is off and the same colour as the neighbouring transport icons while it is on. A mouse click does not leave a focus box around it.',
    ],
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
      'Focus lists the filters on the left of the graph, with the type beside the frequency. The knobs sit on the center of the screen and float over the grid. The plot stops under those knobs, so a bar at the top of the scale ends before them. Range, in the graph menu, is 60, 90, or 120 dB. It is how far down the spectrum bars reach. It does not scale the EQ curve. The focus icon is the top-right corner of every view. On Wave, EQ, and FFT, ••• sits in that same row, immediately to its left. EQ and FFT keep it there in Focus. Hold sits on that same row, to the left of •••. The same icon leaves Focus. The filter type menu is in the band header, next to the band name. The pointer shows frequency first, then the note, for example 440 Hz · A4. The focus control on the EQ graph opens EQ Focus. The graph menu sets grid density 6, 12, or 24, the axis scale Lin, Log, or Mel, the spectrum layer Before, After, or Both, and frequency color on or off. Hover a setting name to read what it does. Freq nodes colors each EQ handle, the filter list, and the band name by the frequency the band sits on. EQ color and FFT color are separate. Changing Off, Level, or Frequency in FFT does not recolor the EQ handles, the filter list, or the band name. Regions tints the spectrum columns. Legend draws that color key at the lower left of the EQ graph. Guides, when on, add a landmark under the pointer: kick boom near 80–100 Hz, voice around 1 kHz, snare crack around 2–5 kHz, air above 12 kHz. Those notes follow Sound On Sound (Senior and White, Using EQ, August 2001) and the iZotope EQ cheat sheet. They are places to listen, not rules. Frequency guide lines use the usual round frequencies on a logarithmic axis unless Lin is selected, and the numbers sit under the axis line.',
      'The horizontal lines on the EQ graph are filter gain, every 6 dB from −24 to +24. They use the same light grid as the spectrum. In EQ Focus the lines fade out toward the knobs, so the graph does not end on a hard edge. A bell at +24 dB peaks on the +24 line. The stroke stays inside the chart. When cascaded filters go past +24 dB, the scale opens so the curve keeps its shape instead of being shaved flat on that line. A shelf that really is flat still draws flat. Each band’s own gain still stops at +24 dB. It is not a sign that the audio is distorting. Spectrum bars use the separate Range scale, with 0 dB at the top of their scale.',
      'Hold, on the EQ graph bar and on the FFT bar, loops the short fragment that has already reached the playhead. The button sits outside •••. Length, in that menu, is 0.05 s, 0.1 s, 0.25 s, 0.5 s, or 1 s. Changing it while Hold is on restarts that loop. The FFT and EQ graph keeps drawing that loop, including each time it repeats. It does not loop the slice that has not appeared yet. Press Hold again to play on from that place. Stop clears the hold. Click anywhere outside the ••• menu to close it.',
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
      'WAVE shows the sample. FFT shows the spectrum of the playing audio. EQ opens the equalizer workspace. AUTO opens automation. These are views of the same project. Choosing Wave, FFT, or AUTO does not replace the inspector, except that leaving the EQ picture restores the inspector that was open before it. 3D Spectral History is a view inside FFT, not another workspace.',
    ],
  },
  {
    id: 'fft-3d',
    title: 'FFT → 3D Spectral History',
    body: [
      'Open 3D Spectral History from the 3D label in FFT. 2D returns to the ordinary analyzer. The 2D / 3D switch stays on the FFT bar. In FFT Focus that switch is inside the settings menu, so the spectrum fills the screen. Frequency runs left to right, level rises in dB, and time recedes backward. The front ridge is now. Older ridges fade as they move back. They stay until they leave the history window.',
      'History is 1, 2, 5, or 10 seconds of real playback. Five seconds is the default. The picture keeps the same depth; a longer history means each step back is more time, not a bigger scene. The view uses the same FFT as the 2D analyzer: FFT size, smoothing, range, and frequency scale. It measures the audio. It does not draw the EQ response. Source is the tap before the effect chain. Output, the default in 3D, is the tap after the chain. Both keeps After as the history. Before is a thin solid line on the current ridge only, so the older ridges stay clear. The graph does not print Source or Output under the menu.',
      'Front, Angled, and Top are the views. Angled is the default. Front is for reading the current spectrum. Top lays frequency across and time away from now, with level in the strength of the line. Drag sideways turns the graph all the way around the vertical axis. The floor stays at the bottom. Drag up and down tilts it without flipping it. Pinch or the wheel zooms, inside a limited range. Reset View returns to Angled. Freeze holds the ridges while audio continues. Pause and Stop also leave the picture where it is, because history follows playback time. Clear History, in the ••• menu, drops only the stored ridges.',
      'Ridges glide backward with playback time. A new slice eases out of now instead of stepping the whole picture. Point at a ridge to read frequency, note, level, and age, for example 440 Hz · A4, −18.2 dB, −1.8 s. Time labels sit inside the graph, on the left depth edge: NOW at the front, then −1, −2, and the far edge of the history. Lines are the default. Surface fills under each ridge with a light wash and a dark edge, so one slice stays separate from the next. With Before and After both on, After keeps the filled color and Before is a thin solid line on the current ridge. The 2D analyzer uses that same pair: filled After bars, and a thin solid Before line on top. Color, in the analyzer settings, is Off, Level, or Frequency. It paints the 2D bars and the 3D ridges. Level runs from the theme’s violet curve through cyan to gold. Quiet stays at the cool end and loud reaches the warm end, on the 2D bars, the 2D line, and the 3D ridges. Frequency uses the same band hues as the 2D analyzer. That FFT color does not change EQ node colors, the filter list, or the EQ graph. Density and peak trails are in that menu too. A small screen draws fewer ridges. The history buffer has a fixed size and starts empty after a reload. Reduced motion skips camera glide; the spectrum itself still updates, because it is the measurement.',
    ],
  },
  {
    id: 'focus',
    title: 'Focus mode',
    body: [
      'Focus mode fills the editor with one task: wave, FFT, EQ, or automation. Exit returns to the normal layout. In WAVE Focus, fade handles are inset below the toolbar. In FFT Focus the spectrum is the picture. Layer, 2D / 3D, history, and display open from the settings control on the focus bar.',
      'EQ Focus knobs are a larger, quieter dial with a dark translucent face and thin marks. The indicator follows the effective value, including LFO motion. The small mark under a knob follows the LFO wave shape. Knobs and their readouts stay neutral. Only the band name and number use the band color. With frequency color on, that name takes the color of the frequency. The filter type menu sits in the band header. EQ Focus does not show the Hearing Access readout.',
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
    body: [
      'Export writes a WAV of the processed sample or the current selection, using the chain and automation that are in the project. The export dialog includes Export check, a short reading of the settings that will be written: format, sample rate, bit depth, channels, and range. Simple mode shows format, range, and the warnings that matter. Technical and Sensory keep the same checks and the advanced settings.',
      'An error blocks the export. A warning still lets you export. Info is context. Words name the level, so color is not the only signal. No audio loaded is an error: load a file, then return to export. A range with no length, a reversed start and end, or a range outside the audio is an error. The check does not move your selection to make the range fit.',
      'Only WAV is offered. Sample rate and bit depth follow the choices this export can encode. 16-bit and 24-bit are integer PCM. 16-bit applies TPDF dither. 24-bit does not. 32-bit float stores floating-point samples, not integer PCM. Internal processing stays floating point either way. The channel row shows mono, stereo, left, right, or a left/right swap. It does not change the channel count for you.',
      'Active effects in the chain are included. Bypassed effects are not. Keep audio tail is on by default. It writes the decay the exporter already renders after the sample: delay, reverb, and a short ring from other active effects. Turning it off ends the file with the audio and does not keep that tail. Export check does not switch it for you.',
      'Export check does not measure the rendered file. It does not say the file is free of clipping, and it does not treat the live meter as the export. A peak is shown only when it was measured for this source, these effects, this automation, this range, and these export settings. A newer edit drops that reading. Export check does not normalize, limit, change gain, EQ, fades, automation, or channels.',
      'Export preview plays a short piece of the same offline render the file would use, from the playhead when it sits inside the export range, or from the start of that range when it does not. It does not move the project, the playhead, or the effect settings. Stop ends that preview only. Closing the dialog ends it too. If the project is already playing, preview waits until you stop that playback. The sound is processed audio before the WAV file: 16-bit dither and 24-bit quantization are not in the preview. Playback speed and pitch are not part of this render. A window that starts after the beginning of the export does not include delay or reverb that would have arrived from earlier audio, and a short window’s tail is the decay after that window. Peak normalize is applied only when the preview is the whole export. Listening still passes through the monitor output.',
    ],
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
      'When Keyboard-First, Drag-Free Editing, screen reader optimizations, and Accessible Waveform Navigation are off, Space always plays or pauses, including while a button, switch, or slider has focus. A text field still takes the space character. An open dialog keeps Space for its own controls. While Hold is on, Space clears Hold and leaves playback running from that place. When one of those accessibility options is on, Space plays or pauses only when focus is not on a button, switch, slider, menu, or text field, and Enter or Space activates the focused button. Escape closes menus and dialogs and returns focus to the control that opened them.',
      'Ctrl+Z or Cmd+Z undoes. Shift+Ctrl+Z or Shift+Cmd+Z redoes.',
      'Tab moves between controls. Arrow keys change a focused knob or slider. Shift+Arrow is a finer step. Home and End jump to the ends. Page Up and Page Down take a larger step. Delete or Backspace resets the focused parameter.',
      'Transport shortcuts can be turned off in Settings. F1 explains the focused control. That shortcut stays available when transport shortcuts are off.',
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
    title: 'FIELD ACCESS',
    body: [
      'FIELD ACCESS is Settings → Accessibility. The same preferences apply in Simple, Technical, and Sensory, and they stay in place through Focus mode, Guided Tasks, and theme changes. Changing them does not restart playback and does not change the audio engine.',
      'Reduced Motion reduces decorative animation, panel entrances, parallax, and glow. The playhead, waveform, meters, EQ curve, FFT, selection, and automation stay visible, with less extra motion. Sensory scenes drop decorative pulse. Spectral history skips camera glide and still draws the measurement. If the device asks for reduced motion, FIELD follows that even when the switch is off. The switch does not override the device. The sound does not change. Sensory Comfort is a separate preference on the same screen. See Sensory Comfort.',
      'Enhanced Focus Visibility draws a stronger keyboard focus ring from the theme’s text and background colors. It shows for keyboard focus. An ordinary click does not turn it on. The usual focus style remains when the switch is off.',
      'Larger Controls enlarges hit areas and minimum heights for buttons, knobs, sliders, transport, EQ nodes, waveform handles, and automation nodes. Dense Technical controls grow their invisible target more than their drawing. Parameter values, ranges, and the audio stay the same.',
      'High Visibility Controls is in Settings → Accessibility → Visual comfort. It is off until you turn it on. It makes important controls, selections, and editing handles easier to see. The sound does not change.',
      'Attention Focus is in Settings → Accessibility → Cognitive & attention. It is off until you turn it on. It highlights the controls that belong to the edit you are doing, and it can quiet decorative contrast elsewhere. It does not hide controls, and it does not change the sound. See Attention Focus.',
      'Predictable Layout is in the same Cognitive & attention section. It is off until you turn it on. It keeps tools and panels in consistent places. See Predictable Layout.',
      'Interface Size and Text Size are in the same visual section. They are separate from each other and from Larger Controls. See Interface & text scaling.',
      'These choices last while this page is open. A reload starts with the accessibility switches off. They are not kept in the browser yet. Restore accessibility defaults, inside FIELD ACCESS, resets only these preferences. It does not delete audio, effects, automation, or the project. Reset application, in the top bar, also returns these preferences, including Interface Size, Text Size, High Visibility, Attention Focus, and Sensory Comfort, to their defaults.',
      'Keyboard: Tab and Shift+Tab move between controls. Enter activates buttons. Space activates checkboxes, radios, and switches. Arrow keys change a focused knob or slider. On the waveform, arrow keys move the playhead. On an EQ graph node, arrow keys nudge frequency and gain, and Shift+arrow nudges Q. Home and End jump to the ends of a knob. Delete or Backspace resets the focused parameter.',
      'Screen reader support is partial. Buttons, knobs, sliders, switches, tabs, dialogs, and Guided Tasks expose names. Knobs and sliders expose values. This manual does not claim full WCAG 2.2 AA conformance. Automated checks do not replace testing with a screen reader.',
      'Known limits: pointer dragging still edits the waveform, fades, EQ nodes, and automation points. The same edits are available from the keyboard through buttons, sliders, and the drag-free editors. Screen reader behavior was not manually verified for this release. On a very narrow screen the top bar scrolls sideways so Settings stays reachable.',
    ],
  },
  {
    id: 'scaling',
    title: 'Interface & text scaling',
    body: [
      'Interface Size and Text Size are in Settings → Accessibility, under Visual comfort. They are separate. You can enlarge the controls and leave the type alone, or enlarge the type and leave the controls at their usual size. You can also raise both. Interface Size runs from 100% to 150%. Text Size runs from 100% to 200%. The buttons under each slider jump to 100%, 110%, 125%, and 150% for the interface, and to 100%, 125%, 150%, 175%, and 200% for text. The slider also moves in steps of 5%.',
      'Interface Size changes buttons, tabs, padding, and the space around controls. It does not zoom the whole page. The waveform, the EQ graph, and the FFT keep their own measurements. A click on the wave still lands on the same moment. An EQ node still edits the frequency and gain under the pointer. An automation point stays on its time and value.',
      'Text Size changes labels, numbers, menus, help, Guided Tasks, and status text. At the larger steps, columns wrap. The Inspector, Settings, and the tutorial panel scroll so the words stay reachable. Essential labels wrap instead of being cut off with no other way to read them.',
      'Larger Controls is a different switch. It increases the area you can press, including EQ nodes, waveform handles, and automation points. It does not change what those gestures edit. Interface Size and Larger Controls are not multiplied into one huge target.',
      'Browser zoom still works on top of these settings. Pinch zoom on a phone stays available. FIELD does not turn zoom off. On a narrow screen, a larger size stacks controls and lets sections scroll. Important actions stay clear of the notch and the home indicator.',
      'Restore accessibility defaults sets Interface Size and Text Size back to 100%, together with the other accessibility switches. It does not delete the sample or the project. Reset application does the same for these preferences, including both sizes, and also clears the session. Changing either size does not restart playback and does not reload the audio.',
    ],
  },
  {
    id: 'high-visibility',
    title: 'High Visibility Controls',
    body: [
      'High Visibility Controls is in Settings → Accessibility → Visual comfort. It is off until you turn it on. The same switch works in Simple, Technical, and Sensory, and it stays on through Focus mode, Guided Tasks, and theme changes.',
      'Turn it on when controls, selections, or editing handles are hard to see. FIELD draws clearer edges, shapes, and short labels. It does not rely on color by itself. A bypassed effect is dashed and labeled. A selected EQ band is a rounded square with its band number. An unselected band stays a circle. Keyboard focus keeps the focus ring you already have, including Enhanced Focus Visibility.',
      'On the waveform, the playhead is a slightly thicker line with a small triangle at the top. The selection keeps square marks at its start and end, with a light fill between them. Trim edges use a bracket. Fade in and fade out keep their own marks. A loop, where the view has one, uses a diamond and a dashed edge so it does not look like the playhead.',
      'EQ nodes show a small band number. The response curve stays readable, and the 0 dB line is marked. Automation points use a circle when they are idle and a diamond when one is selected. An inactive automation lane is dashed. In the effect chain, Active and Bypassed are written on the effect. Move earlier and Move later stay available when those buttons are already shown.',
      'Meters keep their scale. The clip light becomes a square and the Clip label stays, and only when the meter has already detected clipping. Hearing Access keeps its symbols (attack, clip, silence, loud, tone, click) and makes the words easier to read. Sensory keeps its picture. Editable controls gain a quiet edge so you can find them.',
      'Guided Tasks draws a dashed outline around the step it is showing. That outline is not the keyboard focus ring, and it does not flash. Reduced Motion stays in charge of animation. High Visibility does not add pulsing handles.',
      'The choice lasts while this page is open. A reload starts with it off. Restore accessibility defaults turns High Visibility off and leaves the audio project alone. Reset application returns High Visibility to off together with the other accessibility preferences, and it also clears the session.',
      'It works with the themes you already have, including Studio Dark, Soft Slate, Warm Paper, and Dusk. Edges use the theme’s text color so they stay visible on dark and light backgrounds. It also works with Interface Size, Text Size, and Larger Controls. Handles grow a little on screen. Their click area does not stack on top of the neighbor.',
    ],
  },
  {
    id: 'attention-focus',
    title: 'Attention Focus',
    body: [
      'Attention Focus is in Settings → Accessibility → Cognitive & attention. It is off until you turn it on. Turn it on when you want FIELD to point at the controls that belong to the edit you are doing. Other controls stay where they are. You can still click them, and you can still reach them with Tab.',
      'Focus Strength is Subtle or Clear. Subtle is a small difference. Clear is easier to see. Neither one hides text, and neither one flashes.',
      'Highlight Related Controls draws a quiet mark on the waveform, the selection, a fade, a trim, the selected EQ band, the selected effect, an automation point, or the Guided Tasks step you are on. Reduce Unrelated Emphasis quiets decorative borders and glow around areas that are not part of that edit. Essential words stay readable. Warnings, clip lights, and the Play control stay easy to see.',
      'Attention Focus is not Focus Mode. Focus Mode changes which workspace is on screen. Attention Focus only changes emphasis. You can use both. FIELD does not turn Focus Mode on for you.',
      'When a Guided Tasks step is open, that step is the mark FIELD uses. Show me where still works the same way. Finishing a step still depends on the edit you actually make, not on the highlight.',
      'The choice lasts while this page is open. A reload starts with it off. Restore accessibility defaults turns Attention Focus off and leaves the audio project alone. Changing it does not restart playback.',
    ],
  },
  {
    id: 'predictable-layout',
    title: 'Predictable Layout',
    body: [
      'Predictable Layout is in Settings → Accessibility → Cognitive & attention. It is off until you turn it on. It is an accessibility preference, not another editing mode. Simple, Technical, and Sensory stay as they are. Turning it on does not change the sound, the audio engine, automation, LFO processing, or export.',
      'Turn it on when you want tools and panels to stay in consistent places while you work. Three choices sit under it. Stable Panels keeps the inspector, the effect chain, and the transport in steady boxes. When a panel has more to show, that content scrolls inside the panel. Remember Workspace Layout keeps the workspace you last used, and whether panels were open or collapsed, while this page is open. A reload starts with that switch off. Reduce Layout Movement shortens panel animation. The screen still adapts when the window changes size. Browser zoom stays on.',
      'A change you make on purpose still happens. Focus Mode can still open a quieter workspace, and leaving Focus Mode brings the panels back. Guided Tasks still open in their own panel. Show me where can still scroll to a control that is off screen. Drag-free editors, the accessible waveform tools, and Assisted Controls stay where they already open.',
      'Restore workspace layout, on the same screen, puts the panels back in their usual places. It does not turn Predictable Layout off, and it does not change the sample. Restore accessibility defaults turns the switch off with the other accessibility preferences, and leaves the sample alone. Reset all, in Settings, clears the audio project and leaves these preferences in place. Reset application clears the session and also returns the accessibility preferences, including Predictable Layout, to their defaults.',
      'On a narrow screen the same regions stay in a steady order: navigation, the waveform, then the editing controls. The inspector stays a side panel on a wide screen and a lower panel on a phone. It does not switch between those presentations on its own. Larger Interface Size and Text Size still reflow. Text that does not fit scrolls inside the panel instead of being clipped.',
      'Attention Focus can still highlight the control you are editing. It does not move the panel. High Visibility keeps its outlines without pushing neighboring controls when Predictable Layout is on. Sensory Comfort and Reduced Motion still calm decorative motion. Keyboard focus stays on the control you are using while you edit a value.',
    ],
  },
  {
    id: 'sensory-comfort',
    title: 'Sensory Comfort',
    body: [
      'Sensory Comfort is in Settings → Accessibility. It is off until you turn it on. It is an accessibility preference, not another editing mode. Simple, Technical, and Sensory stay as they are. Turning it on does not change the sound, the audio engine, automation, LFO processing, or export.',
      'The switch reduces unnecessary motion, visual intensity, and distractions. While it is on, the choices under it apply: Visual Activity, Reduce Decorative Motion, Calm Meters, Calm Spectrum, Reduce Visual Effects, and Quiet Notifications. Turning Sensory Comfort off returns the usual drawing. Each choice under it can be switched on its own, and it stays while this page is open. A reload starts with them off. Reduced Motion does not require Sensory Comfort. If Reduced Motion or the device asks for less motion, decorative animation stays off either way.',
      'Visual Activity has two settings. Standard keeps the usual drawing rate. Low draws nonessential pictures less often. That includes the FFT picture, meters’ motion on screen, and decorative Sensory drawing. It does not change the analysis size, the hop, or how often the audio itself is processed. The playhead stays on the editor’s own clock.',
      'Reduce Decorative Motion stops ornamental animation: Sensory pulse and grain drift, the LFO activity dot’s pulse, waterfall camera glide, and large entrance fades. The playhead, selection, trim, fades, loop edges, EQ curve, automation points, and keyboard focus stay. Calm Meters keep the same peak reading and the same clip point. The word Clip stays visible and does not rely on a flashing light. Calm Spectrum calms the 2D FFT and the 3D waterfall. Frequency and level mapping stay. The existing waterfall pause still pauses the picture only. Playback continues.',
      'Reduce Visual Effects lowers glow, blur, pulsing shadows, and decorative particles. Focus rings and control contrast stay. Quiet Notifications hides informational notes, such as a successful tempo guess and a loop badge. It does not hide export errors, file errors, clipping, unsaved-work warnings, or failed actions. Screen reader announcements for those important events stay. Guided Tasks use a steady outline instead of a pulse, and Show me where scrolls only when the target is off screen. Focus Mode does not play an entrance animation while decorative motion is reduced, and it does not restart playback.',
      'Sensory Comfort works with Interface Size, Text Size, Larger Controls, and High Visibility Controls. It does not shrink focus, selection, or the stronger control edges. These choices last while this page is open. A reload starts with them off. Restore accessibility defaults resets them with the other FIELD ACCESS preferences. Reset application does the same. Clearing the audio session inside the engine does not keep a second copy of these preferences.',
    ],
  },
  {
    id: 'drag-free',
    title: 'Drag-free editing',
    body: [
      'Drag-free editing is in Settings → Accessibility → Interaction. It is off until you turn it on. Turning it on shows buttons and exact values beside the controls you can already drag. Dragging still works.',
      'On the waveform, Set start and Set end use the playhead. Edit times takes a clock such as 01:23.450. Clear removes the highlight and leaves the audio. Go to time, and the 100 millisecond steps, move the playhead. Preview plays the selection. Trim asks first, then keeps the selection and removes the audio outside it. Undo can bring that audio back. Changing a time does not trim by itself.',
      'Fade in and fade out take a duration in milliseconds, or steps of 50 milliseconds. The fade cannot be longer than the selection. The curve stays the one already chosen.',
      'EQ bands lists every band slot by its own identity, including a slot that is still off. Choose a filter type to turn that slot on. Frequency, gain, Q, filter type, and bypass then edit that same band. A deleted band is not replaced by the next one.',
      'Automation lists the points on the parameter you already selected. You can type a time, type the parameter’s own value, delete a point, or add a point at the playhead. The value you type is the same amount the knob shows, not a hidden 0–1 number.',
      'In the effect chain, each movable effect has move buttons. Input and Output stay fixed. Moving an effect keeps its settings. The sound can change because the order changed.',
      'When a track is looping, Set loop start, Set loop end, and Edit loop times use that loop. Simple and Sensory do not add a separate loop if the view does not have one.',
      'The same editors are available in Simple, Technical, and Sensory where that edit already exists, including Focus mode. Tab, Shift+Tab, Enter, Space, and Escape work on the new controls. Times are minutes, seconds, and milliseconds. FIELD still rounds sample edits the way it did before. The clock does not mean every millisecond is its own sample.',
    ],
  },
  {
    id: 'keyboard-first',
    title: 'Keyboard-First',
    body: [
      'Keyboard-First is in Settings → Accessibility → Interaction. It is off until you turn it on. Turning it on shows the drag-free editors and the effect move buttons, and it does not change the audio engine.',
      'Tab, Shift+Tab, Enter, Space, arrows, Home, End, and Escape work whether Keyboard-First is on or off. The preference does not turn keyboard access off.',
      'Workspace navigation is in the Settings menu, and Ctrl+Shift+K or Cmd+Shift+K opens it. Ctrl+K and Cmd+K stay with the browser. The list shows only destinations that exist in the current mode. Choosing one moves focus there. Escape closes the list and restores focus. Playback does not restart.',
      'On the waveform, Left and Right move the playhead by 10 milliseconds. Shift makes that 100 milliseconds. Page Up and Page Down move one second. Home and End go to the start and end of the audio. Set selection start and Set selection end, in More edits, use the playhead. Trim and fades stay on their existing buttons and inspector sliders. Nothing trims just because focus moved.',
      'The effect chain is a list. Tab reaches it. Arrow keys move between effects. Enter selects the effect and opens it in the Inspector. Alt+Arrow moves it. The Inspector also has move and remove buttons. Input and Output stay fixed.',
      'Markers use the same shortcut list. Ctrl+Shift+E or Cmd+Shift+E adds a marker at the playhead and leaves the list closed. Ctrl+Shift+Up and Ctrl+Shift+Down go to the previous and next marker. Ctrl+Shift+U opens the marker list. These chords do nothing while you are typing in a text field.',
      'EQ bands, automation points, and sensory parameters use the same controls as the pointer: sliders, numeric fields, and the drag-free editors when Drag-Free Editing or Keyboard-First is on. Guided Tasks advance from those real edits. Show me where moves focus only when you activate it.',
      'Keyboard shortcuts, in the Settings menu, lists the live registry grouped as Navigation, Transport, Editing, Effects, Automation, and Guided Tasks. Focus mode keeps the same keys. Closing it restores focus and does not restart playback.',
    ],
  },
  {
    id: 'accessible-waveform',
    title: 'Accessible waveform',
    body: [
      'Accessible Waveform Navigation is in Settings → Accessibility → Interaction. It is off until you turn it on. Turning it on adds Open waveform navigation beside the waveform you already have. The tools open in a panel you can scroll and close. They do not draw a second waveform, and they do not change the audio engine.',
      'The waveform region keeps its name, duration, channel count, sample rate, playhead, and selection whether this preference is on or off. Arrow keys, Home, and End on the waveform still move the playhead. Screen readers are not told the time on every audio frame.',
      'Open waveform navigation, then use Go to start, Go to end, Step backward, and Step forward. The navigation step is a menu: 10 seconds, 1 second, 100 milliseconds, 10 milliseconds, or 1 sample. One sample follows the recording’s own sample rate. The other steps are in milliseconds and do not claim sample accuracy.',
      'Go to time accepts the same clock as the rest of the editor, such as 00:12.350. The time has to be zero or greater and no later than the end of the recording. Read playhead position speaks the current time when you ask. It does not talk during playback.',
      'Set start at playhead and Set end at playhead write the real selection. Edit selection times types both edges. Clear selection removes a partial highlight. The start has to be earlier than the end, and the range has to be at least 50 milliseconds. An invalid time is rejected and explained. Preview selection plays the current selection. It does not start when the controls receive focus.',
      'Trim, Fade in, Fade out, Normalize, Loop, and Export selection use the same actions as the rest of FIELD, in the modes that already have them. Sensory keeps navigation and selection. It does not add a trim that Sensory did not have.',
      'Landmarks are times you can jump to. Recording start, recording end, and selection or loop edges are exact. Detected transient, possible silence, and level change are approximate. A transient is a sudden rise, not a drum hit or a beat. Possible silence means the level stayed under about −48 dBFS for a short stretch. It is not absolute silence. Previous landmark and Next landmark move the real playhead and do not edit the audio.',
      'Inspect signal, in Technical, reads peak and RMS in a 50 millisecond window around the playhead. Stereo recordings show the left and right channels separately. These are digital levels in dBFS. They are not a loudness measurement.',
      'Tab, Shift+Tab, Enter, Space, and Escape operate the tools. Escape closes the panel and returns focus to the button that opened it. Choosing a landmark does not move focus away from the list. The same tools work in Focus mode and do not restart playback by themselves.',
      'Automatic detection can miss hits, mark noise, or place a time a little early or late. Very quiet background is not guaranteed silence. Guided Tasks still complete from the real selection, trim, and fade, including edits made here without dragging.',
    ],
  },
  {
    id: 'audio-markers',
    title: 'Audio landmarks and markers',
    body: [
      'A marker is a name you give to one moment in the loaded recording. It is a point on the timeline, not a selection. Adding, renaming, or deleting a marker does not change the audio, the effects, the play speed, or the pitch.',
      'Markers stays closed until you open it. In Technical the control is on the waveform toolbar: a diamond, the word Markers, and the number of saved markers. Simple and Sensory keep that same compact control in the header. The list opens beside the control. On a narrow screen it becomes a short sheet above the transport. Opening it does not resize the waveform, the transport, or the inspector. Plus adds a marker at the playhead and opens the name, time, and description in that same list. The clock is the same one as the rest of the editor, such as 00:12.350. The first names are Marker 1, Marker 2, and so on.',
      'Go to moves the existing playhead to that marker and leaves the selection alone. Previous marker and Next marker do the same. They do not wrap from the last marker back to the first. A screen reader hears the marker name and time when you make that jump. Playback itself does not announce markers.',
      'Edit changes the name, the description, the time, or the color. Double-click the diamond or its name on the waveform, or double-click the name in the list, to open that editor. Color is one swatch from the track palette. A time before zero, after the end of the recording, or in the wrong form is rejected and explained. The marker stays where it was. Delete removes that marker. Undo and Redo use the same project history as other edits.',
      'Markers are saved in the project preset with their ids, names, descriptions, times, and colors. They belong to the file name, sample rate, and duration they were saved with. Loading that preset onto a different recording does not attach them. A preset saved before markers existed still loads. A broken marker entry is skipped.',
      'Loading a different audio file clears the current markers. It does not move them onto the new file. Trim and Use as sample also clear them, because the buffer is replaced. Cut, paste, and insert silence keep markers on the same audio and follow that edit. A marker that sat inside deleted audio is removed, not slid to a new place.',
      'Suggestions, in Technical, stay collapsed. They are the silence, transient, and level positions already found by Accessible Waveform. Each row shows the time, then the name, then Save as marker on its own line. Pointing at a row draws that place on the waveform at half opacity until the pointer leaves. Save as marker stores the one you choose. FIELD does not turn the whole list into markers by itself. Recording start, recording end, selection edges, and loop edges stay landmarks. They are not stored as your markers unless you save one.',
      'On the waveform, a marker is a dashed line with a diamond under the edit toolbar. The playhead stays a solid line. Selection edges, fade handles, and automation points keep their own shapes. Labels that would sit on top of each other are hidden. Every marker remains in the list. Grab the diamond and drag sideways to move that marker. Letting go stores one undo step. A click on the diamond still moves the playhead there. The list still edits the time exactly, so you do not have to drag. High Visibility keeps an outline on the diamond and on the selected row, and it keeps the marker line easy to see.',
      'A row moves the playhead to that marker. The marker actions menu renames it, edits the time, edits the description, or deletes it. You do not have to drag. On a phone the same list is the way to edit a time exactly.',
      'Ctrl+Shift+E or Cmd+Shift+E adds a marker at the playhead and leaves the list closed. Ctrl+Shift+Up and Ctrl+Shift+Down move to the previous and next marker. Ctrl+Shift+U opens Markers. The same keys are listed in Keyboard shortcuts. They stay quiet while a text field is focused, and they do not run during ordinary playback.',
    ],
  },
  {
    id: 'reset',
    title: 'Reset',
    body: [
      'Reset application, in the top bar, returns FIELD to a clean session without reloading the page. It stops audio, drops the loaded sample, clears effects, automation, modulation, and editing state. It also restores FIELD ACCESS preferences, including Interface Size and Text Size, to their defaults.',
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
      'The panel opens from the Hearing Access button, an ear icon immediately to the left of Export. Enlarge grows it; Restore returns the default size. Each corner has a resize handle, and the size and position are remembered. Drag the header to detach the panel; Dock puts it back. When the panel is small, the scrolling text keeps a margin beside the scrollbar. The tag list is one row, in the panel and in Hearing Access focus. Each tag has a thin border and slightly rounded corners. There is no scrollbar. Sound is the live reading and Original → heard. Events lists measured moments — click a row to move the playhead; an empty list means this scope has no qualifying attack, gap, or clip. Space is stereo balance, width, correlation, and mid/side, plus a head picture that follows the playhead. Dynamics is level, crest, and full-scale clipping. Compare is a table per active effect. Haptics can send a test pulse when the browser exposes vibration. Longer explanations sit behind the information button.',
      'Choose a profile. Assisted listening adds measurements beside ordinary monitoring. Visual first prioritizes the sound map, fingerprint, events, space, dynamics, and numbers when auditory monitoring is not reliable. Visual + haptic adds optional pulses on devices that actually support vibration.',
      'The sound map shows time, frequency region, and energy. Regions are SUB, BASS, LOW MID, MID, HIGH MID, HIGH, and AIR. Each region has a label, a vertical position, a texture, and a color taken from the active theme. Color is never the only channel, so the map stays readable in Black & White, Noire, and Eyes Friendly themes. Attacks are thin vertical lines at the time they happen, drawn through the band rows. The rows sit edge to edge, so there is no square grid to line up with. Click a line to mark the start of that attack on the waveform and move the playhead. The line icon under the wave legend shows or hides that mark. The view does not zoom. It does not edit the audio.',
      'Original → heard is the only band picture in Sound. It puts the sample or selection before effects and what you hear after pitch and EQ on one bar per band. Levels run from −96 dB to 0 dB, so a quieter high band stays visible beside a louder bass band. Peak, RMS, and crest stay in Dynamics. The dimmer bar is the original and a tick marks its end. The brighter bar is what you hear after pitch and the current EQ curve. A bright extension past the tick is a boost. A dim tail past the brighter bar is a cut. Its color follows the theme and the band name stays beside it.',
      'Live descriptions such as BASS-HEAVY, HIGH-BAND ENERGY, AIR ENERGY, LEFT-HEAVY, RIGHT-HEAVY, LOW CORRELATION, CLIPPING, NEAR FULL SCALE, DC OFFSET, or WIDE STEREO come from documented thresholds, with hysteresis so labels do not flicker. WIDE STEREO and NARROW STEREO never appear together: when the measurement crosses to the other side, the old label is replaced at once. The same is true of LOUD and QUIET. Each label has an explanation that includes the measured value. Every tag has the same height in the panel and in Hearing Access focus. The list is one row tall. Each tag has a thin border and slightly rounded corners. There is no scrollbar. Note tags and character tags follow the playhead. A partial or a character such as TONAL, NOISE-LIKE, PERCUSSIVE, SUSTAINED, BRIGHT, DULL, HARMONIC, or INHARMONIC is listed while that moment is under the playhead, not for the whole sample at once. Click a note tag to hear a short synthesized sine of that frequency. The preview stays quiet, high frequencies are much quieter still, and a limiter caps it. It is not the sample itself and it does not pass through the instrument output. A Notes control above the tags sets how many partials of the current moment are listed. A strict setting keeps the loudest one or two. A sensitive setting includes quieter partials, up to about six, and the same note is listed once. Silence does not invent a note. FIELD does not call a sound good, bad, warm, or professional.',
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
    id: 'shed',
    title: 'SHED',
    body: [
      'SHED is a local architectural view inside FIELD for the INTERFERENCJE project. It is a place to compose a virtual Kraków nativity scene, a szopka krakowska, from editable ink drawings. Later, each architectural element can stand for one field recording of Kraków. This version keeps the composition on this device. It does not sync between devices. It does not use an account or Google Drive, and it does not play audio of its own.',
      'The sheet is warm parchment. Every element is a pen-and-watercolor study in one grammar: thin ink, flat washes, and a little gold on the ornament. The default tower follows the taller tower of St. Mary’s Basilica: a brick shaft, a limestone base, pointed windows, a gallery, and a tall helmet with a pinnacle at each corner. The library also holds the lower St. Mary’s helmet, a Wawel tower, a defensive tower, townhouse and Cloth Hall facades, roofs, arcades, gates, attics, and ornaments.',
      'The two St. Mary’s towers are drawn by a seeded ink-and-watercolor study. Moving a tower keeps its contours, windows, and washes. Windows changes the rhythm of the openings, and the lower variant uses the lantern helmet. A saved scene that has no seed keeps its measurements and takes a stable drawing from the element. Wawel, the defensive tower, and the other categories stay on the library drawing.',
      'Open SHED from the Workspace | SHED switch in the header. Workspace returns to the editing mode you were already using. Simple, Technical, and Sensory stay as they were. Switching does not restart the audio engine, drop the loaded sample, or clear editing parameters.',
      'Add element opens a library of Kraków forms: Tower, Facade, Roof, Arcade, Gate, Attic, and Ornament. Each row shows a small drawing of that category. Choosing one adds it to the scene, selects it, and opens its controls. Existing elements stay where they are. On a narrow screen the library sits as a bottom sheet and the inspector sits under the sheet, so the drawing stays visible.',
      'Select an element by clicking, tapping, or focusing it and pressing Enter. A dashed outline and a corner mark show the selection. Where elements overlap, the front one takes the pointer. Tab still reaches the ones behind it. The panel lists only the controls for that category: size, the architectural variant, colors, position, and layer. Drag moves the element. On a touch screen the first tap selects it and the next drag moves it, so panning the parchment does not slide a building by accident. Arrow keys move it too, and Shift takes a smaller step. The position sliders do the same. Bring forward and Send backward change the drawing order. Duplicate copies the element. Delete element removes it. Reset restores that element’s initial proportions, the muted default colors, and its place.',
      'Zoom in, Zoom out, and Reset view change the camera. Pan left, right, up, and down do the same, and dragging the empty parchment pans without moving a building. Element positions stay in the scene, so zoom and pan do not rewrite them.',
      'Changes are saved in this browser under the SHED document. A composition saved by the first SHED version, with its tower, still opens. Reload the page and the elements come back. If a stored note is unreadable, FIELD restores a safe default scene and says so. A newer document this version does not understand is left untouched. The save line says Saved. That save stays on this device.',
      'Architecture and City are separate scenes. Architecture is the free parchment. City is a drawing of Kraków Old Town from OpenStreetMap, © OpenStreetMap contributors, under the Open Database License. The switch leaves the other scene where it was and does not restart the audio engine. City plots are virtual game locations, not cadastral parcels. Choose a sample author, select an available plot, and place one building from the architectural library. Removing that building frees the plot. One local city document cannot put two buildings on the same plot. Author counts stay on this device. A recording link is reserved for later. This version does not upload audio, and the selected author is not an account.',
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
      'FIELD otwiera się w Technical, w układzie Workspace. Simple to szybki edytor wykończenia sampla. Technical to pełny edytor. Sensoryczny kształtuje dźwięk odczuciem. Wszystkie trzy korzystają z tego samego silnika. Simple i Sensoryczny zostają w nagłówku. Zapisany w tej przeglądarce wybór zostaje.',
      'Zezwól na dźwięk, gdy przeglądarka zapyta. Jeśli status mówi, że audio jest zablokowane, kliknij stronę jeszcze raz, żeby AudioContext mógł wystartować.',
    ],
  },
  {
    id: 'language',
    title: 'Język',
    body: [
      'FIELD działa po angielsku albo po polsku. Przełącznik pokazuje nazwy English i Polski. Jest na ekranie wyboru trybu i w Ustawieniach. Wybór zapisuje się w tej przeglądarce. Nie ma konta. Przeglądarka bez zapisanego wyboru zostaje przy angielskim.',
      'Polski używa terminów audio: wzmocnienie to gain, poziom to level, głośność to volume, przesterowanie to clipping, próg to threshold, atak to attack, zwolnienie to release, a stopień kompresji to ratio. Narastanie to fade in. Wygaszanie to fade out. EQ, FFT, RMS, LUFS, dB, dBFS, Hz, kHz, Q, LFO, MIDI, WAV, MP3, FLAC i PCM zostają w tej postaci. Nagłówek zostawia jednostki, na przykład 48 kHz. Zapis czasu zostaje 00:12.450.',
      'Część kontrolek ma krótką etykietę, żeby belki nie rosły. Pełna polska nazwa jest nazwą dostępną i podpowiedzią. Zakładka fali zostaje Fala. Jej nazwa dostępna to Przebieg. Przełącznik trybów pokazuje Prosty, Techn. i Sens. Nazwy dostępne to Prosty, Techniczny i Sensoryczny.',
      'Zmiana języka aktualizuje tylko interfejs. Nie przebudowuje grafu audio, nie resetuje parametrów, nie rusza głowicy i nie zatrzymuje odtwarzania.',
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
      'Zadania z przewodnikiem to uczenie się przez działanie. Działają w trybie Prostym i w Technicznym. Otwierasz je z menu, przyciskiem Prowadź mnie w Prostym albo przyciskiem Prowadź mnie w nagłówku Technicznego. To warstwa prowadzenia nad FIELD. To nie jest czwarty tryb i nie jest osobny edytor. Prosty, Techniczny i Sensoryczny zostają, jakie są.',
      'To samo zadanie podąża za warsztatem, w którym jesteś. W Prostym zadanie Dodaj przestrzeń mówi, żeby otworzyć Efekty i włączyć pogłos. W Technicznym to zadanie mówi, żeby dodać pogłos w łańcuchu efektów, wybrać tę instancję i podnieść Wet w jej inspektorze. Przełączenie między Prostym a Technicznym zostawia zadanie, krok, który nadal możesz zrobić, i kroki już ukończone. Nie uruchamia samouczka od nowa i nie zmienia dźwięku.',
      'Zaczynasz od tego, co chcesz zrobić. Każdy krok prosi o jedną czynność w prawdziwym edytorze. Krok kończy się, gdy ta czynność się wydarzy. Dalej nie oznacza samo z siebie, że edycja jest gotowa. Kroki informacyjne używają Dalej. Pomiń jest tylko przy krokach opcjonalnych. Pokaż gdzie przewija do kontrolki, a w Technicznym może otworzyć menu dodawania albo wybrać efekt, za którym idzie krok. Nie wstawia efektu i nie rusza parametru. Reszta interfejsu zostaje używalna.',
      'Gdy krok potrzebuje parametru efektu, przewodnik szuka tego efektu. Jeśli go nie ma, krok wskazuje +. Gdy go dodasz, następny krok prosi, żeby wybrać ten kafelek, żeby otworzył się inspektor, a potem ruszyć parametr. Dwa efekty tego samego typu zostają osobne. Przewodnik idzie za tym, który dodałeś, albo za jedynym, i nie podświetla drugiego.',
      'Panel może być zadokowany, unoszony albo zminimalizowany. Na wąskim ekranie staje się dolnym arkuszem, żeby fala, łańcuch i transport zostały używalne. Minimalizacja zatrzymuje prowadzenie i zostawia krok. Odtwarzanie i edycja idą dalej. Wyjście zostawia przewodnik i pamięta zadanie. Ponowne otwarcie wznawia je. Ponowne rozpoczęcie czyści tylko przewodnik. Nie wczytuje sampla od nowa, nie zeruje gainu i nie usuwa efektów. Wstecz pokazuje poprzednią instrukcję i nie cofa edycji.',
      'Szybkość, wysokość i odwrócenie są proszone w Technicznym. FIELD pyta, zanim odejdzie z Prostego dla tego zadania. Dźwięk zostaje, jaki jest. Jeśli Focus chowa kontrolkę, przewodnik mówi, że kontrolka jest poza trybem Focus, i czeka. Wyjdź z Focus i pokaż kontrolkę wychodzi z Focus tylko wtedy, gdy sam to wybierzesz. Odtwarzanie, zaznaczenie, efekty, automatyzacja i modulacja zostają, jakie są. Gdy nie ma sampla, wczytaj go albo wygeneruj istniejącą próbkę demo. Wczytany sample nie jest podmieniany.',
      'Dlaczego i Dowiedz się więcej otwierają te same krótkie wyjaśnienia co Poznaj dźwięk. Pierwsze zdania są zwykłe. Praktyczna uwaga i opcjonalna uwaga techniczna, w tym częstotliwość, gain, Q, wet, czas delay, feedback, bypass i kolejność łańcucha, czekają, aż o nie poprosisz.',
    ],
  },
  {
    id: 'learn-audio',
    title: 'Poznaj dźwięk',
    body: [
      'Poznaj dźwięk to biblioteka tematów. Otwierasz ją z Zadań z przewodnikiem. Możesz czytać bez uruchomionego zadania. Tematy to fala, amplituda, gain, decybele, przesterowanie, zaznaczenie, przycięcie, zanikanie, częstotliwość, EQ, Q, pogłos, wet i dry, delay, łańcuch efektów, bypass, wysokość, szybkość, odwrócenie i eksport.',
      'Wysokość fali to amplituda, nie pełna miara głośności. Gain zmienia poziom. EQ zmienia balans częstotliwości i nie usuwa całego szumu. Pogłos dodaje dźwięk odbić. Delay powtarza dźwięk później. Szybkość, wysokość i odwrócenie to różne ruchy.',
    ],
  },
  {
    id: 'explain-this',
    title: 'Wyjaśnij',
    body: [
      'Wyjaśnij to krótka notatka o kontrolce, której używasz. Zostaje w FIELD. Otwierasz ją klawiszem F1 na kontrolce w fokusie. Ustawienia mogą też pokazać znak informacji, ⓘ, obok nagłówka inspektora. Ten znak zostaje ukryty, dopóki nie włączysz Pokaż znaki informacji. Fokus albo kliknięcie gałki nie stawia drugiego znaku.',
      'Podstawowy to zwykły język: co kontrolka zmienia, co możesz usłyszeć i kiedy się przydaje. Techniczny to opis inżynierski: jednostki, zakres i zachowanie procesu. Wybór zostaje w tej przeglądarce jako poziom pomocy. Nie jest związany z trybem Prostym ani Technicznym.',
      'F1 wyjaśnia kontrolkę w fokusie. Escape zamyka notatkę. Fokus wraca do kontrolki tylko wtedy, gdy wcześniej wszedł do notatki. Otwarcie notatki samo nie przenosi fokusu. Tab z kontrolki wchodzi do notatki. Czytnik ekranu słyszy nazwę i krótkie wyjaśnienie. Dłuższy tekst techniczny czeka, aż otworzysz szczegóły.',
      'Więcej w podręczniku otwiera pasującą sekcję tego podręcznika, gdy taka istnieje. Angielski i polski niosą to samo znaczenie. Notatka bierze skróty z bieżącego rejestru i zakresy z parametrów, które FIELD już ma. Pomoc nie zatrzymuje odtwarzania, nie zeruje parametru i nie zmienia efektu.',
    ],
  },
  {
    id: 'technical-interface',
    title: 'Interfejs techniczny',
    body: [
      'Technical ma dwa układy. Workspace jest domyślny. Klasyczny to wcześniejszy widok. Workspace układa te same kontrolki inaczej: łańcuch, jeden aktywny obszar (Fala, EQ, FFT, Auto albo Hearing), kontrolki kontekstu i transport. Korzysta z tego samego silnika i tych samych funkcji. Kontrolka tła widoku stoi na belce obrazu. Po ukryciu inspektora Context jest tuż przed Guide me.',
      'Tryb Focus to ten sam obszar bez otaczającej ramki. Ikona focus stoi w prawym górnym rogu obrazu Fali, EQ, FFT, Auto i Hearing, w tym samym miejscu w Focus. Na EQ i FFT ••• stoi tuż po jej lewej. Fala trzyma to ••• w tym samym rogu poza Focus, a w Focus przenosi polecenia edycji na belkę. Ta sama ikona wychodzi z Focus. Menu widoku kończy się na •••: na Fali jest za Trim. Focus trzyma mały transport — play, stop i pętlę jako same ikony, plus czas — na górnej belce, w tym samym miejscu w każdym widoku. Ikony nie mają wypełnienia guzika ani zaokrągleń. Wyjście przywraca ramkę, nie zmieniając dźwięku, zaznaczenia ani głowicy. FFT Focus pokazuje widmo. Ustawienia analizatora otwierają się z ••• na końcu belki FFT.',
      'Odświeżenie otwiera Workspace. Wybór Klasycznego zapisany, gdy Klasyczny był domyślny, nie jest już brany pod uwagę. Ustawienia → Interfejs techniczny przełącza je od razu, a Klasyczny wybrany tutaj zostaje w tej przeglądarce. Nagłówek pokazuje Warsztat raz, obok SHED. Klasyczny zostaje w Ustawieniach. To nie jest kolejny tryb obok Prostego, Technical i Sensorycznego.',
      'Widoki Workspace zmieniają tylko obraz. Fala, EQ, FFT, Auto i Hearing dzielą jedną ramkę, więc przełączanie nie rusza górnej krawędzi. Fala, FFT, Auto i Hearing zostawiają inspektor na ostatnio wybranym efekcie. EQ pokazuje inspektor korektora, gdy ten obraz jest otwarty i korektor jest w łańcuchu. Wyjście z EQ, także na Falę, pokazuje inspektor, który był otwarty przed tym obrazem. Wybranie innego efektu przy otwartym EQ zostawia ten efekt. FFT trzyma Before, After, Both oraz 2D / 3D na belce obrazu, a ••• na końcu tej belki otwiera ustawienia analizatora, w tym samym stylu co menu Fali. Kolor to Off, Level albo Frequency i maluje zarówno słupki 2D, jak i granie 3D. Menu ••• na EQ i menu ••• na FFT mają te same rzędy: siatka, warstwa, skala, zakres, słupki, linia, legenda i prowadnice. Każdy widok trzyma własne wartości. Kolor EQ barwi te słupki regionami. Kolor FFT to Off, Level albo Frequency. Freq nodes i kanał EQ zostają w menu EQ. Zmiana jednego widoku nie zmienia drugiego. Hearing zostawia ten sam efekt. Słowa głośności stoją obok wskaźnika wyjścia po prawej i nie zwężają obrazu.',
      'EQ w Workspace otwiera się w inspektorze. Każdy filtr to jeden rząd na całą szerokość: selektor typu i gałki tego filtra. Dodaj pasmo tworzy kolejny filtr. Wykres zajmuje całą wysokość nad transportem. Ikona w inspektorze otwiera pionowe paski pod wykresem; przeciągnięcie belki między nimi zmienia wysokość tego panelu. Ikona w rogu panelu pasków wraca do inspektora. Ten wybór jest pamiętany tylko dla EQ. Dodanie albo zaznaczenie innego efektu pokazuje jego inspektor.',
    ],
  },
  {
    id: 'load',
    title: 'Wczytywanie audio',
    body: [
      'Wczytaj sample stoi w nagłówku, tuż na prawo od nazwy wczytanego dźwięku. Nazwa ma stałą szerokość, więc przycisk zostaje w tym samym miejscu, gdy nazwa się zmienia. Otwiera wybór pliku. Plik można też upuścić na edytor.',
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
      'Pauza trzyma dźwięk, który już gra — ten z EQ. Play i Loop wznawiają od tego dźwięku. Fragment tylko zaplanowany z wyprzedzeniem, także kolejny przebieg pętli, nie jest tym, który wraca.',
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
      'Sel start i Sel end stawiają głowicę na krawędziach zaznaczenia. Kopiuj, wytnij, wklej, usuń, wycisz, przytnij i wstaw ciszę używają bieżącego zaznaczenia. Przytnij stoi na belce Fali, obok fade out.',
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
    body: [
      'Loop powtarza bieżące zaznaczenie. Fade in i fade out słychać przy każdym przejściu, także na początku pętli, więc szew łączy cichy koniec zaniku z cichym początkiem. Wyłączenie puszcza resztę sampla. W Focus ikona pętli jest szara, gdy jest wyłączona, a włączona ma kolor sąsiednich ikon transportu. Kliknięcie myszą nie zostawia wokół niej ramki fokusu.',
    ],
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
      'Lista filtrów stoi po lewej stronie wykresu, a typ jest obok częstotliwości. Pokrętła są na środku ekranu i unoszą się nad siatką. Wykres kończy się pod tymi gałkami, więc słupek na szczycie skali staje przed nimi. Zakres w menu wykresu to 60, 90 albo 120 dB. To głębokość słupków widma, a nie skala krzywej EQ. Ikona focus jest w prawym górnym rogu każdego widoku. Na Fali, EQ i FFT ••• stoi w tym samym rzędzie, tuż po jej lewej. EQ i FFT zostawiają je tam także w Focus. Hold stoi w tym samym rzędzie, na lewo od •••. Ta sama ikona wychodzi z Focus. Menu typu filtra jest w nagłówku pasma, przy nazwie. Wskaźnik pokazuje najpierw częstotliwość, potem nutę, na przykład 440 Hz · A4. Przycisk focus na wykresie EQ otwiera EQ Focus. Menu wykresu ustawia gęstość 6, 12 albo 24, skalę Lin, Log albo Mel, warstwę widma Before, After albo Both oraz kolor częstotliwości włącza albo wyłącza. Najechanie na nazwę ustawienia pokazuje, co ono robi. Freq nodes koloruje uchwyt EQ, listę filtrów i nazwę pasma według częstotliwości, na której pasmo stoi. Kolor EQ i kolor FFT są osobne. Zmiana Off, Level albo Frequency w FFT nie przemalowuje uchwytów EQ, listy filtrów ani nazwy pasma. Regions barwi słupki widma. Legend rysuje ten klucz kolorów w lewym dolnym rogu wykresu EQ. Guides, gdy są włączone, dopisują punkt odniesienia pod wskaźnikiem: boom stopy koło 80–100 Hz, głos koło 1 kHz, trzask werbla koło 2–5 kHz, powietrze powyżej 12 kHz. Te opisy idą za Sound On Sound (Senior i White, Using EQ, sierpień 2001) oraz ściągą EQ iZotope. To miejsca do słuchania, nie reguły. Pionowe prowadnice używają zwykłych okrągłych częstotliwości i leżą logarytmicznie, dopóki nie wybierzesz Lin. Liczby stoją pod poziomą osią.',
      'Poziome linie na wykresie EQ to wzmocnienie filtra, co 6 dB od −24 do +24. Mają ten sam lekki rysunek co siatka widma. W EQ Focus linie zanikają w stronę gałek, więc wykres nie kończy się twardą krawędzią. Bell na +24 dB szczytuje na linii +24. Kreska mieści się w wykresie. Gdy złożone filtry wychodzą poza +24 dB, skala się otwiera i krzywa zachowuje kształt, zamiast być ścinana na płasko na tej linii. Półka, która naprawdę jest płaska, nadal rysuje się płasko. Gain pojedynczego pasma i tak kończy się na +24 dB. To nie jest znak, że dźwięk się przesterowuje. Słupki widma mają osobną skalę Range, z 0 dB na szczycie tej skali.',
      'Hold, na belce wykresu EQ i na belce FFT, zapętla krótki fragment, który już doszedł do głowicy. Przycisk stoi poza •••. Długość w tym menu to 0,05 s, 0,1 s, 0,25 s, 0,5 s albo 1 s. Zmiana przy włączonym Hold zaczyna pętlę od nowa. Wykres FFT i EQ dalej rysuje tę pętlę, także przy każdym powtórzeniu. Nie zapętla odcinka, który jeszcze się nie pojawił. Drugie wciśnięcie Hold odtwarza dalej od tego miejsca. Stop zdejmuje zatrzymanie. Kliknięcie poza menu ••• je zamyka.',
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
      'WAVE pokazuje sample. FFT pokazuje widmo odtwarzanego audio. EQ otwiera warsztat korektora. AUTO otwiera automatyzację. To widoki tego samego projektu. Wybór Fali, FFT albo AUTO nie podmienia inspektora, z wyjątkiem wyjścia z obrazu EQ, które przywraca inspektor otwarty przed nim. 3D Spectral History jest widokiem wewnątrz FFT, a nie osobnym warsztatem.',
    ],
  },
  {
    id: 'fft-3d',
    title: 'FFT → 3D Spectral History',
    body: [
      '3D Spectral History otwiera napis 3D w FFT. 2D wraca do zwykłego analizatora. Przełącznik 2D / 3D zostaje na pasku FFT. W FFT Focus ten przełącznik jest w menu ustawień, więc widmo wypełnia ekran. Częstotliwość biegnie od lewej do prawej, poziom rośnie w dB, a czas cofa się w głąb. Przednia grań to teraz. Starsze granie bledną, gdy oddalają się do tyłu. Znikają dopiero po wyjściu z okna historii.',
      'Historia to 1, 2, 5 albo 10 sekund rzeczywistego odtwarzania. Domyślnie jest 5 sekund. Głębokość obrazu zostaje ta sama: dłuższa historia oznacza więcej czasu na tej samej osi, a nie większą scenę. Widok korzysta z tego samego FFT co analizator 2D: rozmiar FFT, wygładzanie, zakres i skala częstotliwości. Mierzy audio. Nie rysuje krzywej EQ. Source to odczep przed łańcuchem efektów. Output, domyślny w 3D, to odczep za łańcuchem. Both zostawia After jako historię. Before jest cienką ciągłą linią tylko na bieżącej grani, więc starsze granie zostają czytelne. Wykres nie wypisuje Source ani Output pod menu.',
      'Front, Angled i Top to widoki kamery. Angled jest domyślny. Front służy do czytania bieżącego widma. Top kładzie częstotliwość w poziomie, a czas w głąb od teraz; poziom widać w sile linii. Przeciągnięcie w bok obraca wykres dookoła pionowej osi. Dół zostaje dołem. Przeciągnięcie w górę i w dół przechyla obraz, bez odwracania go. Uszczypnięcie albo kółko przybliża, w ograniczonym zakresie. Reset View wraca do Angled. Freeze zatrzymuje granie, a audio gra dalej. Pauza i Stop też zostawiają obraz w miejscu, bo historia idzie za czasem odtwarzania. Clear History, w menu •••, kasuje tylko zapisane granie.',
      'Granie suną do tyłu razem z czasem odtwarzania. Nowy przekrój wychodzi z teraz płynnie, zamiast przestawiać cały obraz. Wskazanie grani czyta częstotliwość, nutę, poziom i wiek, na przykład 440 Hz · A4, −18.2 dB, −1.8 s. Podpisy czasu są w środku wykresu, przy lewej krawędzi głębi: NOW z przodu, potem −1, −2 i koniec historii. Domyślne są linie. Surface wypełnia obszar pod granią lekkim wypełnieniem i ciemną krawędzią, więc jeden przekrój nie zlewa się z następnym. Gdy Before i After są razem, After zostaje wypełniony kolorem, a Before jest cienką ciągłą linią na bieżącej grani. Analizator 2D używa tej samej pary: wypełnione słupki After i cienka ciągła linia Before. Kolor, w ustawieniach analizatora, to Off, Level albo Frequency. Maluje słupki 2D i granie 3D. Level biegnie od fioletu krzywej motywu przez cyjan do złota. Cicho zostaje przy chłodnym końcu, a głośno dochodzi do ciepłego, na słupkach 2D, linii 2D i graniach 3D. Frequency używa tych samych barw pasm co analizator 2D. Ten kolor FFT nie zmienia kolorów węzłów EQ, listy filtrów ani wykresu EQ. Gęstość i ślady szczytów są w tym samym menu. Mały ekran rysuje mniej grani. Bufor historii ma stały rozmiar i po odświeżeniu strony zaczyna się pusty. Ograniczenie ruchu wyłącza poślizg kamery; samo widmo dalej się aktualizuje, bo jest pomiarem.',
    ],
  },
  {
    id: 'focus',
    title: 'Tryb Focus',
    body: [
      'Focus wypełnia edytor jednym zadaniem: fala, FFT, EQ albo automatyzacja. Wyjście wraca do zwykłego układu. W WAVE Focus uchwyty fade są odsunięte pod pasek narzędzi. W FFT Focus widmo jest obrazem. Warstwa, 2D / 3D, historia i wyświetlanie otwierają się z kontrolki ustawień na pasku focus.',
      'Pokrętła EQ Focus są większe i cichsze: ciemna, lekko przezroczysta tarcza i cienkie kreski. Wskazówka śledzi wartość skuteczną, także przy LFO. Mały znak pod pokrętłem podąża za kształtem fali LFO. Pokrętła i odczyty zostają neutralne. Kolor pasma ma tylko nazwa i numer. Przy włączonym kolorze częstotliwości ta nazwa bierze barwę częstotliwości. Menu typu filtra jest w nagłówku pasma. EQ Focus nie pokazuje odczytu dostępu słuchowego.',
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
    body: [
      'Eksport zapisuje WAV przetworzonego sampla albo bieżącego zaznaczenia, z łańcuchem i automatyzacją projektu. Okno eksportu zawiera Kontrolę eksportu: krótki odczyt ustawień, które trafią do pliku. Są to format, częstotliwość próbkowania, głębia bitowa, kanały i zakres. Tryb prosty pokazuje format, zakres i ważne ostrzeżenia. Tryb techniczny i sensoryczny zostawiają te same sprawdzenia oraz ustawienia zaawansowane.',
      'Błąd zatrzymuje eksport. Ostrzeżenie pozwala zapisać plik. Informacja jest kontekstem. Poziom jest nazwany słowem, więc kolor nie jest jedynym sygnałem. Brak wczytanego audio to błąd: wczytaj plik i wróć do eksportu. Zakres o zerowej długości, odwrócony początek i koniec albo zakres poza nagraniem to błąd. Kontrola nie przesuwa zaznaczenia, żeby zakres się zmieścił.',
      'Dostępny jest tylko WAV. Częstotliwość próbkowania i głębia bitowa biorą się z wyborów, które ten eksport umie zakodować. 16-bit i 24-bit to PCM całkowite. 16-bit stosuje dithering TPDF. 24-bit go nie stosuje. 32-bit float zapisuje próbki zmiennoprzecinkowe, nie PCM całkowite. Przetwarzanie wewnętrzne i tak zostaje zmiennoprzecinkowe. Wiersz kanałów pokazuje mono, stereo, lewy, prawy albo zamianę L/P. Sam nie zmienia liczby kanałów.',
      'Aktywne efekty z łańcucha trafiają do pliku. Efekty w bypass nie. Pozostaw ogon ewentualnych efektów jest domyślnie włączone. Dopisuje wybrzmienie, które eksporter już renderuje po nagraniu: pogłos, opóźnienie i krótkie wybrzmienie innych aktywnych efektów. Wyłączenie kończy plik razem z audio i nie zachowuje tego ogona. Kontrola eksportu sama tego nie przełącza.',
      'Kontrola eksportu nie mierzy wyrenderowanego pliku. Nie mówi, że plik jest wolny od przesterowania, i nie bierze miernika na żywo za wynik eksportu. Szczyt pojawia się tylko wtedy, gdy zmierzono go dla tego źródła, tych efektów, tej automatyzacji, tego zakresu i tych ustawień eksportu. Nowsza edycja kasuje ten odczyt. Kontrola nie normalizuje, nie ogranicza, nie zmienia wzmocnienia, EQ, zaników, automatyzacji ani kanałów.',
      'Odsłuch eksportu odtwarza krótki fragment tego samego renderu offline, którego użyłby plik: od głowicy, gdy jest w zakresie eksportu, albo od początku tego zakresu, gdy głowicy tam nie ma. Nie rusza projektu, głowicy ani ustawień efektów. Zatrzymaj kończy tylko ten odsłuch. Zamknięcie okna też go kończy. Gdy projekt już gra, odsłuch czeka, aż zatrzymasz to odtwarzanie. To przetworzone audio przed plikiem WAV: dithering 16-bit i kwantyzacja 24-bit nie wchodzą do odsłuchu. Prędkość odtwarzania i wysokość dźwięku nie wchodzą do tego renderu. Okno, które zaczyna się po początku eksportu, nie zawiera opóźnienia ani pogłosu z wcześniejszego audio, a ogon krótkiego okna to wybrzmienie po tym oknie. Normalizacja szczytu jest stosowana tylko wtedy, gdy odsłuch obejmuje cały eksport. Słuchanie i tak idzie przez wyjście monitora.',
    ],
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
      'Gdy obsługa klawiaturą, edytowanie bez przeciągania, optymalizacje czytnika ekranu i dostępna nawigacja po nagraniu są wyłączone, spacja zawsze włącza albo pauzuje odtwarzanie, także gdy fokus jest na przycisku, przełączniku albo suwaku. Pole tekstowe nadal przyjmuje znak spacji. Otwarte okno zostawia spację swoim kontrolkom. Gdy Hold jest włączony, spacja kasuje Hold i zostawia odtwarzanie od tego miejsca. Gdy jedna z tych opcji dostępności jest włączona, spacja odtwarza albo pauzuje tylko wtedy, gdy fokus nie jest na przycisku, przełączniku, suwaku, menu ani polu tekstowym, a Enter albo Spacja aktywuje sam przycisk. Escape zamyka menu i okna i wraca fokus do kontrolki, która je otworzyła.',
      'Ctrl+Z albo Cmd+Z cofa. Shift+Ctrl+Z albo Shift+Cmd+Z ponawia.',
      'Tab przechodzi między kontrolkami. Strzałki zmieniają gałkę albo suwak w fokusie. Shift+strzałka to mniejszy krok. Home i End skaczą na krańce. Page Up i Page Down robią większy krok. Delete albo Backspace resetuje parametr w fokusie.',
      'Skróty transportu można wyłączyć w Ustawieniach. F1 wyjaśnia kontrolkę w fokusie. Ten skrót zostaje, gdy skróty transportu są wyłączone.',
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
    title: 'FIELD ACCESS',
    body: [
      'FIELD ACCESS jest w Ustawienia → Dostępność. Te same preferencje działają w trybie Prostym, Technicznym i Sensorycznym oraz zostają przy Focus, zadaniach z przewodnikiem i zmianie motywu. Ich zmiana nie restartuje odtwarzania i nie zmienia silnika audio.',
      'Ogranicz ruch zmniejsza dekoracyjne animacje, wejścia paneli, parallaksę i poświatę. Głowica, fala, mierniki, krzywa EQ, FFT, zaznaczenie i automatyzacja zostają widoczne, z mniejszą ilością zbędnego ruchu. Sceny sensoryczne gaszą ozdobny puls. Historia widmowa pomija ślizg kamery i nadal rysuje pomiar. Gdy urządzenie prosi o ograniczenie ruchu, FIELD to respektuje nawet przy wyłączonym przełączniku. Przełącznik nie nadpisuje urządzenia. Dźwięk się nie zmienia. Komfort sensoryczny jest osobną preferencją na tym samym ekranie. Patrz Komfort sensoryczny.',
      'Wyraźniejszy fokus klawiatury rysuje mocniejszy pierścień z kolorów tekstu i tła motywu. Widać go przy fokusie z klawiatury. Zwykłe kliknięcie go nie włącza. Gdy przełącznik jest wyłączony, zostaje dotychczasowy fokus.',
      'Większe elementy sterujące powiększają obszar trafienia i minimalną wysokość przycisków, gałek, suwaków, transportu, węzłów EQ, uchwytów fali i węzłów automatyzacji. W gęstym Technicznym rośnie głównie niewidoczny cel, nie sam rysunek. Wartości, zakresy i dźwięk zostają takie same.',
      'Zwiększona widoczność kontrolek jest w Ustawienia → Dostępność → Komfort widzenia. Jest wyłączona, dopóki jej nie włączysz. Poprawia widoczność kontrolek, zaznaczeń i uchwytów edycyjnych. Dźwięk się nie zmienia.',
      'Koncentracja uwagi jest w Ustawienia → Dostępność → Poznanie i uwaga. Jest wyłączona, dopóki jej nie włączysz. Wyróżnia kontrolki związane z czynnością, którą właśnie wykonujesz, i może ściszyć dekoracyjny kontrast gdzie indziej. Nie ukrywa kontrolek i nie zmienia dźwięku. Patrz Koncentracja uwagi.',
      'Przewidywalny układ jest w tej samej sekcji Poznanie i uwaga. Jest wyłączony, dopóki go nie włączysz. Utrzymuje narzędzia i panele w stałych miejscach. Patrz Przewidywalny układ.',
      'Rozmiar interfejsu i Rozmiar tekstu są w tej samej sekcji widzenia. Są osobne od siebie i od większych elementów sterujących. Patrz Rozmiar interfejsu i tekstu.',
      'Te wybory zostają, dopóki strona jest otwarta. Odświeżenie zaczyna z wyłączonymi przełącznikami dostępności. Przeglądarka ich jeszcze nie trzyma. Przywróć domyślne ustawienia dostępności, w FIELD ACCESS, resetuje tylko te preferencje. Nie kasuje audio, efektów, automatyzacji ani projektu. Reset aplikacji na górnym pasku też wraca z tymi preferencjami, w tym z Rozmiarem interfejsu, Rozmiarem tekstu, zwiększoną widocznością, koncentracją uwagi i Komfortem sensorycznym, do wartości domyślnych.',
      'Klawiatura: Tab i Shift+Tab przechodzą między kontrolkami. Enter aktywuje przyciski. Spacja zmienia pola wyboru i przełączniki. Strzałki zmieniają gałkę albo suwak w fokusie. Na fali strzałki przesuwają głowicę. Na węźle EQ strzałki ruszają częstotliwość i wzmocnienie, a Shift+strzałka rusza Q. Home i End skaczą na krańce gałki. Delete albo Backspace resetuje parametr w fokusie.',
      'Obsługa czytnika ekranu jest częściowa. Przyciski, gałki, suwaki, przełączniki, karty, okna i Zadania z przewodnikiem mają nazwy. Gałki i suwaki podają wartość. Ten podręcznik nie ogłasza pełnej zgodności z WCAG 2.2 AA. Testy automatyczne nie zastępują sprawdzenia czytnikiem ekranu.',
      'Znane ograniczenia: przeciąganie nadal edytuje falę, zaniki, węzły EQ i punkty automatyzacji. Te same edycje są dostępne z klawiatury przez przyciski, suwaki i edytory bez przeciągania. Zachowanie czytnika ekranu nie było sprawdzane ręcznie w tym wydaniu. Na bardzo wąskim ekranie górny pasek przewija się w bok, żeby Ustawienia zostały osiągalne.',
    ],
  },
  {
    id: 'scaling',
    title: 'Rozmiar interfejsu i tekstu',
    body: [
      'Rozmiar interfejsu i Rozmiar tekstu są w Ustawienia → Dostępność, w sekcji Komfort widzenia. To dwa osobne ustawienia. Możesz powiększyć kontrolki i zostawić tekst, albo powiększyć tekst i zostawić kontrolki w zwykłym rozmiarze. Możesz też podnieść oba. Rozmiar interfejsu ma zakres od 100% do 150%. Rozmiar tekstu ma zakres od 100% do 200%. Przyciski pod suwakiem skaczą do 100%, 110%, 125% i 150% dla interfejsu oraz do 100%, 125%, 150%, 175% i 200% dla tekstu. Suwak porusza się też co 5%.',
      'Rozmiar interfejsu zmienia przyciski, karty, odstępy i miejsce wokół kontrolek. Nie przybliża całej strony. Fala, wykres EQ i FFT zostają przy swoich pomiarach. Kliknięcie na fali trafia w ten sam moment. Węzeł EQ nadal edytuje częstotliwość i wzmocnienie pod wskaźnikiem. Punkt automatyzacji zostaje na swoim czasie i wartości.',
      'Rozmiar tekstu zmienia etykiety, liczby, menu, pomoc, zadania z przewodnikiem i komunikaty stanu. Przy większych krokach kolumny się zawijają. Inspektor, Ustawienia i panel samouczka przewijają się, żeby tekst dało się przeczytać. Ważne etykiety zawijają się, zamiast być ucięte bez innego sposobu odczytu.',
      'Większe elementy sterujące to inny przełącznik. Zwiększa obszar, który można nacisnąć, w tym węzły EQ, uchwyty fali i punkty automatyzacji. Nie zmienia tego, co ten gest edytuje. Rozmiar interfejsu i większe elementy sterujące nie mnożą się w jeden ogromny cel.',
      'Powiększenie przeglądarki nadal działa ponad tymi ustawieniami. Uszczypnięcie na telefonie zostaje włączone. FIELD go nie wyłącza. Na wąskim ekranie większy rozmiar układa kontrolki jedna pod drugą i pozwala przewijać sekcje. Ważne działania zostają z dala od wcięcia i wskaźnika domu.',
      'Przywróć domyślne ustawienia dostępności wraca z Rozmiarem interfejsu i Rozmiarem tekstu do 100%, razem z pozostałymi przełącznikami dostępności. Nie kasuje sampla ani projektu. Reset aplikacji robi to samo z tymi preferencjami, łącznie z oboma rozmiarami, i dodatkowo czyści sesję. Zmiana któregoś rozmiaru nie restartuje odtwarzania i nie wczytuje audio od nowa.',
    ],
  },
  {
    id: 'high-visibility',
    title: 'Zwiększona widoczność kontrolek',
    body: [
      'Zwiększona widoczność kontrolek jest w Ustawienia → Dostępność → Komfort widzenia. Jest wyłączona, dopóki jej nie włączysz. Ten sam przełącznik działa w trybie Prostym, Technicznym i Sensorycznym oraz zostaje przy Focus, zadaniach z przewodnikiem i zmianie motywu.',
      'Włącz ją, gdy kontrolki, zaznaczenia albo uchwyty edycji są słabo widoczne. FIELD rysuje wyraźniejsze krawędzie, kształty i krótkie napisy. Sam kolor nie wystarcza. Efekt ominięty jest kreskowany i podpisany. Wybrane pasmo EQ jest zaokrąglonym kwadratem z numerem pasma. Niewybrane pasmo zostaje kółkiem. Fokus klawiatury zostaje przy dotychczasowym pierścieniu, także przy wyraźniejszym fokusie.',
      'Na fali głowica jest nieco grubszą kreską z małym trójkątem u góry. Zaznaczenie ma kwadratowe znaki na początku i na końcu oraz lekkie wypełnienie między nimi. Krawędzie przycięcia używają nawiasu. Płynny początek i płynny koniec zachowują własne znaki. Pętla, tam gdzie widok ją ma, używa rombu i kreskowanej krawędzi, żeby nie wyglądała jak głowica.',
      'Węzły EQ pokazują mały numer pasma. Krzywa odpowiedzi zostaje czytelna, a linia 0 dB jest oznaczona. Punkty automatyzacji są kółkiem, gdy są wolne, i rombem, gdy jeden jest wybrany. Nieaktywny pas automatyzacji jest kreskowany. W łańcuchu efektów na efekcie widać napis Aktywny albo Wyłączony. Przyciski przesuwania zostają tam, gdzie już są pokazywane.',
      'Mierniki zachowują skalę. Lampka przesterowania staje się kwadratem, a napis Clip zostaje, i tylko wtedy, gdy miernik już wykrył przesterowanie. Dostęp słuchowy zachowuje symbole (atak, przester, cisza, głośno, ton, klik) i ułatwia czytanie słów. Tryb sensoryczny zachowuje swój obraz. Edytowalne kontrolki dostają cichą krawędź, żeby dało się je znaleźć.',
      'Zadania z przewodnikiem rysują kreskowany obrys wokół kroku, który pokazują. Ten obrys nie jest pierścieniem fokusu klawiatury i nie miga. Ograniczenie ruchu nadal decyduje o animacji. Zwiększona widoczność nie dodaje pulsujących uchwytów.',
      'Wybór zostaje, dopóki strona jest otwarta. Odświeżenie zaczyna z wyłączoną zwiększoną widocznością. Przywróć domyślne ustawienia dostępności wyłącza zwiększoną widoczność i zostawia projekt audio. Reset aplikacji wyłącza zwiększoną widoczność razem z pozostałymi preferencjami dostępności i dodatkowo czyści sesję.',
      'Działa z motywami, które już masz, w tym Studio Dark, Soft Slate, Warm Paper i Dusk. Krawędzie biorą kolor tekstu motywu, więc zostają widoczne na ciemnym i jasnym tle. Działa też z Rozmiarem interfejsu, Rozmiarem tekstu i większymi elementami sterującymi. Uchwyty rosną trochę na ekranie. Ich obszar kliknięcia nie nakłada się na sąsiada.',
    ],
  },
  {
    id: 'attention-focus',
    title: 'Koncentracja uwagi',
    body: [
      'Koncentracja uwagi jest w Ustawienia → Dostępność → Poznanie i uwaga. Jest wyłączona, dopóki jej nie włączysz. Włącz ją, gdy FIELD ma wskazać kontrolki związane z czynnością, którą właśnie wykonujesz. Pozostałe kontrolki zostają na miejscu. Nadal można je kliknąć i nadal da się do nich dojść Tabem.',
      'Siła wyróżnienia to Subtelna albo Wyraźna. Subtelna jest małą różnicą. Wyraźna jest łatwiejsza do zobaczenia. Żadna nie ukrywa tekstu i żadna nie miga.',
      'Wyróżniaj powiązane kontrolki rysuje cichy znak przy fali, zaznaczeniu, zaniku, przycięciu, wybranym paśmie EQ, wybranym efekcie, punkcie automatyzacji albo kroku zadań z przewodnikiem. Ścisz niepowiązane elementy uspokaja dekoracyjne krawędzie i poświatę poza tą czynnością. Ważne słowa zostają czytelne. Ostrzeżenia, lampka przesteru i przycisk odtwarzania zostają łatwe do zobaczenia.',
      'Koncentracja uwagi to nie jest tryb Focus. Focus zmienia, który obszar jest na ekranie. Koncentracja uwagi zmienia tylko wyróżnienie. Można używać obu. FIELD sam nie włącza trybu Focus.',
      'Gdy krok zadań z przewodnikiem jest otwarty, ten krok jest znakiem, którego FIELD używa. Pokaż gdzie działa tak samo jak wcześniej. Ukończenie kroku nadal zależy od edycji, którą naprawdę zrobisz, a nie od podświetlenia.',
      'Wybór zostaje, dopóki strona jest otwarta. Odświeżenie zaczyna z wyłączoną koncentracją uwagi. Przywróć domyślne ustawienia dostępności wyłącza koncentrację uwagi i zostawia projekt audio. Zmiana nie restartuje odtwarzania.',
    ],
  },
  {
    id: 'predictable-layout',
    title: 'Przewidywalny układ',
    body: [
      'Przewidywalny układ jest w Ustawienia → Dostępność → Poznanie i uwaga. Jest wyłączony, dopóki go nie włączysz. To preferencja dostępności, nie kolejny tryb edycji. Prosty, Techniczny i Sensoryczny zostają. Włączenie nie zmienia dźwięku, silnika audio, automatyzacji, przetwarzania LFO ani eksportu.',
      'Włącz go, gdy narzędzia i panele mają zostawać w stałych miejscach podczas pracy. Pod spodem są trzy wybory. Stabilne panele trzymają inspektor, łańcuch efektów i transport w stałych ramkach. Gdy panel ma więcej treści, ta treść przewija się w środku. Zapamiętaj układ obszaru roboczego trzyma ostatni obszar oraz to, czy panele były otwarte czy zwinięte, dopóki strona jest otwarta. Odświeżenie zaczyna z wyłączonym przełącznikiem. Ogranicz ruch układu skraca animację paneli. Ekran nadal dopasowuje się, gdy zmieniasz rozmiar okna. Powiększenie przeglądarki zostaje włączone.',
      'Zmiana, którą robisz celowo, nadal zachodzi. Tryb Focus nadal może otworzyć spokojniejszy obszar, a wyjście z Focus przywraca panele. Zadania z przewodnikiem nadal otwierają się we własnym panelu. Pokaż gdzie nadal może przewinąć do kontrolki poza ekranem. Edytory bez przeciągania, narzędzia dostępnej fali i kontrolki wspomagane zostają tam, gdzie już się otwierają.',
      'Przywróć układ obszaru roboczego, na tym samym ekranie, odkłada panele na zwykłe miejsca. Nie wyłącza Przewidywalnego układu i nie zmienia sampla. Przywróć domyślne ustawienia dostępności wyłącza ten przełącznik razem z pozostałymi preferencjami dostępności i zostawia sampel. Reset wszystkiego, w Ustawieniach, czyści projekt audio i zostawia te preferencje. Reset aplikacji czyści sesję i dodatkowo wraca z preferencjami dostępności, łącznie z Przewidywalnym układem, do wartości domyślnych.',
      'Na wąskim ekranie te same obszary zostają w stałej kolejności: nawigacja, fala, potem kontrolki edycji. Inspektor zostaje panelem z boku na szerokim ekranie i panelem u dołu na telefonie. Sam nie przeskakuje między tymi postaciami. Większy Rozmiar interfejsu i Rozmiar tekstu nadal układają treść od nowa. Tekst, który się nie mieści, przewija się w panelu, zamiast być ucięty.',
      'Koncentracja uwagi nadal może wyróżnić kontrolkę, którą edytujesz. Nie przesuwa panelu. Zwiększona widoczność zostawia obrysy i nie popycha sąsiednich kontrolek, gdy Przewidywalny układ jest włączony. Komfort sensoryczny i Ogranicz ruch nadal uspokajają ruch dekoracyjny. Fokus klawiatury zostaje na kontrolce, której używasz, gdy zmieniasz wartość.',
    ],
  },
  {
    id: 'sensory-comfort',
    title: 'Komfort sensoryczny',
    body: [
      'Komfort sensoryczny jest w Ustawienia → Dostępność. Jest wyłączony, dopóki go nie włączysz. To preferencja dostępności, nie kolejny tryb edycji. Prosty, Techniczny i Sensoryczny zostają. Włączenie nie zmienia dźwięku, silnika audio, automatyzacji, przetwarzania LFO ani eksportu.',
      'Przełącznik ogranicza zbędny ruch, intensywność wizualną i elementy rozpraszające. Gdy jest włączony, działają wybory pod nim: Aktywność wizualna, Ogranicz ruch dekoracyjny, Spokojne mierniki, Spokojne widmo, Ogranicz efekty wizualne i Ciche powiadomienia. Wyłączenie Komfortu sensorycznego wraca zwykły rysunek. Każdy wybór pod nim można włączyć i wyłączyć osobno, i zostaje, dopóki strona jest otwarta. Odświeżenie zaczyna z nimi wyłączonymi. Ograniczenie ruchu nie wymaga Komfortu sensorycznego. Gdy Ogranicz ruch albo urządzenie prosi o mniej ruchu, ozdobna animacja i tak zostaje wyłączona.',
      'Aktywność wizualna ma dwa ustawienia. Standardowa zostawia zwykłe tempo rysowania. Niska rysuje zbędne obrazy rzadziej. Dotyczy to obrazu FFT, ruchu mierników na ekranie i ozdobnego rysunku Sensory. Nie zmienia rozmiaru analizy, skoku ani tego, jak często przetwarzany jest sam dźwięk. Głowica zostaje na zegarze edytora.',
      'Ogranicz ruch dekoracyjny zatrzymuje ozdobną animację: puls i szum Sensory, puls kropki aktywności LFO, ślizg kamery wodospadu i duże wejścia paneli. Zostają głowica, zaznaczenie, przycięcie, zaniki, krawędzie pętli, krzywa EQ, punkty automatyzacji i fokus klawiatury. Spokojne mierniki zostawiają ten sam odczyt szczytu i ten sam próg przesterowania. Słowo Clip zostaje widoczne i nie polega na migającym świetle. Spokojne widmo uspokaja FFT 2D i wodospad 3D. Mapowanie częstotliwości i poziomu zostaje. Istniejąca pauza wodospadu pauzuje tylko obraz. Odtwarzanie trwa.',
      'Ogranicz efekty wizualne zmniejsza poświatę, rozmycie, pulsujące cienie i ozdobne cząstki. Pierścienie fokusu i kontrast kontrolek zostają. Ciche powiadomienia chowają komunikaty informacyjne, takie jak udane wykrycie tempa i plakietkę pętli. Nie chowają błędów eksportu, błędów pliku, przesterowania, ostrzeżeń o niezapisanej pracy ani nieudanych działań. Komunikaty czytnika ekranu o tych ważnych zdarzeniach zostają. Zadania z przewodnikiem używają stałego obrysu zamiast pulsu, a Pokaż gdzie przewija tylko wtedy, gdy cel jest poza ekranem. Tryb Focus nie odtwarza animacji wejścia, gdy ruch dekoracyjny jest ograniczony, i nie restartuje odtwarzania.',
      'Komfort sensoryczny działa z Rozmiarem interfejsu, Rozmiarem tekstu, większymi elementami sterującymi i zwiększoną widocznością kontrolek. Nie zmniejsza fokusu, zaznaczenia ani mocniejszych krawędzi kontrolek. Te wybory zostają, dopóki strona jest otwarta. Odświeżenie zaczyna z nimi wyłączonymi. Przywróć domyślne ustawienia dostępności resetuje je razem z pozostałymi preferencjami FIELD ACCESS. Reset aplikacji robi to samo. Czyszczenie sesji audio w silniku nie trzyma drugiej kopii tych preferencji.',
    ],
  },
  {
    id: 'drag-free',
    title: 'Edytowanie bez przeciągania',
    body: [
      'Edytowanie bez przeciągania jest w Ustawienia → Dostępność → Interakcja. Jest wyłączone, dopóki go nie włączysz. Po włączeniu obok dotychczasowego przeciągania pojawiają się przyciski i dokładne wartości. Przeciąganie nadal działa.',
      'Na fali Ustaw początek i Ustaw koniec biorą miejsce głowicy. Edytuj czasy przyjmuje zapis taki jak 01:23.450. Wyczyść zdejmuje zaznaczenie i zostawia dźwięk. Idź do czasu oraz kroki co 100 milisekund przesuwają głowicę. Odsłuch gra zaznaczenie. Przytnij najpierw pyta, potem zostawia zaznaczenie i usuwa dźwięk poza nim. Cofnięcie może przywrócić to audio. Sama zmiana czasu nie przycina.',
      'Płynny początek i płynny koniec przyjmują czas w milisekundach albo kroki co 50 milisekund. Zanik nie może być dłuższy niż zaznaczenie. Krzywa zostaje ta, która już jest wybrana.',
      'Pasma EQ wymieniają każdy slot pasma po jego własnej tożsamości, także slot, który jest jeszcze wyłączony. Wybór typu filtra włącza ten slot. Częstotliwość, wzmocnienie, Q, typ filtra i ominięcie edytują potem to samo pasmo. Usunięte pasmo nie jest zastępowane następnym.',
      'Automatyzacja wymienia punkty parametru, który już jest wybrany. Można wpisać czas, wpisać wartość tego parametru, usunąć punkt albo dodać punkt przy głowicy. Wpisana wartość jest tą samą wielkością, którą pokazuje gałka, a nie ukrytą liczbą od 0 do 1.',
      'W łańcuchu efektów każdy przesuwalny efekt ma przyciski ruchu. Wejście i wyjście zostają na miejscu. Przesunięcie zachowuje ustawienia efektu. Dźwięk może się zmienić, bo zmieniła się kolejność.',
      'Gdy ścieżka jest w pętli, Ustaw początek pętli, Ustaw koniec pętli i Edytuj czasy pętli używają tej pętli. Prosty i Sensoryczny nie dokładają osobnej pętli, jeśli widok jej nie ma.',
      'Te same edytory są w Prostym, Technicznym i Sensorycznym tam, gdzie dana edycja już istnieje, także w trybie Focus. Tab, Shift+Tab, Enter, Spacja i Escape działają na nowych kontrolkach. Czas to minuty, sekundy i milisekundy. FIELD nadal zaokrągla edycję sampli tak jak wcześniej. Zegar nie oznacza, że każda milisekunda jest osobną próbką.',
    ],
  },
  {
    id: 'keyboard-first',
    title: 'Obsługa klawiaturą',
    body: [
      'Obsługa klawiaturą jest w Ustawienia → Dostępność → Interakcja. Jest wyłączona, dopóki jej nie włączysz. Po włączeniu pojawiają się edytory bez przeciągania i przyciski przesuwania efektów. Silnik audio się nie zmienia.',
      'Tab, Shift+Tab, Enter, Spacja, strzałki, Home, End i Escape działają niezależnie od tej preferencji. Wyłączenie jej nie wyłącza klawiatury.',
      'Nawigacja po obszarze jest w menu Ustawień, a Ctrl+Shift+K albo Cmd+Shift+K ją otwiera. Ctrl+K i Cmd+K zostają przy przeglądarce. Lista pokazuje tylko miejsca dostępne w bieżącym trybie. Wybór przenosi fokus. Escape zamyka listę i przywraca fokus. Odtwarzanie nie startuje od nowa.',
      'Na fali Left i Right przesuwają głowicę o 10 milisekund. Shift robi z tego 100 milisekund. Page Up i Page Down przesuwają o sekundę. Home i End idą na początek i koniec audio. Ustaw początek zaznaczenia i Ustaw koniec zaznaczenia, w Więcej edycji, biorą miejsce głowicy. Przycięcie i zaniki zostają na dotychczasowych przyciskach i suwakach inspektora. Samo przeniesienie fokusu niczego nie przycina.',
      'Łańcuch efektów jest listą. Tab do niego wchodzi. Strzałki przechodzą między efektami. Enter wybiera efekt i otwiera go w Inspektorze. Alt+strzałka go przesuwa. Inspektor ma też przyciski przesunięcia i usunięcia. Wejście i Wyjście zostają na miejscu.',
      'Znaczniki są w tym samym spisie skrótów. Ctrl+Shift+E albo Cmd+Shift+E dodaje znacznik w miejscu głowicy i zostawia listę zamkniętą. Ctrl+Shift+strzałka w górę i Ctrl+Shift+strzałka w dół idą do poprzedniego i następnego znacznika. Ctrl+Shift+U otwiera listę. Te skróty milczą, gdy piszesz w polu tekstowym.',
      'Pasma EQ, punkty automatyzacji i parametry sensoryczne używają tych samych kontrolek co wskaźnik: suwaków, pól liczbowych i edytorów bez przeciągania, gdy włączone jest edytowanie bez przeciągania albo obsługa klawiaturą. Zadania z przewodnikiem zaliczają te prawdziwe edycje. Pokaż gdzie przenosi fokus tylko wtedy, gdy sam to uruchomisz.',
      'Skróty klawiszowe, w menu Ustawień, pokazują aktualny rejestr w grupach: Nawigacja, Transport, Edycja, Efekty, Automatyzacja i Zadania z przewodnikiem. Focus używa tych samych klawiszy. Zamknięcie przywraca fokus i nie restartuje odtwarzania.',
    ],
  },
  {
    id: 'accessible-waveform',
    title: 'Dostępna fala',
    body: [
      'Dostępna nawigacja po nagraniu jest w Ustawienia → Dostępność → Interakcja. Jest wyłączona, dopóki jej nie włączysz. Po włączeniu obok dotychczasowej fali pojawia się Otwórz nawigację po nagraniu. Narzędzia otwierają się w panelu, który można przewijać i zamknąć. Nie rysują drugiej fali i nie zmieniają silnika audio.',
      'Region fali zachowuje nazwę, czas, liczbę kanałów, częstotliwość próbkowania, głowicę i zaznaczenie niezależnie od tej preferencji. Strzałki, Home i End na fali nadal przesuwają głowicę. Czytnik ekranu nie dostaje czasu na każdej klatce audio.',
      'Otwórz nawigację po nagraniu, a potem użyj Idź na początek, Idź na koniec, Krok wstecz i Krok naprzód. Krok nawigacji to menu: 10 sekund, 1 sekunda, 100 milisekund, 10 milisekund albo 1 próbka. Jedna próbka używa częstotliwości tego nagrania. Pozostałe kroki są w milisekundach i nie obiecują dokładności próbki.',
      'Idź do czasu przyjmuje ten sam zegar co reszta edytora, na przykład 00:12.350. Czas ma być od zera do końca nagrania. Odczytaj pozycję głowicy mówi bieżący czas, gdy o to poprosisz. Nie mówi w trakcie odtwarzania.',
      'Ustaw początek na głowicy i Ustaw koniec na głowicy zapisują prawdziwe zaznaczenie. Edytuj czasy zaznaczenia wpisuje obie krawędzie. Wyczyść zaznaczenie usuwa częściowe podświetlenie. Początek musi być wcześniejszy niż koniec, a zakres ma mieć co najmniej 50 milisekund. Zły czas jest odrzucany i wyjaśniany. Odsłuch zaznaczenia odtwarza bieżące zaznaczenie. Nie startuje, gdy kontrolki dostaną fokus.',
      'Przytnij, Fade in, Fade out, Normalizuj, Pętla i Eksportuj zaznaczenie używają tych samych działań co reszta FIELD, w trybach, które już je mają. Tryb Sensoryczny zostawia nawigację i zaznaczenie. Nie dodaje przycięcia, którego ten tryb nie miał.',
      'Punkty charakterystyczne to czasy, do których można skoczyć. Początek nagrania, koniec nagrania oraz krawędzie zaznaczenia albo pętli są dokładne. Wykryty transient, możliwa cisza i zmiana poziomu są przybliżone. Transient to nagły wzrost, a nie uderzenie bębna albo bit. Możliwa cisza znaczy, że poziom został poniżej około −48 dBFS przez krótki odcinek. To nie jest cisza absolutna. Poprzedni punkt i Następny punkt przesuwają prawdziwą głowicę i nie edytują audio.',
      'Zbadaj sygnał, w trybie Sterowanie, odczytuje szczyt i RMS w oknie 50 milisekund wokół głowicy. Nagranie stereo pokazuje lewy i prawy kanał osobno. To poziomy cyfrowe w dBFS. To nie jest pomiar głośności odczuwanej.',
      'Tab, Shift+Tab, Enter, Spacja i Escape obsługują te narzędzia. Escape zamyka panel i wraca fokus do przycisku, który go otworzył. Wybór punktu nie przenosi fokusu poza listę. Te same narzędzia działają w trybie Focus i same nie wznawiają odtwarzania.',
      'Automatyczne wykrywanie może pominąć uderzenie, oznaczyć szum albo postawić czas odrobinę za wcześnie lub za późno. Bardzo ciche tło nie jest gwarantowaną ciszą. Zadania z przewodnikiem zaliczają prawdziwe zaznaczenie, przycięcie i zanik, także te zrobione tutaj bez przeciągania.',
    ],
  },
  {
    id: 'audio-markers',
    title: 'Punkty charakterystyczne i znaczniki',
    body: [
      'Znacznik to nazwa jednego momentu wczytanego nagrania. To punkt na osi czasu, a nie zaznaczenie. Dodanie, zmiana nazwy albo usunięcie znacznika nie zmienia audio, efektów, prędkości ani wysokości dźwięku.',
      'Znaczniki zostają zamknięte, dopóki ich nie otworzysz. W trybie Technicznym kontrolka jest na pasku fali: romb, słowo Znaczniki i liczba zapisanych znaczników. Prosty i Sensoryczny trzymają tę samą zwartą kontrolkę w nagłówku. Lista otwiera się obok kontrolki. Na wąskim ekranie jest krótkim arkuszem nad transportem. Otwarcie nie zmienia wysokości fali, transportu ani inspektora. Plus dodaje znacznik w miejscu głowicy i otwiera nazwę, czas i opis w tej samej liście. Zegar jest ten sam co w reszcie edytora, na przykład 00:12.350. Pierwsze nazwy to Znacznik 1, Znacznik 2 i dalej.',
      'Idź przesuwa istniejącą głowicę do tego znacznika i zostawia zaznaczenie. Poprzedni znacznik i Następny znacznik robią to samo. Nie przeskakują z ostatniego na pierwszy. Czytnik ekranu słyszy nazwę i czas przy takim skoku. Samo odtwarzanie nie ogłasza znaczników.',
      'Zmiana obejmuje nazwę, opis, czas albo kolor. Dwukrotne kliknięcie rombu lub jego nazwy na fali, albo dwukrotne kliknięcie nazwy na liście, otwiera ten edytor. Kolor to jedna próbka z palety śladu. Czas przed zerem, po końcu nagrania albo w złej postaci jest odrzucany i wyjaśniany. Znacznik zostaje na miejscu. Usuń kasuje ten znacznik. Cofnij i Ponów używają tej samej historii projektu co inne edycje.',
      'Znaczniki zapisują się w presecie projektu razem z identyfikatorami, nazwami, opisami, czasami i kolorami. Należą do nazwy pliku, częstotliwości próbkowania i czasu trwania, z którymi je zapisano. Wczytanie tego presetu na inne nagranie ich nie dokleja. Preset zapisany przed znacznikami nadal się wczytuje. Uszkodzony wpis jest pomijany.',
      'Wczytanie innego pliku audio czyści bieżące znaczniki. Nie przenosi ich na nowy plik. Przytnij i Użyj jako sample też je czyszczą, bo bufor jest zastępowany. Wytnij, wklej i wstawienie ciszy zostawiają znaczniki przy tym samym audio i idą za tą edycją. Znacznik, który leżał w usuniętym fragmencie, znika. Nie jest przesuwany w inne miejsce.',
      'Propozycje, w trybie Technicznym, zostają zwinięte. To pozycje ciszy, transientów i zmian poziomu, które już znajduje Dostępna fala. Każdy wiersz pokazuje czas, potem nazwę, a pod spodem Zapisz jako znacznik. Wskazanie wiersza rysuje to miejsce na fali z połową krycia, dopóki wskaźnik nie zejdzie. Zapisz jako znacznik zapisuje tę jedną, którą wybierzesz. FIELD nie zamienia całej listy w znaczniki. Początek nagrania, koniec nagrania, krawędzie zaznaczenia i pętli zostają punktami charakterystycznymi. Nie stają się twoimi znacznikami, dopóki jednego nie zapiszesz.',
      'Na fali znacznik to przerywana linia z rombem pod paskiem edycji. Głowica zostaje linią ciągłą. Krawędzie zaznaczenia, uchwyty zaników i punkty automatyzacji zachowują własne kształty. Etykiety, które nachodziłyby na siebie, są ukrywane. Każdy znacznik zostaje na liście. Chwyć romb i przeciągnij w bok, aby przesunąć ten znacznik. Puszczenie zapisuje jeden krok cofania. Kliknięcie rombu nadal przenosi tam głowicę. Lista nadal zmienia czas dokładnie, więc nie trzeba przeciągać. Wysoka widoczność zostawia obrys na rombie i na wybranym wierszu oraz zostawia linię znacznika czytelną.',
      'Wiersz przesuwa głowicę do tego znacznika. Menu akcji zmienia nazwę, czas, opis albo usuwa znacznik. Nie trzeba przeciągać. Na telefonie ta sama lista służy do dokładnej zmiany czasu.',
      'Ctrl+Shift+E albo Cmd+Shift+E dodaje znacznik w miejscu głowicy i zostawia listę zamkniętą. Ctrl+Shift+strzałka w górę i Ctrl+Shift+strzałka w dół idą do poprzedniego i następnego znacznika. Ctrl+Shift+U otwiera Znaczniki. Te same klawisze są w Skrótach klawiszowych. Milczą, gdy fokus jest w polu tekstowym, i nie działają w trakcie zwykłego odtwarzania.',
    ],
  },
  {
    id: 'reset',
    title: 'Reset',
    body: [
      'Reset aplikacji na górnym pasku wraca do czystej sesji FIELD bez przeładowania strony. Zatrzymuje dźwięk, usuwa sample, czyści efekty, automatyzację, modulację i stan edycji. Przywraca też preferencje FIELD ACCESS, w tym Rozmiar interfejsu i Rozmiar tekstu, do wartości domyślnych.',
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
    title: 'Dostęp słuchowy',
    body: [
      'Dostęp słuchowy to warstwa dostępności, a nie czwarty tryb edycji. Włącza się ją w Ustawienia → Dostępność → Dostęp słuchowy. Działa w trybach Prosty, Sterowanie i Słuch. Domyślnie jest wyłączona. FIELD nie wnioskuje z tego przełącznika o niepełnosprawności.',
      'Panel otwiera przycisk Dostęp słuchowy, ikona ucha tuż na lewo od Eksportuj. Powiększ powiększa okno, Przywróć wraca do rozmiaru domyślnego. Każdy róg ma uchwyt zmiany rozmiaru, a rozmiar i pozycja zostają zapamiętane. Przeciągnięcie nagłówka odpina panel; Dokuj stawia go z powrotem. Gdy okno jest małe, treść ma margines obok paska przewijania. Lista tagów ma jeden rząd, w panelu i w focusie dostępu słuchowego. Każdy tag ma cienką obwódkę i lekko zaokrąglone rogi. Nie ma paska przewijania. Dźwięk to odczyt na żywo i Oryginał → słyszane. Zdarzenia to lista zmierzonych momentów — klik wiersza przesuwa głowicę; pusta lista znaczy, że w tym zakresie nie ma ataku, przerwy ani przesterowania. Przestrzeń to balans, szerokość, korelacja i mid/side oraz obraz głowy podążający za głowicą. Dynamika to poziom, szczytowość i przesterowanie pełnej skali. Porównanie to tabela dla każdego włączonego efektu. Haptyka może wysłać impuls testowy, gdy przeglądarka udostępnia wibrację. Dłuższe wyjaśnienia są pod przyciskiem informacji.',
      'Profil wybiera użytkownik. Assisted listening dokłada pomiary do zwykłego odsłuchu. Visual first stawia na mapę dźwięku, odcisk, zdarzenia, przestrzeń, dynamikę i liczby, gdy odsłuch nie jest wiarygodny. Visual + haptic dodaje opcjonalne impulsy tam, gdzie urządzenie naprawdę ma wibrację.',
      'Mapa dźwięku pokazuje czas, region częstotliwości i energię. Regiony to SUB, BASS, LOW MID, MID, HIGH MID, HIGH i AIR. Każdy ma etykietę, pozycję, fakturę i kolor wzięty z aktywnego motywu. Sam kolor nic nie znaczy, więc mapa zostaje czytelna w motywach Black & White, Noire i Eyes Friendly. Ataki to cienkie pionowe linie w czasie, w którym się pojawiają, przez wiersze pasm. Wiersze stykają się krawędziami, więc nie ma siatki kwadratów do wyrównania. Klik linii stawia znak na początku tego ataku na fali i przesuwa głowicę. Ikona linii pod legendą fali pokazuje albo ukrywa ten znak. Widok się nie przybliża. Nie edytuje audio.',
      'Oryginał → słyszane to jedyny obraz pasm w Dźwięku. Składa próbkę albo zaznaczenie przed efektami i to, co słychać po pitchu i EQ, na jednym pasku pasma. Poziomy idą od −96 dB do 0 dB, więc cichsze wysokie pasmo zostaje widoczne obok głośnego basu. Szczyt, RMS i szczytowość zostają w Dynamice. Bledszy pasek to oryginał, a kreska oznacza jego koniec. Jaśniejszy pasek to to, co słychać po pitchu i aktualnej krzywej EQ. Jasne przedłużenie za kreską to podbicie. Bledsza resztka za jaśniejszym paskiem to tłumienie. Kolor idzie z motywu, a nazwa pasma zostaje obok.',
      'Opisy na żywo, takie jak MOCNY BAS, ENERGIA GÓRY, ENERGIA AIR, WIĘCEJ Z LEWEJ, WIĘCEJ Z PRAWEJ, NISKA KORELACJA, PRZESTEROWANIE, BLISKO PEŁNEJ SKALI, SKŁADOWA STAŁA albo SZEROKIE STEREO, wynikają z opisanych progów i histerezy, żeby etykiety nie mrugały. SZEROKIE STEREO i WĄSKIE STEREO nie pojawiają się razem: gdy pomiar przechodzi na drugą stronę, stara etykieta znika od razu. To samo dotyczy GŁOŚNO i CICHO. Każda etykieta ma wyjaśnienie z wartością pomiaru. Każdy tag ma tę samą wysokość w panelu i w focusie dostępu słuchowego. Lista ma wysokość jednego rzędu. Każdy tag ma cienką obwódkę i lekko zaokrąglone rogi. Nie ma paska przewijania. Tagi nut i charakteru podążają za głowicą. Składowa albo charakter, taki jak TONALNY, SZUMOWY, PERKUSYJNY, UTRZYMANY, JASNY, CIEMNY, HARMONICZNY albo NIEHARMONICZNY, pojawia się, gdy ten moment jest pod głowicą, a nie dla całej próbki naraz. Klik tagu nuty odtwarza krótki zsyntezowany sinus tej częstotliwości. Podgląd jest cichy, wysokie częstotliwości są jeszcze cichsze, a limiter go ogranicza. To nie jest sama próbka i nie przechodzi przez wyjście instrumentu. Suwak Notes nad tagami ustawia, ile składowych bieżącego momentu widać. Niska czułość zostawia najgłośniejszą jedną albo dwie. Wysoka dodaje cichsze, do około sześciu, a ta sama nuta pojawia się raz. Cisza nie wymyśla nuty. FIELD nie nazywa dźwięku dobrym, złym, ciepłym ani profesjonalnym.',
      'Before / after porównuje zmierzony bufor ze zmianą wynikającą z aktywnego efektu: magnituda EQ, gain, redukcja wzmocnienia kompresora, powtórzenia delay, ogon pogłosu oraz szerokość lub balans. Compare pokazuje każdy włączony efekt jako osobną tabelę: miara, wartość przed, wartość po i zmiana. Czasy delay i decay pogłosu biorą się z tych samych parametrów co DSP. Czas pogłosu wynika z parametrów. To nie jest zmierzony RT60.',
      'Mapa dynamiki oznacza ciche, głośne, transjent i rzeczywiste przesterowanie pełnej skali na cienkim pasku fali, gdzie słupek oznacza poziom. Wysokość słupka to szczyt tego odcinka czasu. Trójkąt to krótki atak. Wykrzyknik to przesterowanie pełnej skali. Pasek leży pod falą i nad linijką czasu, więc nie zasłania wykresu. Znaki stoją we własnym rzędzie nad słupkami poziomu. Głośny materiał poniżej pełnej skali nie jest przesterowaniem. Na fali transjent to cienka pionowa linia, ten sam znak co Wejście → Oznacz transjenty. Każdy wiersz pasma używa stałej skali głośności, więc cichsze wysokie pasmo zostaje widoczne obok głośniejszego basu. Próbka z mocnym basem nadal może być głównie basem. To jest poziom, a nie ukryte wysokie. Jedno uderzenie może zapalić kilka trójkątów na pasku poziomu. Na mapie dźwięku atak to cienka pionowa linia w zmierzonym czasie. Detekcja zdarzeń może oznaczyć transjent, ciszę, głośne zdarzenie, niską częstotliwość, odcinek tonalny, możliwy klik i możliwe przesterowanie. Pokaż albo wiersz zdarzenia przesuwa głowicę. Audio nie jest przepisywane samo.',
      'Mapa przestrzeni podaje balans, szerokość, korelację i energię mid/side, w tym neutralne ostrzeżenie, gdy korelacja sugeruje problem zgodności z mono. Obraz głowy, widziany z góry, podąża za głowicą. Rozpiętość idzie za szerokością, a pusty znacznik ma niską korelację. Pole jest oddzielone od głowy i biegnie w czasie z góry na dół. Dłuższy znacznik jest szerszy. Znaczniki podążają za panoramą, szerokością, balansem i Haasem mid/side oraz delayem, który zastępuje jeden kanał. Balans próbki zostaje obok słyszanego balansu. Plik mono zostaje wąski, a panorama i tak go ustawia. Pomoc EQ pokazuje częstotliwość, nutę, region, gain, Q i zakres, który naprawdę rusza odpowiedź filtra. Dłuższe wyjaśnienia są pod przyciskiem informacji.',
      'Pokaż przy warunku asystenta kadruje ten zakres na fali i przesuwa głowicę. Nie edytuje audio. Ikona Słuch obok pozostałych widoków otwiera focus dostępu słuchowego: mapę dźwięku po pitchu, tagi na żywo, wskaźnik głośności, głowę podążającą za odtwarzaniem i pole przestrzeni, w tej samej ramce co Fala, EQ, FFT i automatyzacja. Ten widok nie pokazuje pasków EQ. Przeciągnięcie po fali w tym widoku zaznacza fragment. Puszczenie zamienia zaznaczenie w pętlę. Klik tylko przesuwa głowicę. Pasek pod falą może oddać fali większość ekranu albo ją zmniejszyć. Heard, szerokość, korelacja, room i distance stoją w jednym rzędzie. Każda wartość ma stałą szerokość, więc zmiana jednej nie przesuwa pozostałych. Pionowy wskaźnik głośności stoi po prawej. Korzysta z tego samego odczytu szczytu co główny miernik i nazywa poziom: cicho, średnio, głośno, bardzo głośno albo clipping, na skali od −60 dBFS do 0. W trakcie odtwarzania słupki śledzą wyjście. Gdy odtwarzanie stoi, słupki opadają do ciszy, więc gorący szczyt próbki nie jest nazywany very loud. Szczyt próbki i RMS zostają wypisane jako liczby. Legenda pod skalą czasu włącza i wyłącza przerywane linie transjentów oraz symbole na wykresie. Linie są ukryte, dopóki nie włączysz Input → Mark transients, i ta sama przerywana linia jest w widoku fali oraz w Hearing focus. Czułość tych znaków stoi we własnym rzędzie pod Detect tempo i Tap tempo, żeby suwak nie wchodził pod przycisk tap. Pole przestrzeni podąża za panoramą, mid/side i delayem, także gdy delay wpada w jeden kanał. Na głowie większy reverb size albo większa odległość rysuje mniejszą głowę. Obraz nie ma obrysu pokoju ani kropek po bokach. Źródło stoi przed głową i idzie do przodu, gdy rośnie reverb distance. Wet nie przesuwa źródła. Gdy wet jest powyżej zera, mapa dźwięku przenosi energię do przodu zgodnie z decay i tłumi wysokie wiersze, gdy źródło jest dalej. Pole przestrzeni rysuje krótki ogon pod każdym znacznikiem. Wet równe zero zostawia te wykresy bez zmian. Prawa krawędź pola przestrzeni dzieli to tak samo: dłuższa linia to większy pokój, a kropka to odległość źródła. Ikona focus w lewym górnym rogu fali, pasków EQ, widoku automatyzacji i panelu Hearing Access otwiera ten widok. Na widmie i wykresie EQ stoi nad menu •••. W focusie Hearing Access róg fali zostaje pusty, a Panel otwiera pełny panel Hearing Access. Na focusie fali, widma i automatyzacji odczyt stoi pod belką, żeby nie zasłaniać odtwarzania i wyjścia. EQ Focus tego odczytu nie pokazuje.  Na tym widoku są Fit, oddalenie i przybliżenie. Podwójne kliknięcie przybliża falę do zaznaczenia, kolejne dopasowuje całą próbkę. Porównanie EQ zostaje w panelu.',
      'Monitoring assistance to ograniczone podbicie low/mid/high tylko na ścieżce odsłuchu, za safety gain i przed wyjściem sprzętowym. To nie jest aparat słuchowy. Nie wchodzi do eksportu. Eksport renderuje silnik offline, który tego filtra nie wstawia.',
      'Haptyka jest opcjonalna. FIELD uznaje wibrację za dostępną, gdy przeglądarka ją udostępnia, a Test pulse sprawdza, czy urządzenie przyjmuje jeden wzorzec. Przeglądarka bez wibracji mówi o tym wprost. Intensywność: off, low, medium, high. Impulsy w trakcie odtwarzania wymagają intensywności powyżej off. Mają limit częstości. Frequency haptics są eksperymentalne i można je wyłączyć.',
      'Wizualny asystent miksu wymienia warunki techniczne: możliwe przesterowanie, energia niskich częstotliwości, nierównowaga kanałów, niska korelacja, zakres dynamiki, długa cisza i składowa stała. Pokaż przesuwa głowicę. Nie naprawia audio.',
      'W trybie Focus dostęp słuchowy zostaje jednym odczytem na aktywnym wykresie: szczyt i zakres fali, dominująca częstotliwość widma albo wartość zapisana i efektywna parametru automacji. EQ Focus tego odczytu nie pokazuje. Wykres pozostaje główną powierzchnią.',
      'Ograniczenia: Dostęp słuchowy daje wizualną, liczbową i opcjonalnie dotykową reprezentację mierzalnych właściwości dźwięku. Nie odtwarza każdego percepcyjnego aspektu słyszenia i nie gwarantuje, że miks będzie subiektywnie poprawny dla każdego słuchacza. Monitoring assistance nie jest medycznym urządzeniem słuchowym. Liczby voice/background, jeśli się pojawią, są szacunkiem i są pomijane, gdy widmo jest wąskim tonem albo wynik jest niejednoznaczny.',
    ],
  },
  {
    id: 'shed',
    title: 'SHED',
    body: [
      'SHED to lokalny widok architektoniczny wewnątrz FIELD, część projektu INTERFERENCJE. Służy do składania wirtualnej szopki krakowskiej z edytowalnych rysunków tuszem. Później każdy element architektoniczny będzie mógł odpowiadać jednemu nagraniu terenowemu z Krakowa. Ta wersja trzyma kompozycję na tym urządzeniu. Nie synchronizuje danych między urządzeniami. Nie używa konta ani Google Drive i nie odtwarza własnego audio.',
      'Arkusz jest ciepłym pergaminem. Każdy element jest studium piórkiem i akwarelą w jednej gramatyce: cienki tusz, płaskie lawowanie i trochę złota na ornamencie. Domyślna wieża idzie za wyższą wieżą kościoła Mariackiego: ceglany trzon, wapienna baza, ostrołukowe okna, galeria i wysoki hełm ze sterczyną w każdym narożniku. Biblioteka ma też hełm niższej wieży, wieżę Wawelu, basztę, fasady kamienicy i Sukiennic, dachy, arkady, bramy, attyki i ornamenty.',
      'Obie wieże Mariackie rysuje zasiane studium tuszem i akwarelą. Przesunięcie wieży zostawia jej kontury, okna i lawowanie. Okna zmieniają rytm otworów, a niższy wariant dostaje hełm latarniowy. Zapisana scena bez ziarna zostawia wymiary i bierze stabilny rysunek z elementu. Wawel, baszta i pozostałe kategorie zostają przy rysunku biblioteki.',
      'SHED otwiera przełącznik Warsztat | SHED w nagłówku. Warsztat wraca do trybu edycji, którego już używasz. Prosty, Techniczny i Sensoryczny zostają takie, jakie były. Przełączenie nie uruchamia silnika audio od nowa, nie usuwa wczytanego sampla i nie czyści parametrów edycji.',
      'Dodaj element otwiera bibliotekę form Krakowa: Wieża, Fasada, Dach, Arkada, Brama, Attyka i Ornament. Każdy wiersz pokazuje mały rysunek tej kategorii. Wybór dodaje element do sceny, zaznacza go i otwiera jego ustawienia. Istniejące elementy zostają na miejscu. Na wąskim ekranie biblioteka jest dolnym arkuszem, a inspektor siada pod arkuszem, więc rysunek zostaje widoczny.',
      'Element zaznaczasz kliknięciem, dotknięciem albo fokusem i Enter. Przerywany obrys i znacznik w rogu pokazują zaznaczenie. Gdy elementy nachodzą na siebie, wierzch przejmuje wskaźnik. Tab nadal dochodzi do tych pod spodem. Panel pokazuje tylko ustawienia tej kategorii: rozmiar, wariant architektoniczny, kolory, położenie i warstwę. Przeciągnięcie przesuwa element. Na ekranie dotykowym pierwsze stuknięcie zaznacza, a kolejne przeciągnięcie przesuwa, więc przesuwanie pergaminu nie rusza budynku przypadkiem. Strzałki też przesuwają element, a Shift robi mniejszy krok. To samo robią suwaki położenia. Przesuń na wierzch i Przesuń pod spód zmieniają kolejność rysowania. Duplikuj kopiuje element. Usuń element usuwa go. Przywróć wraca do początkowych proporcji, przygaszonych kolorów domyślnych i miejsca tego elementu.',
      'Powiększ, Pomniejsz i Resetuj widok zmieniają kadr. Lewo, Prawo, Góra i Dół robią to samo, a przeciągnięcie pustego pergaminu przesuwa widok bez ruszania budynku. Położenia elementów zostają w scenie, więc powiększenie i przesunięcie ich nie przepisują.',
      'Zmiany zapisują się w tej przeglądarce w dokumencie SHED. Kompozycja zapisana przez pierwszą wersję SHED, z jej wieżą, nadal się otwiera. Po odświeżeniu strony elementy wracają. Gdy zapis jest nieczytelny, FIELD przywraca bezpieczną domyślną scenę i mówi o tym. Nowszego dokumentu, którego ta wersja nie rozumie, nie nadpisuje. Linia zapisu mówi Zapisano. Ten zapis zostaje na tym urządzeniu.',
      'Architektura i Miasto to osobne sceny. Architektura to wolny pergamin. Miasto to rysunek Starego Miasta w Krakowie z OpenStreetMap, © OpenStreetMap contributors, na licencji Open Database License. Przełącznik zostawia drugą scenę tam, gdzie była, i nie uruchamia silnika audio od nowa. Działki w Mieście to wirtualne miejsca gry, a nie działki ewidencyjne. Wybierz przykładowego autora, zaznacz wolną działkę i postaw jeden budynek z biblioteki architektonicznej. Usunięcie budynku zwalnia działkę. Jeden lokalny dokument miasta nie położy dwóch budynków na tej samej działce. Liczniki autorów zostają na tym urządzeniu. Powiązanie z nagraniem jest zostawione na później. Ta wersja nie wgrywa audio, a wybrany autor nie jest kontem.',
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
