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
      'Choose Technical, Simple, or Sensory when FIELD opens. Technical is the full editor. Simple and Sensory are thinner control surfaces over the same engine.',
      'Grant audio when the browser asks. If the status says audio is blocked, interact with the page again so the AudioContext can start.',
    ],
  },
  {
    id: 'load',
    title: 'Loading audio',
    body: [
      'Load sample is the primary action. It opens a file picker. You can also drop a file onto the editor.',
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
      'Play/Pause, Stop, and Loop stay on the transport. Play from start jumps to the beginning of the sample rather than the selection.',
      'On a narrow desktop the secondary actions compress, then move into More. They do not wrap onto a second row. The phone transport keeps large targets and does not force the full desktop labels.',
    ],
  },
  {
    id: 'wave',
    title: 'Waveform editing',
    body: [
      'Drag across the waveform to set the selection. Drag the edges to resize it. Pinch with two fingers to zoom. Scroll or drag to pan when the view is zoomed.',
      'The overview under the wave shows the whole sample. Fit returns the view to the full duration.',
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
      'The start of the chain is the input gain. Make mono folds the sample to one channel. Record captures the microphone into the sample slot when the browser allows it.',
    ],
  },
  {
    id: 'chain',
    title: 'Audio chain',
    body: [
      'Modules run in series from input to output. Add, remove, bypass, and reorder them from the chain. Each added effect is its own instance with its own settings, even when the type matches one already in the chain.',
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
      'Each EQ instance has its own bands. Band and comb gain run from −24 dB to +24 dB. Focus lists every active band on the left of the graph: color, name, frequency, and type. Choosing a row or a graph node selects the same band. The knobs stay centered over the grid when the filter type changes.',
      'Focus lists the filters on the left of the graph. The knobs sit on the center of the screen and float over the grid. The pointer shows frequency first, then the note, for example 440 Hz · A4. The graph menu sets grid density 6, 12, or 24, the axis scale Lin, Log, or Mel, and the spectrum layer Before, After, or Both. Guides use the usual round frequencies on a logarithmic axis unless Lin is selected, and the numbers sit under the axis line.',
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
    body: ['The compressor instance has its own threshold, ratio, attack, release, and makeup. It is not the master safety limiter.'],
  },
  {
    id: 'delay',
    title: 'Delay',
    body: ['Time, feedback, and wet are per delay instance. In stereo, LEFT and RIGHT start below the mono/stereo switch with a shared gap. Kill FX cuts delay and reverb tails without removing the modules.'],
  },
  {
    id: 'reverb',
    title: 'Reverb',
    body: ['Each reverb instance keeps its own size, decay, and wet mix, and its own impulse response.'],
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
    ],
  },
  {
    id: 'random',
    title: 'Random',
    body: ['Random offsets parameters inside their allowed ranges. The safety limiter is excluded so Random cannot push it into an unsafe setting.'],
  },
  {
    id: 'chaos',
    title: 'Chaos',
    body: [
      'Chaos is the button immediately left of Settings. Turning it on enables the chain safety limiter if that limiter was bypassed or missing. It does not add a second limiter, and it does not add makeup gain.',
      'If you bypass the limiter while Chaos stays on, FIELD leaves that choice until you leave Chaos and enter it again.',
    ],
  },
  {
    id: 'views',
    title: 'WAVE, FFT, EQ, and AUTO',
    body: [
      'WAVE shows the sample. FFT shows the spectrum of the playing audio. EQ opens the equalizer workspace. AUTO opens automation. These are views of the same project.',
    ],
  },
  {
    id: 'focus',
    title: 'Focus mode',
    body: [
      'Focus mode fills the editor with one task: wave, FFT, EQ, or automation. Exit returns to the normal layout. In WAVE Focus, fade handles are inset below the toolbar.',
      'EQ Focus knobs are the larger minimal variant. The indicator follows the effective value, including LFO motion, and takes its accent from the selected band.',
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
      'The panel opens from the Hearing Access button. Enlarge grows it; Restore returns the default size. Each corner has a resize handle, and the size and position are remembered. Drag the header to detach the panel; Dock puts it back. When the panel is small, the scrolling text keeps a margin beside the scrollbar. Live tags stay in their own scrolling row so they do not push the fingerprint. Sound is the live reading and the fingerprint. Events lists measured moments — click a row to move the playhead; an empty list means this scope has no qualifying attack, gap, or clip. Space is stereo balance, width, correlation, and mid/side, plus a head picture of the heard image. Dynamics is level, crest, and full-scale clipping. Compare is the measured change from the effects that are actually on. Haptics explains whether this device can vibrate.',
      'Choose a profile. Assisted listening adds measurements beside ordinary monitoring. Visual first prioritizes the sound map, fingerprint, events, space, dynamics, and numbers when auditory monitoring is not reliable. Visual + haptic adds optional pulses on devices that actually support vibration.',
      'The sound map shows time, frequency region, and energy. Regions are SUB, BASS, LOW MID, MID, HIGH MID, HIGH, and AIR. Each region has a label, a vertical position, a texture, and a color taken from the active theme. Color is never the only channel, so the map stays readable in Black & White, Noire, and Eyes Friendly themes. Squares along the top are transients. Click a square to frame that moment on the waveform and move the playhead. It does not edit the audio.',
      'Sound fingerprint describes the original sample or selection before effects. Band bars are mean level from −96 dB to 0 dB, so a quieter high band stays visible beside a louder bass band. It also reports peak, RMS, crest factor, and a dominant frequency only when a narrow partial is actually present. Silence does not invent a note. When pitch is not zero, the fingerprint names the heard dominant frequency. Original → heard puts both levels on one bar per band. The dimmer bar is the original. The brighter bar is what you hear after pitch and the current EQ curve. Its color follows the theme and the band name stays beside it.',
      'Live descriptions such as BASS-HEAVY, HIGH-BAND ENERGY, AIR ENERGY, LEFT-HEAVY, RIGHT-HEAVY, LOW CORRELATION, CLIPPING, NEAR FULL SCALE, DC OFFSET, or WIDE STEREO come from documented thresholds, with hysteresis so labels do not flicker. Each label has an explanation that includes the measured value. The same tags appear in Hearing Access focus. FIELD does not call a sound good, bad, warm, or professional.',
      'Before / after compares the measured buffer with the change implied by the active effect: EQ magnitude, gain, compressor gain reduction, delay repeats, reverb tail, and stereo width or balance. Delay times and reverb decay follow the same parameters as the DSP. Reverb duration is parameter-derived. It is not a measured RT60.',
      'The dynamics map marks quiet, loud, transient, and actual full-scale clipping on a thin waveform strip. Loud audio below full scale is not labeled as clipping. Event detection can mark transients, silence, loud events, low-frequency events, tonal stretches, possible clicks, and possible clipping. Choose Show or an event row to move the playhead. Nothing is rewritten automatically.',
      'The space map reports balance, width, correlation, and mid/side energy, including a neutral warning when correlation suggests a mono-compatibility issue. A head picture, seen from above, places the heard image in front of the listener: the left ear is on the left and the right ear is on the right. Spread follows width, and a hollow mark has low correlation. The field below runs in time from top to bottom. Left is the left edge and right is the right edge. A longer mark is wider. Pan and the left/right channel gains move both pictures; the sample balance stays listed beside the heard balance. A mono file stays narrow, and pan still places it. EQ assistance shows the selected band’s frequency, note, region, gain, Q, and the frequency span the real filter response actually moves.',
      'Show, on a mixing-assistant finding, frames that time span on the waveform and moves the playhead. It does not edit the audio. The Hearing icon beside the other view icons opens Hearing Access focus: the sound map after pitch, the live tags, a head picture, and the space field, using the same focus chrome as Wave, EQ, FFT, and automation. Drag the bar under the waveform to shrink or grow that part of the screen. Fit, zoom out, and zoom in sit on that view. Double-click zooms the waveform to the selection; double-click again fits the sample. The EQ comparison stays in the panel.',
      'Monitoring assistance is a bounded low/mid/high emphasis on the speaker path only, after the safety gain and before the hardware output. It is not a hearing aid. It is not included in export. Exported audio is rendered by the offline engine, which never inserts this filter.',
      'Haptics are optional and feature-detected. Unsupported browsers explain that vibration is unavailable instead of pretending. Intensity is off, low, medium, or high. Pulses are rate-limited. Frequency haptics are experimental and can be disabled.',
      'The visual mixing assistant lists technical conditions such as possible clipping, low-frequency energy, channel imbalance, low correlation, dynamic range, long silence, and DC offset. Show moves the playhead. It does not fix the audio.',
      'In Focus mode Hearing Access stays a single readout on the active graph: the selected EQ band, waveform peak and scope, dominant spectrum frequency, or the automation parameter’s stored and effective values. The graph remains the main surface.',
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
      'Na starcie wybierz Technical, Simple albo Sensory. Technical to pełny edytor. Simple i Sensory to cieńsze powierzchnie tego samego silnika.',
      'Zezwól na dźwięk, gdy przeglądarka zapyta. Jeśli status mówi, że audio jest zablokowane, kliknij stronę jeszcze raz, żeby AudioContext mógł wystartować.',
    ],
  },
  {
    id: 'load',
    title: 'Wczytywanie audio',
    body: [
      'Wczytaj sample jest główną akcją. Otwiera wybór pliku. Plik można też upuścić na edytor.',
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
      'Play/Pause, Stop i Loop zostają na transporcie. Play from start skacze na początek sampla, nie zaznaczenia.',
      'Na węższym pulpicie akcje drugorzędne najpierw się zagęszczają, potem wchodzą do Więcej. Nie zawijają się do drugiego rzędu. Transport telefonu ma duże cele i nie wciska pełnych etykiet pulpitu.',
    ],
  },
  {
    id: 'wave',
    title: 'Edycja fali',
    body: [
      'Przeciągnij po fali, aby ustawić zaznaczenie. Krawędzie zmieniają jego długość. Uszczypnięcie dwoma palcami przybliża. Przewijanie albo przeciąganie przesuwa widok, gdy jest przybliżony.',
      'Pasek pod falą pokazuje cały sample. Fit wraca do pełnej długości.',
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
      'Początek łańcucha to wzmocnienie wejścia. Make mono składa sample do jednego kanału. Nagrywanie zapisuje mikrofon w slocie sampla, gdy przeglądarka na to pozwala.',
    ],
  },
  {
    id: 'chain',
    title: 'Łańcuch audio',
    body: [
      'Moduły idą szeregowo od wejścia do wyjścia. Dodajesz, usuwasz, omijasz i zmieniasz ich kolejność w łańcuchu. Każdy dodany efekt jest osobną instancją, nawet gdy typ już jest w łańcuchu.',
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
      'Każda instancja EQ ma własne pasma. Gain pasma i grzebienia sięga od −24 dB do +24 dB. Focus pokazuje listę aktywnych filtrów po lewej stronie wykresu: kolor, nazwę, częstotliwość i typ. Wiersz i węzeł na wykresie wybierają to samo pasmo. Pokrętła zostają na środku siatki przy zmianie typu.',
      'Lista filtrów stoi po lewej stronie wykresu. Pokrętła są na środku ekranu i unoszą się nad siatką. Wskaźnik pokazuje najpierw częstotliwość, potem nutę, na przykład 440 Hz · A4. Menu wykresu ustawia gęstość 6, 12 albo 24, skalę Lin, Log albo Mel oraz warstwę widma Before, After albo Both. Prowadnice używają zwykłych okrągłych częstotliwości i leżą logarytmicznie, dopóki nie wybierzesz Lin. Liczby stoją pod poziomą osią.',
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
    body: ['Instancja kompresora ma własny próg, ratio, attack, release i makeup. To nie jest główny limiter bezpieczeństwa.'],
  },
  {
    id: 'delay',
    title: 'Delay',
    body: ['Czas, feedback i wet są osobne dla każdej instancji delay. W stereo panele LEFT i RIGHT zaczynają się pod przełącznikiem mono/stereo ze wspólnym odstępem. Kill FX ucina ogony delay i pogłosu bez usuwania modułów.'],
  },
  {
    id: 'reverb',
    title: 'Pogłos',
    body: ['Każda instancja pogłosu trzyma własny rozmiar, wybrzmienie, wet i własną odpowiedź impulsową.'],
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
    ],
  },
  {
    id: 'random',
    title: 'Random',
    body: ['Random odchyla parametry w dozwolonych zakresach. Limiter bezpieczeństwa jest wyłączony z losowania, więc Random nie ustawi go niebezpiecznie.'],
  },
  {
    id: 'chaos',
    title: 'Chaos',
    body: [
      'Chaos jest przyciskiem bezpośrednio na lewo od Ustawień. Włączenie go uruchamia limiter bezpieczeństwa w łańcuchu, jeśli był ominięty albo go nie było. Nie dodaje drugiego limitera i nie podbija makeup.',
      'Jeśli ominiesz limiter, gdy Chaos nadal jest włączony, FIELD zostawia ten wybór, dopóki nie wyjdziesz z Chaos i nie wejdziesz ponownie.',
    ],
  },
  {
    id: 'views',
    title: 'WAVE, FFT, EQ i AUTO',
    body: [
      'WAVE pokazuje sample. FFT pokazuje widmo odtwarzanego audio. EQ otwiera warsztat korektora. AUTO otwiera automatyzację. To widoki tego samego projektu.',
    ],
  },
  {
    id: 'focus',
    title: 'Tryb Focus',
    body: [
      'Focus wypełnia edytor jednym zadaniem: fala, FFT, EQ albo automatyzacja. Wyjście wraca do zwykłego układu. W WAVE Focus uchwyty fade są odsunięte pod pasek narzędzi.',
      'Pokrętła EQ Focus są większym, oszczędnym wariantem. Wskazówka śledzi wartość skuteczną, także przy LFO, a akcent bierze z wybranego pasma.',
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
      'Panel otwiera przycisk Hearing Access. Enlarge powiększa okno, Restore wraca do rozmiaru domyślnego. Każdy róg ma uchwyt zmiany rozmiaru, a rozmiar i pozycja zostają zapamiętane. Przeciągnięcie nagłówka odpina panel; Dock stawia go z powrotem. Gdy okno jest małe, treść ma margines obok paska przewijania. Tagi na żywo przewijają się we własnym rzędzie i nie spychają odcisku. Sound to odczyt na żywo i fingerprint. Events to lista zmierzonych momentów — klik wiersza przesuwa głowicę; pusta lista znaczy, że w tym zakresie nie ma ataku, przerwy ani clippingu. Space to balans, szerokość, korelacja i mid/side oraz obraz głowy dla słyszanego obrazu. Dynamics to poziom, crest i clipping pełnej skali. Compare to zmierzona zmiana włączonych efektów. Haptics mówi, czy to urządzenie umie wibrować.',
      'Profil wybiera użytkownik. Assisted listening dokłada pomiary do zwykłego odsłuchu. Visual first stawia na mapę dźwięku, odcisk, zdarzenia, przestrzeń, dynamikę i liczby, gdy odsłuch nie jest wiarygodny. Visual + haptic dodaje opcjonalne impulsy tam, gdzie urządzenie naprawdę ma wibrację.',
      'Mapa dźwięku pokazuje czas, region częstotliwości i energię. Regiony to SUB, BASS, LOW MID, MID, HIGH MID, HIGH i AIR. Każdy ma etykietę, pozycję, fakturę i kolor wzięty z aktywnego motywu. Sam kolor nic nie znaczy, więc mapa zostaje czytelna w motywach Black & White, Noire i Eyes Friendly. Kwadraty u góry to transjenty. Klik kwadratu kadruje ten moment na fali i przesuwa głowicę. Nie edytuje audio.',
      'Sound fingerprint opisuje oryginalną próbkę albo zaznaczenie, zanim zadziałają efekty. Paski pasm to średni poziom od −96 dB do 0 dB, więc cichsze wysokie pasmo zostaje widoczne obok głośnego basu. Podaje też peak, RMS, crest i częstotliwość dominującą tylko wtedy, gdy jest wąski częściowy. Cisza nie wymyśla nuty. Gdy pitch nie jest zerem, fingerprint podaje słyszaną dominującą częstotliwość. Original → heard składa oba poziomy na jednym pasku pasma. Bledszy pasek to oryginał. Jaśniejszy to to, co słychać po pitchu i aktualnej krzywej EQ. Kolor idzie z motywu, a nazwa pasma zostaje obok.',
      'Opisy na żywo, takie jak BASS-HEAVY, HIGH-BAND ENERGY, AIR ENERGY, LEFT-HEAVY, RIGHT-HEAVY, LOW CORRELATION, CLIPPING, NEAR FULL SCALE, DC OFFSET albo WIDE STEREO, wynikają z opisanych progów i histerezy, żeby etykiety nie mrugały. Każda etykieta ma wyjaśnienie z wartością pomiaru. Te same tagi widać w focusie Hearing Access. FIELD nie nazywa dźwięku dobrym, złym, ciepłym ani profesjonalnym.',
      'Before / after porównuje zmierzony bufor ze zmianą wynikającą z aktywnego efektu: magnituda EQ, gain, redukcja wzmocnienia kompresora, powtórzenia delay, ogon pogłosu oraz szerokość lub balans. Czasy delay i decay pogłosu biorą się z tych samych parametrów co DSP. Czas pogłosu wynika z parametrów. To nie jest zmierzony RT60.',
      'Mapa dynamiki oznacza ciche, głośne, transjent i rzeczywiste przesterowanie pełnej skali na cienkim pasku fali. Głośny materiał poniżej pełnej skali nie jest clippingiem. Detekcja zdarzeń może oznaczyć transjent, ciszę, głośne zdarzenie, niską częstotliwość, odcinek tonalny, możliwy klik i możliwe clipping. Show albo wiersz zdarzenia przesuwa głowicę. Audio nie jest przepisywane samo.',
      'Mapa przestrzeni podaje balans, szerokość, korelację i energię mid/side, w tym neutralne ostrzeżenie, gdy korelacja sugeruje problem zgodności z mono. Obraz głowy, widziany z góry, stawia słyszany obraz przed słuchaczem: lewe ucho po lewej, prawe po prawej. Rozpiętość idzie za szerokością, a pusty znacznik ma niską korelację. Pole pod spodem biegnie w czasie z góry na dół. Lewo jest po lewej, prawo po prawej. Dłuższy znacznik jest szerszy. Panorama i wzmocnienia kanałów L/R ruszają oba obrazy; balans próbki zostaje obok słyszanego balansu. Plik mono zostaje wąski, a panorama i tak go ustawia. Pomoc EQ pokazuje częstotliwość, nutę, region, gain, Q i zakres, który naprawdę rusza odpowiedź filtra.',
      'Show przy warunku asystenta kadruje ten zakres na fali i przesuwa głowicę. Nie edytuje audio. Ikona Hearing obok pozostałych widoków otwiera Focus Hearing Access: mapę dźwięku po pitchu, tagi na żywo, obraz głowy i pole przestrzeni, w tej samej ramce co Fala, EQ, FFT i automatyzacja. Pasek pod falą zmniejsza albo powiększa tę część ekranu. Na tym widoku są Fit, oddalenie i przybliżenie. Podwójne kliknięcie przybliża falę do zaznaczenia, kolejne dopasowuje całą próbkę. Porównanie EQ zostaje w panelu.',
      'Monitoring assistance to ograniczone podbicie low/mid/high tylko na ścieżce odsłuchu, za safety gain i przed wyjściem sprzętowym. To nie jest aparat słuchowy. Nie wchodzi do eksportu. Eksport renderuje silnik offline, który tego filtra nie wstawia.',
      'Haptyka jest opcjonalna i wykrywana. Przeglądarka bez wibracji mówi o tym wprost. Intensywność: off, low, medium, high. Impulsy mają limit częstości. Frequency haptics są eksperymentalne i można je wyłączyć.',
      'Visual mixing assistant wymienia warunki techniczne: możliwe clipping, energia niskich częstotliwości, nierównowaga kanałów, niska korelacja, zakres dynamiki, długa cisza i offset DC. Show przesuwa głowicę. Nie naprawia audio.',
      'W trybie Focus Hearing Access zostaje jednym odczytem na aktywnym wykresie: wybrany pas EQ, szczyt i zakres fali, dominująca częstotliwość widma albo wartość zapisana i efektywna parametru automacji. Wykres pozostaje główną powierzchnią.',
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
