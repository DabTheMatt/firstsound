import type { Locale } from './locale'
import { polishCardinal } from './plural'

/**
 * Hearing Access chrome. Analysis modules keep English labels.
 * Polish is applied here, at render time, so measurements and tests stay stable.
 */

export type HearingCopy = {
  title: string
  panel: string
  sectionsLabel: string
  dock: string
  restore: string
  enlarge: string
  close: string
  dragTitle: string
  resizeHeight: string
  dragResize: string
  resizeCorner: (corner: string) => string
  focusAria: string
  focusStage: string
  monitor: string
  notes: string
  notesAria: string
  hideDetails: string
  details: string
  noSample: string
  thisScope: string
  soundMapAfterPitch: string
  loadToCompare: string
  originalHeard: string
  originalAfterEq: string
  levelsTip: string
  levelsTipPitch: (semitones: string) => string
  levelsTipEq: string
  levelsTipFlat: string
  levelsTipRest: string
  levelsTipStill: string
  affected: (lo: number, hi: number) => string
  automation: (label: string, stored: string, effective: string) => string
  gainNote: (db: string) => string
  voiceContrast: (db: string) => string
  assistant: string
  show: string
  noFindings: string
  framed: string
  showing: (title: string, timecode: string) => string
  playheadAnnounce: (timecode: string, label: string) => string
  playheadMoved: string
  noEvents: (scope: string) => string
  heardBalance: string
  sampleBalance: string
  width: string
  correlation: string
  room: string
  distance: string
  mid: string
  side: string
  heard: string
  monoSample: string
  monoImage: string
  loadSpace: string
  loadMap: string
  turnOn: string
  lowCorrelation: string
  dynamicsNeedsSample: string
  peak: string
  crest: string
  clippingBlocks: string
  quietBlocks: string
  compare: string
  measure: string
  before: string
  after: string
  change: string
  noCompare: string
  direct: string
  haptics: string
  intensity: string
  intensityAria: string
  testPulse: string
  frequencyExperimental: string
  noVibration: string
  noVibrationSettings: string
  pulseSent: string
  pulseSentOff: string
  pulseRejected: string
  noPulse: string
  panelButton: string
  zoomOut: string
  zoomIn: string
  fit: string
  heardAt: (pitch: string) => string
  originalPitch: string
  soundMapEmpty: string
  soundMapTime: string
  soundMapAria: string
  spaceFieldAria: string
  headAria: (room: string, distance: string, side: string) => string
  loudness: string
  loudnessNow: (text: string) => string
  loudnessStopped: string
  loudnessValue: (word: string, live: string, peak: string, rms: string) => string
  nowWord: string
  stoppedWord: string
  peakWord: string
  tagsAria: string
  playTag: (label: string) => string
  moreSound: string
  soundTip: string
  eventsTip: string
  spaceTip: string
  spaceTipShort: string
  dynamicsTip: string
  compareTip: string
  assistantTip: string
  hapticsTip: string
  hapticsMore: string
  eventsMore: string
  spaceMore: string
  dynamicsMore: string
  compareMore: string
  assistantMore: string
  focusTip: string
  focusTipLabel: string
  levelsTipLabel: string
  settingsIntro: string
  off: string
  on: string
  profile: string
  layers: string
  monitoring: string
  monitorEmphasis: string
  monitorBand: (label: string) => string
  eventFilters: string
  frequencyHaptics: string
  section: Record<'sound' | 'events' | 'space' | 'dynamics' | 'compare' | 'haptics', string>
  summaryLabel: Record<'level' | 'low' | 'mid' | 'high' | 'space' | 'dynamics' | 'transients', string>
  legend: {
    transient: string
    attack: string
    clip: string
    level: string
    silence: string
    loud: string
    tone: string
    click: string
    transients: string
    symbols: string
    hideLine: string
    showLine: string
  }
  profileLabel: (id: string) => string
  profileDetail: (id: string) => string
  layerLabel: (id: string) => string
  tag: (id: string, english: string) => string
  detail: (english: string) => string
  findingTitle: (id: string, english: string) => string
  band: (id: string, english: string) => string
  scope: (english: string) => string
  eventLabel: (kind: string, english: string) => string
  eventFilter: (kind: string) => string
  summaryWord: (english: string) => string
  voiceLabel: (english: string) => string
  roomWord: (english: string) => string
  distanceWord: (english: string) => string
  balance: (english: string) => string
  compareGroup: (english: string) => string
  compareRow: (english: string) => string
  cell: (english: string) => string
  alertTitle: (english: string) => string
  intensityLabel: (english: string) => string
  loudnessWord: (english: string) => string
  reverbLine: (direct: string, early: string, tail: string) => string
}

const EN_STATIC = {
  title: 'Hearing Access',
  panel: 'Hearing Access panel',
  sectionsLabel: 'Hearing Access sections',
  dock: 'Dock',
  restore: 'Restore',
  enlarge: 'Enlarge',
  close: 'Close',
  dragTitle: 'Drag to move this panel. Dock returns it to the corner.',
  resizeHeight: 'Resize panel height',
  dragResize: 'Drag to resize',
  focusAria: 'Hearing Access focus',
  focusStage: 'Hearing Access focus',
  monitor: 'Monitoring only. Not included in export. Not a hearing aid.',
  notes: 'Notes',
  notesAria: 'Note detection sensitivity',
  hideDetails: 'Hide details',
  details: 'Details',
  noSample: 'NO SAMPLE',
  thisScope: 'THIS SCOPE',
  soundMapAfterPitch: 'Sound map after pitch. The bars above compare the original with what you hear.',
  loadToCompare: 'Load a sample to compare the original with what you hear.',
  originalHeard: 'Original → heard',
  originalAfterEq: 'Original → after EQ',
  levelsTipLabel: 'More about original and heard levels',
  levelsTipRest: 'A bright extension past the tick is a boost. A dim tail past the bright bar is a cut.',
  levelsTipStill: ' Nothing in the current pitch or EQ moves a band by 0.3 dB or more.',
  assistant: 'Visual mixing assistant',
  show: 'Show',
  noFindings: 'No technical findings in this scope.',
  framed: 'The waveform is framed on that span. The outline is the region. Audio is unchanged.',
  playheadMoved: 'Playhead moved. Press play to hear from that point.',
  heardBalance: 'Heard balance',
  sampleBalance: 'Sample balance',
  width: 'Width',
  correlation: 'Correlation',
  room: 'Room',
  distance: 'Distance',
  mid: 'Mid',
  side: 'Side',
  heard: 'Heard',
  monoSample: 'This sample is mono, so width stays narrow. Pan still places it.',
  monoImage: 'This sample is mono. Pan still places that one image.',
  loadSpace: 'Load a sample to place it in the field.',
  loadMap: 'Load a sample to see the map and the stereo field.',
  turnOn: 'Turn Hearing Access on to measure this sample.',
  lowCorrelation: 'Low correlation. Possible mono compatibility issue.',
  dynamicsNeedsSample: 'Dynamics needs a loaded sample.',
  peak: 'Peak',
  crest: 'Crest',
  clippingBlocks: 'Clipping blocks',
  quietBlocks: 'Quiet blocks are the low bars on the waveform strip. Clipping uses a full-scale sample threshold, not loudness.',
  compare: 'Compare',
  measure: 'Measure',
  before: 'Before',
  after: 'After',
  change: 'Change',
  noCompare: 'No measurable change yet. Move gain, EQ, compressor, delay, reverb, or stereo width and the tables fill in.',
  direct: 'Direct',
  haptics: 'Haptics',
  intensity: 'Intensity',
  intensityAria: 'Haptic intensity',
  testPulse: 'Test pulse',
  frequencyExperimental: 'Frequency haptics are experimental and can be turned off in Accessibility settings.',
  noVibration: 'This browser does not provide vibration. FIELD does not imitate haptics on screen.',
  noVibrationSettings: 'This browser does not provide vibration. Haptic controls stay off.',
  pulseSent: 'Pulse sent.',
  pulseSentOff: 'Pulse sent. Set intensity above off to pulse during playback.',
  pulseRejected: 'This device rejected the pulse. FIELD does not imitate haptics on screen.',
  noPulse: 'No pulse.',
  panelButton: 'Panel',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  fit: 'Fit',
  soundMapEmpty: 'No spectral columns yet',
  soundMapTime: 'T',
  soundMapAria:
    'Sound map. Rows are labeled frequency regions and sit edge to edge. Color follows the theme and is paired with the label. Attacks are thin vertical lines at the time they happen. The waveform level strip can show several triangles for one attack. Choose a line to mark it on the waveform. Reverb wet smears the rows forward and dulls the high rows.',
  spaceFieldAria:
    'Stereo field over time. Wider marks are wider images. Hollow marks are low correlation. A short tail under a mark is reverb wet. The right edge is the room: a longer line is a larger room, and the dot is how far the source sits in front of the listener.',
  loudness: 'Loudness',
  nowWord: 'now',
  stoppedWord: 'stopped',
  peakWord: 'peak',
  tagsAria: 'Hearing tags',
  moreSound: 'More about Sound',
  eventsTip:
    'Listed moments are transients, silence, loud peaks, low-frequency onsets, sustained tones, possible clicks, and possible clipping. Click a row to move the playhead. The audio is not edited.',
  spaceTipShort: 'Balance, width, correlation, and mid/side energy for this scope.',
  dynamicsTip:
    'Levels for this scope. The thin strip on the waveform marks quiet, loud, and full-scale clipping. Loud audio below full scale is not clipping.',
  compareTip:
    'Each table is one active effect on this scope. A bypassed module is omitted. Delay times and the reverb tail follow the same parameters as the DSP. Nothing here rewrites the audio.',
  assistantTip: 'Show frames that span on the waveform and moves the playhead. It does not change the audio.',
  hapticsTip:
    'Optional pulses on transients, clipping, loop edges, and selection edges. They are never a continuous buzz. Test sends one pulse. Intensity above off is what pulses during playback. FIELD does not imitate haptics on screen.',
  hapticsMore: 'More about haptics',
  eventsMore: 'More about events',
  spaceMore: 'More about space',
  dynamicsMore: 'More about dynamics',
  compareMore: 'More about compare',
  assistantMore: 'More about the assistant',
  focusTipLabel: 'More about Hearing Access focus',
  settingsIntro: 'An accessibility layer on top of Simple, Technical, and Sensory. It does not replace those modes.',
  off: 'Off',
  on: 'On',
  profile: 'Profile',
  layers: 'Layers',
  monitoring: 'Monitoring assistance',
  monitorEmphasis: 'Monitor emphasis',
  eventFilters: 'Event filters',
  frequencyHaptics: 'Frequency haptics (experimental)',
} as const

type StaticCopy = { [K in keyof typeof EN_STATIC]: string }

const PL_STATIC: StaticCopy = {
  title: 'Dostęp słuchowy',
  panel: 'Panel dostępu słuchowego',
  sectionsLabel: 'Sekcje dostępu słuchowego',
  dock: 'Dokuj',
  restore: 'Przywróć',
  enlarge: 'Powiększ',
  close: 'Zamknij',
  dragTitle: 'Przeciągnij, aby przesunąć panel. Dokuj wraca do rogu.',
  resizeHeight: 'Zmień wysokość panelu',
  dragResize: 'Przeciągnij, aby zmienić rozmiar',
  focusAria: 'Focus dostępu słuchowego',
  focusStage: 'Focus dostępu słuchowego',
  monitor: 'Tylko odsłuch. Nie wchodzi do eksportu. To nie jest aparat słuchowy.',
  notes: 'Nuty',
  notesAria: 'Czułość wykrywania nut',
  hideDetails: 'Ukryj szczegóły',
  details: 'Szczegóły',
  noSample: 'BRAK SAMPLE',
  thisScope: 'TEN ZAKRES',
  soundMapAfterPitch: 'Mapa dźwięku po pitchu. Paski powyżej porównują oryginał z tym, co słychać.',
  loadToCompare: 'Wczytaj sample, aby porównać oryginał z tym, co słychać.',
  originalHeard: 'Oryginał → słyszane',
  originalAfterEq: 'Oryginał → po EQ',
  levelsTipLabel: 'Więcej o poziomach oryginału i tego, co słychać',
  levelsTipRest: 'Jasne przedłużenie za kreską to podbicie. Bledsza resztka za jasnym paskiem to tłumienie.',
  levelsTipStill: ' Obecny pitch i EQ nie przesuwają żadnego pasma o 0,3 dB ani więcej.',
  assistant: 'Wizualny asystent miksu',
  show: 'Pokaż',
  noFindings: 'Brak warunków technicznych w tym zakresie.',
  framed: 'Fala jest skadrowana na tym zakresie. Obrys to region. Audio bez zmian.',
  playheadMoved: 'Głowica przesunięta. Naciśnij play, aby słuchać od tego miejsca.',
  heardBalance: 'Słyszany balans',
  sampleBalance: 'Balans sample',
  width: 'Szerokość',
  correlation: 'Korelacja',
  room: 'Pokój',
  distance: 'Odległość',
  mid: 'Mid',
  side: 'Side',
  heard: 'Słyszane',
  monoSample: 'Ten sample jest mono, więc szerokość zostaje wąska. Panorama i tak go ustawia.',
  monoImage: 'Ten sample jest mono. Panorama i tak ustawia ten jeden obraz.',
  loadSpace: 'Wczytaj sample, aby umieścić go w polu.',
  loadMap: 'Wczytaj sample, aby zobaczyć mapę i pole stereo.',
  turnOn: 'Włącz dostęp słuchowy, aby zmierzyć ten sample.',
  lowCorrelation: 'Niska korelacja. Możliwy problem zgodności z mono.',
  dynamicsNeedsSample: 'Dynamika wymaga wczytanego sample.',
  peak: 'Szczyt',
  crest: 'Szczytowość',
  clippingBlocks: 'Bloki przesterowania',
  quietBlocks: 'Ciche bloki to niskie słupki na pasku fali. Przesterowanie używa progu pełnej skali, nie głośności.',
  compare: 'Porównanie',
  measure: 'Miara',
  before: 'Przed',
  after: 'Po',
  change: 'Zmiana',
  noCompare: 'Jeszcze brak mierzalnej zmiany. Porusz wzmocnienie, EQ, kompresor, delay, pogłos albo szerokość stereo, a tabele się wypełnią.',
  direct: 'Bezpośredni',
  haptics: 'Haptyka',
  intensity: 'Intensywność',
  intensityAria: 'Intensywność haptyki',
  testPulse: 'Impuls testowy',
  frequencyExperimental: 'Haptyka częstotliwości jest eksperymentalna. Można ją wyłączyć w ustawieniach dostępności.',
  noVibration: 'Ta przeglądarka nie daje wibracji. FIELD nie udaje haptyki na ekranie.',
  noVibrationSettings: 'Ta przeglądarka nie daje wibracji. Sterowanie haptyką zostaje wyłączone.',
  pulseSent: 'Impuls wysłany.',
  pulseSentOff: 'Impuls wysłany. Ustaw intensywność powyżej wył., aby pulsować w trakcie odtwarzania.',
  pulseRejected: 'To urządzenie odrzuciło impuls. FIELD nie udaje haptyki na ekranie.',
  noPulse: 'Brak impulsu.',
  panelButton: 'Panel',
  zoomOut: 'Oddal',
  zoomIn: 'Przybliż',
  fit: 'Dopasuj',
  soundMapEmpty: 'Brak kolumn widma',
  soundMapTime: 't',
  soundMapAria:
    'Mapa dźwięku. Wiersze to podpisane regiony częstotliwości i stykają się krawędziami. Kolor idzie z motywu i stoi obok nazwy. Ataki to cienkie pionowe linie w czasie, w którym się pojawiają. Pasek poziomu na fali może pokazać kilka trójkątów dla jednego ataku. Wybierz linię, aby oznaczyć ją na fali. Wet pogłosu rozmazuje wiersze do przodu i tłumi wysokie wiersze.',
  spaceFieldAria:
    'Pole stereo w czasie. Szerszy znacznik to szerszy obraz. Pusty znacznik to niska korelacja. Krótki ogon pod znacznikiem to wet pogłosu. Prawa krawędź to pokój: dłuższa linia to większy pokój, a kropka to odległość źródła przed słuchaczem.',
  loudness: 'Głośność',
  nowWord: 'teraz',
  stoppedWord: 'stop',
  peakWord: 'szczyt',
  tagsAria: 'Tagi słuchowe',
  moreSound: 'Więcej o dźwięku',
  eventsTip:
    'Lista obejmuje transjenty, ciszę, głośne szczyty, wejścia niskiej częstotliwości, odcinki tonalne, możliwy klik i możliwe przesterowanie. Klik wiersza przesuwa głowicę. Audio nie jest edytowane.',
  spaceTipShort: 'Balans, szerokość, korelacja i energia mid/side dla tego zakresu.',
  dynamicsTip:
    'Poziomy dla tego zakresu. Cienki pasek na fali oznacza ciszę, głośno i przesterowanie pełnej skali. Głośny materiał poniżej pełnej skali nie jest przesterowaniem.',
  compareTip:
    'Każda tabela to jeden włączony efekt w tym zakresie. Moduł ominięty jest pominięty. Czasy delay i ogon pogłosu biorą się z tych samych parametrów co DSP. Nic tu nie przepisuje audio.',
  assistantTip: 'Pokaż kadruje ten zakres na fali i przesuwa głowicę. Nie zmienia audio.',
  hapticsTip:
    'Opcjonalne impulsy na transjentach, przesterowaniu, krawędziach pętli i krawędziach zaznaczenia. To nigdy nie jest ciągły brzęczyk. Test wysyła jeden impuls. Intensywność powyżej wył. pulsuje w trakcie odtwarzania. FIELD nie udaje haptyki na ekranie.',
  hapticsMore: 'Więcej o haptyce',
  eventsMore: 'Więcej o zdarzeniach',
  spaceMore: 'Więcej o przestrzeni',
  dynamicsMore: 'Więcej o dynamice',
  compareMore: 'Więcej o porównaniu',
  assistantMore: 'Więcej o asystencie',
  focusTipLabel: 'Więcej o focusie dostępu słuchowego',
  settingsIntro: 'Warstwa dostępności nad trybami Prosty, Sterowanie i Słuch. Nie zastępuje tych trybów.',
  off: 'Wył.',
  on: 'Wł.',
  profile: 'Profil',
  layers: 'Warstwy',
  monitoring: 'Pomoc odsłuchu',
  monitorEmphasis: 'Podbicie odsłuchu',
  eventFilters: 'Filtry zdarzeń',
  frequencyHaptics: 'Haptyka częstotliwości (eksperymentalna)',
}

const SOUND_TIP_EN =
  'Note and character tags follow the playhead, so a sound is listed while that moment is under the playhead. Click a note tag to hear a quiet synthesized tone. High frequencies are kept much quieter, and a limiter caps the preview. The Notes slider sets how far below the loudest partial still counts. The same note is listed once. Silence does not invent a note. The tag list is one row. Each tag has a thin border and slightly rounded corners, so extra tags stay on that row and do not move the lines under them. There is no scrollbar. Original and heard levels share one bar per band.'

const SOUND_TIP_PL =
  'Tagi nut i charakteru podążają za głowicą, więc dźwięk jest na liście, gdy ten moment jest pod głowicą. Klik tagu nuty odtwarza cichy zsyntezowany ton. Wysokie częstotliwości są jeszcze cichsze, a limiter ogranicza podgląd. Suwak Nuty ustawia, jak daleko poniżej najgłośniejszej składowej jeszcze się liczy. Ta sama nuta jest raz. Cisza nie wymyśla nuty. Lista tagów ma jeden rząd. Każdy tag ma cienką obwódkę i lekko zaokrąglone rogi, więc kolejne tagi zostają w tym rzędzie i nie przesuwają linii pod nimi. Nie ma paska przewijania. Poziomy oryginału i tego, co słychać, dzielą jeden pasek na pasmo.'

const SPACE_TIP_EN =
  'The head follows the playhead. Spread is stereo width. A hollow mark is correlation below 0.2. The field is what you hear after pan, mid/side, and delay. A larger reverb size or a greater distance draws a smaller head. The source moves toward the front as distance grows. Wet does not move the head or the source. When wet is above zero, the sound map smears forward and the field draws a short tail under each mark. The right edge shows the room: a longer line is a larger room, and the dot is the source distance. Time runs from top to bottom.'

const SPACE_TIP_PL =
  'Głowa podąża za głowicą. Rozpiętość to szerokość stereo. Pusty znacznik to korelacja poniżej 0,2. Pole to to, co słychać po panoramie, mid/side i delay. Większy rozmiar pogłosu albo większa odległość rysuje mniejszą głowę. Źródło idzie do przodu, gdy rośnie odległość. Wet nie przesuwa głowy ani źródła. Gdy wet jest powyżej zera, mapa dźwięku rozmazuje się do przodu, a pole rysuje krótki ogon pod każdym znacznikiem. Prawa krawędź pokazuje pokój: dłuższa linia to większy pokój, a kropka to odległość źródła. Czas biegnie z góry na dół.'

const FOCUS_TIP_EN =
  'Attacks on the sound map are thin vertical lines at the time they happen. The band rows sit edge to edge on a fixed loudness scale, so a quieter high band stays visible beside a louder bass band. Drag across the wave to select a fragment. Releasing that drag makes it the loop. A click only moves the playhead. Note tags and character tags follow the playhead: a partial is listed while that moment is heard. Click a note tag to hear a quiet synthesized tone. High frequencies are kept much quieter, and a limiter caps the preview. The Notes slider lists quieter partials in the current moment. The same note is listed once. The tag list is one row. Each tag has a thin border and slightly rounded corners, so extra tags stay on that row and do not move the sound map. There is no scrollbar. Clicking an attack on the sound map draws a line at the start of that attack. The line icon under the time scale shows or hides it. The waveform line is the same dashed mark as Input → Mark transients, and it stays hidden until that control is on. Sensitivity for it sits on its own row under the tempo buttons. The legend under the time scale turns those lines and the strip symbols on or off. The strip is slice level: bar height is the peak of that moment, a triangle is a short attack, and an exclamation mark is full-scale clipping. The loudness rail on the right follows the output while audio plays. When playback is stopped the bars rest at silence, and the sample peak stays listed as a number. The head and the space field follow pan, mid/side, and delay. A larger reverb size or a greater distance draws a smaller head. The source moves toward the front as distance grows. Wet does not move the source or the head. When wet is above zero, the sound map smears forward and dulls the high rows, and the space field draws a short tail under each mark. Spread is stereo width. A hollow mark is low correlation.'

const FOCUS_TIP_PL =
  'Ataki na mapie dźwięku to cienkie pionowe linie w czasie, w którym się pojawiają. Wiersze pasm stykają się krawędziami na stałej skali głośności, więc cichsze wysokie pasmo zostaje widoczne obok głośniejszego basu. Przeciągnij po fali, aby zaznaczyć fragment. Puszczenie zamienia to w pętlę. Klik tylko przesuwa głowicę. Tagi nut i charakteru podążają za głowicą: składowa jest na liście, gdy ten moment jest słyszany. Klik tagu nuty odtwarza cichy zsyntezowany ton. Wysokie częstotliwości są jeszcze cichsze, a limiter ogranicza podgląd. Suwak Nuty pokazuje cichsze składowe bieżącego momentu. Ta sama nuta jest raz. Lista tagów ma jeden rząd. Każdy tag ma cienką obwódkę i lekko zaokrąglone rogi, więc kolejne tagi zostają w tym rzędzie i nie przesuwają mapy dźwięku. Nie ma paska przewijania. Klik ataku na mapie rysuje linię na początku tego ataku. Ikona linii pod skalą czasu pokazuje ją albo ukrywa. Linia na fali to ten sam przerywany znak co Wejście → Oznacz transjenty i zostaje ukryta, dopóki ten przycisk jest wyłączony. Czułość stoi we własnym rzędzie pod przyciskami tempa. Legenda pod skalą czasu włącza te linie i symbole paska. Pasek to poziom odcinka: wysokość słupka to szczyt tego momentu, trójkąt to krótki atak, a wykrzyknik to przesterowanie pełnej skali. Wskaźnik głośności po prawej śledzi wyjście, gdy audio gra. Gdy odtwarzanie stoi, słupki opadają do ciszy, a szczyt sample zostaje liczbą. Głowa i pole przestrzeni podążają za panoramą, mid/side i delay. Większy rozmiar pogłosu albo większa odległość rysuje mniejszą głowę. Źródło idzie do przodu, gdy rośnie odległość. Wet nie przesuwa źródła ani głowy. Gdy wet jest powyżej zera, mapa dźwięku rozmazuje się do przodu i tłumi wysokie wiersze, a pole przestrzeni rysuje krótki ogon pod każdym znacznikiem. Rozpiętość to szerokość stereo. Pusty znacznik to niska korelacja.'

const TAGS: Record<string, string> = {
  silence: 'CISZA',
  loud: 'GŁOŚNO',
  quiet: 'CICHO',
  'bass-heavy': 'MOCNY BAS',
  'midrange-dominant': 'ŚRODEK DOMINUJE',
  'high-band': 'ENERGIA GÓRY',
  air: 'ENERGIA AIR',
  wide: 'SZEROKIE STEREO',
  narrow: 'WĄSKIE STEREO',
  'low-correlation': 'NISKA KORELACJA',
  'strong-transients': 'MOCNE TRANSJENTY',
  continuous: 'CIĄGŁY / TONALNY',
  clipped: 'PRZESTEROWANIE',
  'near-full-scale': 'BLISKO PEŁNEJ SKALI',
  'dc-offset': 'SKŁADOWA STAŁA',
  tonal: 'TONALNY',
  'noise-like': 'SZUMOWY',
  percussive: 'PERKUSYJNY',
  sustained: 'UTRZYMANY',
  bright: 'JASNY',
  dull: 'CIEMNY',
  harmonic: 'HARMONICZNY',
  inharmonic: 'NIEHARMONICZNY',
}

const FINDINGS: Record<string, string> = {
  'possible-clipping': 'MOŻLIWE PRZESTEROWANIE',
  'high-low-energy': 'BARDZO DUŻO NISKICH',
  'lr-imbalance': 'NIERÓWNOWAGA L/P',
  'low-correlation': 'BARDZO NISKA KORELACJA',
  'extreme-dynamics': 'BARDZO DUŻA DYNAMIKA',
  'low-dynamics': 'BARDZO MAŁA DYNAMIKA',
  'long-silence': 'DŁUGA CISZA',
  'dc-offset': 'MOCNA SKŁADOWA STAŁA',
}

const BANDS: Record<string, string> = {
  sub: 'SUB',
  bass: 'BAS',
  lowMid: 'NISKI ŚR.',
  mid: 'ŚRODEK',
  highMid: 'WYS. ŚR.',
  high: 'WYSOKI',
  air: 'AIR',
}

const BAND_FROM_ENGLISH: Record<string, string> = {
  SUB: 'SUB',
  BASS: 'BAS',
  'LOW MID': 'NISKI ŚR.',
  MID: 'ŚRODEK',
  'HIGH MID': 'WYS. ŚR.',
  HIGH: 'WYSOKI',
  AIR: 'AIR',
}

const SCOPES: Record<string, string> = {
  SELECTION: 'ZAZNACZENIE',
  CURRENT: 'BIEŻĄCY',
  'FULL SAMPLE': 'CAŁA PRÓBKA',
}

const EVENTS: Record<string, string> = {
  transient: 'TRANSJENT',
  silence: 'POCZĄTEK CISZY',
  loud: 'GŁOŚNE ZDARZENIE',
  lowFrequency: 'ZDARZENIE NISKIEJ CZĘSTOTLIWOŚCI',
  tonal: 'ZDARZENIE TONALNE',
  possibleClick: 'MOŻLIWY KLIK',
  possibleClip: 'MOŻLIWE PRZESTEROWANIE',
}

const EVENT_FILTERS: Record<string, string> = {
  transient: 'Transjent',
  silence: 'Cisza',
  loud: 'Głośne',
  lowFrequency: 'Niska częst.',
  tonal: 'Tonalne',
  possibleClick: 'Możliwy klik',
  possibleClip: 'Możliwe przester.',
}

const SUMMARY: Record<string, string> = {
  SILENT: 'CISZA',
  QUIET: 'CICHO',
  NORMAL: 'NORMALNY',
  LOUD: 'GŁOŚNO',
  LOW: 'NISKI',
  MEDIUM: 'ŚREDNI',
  HIGH: 'WYSOKI',
  MONO: 'MONO',
  NARROW: 'WĄSKO',
  WIDE: 'SZEROKO',
  STRONG: 'MOCNE',
  '—': '—',
}

const VOICE: Record<string, string> = {
  'VOICE-DOMINANT': 'GŁOS DOMINUJE',
  'BACKGROUND HIGH': 'DUŻO TŁA',
  INCONCLUSIVE: 'NIEROZSTRZYGNIĘTE',
}

const ROOMS: Record<string, string> = {
  small: 'mały',
  mid: 'średni',
  large: 'duży',
  none: 'brak',
}

const DISTANCES: Record<string, string> = {
  close: 'blisko',
  mid: 'średnio',
  far: 'daleko',
}

const SIDES: Record<string, string> = {
  center: 'środek',
  left: 'lewo',
  right: 'prawo',
}

const GROUPS: Record<string, string> = {
  Gain: 'Wzmocnienie',
  EQ: 'EQ',
  Compressor: 'Kompresor',
  Delay: 'Delay',
  Reverb: 'Pogłos',
  Stereo: 'Stereo',
}

const ROWS: Record<string, string> = {
  PEAK: 'SZCZYT',
  RMS: 'RMS',
  'MAX GAIN REDUCTION': 'MAKS. REDUKCJA WZM.',
  'AVERAGE GAIN REDUCTION': 'ŚR. REDUKCJA WZM.',
  'PEAKS REDUCED': 'ŚCIĘTE SZCZYTY',
  'FIRST REPEAT': 'PIERWSZE POWTÓRZENIE',
  FEEDBACK: 'SPRZĘŻENIE',
  WET: 'WET',
  DIRECT: 'BEZPOŚREDNI',
  TAIL: 'OGON',
  'EARLY REFLECTIONS': 'WCZESNE ODBICIA',
  BALANCE: 'BALANS',
  WIDTH: 'SZEROKOŚĆ',
  CORRELATION: 'KORELACJA',
  'DOMINANT FREQUENCY': 'CZĘST. DOMINUJĄCA',
}

const ALERTS: Record<string, string> = {
  RECORDING: 'NAGRYWANIE',
  'RECORDING STOPPED': 'NAGRYWANIE ZATRZYMANE',
  'LOOP ON': 'PĘTLA WŁ.',
  'LOOP OFF': 'PĘTLA WYŁ.',
  'AUDIO BLOCKED': 'AUDIO ZABLOKOWANE',
  WARNING: 'OSTRZEŻENIE',
  'POSSIBLE CLIPPING': 'MOŻLIWE PRZESTEROWANIE',
}

const INTENSITY: Record<string, string> = {
  off: 'wył.',
  low: 'nisko',
  medium: 'średnio',
  high: 'wysoko',
}

const LOUDNESS: Record<string, string> = {
  CLIP: 'PRZEST.',
  'VERY LOUD': 'B. GŁOŚNO',
  LOUD: 'GŁOŚNO',
  MEDIUM: 'ŚREDNIO',
  QUIET: 'CICHO',
  SILENT: 'CISZA',
  CLIPPING: 'PRZESTER.',
}

const PROFILES: Record<string, { label: string; detail: string }> = {
  assisted: {
    label: 'Wspomagany odsłuch',
    detail: 'Pomiary wizualne obok odsłuchu.',
  },
  visual: {
    label: 'Najpierw obraz',
    detail: 'Mapa dźwięku, odcisk, zdarzenia i liczby. Nie zakłada, że słyszysz wynik.',
  },
  'visual-haptic': {
    label: 'Obraz + haptyka',
    detail: 'Profil wizualny plus opcjonalne impulsy tam, gdzie urządzenie je obsługuje.',
  },
}

const LAYERS: Record<string, string> = {
  soundMap: 'Mapa dźwięku',
  descriptors: 'Opis na żywo',
  events: 'Wykrywanie zdarzeń',
  dynamicsMap: 'Mapa dynamiki',
  space: 'Mapa przestrzeni',
  compare: 'Przed / po',
  assistant: 'Wizualny asystent miksu',
  voiceEstimate: 'Szacunek głosu / tła',
}

const CORNERS: Record<string, string> = {
  nw: 'lewego górnego',
  ne: 'prawego górnego',
  sw: 'lewego dolnego',
  se: 'prawego dolnego',
}

const EXACT: Record<string, string> = {
  'RMS is high.': 'RMS jest wysoki.',
  'RMS is low.': 'RMS jest niski.',
  'Peak level is below the silence threshold. No dominant frequency is reported.':
    'Szczyt jest poniżej progu ciszy. Nie podajemy dominującej częstotliwości.',
  'Narrow tonal energy is present.': 'Jest wąska energia tonalna.',
  'Peak is close to full scale.': 'Szczyt jest blisko pełnej skali.',
  'Full-scale samples.': 'Próbki pełnej skali.',
  'Level onset': 'Wejście poziomu',
  'High level': 'Wysoki poziom',
  'Short level jump': 'Krótki skok poziomu',
  'Capture is running.': 'Zapis trwa.',
  'Capture stopped.': 'Zapis zatrzymany.',
  'Transport loop state.': 'Stan pętli transportu.',
  'The browser has not started audio.': 'Przeglądarka nie uruchomiła audio.',
  'Partials in this moment sit near whole-number multiples of the lowest one.':
    'Składowe w tym momencie leżą blisko całkowitych wielokrotności najniższej.',
  'Partials in this moment do not sit on a whole-number harmonic series.':
    'Składowe w tym momencie nie leżą na szeregu harmonicznym o całkowitych wielokrotnościach.',
  'Voice and background were not separated. A narrow tone is not reported as speech.':
    'Głos i tło nie zostały rozdzielone. Wąski ton nie jest podawany jako mowa.',
  'ESTIMATE omitted. Spectral shape is outside the range used for a voice-band guess.':
    'SZACUNEK pominięty. Kształt widma jest poza zakresem używanym do zgadywania pasma głosu.',
  'ESTIMATE omitted. Voice-band contrast is not clear enough to report a number.':
    'SZACUNEK pominięty. Kontrast pasma głosu nie jest dość wyraźny, aby podać liczbę.',
  'Gain reduction on peaks': 'Redukcja wzmocnienia na szczytach',
  CENTER: 'ŚRODEK',
  direct: 'bezpośredni',
  'Decay length follows the reverb parameters. It is not a measured RT60.':
    'Długość wybrzmienia wynika z parametrów pogłosu. To nie jest zmierzony RT60.',
}

type Rule = { pattern: RegExp; apply: (match: RegExpMatchArray) => string }

const num = '(-?\\d+(?:\\.\\d+)?)'
const pct = '(\\d+)'

const RULES: Rule[] = [
  {
    pattern: new RegExp(`^Spectral flatness ${num} in this moment\\. Energy sits in narrow peaks\\.$`),
    apply: (m) => `Płaskość widma ${m[1]} w tym momencie. Energia siedzi w wąskich szczytach.`,
  },
  {
    pattern: new RegExp(`^Spectral flatness ${num} in this moment\\. Energy is spread across the spectrum\\.$`),
    apply: (m) => `Płaskość widma ${m[1]} w tym momencie. Energia jest rozłożona w całym widmie.`,
  },
  {
    pattern: new RegExp(`^Spectral flatness ${num}\\. Narrow tonal energy is present\\.$`),
    apply: (m) => `Płaskość widma ${m[1]}. Jest wąska energia tonalna.`,
  },
  {
    pattern: new RegExp(`^Crest factor ${num} dB in this moment\\. The peak is much louder than the average level\\.$`),
    apply: (m) => `Współczynnik szczytu ${m[1]} dB w tym momencie. Szczyt jest dużo głośniejszy niż poziom średni.`,
  },
  {
    pattern: new RegExp(`^Crest factor ${num} dB in this moment\\. Level stays close to the peak\\.$`),
    apply: (m) => `Współczynnik szczytu ${m[1]} dB w tym momencie. Poziom zostaje blisko szczytu.`,
  },
  {
    pattern: new RegExp(`^Spectral centroid (\\d+) Hz in this moment\\. Energy leans toward the highs\\.$`),
    apply: (m) => `Centroid widma ${m[1]} Hz w tym momencie. Energia przechyla się ku górze.`,
  },
  {
    pattern: new RegExp(`^Spectral centroid (\\d+) Hz in this moment\\. Energy leans toward the lows\\.$`),
    apply: (m) => `Centroid widma ${m[1]} Hz w tym momencie. Energia przechyla się ku dołowi.`,
  },
  {
    pattern: new RegExp(
      `^(.+?) at (\\d+) Hz, ${num} dB in this moment\\. Click to hear a quiet synthesized tone\\. High frequencies stay much quieter\\.$`,
    ),
    apply: (m) =>
      `${m[1]} przy ${m[2]} Hz, ${m[3]} dB w tym momencie. Kliknij, aby usłyszeć cichy zsyntezowany ton. Wysokie częstotliwości zostają dużo cichsze.`,
  },
  {
    pattern: new RegExp(`^${pct}% of measured spectral energy is below 250 Hz\\.$`),
    apply: (m) => `${m[1]}% zmierzonej energii widma jest poniżej 250 Hz.`,
  },
  {
    pattern: new RegExp(`^${pct}% of measured spectral energy is between 250 Hz and 6 kHz\\.$`),
    apply: (m) => `${m[1]}% zmierzonej energii widma jest między 250 Hz a 6 kHz.`,
  },
  {
    pattern: new RegExp(`^${pct}% of measured spectral energy is above 6 kHz\\.$`),
    apply: (m) => `${m[1]}% zmierzonej energii widma jest powyżej 6 kHz.`,
  },
  {
    pattern: new RegExp(`^${pct}% of measured spectral energy is between 12 kHz and 20 kHz\\.$`),
    apply: (m) => `${m[1]}% zmierzonej energii widma jest między 12 kHz a 20 kHz.`,
  },
  {
    pattern: new RegExp(`^${pct}% of spectral power is below 250 Hz$`),
    apply: (m) => `${m[1]}% mocy widma jest poniżej 250 Hz`,
  },
  {
    pattern: new RegExp(`^Side energy is ${pct}% of mid\\+side energy\\.$`),
    apply: (m) => `Energia side to ${m[1]}% energii mid+side.`,
  },
  {
    pattern: new RegExp(`^Balance is ([LRC]) ${pct}%\\.$`),
    apply: (m) => `Balans to ${m[1]} ${m[2]}%.`,
  },
  {
    pattern: new RegExp(`^Correlation ${num}\\. Possible mono compatibility issue\\.$`),
    apply: (m) => `Korelacja ${m[1]}. Możliwy problem zgodności z mono.`,
  },
  {
    pattern: new RegExp(`^Crest factor ${num} dB\\.?$`),
    apply: (m) => `Współczynnik szczytu ${m[1]} dB${m[0].endsWith('.') ? '.' : ''}`,
  },
  {
    pattern: new RegExp(`^${pct} full-scale samples?\\.?$`),
    apply: (m) => {
      const noun = polishCardinal(Number(m[1]), {
        one: 'próbka pełnej skali',
        few: 'próbki pełnej skali',
        many: 'próbek pełnej skali',
      })
      return `${m[1]} ${noun}${m[0].endsWith('.') ? '.' : ''}`
    },
  },
  {
    pattern: new RegExp(`^Peak ${num} dBFS\\.?$`),
    apply: (m) => `Szczyt ${m[1]} dBFS${m[0].endsWith('.') ? '.' : ''}`,
  },
  {
    pattern: new RegExp(`^Mean sample ${num}\\.?$`),
    apply: (m) => `Średnia próbki ${m[1]}${m[0].endsWith('.') ? '.' : ''}`,
  },
  {
    pattern: new RegExp(`^RMS ${num} dBFS\\.$`),
    apply: (m) => `RMS ${m[1]} dBFS.`,
  },
  {
    pattern: new RegExp(`^(Center|Right|Left) channel average \\+${num} dB$`),
    apply: (m) => {
      const side = m[1] === 'Right' ? 'Prawy' : m[1] === 'Left' ? 'Lewy' : 'Środkowy'
      return `${side} kanał, średnia +${m[2]} dB`
    },
  },
  {
    pattern: new RegExp(`^${num} s below −70 dBFS$`),
    apply: (m) => `${m[1]} s poniżej −70 dBFS`,
  },
  {
    pattern: new RegExp(`^RMS below −70 dBFS for ${num} s$`),
    apply: (m) => `RMS poniżej −70 dBFS przez ${m[1]} s`,
  },
  {
    pattern: new RegExp(`^Sustained low zero-crossing rate for ${num} s$`),
    apply: (m) => `Utrzymane niskie tempo przejść przez zero przez ${m[1]} s`,
  },
  {
    pattern: new RegExp(`^(\\d+) samples? at or above ([0-9.]+) \\(±0\\.1 dB of full scale\\)$`),
    apply: (m) => {
      const noun = polishCardinal(Number(m[1]), { one: 'próbka', few: 'próbki', many: 'próbek' })
      return `${m[1]} ${noun} na poziomie ${m[2]} albo wyżej (±0,1 dB pełnej skali)`
    },
  },
  {
    pattern: new RegExp(`^Short level jump, peak ${num} dBFS$`),
    apply: (m) => `Krótki skok poziomu, szczyt ${m[1]} dBFS`,
  },
  {
    pattern: new RegExp(`^Onset with ${pct}% of block energy in the low band$`),
    apply: (m) => `Wejście z ${m[1]}% energii bloku w niskim paśmie`,
  },
  {
    pattern: new RegExp(`^ESTIMATE\\. ${pct}% of spectral power sits between 250 Hz and 6 kHz\\. This is not a speech transcript\\.$`),
    apply: (m) => `SZACUNEK. ${m[1]}% mocy widma leży między 250 Hz a 6 kHz. To nie jest transkrypcja mowy.`,
  },
  {
    pattern: new RegExp(`^ESTIMATE\\. ${pct}% of spectral power is outside 250 Hz–6 kHz\\.$`),
    apply: (m) => `SZACUNEK. ${m[1]}% mocy widma jest poza 250 Hz–6 kHz.`,
  },
  {
    pattern: new RegExp(`^${num} dB crest$`),
    apply: (m) => `${m[1]} dB szczytu`,
  },
  {
    pattern: new RegExp(`^${num} s parameter-derived$`),
    apply: (m) => `${m[1]} s z parametrów`,
  },
]

function translateDetail(english: string): string {
  if (EXACT[english]) return EXACT[english]
  for (const rule of RULES) {
    const match = english.match(rule.pattern)
    if (match) return rule.apply(match)
  }
  return english
}

function translateRow(english: string): string {
  if (english.startsWith('M/S ')) return `M/S ${translateRow(english.slice(4))}`
  if (ROWS[english]) return ROWS[english]
  if (english.endsWith(' ENERGY')) {
    const band = english.slice(0, -' ENERGY'.length)
    return `${BAND_FROM_ENGLISH[band] ?? band} ENERGIA`
  }
  return english
}

function build(locale: Locale): HearingCopy {
  const pl = locale === 'pl'
  const text = pl ? PL_STATIC : EN_STATIC
  return {
    ...text,
    resizeCorner: (corner) =>
      pl ? `Zmień rozmiar od ${CORNERS[corner] ?? corner} rogu` : `Resize from the ${corner} corner`,
    levelsTip: pl
      ? 'Każdy pasek idzie od −96 dB do 0 dB. Bledszy pasek to oryginał, a kreska to jego koniec. Jaśniejszy pasek to to, co słychać'
      : 'Each track runs from −96 dB to 0 dB. The dimmer bar is the original and the tick is its end. The brighter bar is what you hear',
    levelsTipPitch: (semitones) =>
      pl
        ? ` po pitchu ${semitones} st i krzywej EQ.`
        : ` after pitch ${semitones} st and the EQ curve.`,
    levelsTipEq: pl ? ' po aktualnej krzywej EQ.' : ' after the current EQ curve.',
    levelsTipFlat: pl
      ? '. EQ jest ominięte, a pitch jest na 0 st, więc paski się pokrywają.'
      : '. EQ is bypassed and pitch is at 0 st, so the bars match.',
    affected: (lo, hi) => (pl ? ` · zakres ${lo}–${hi} Hz` : ` · affected ${lo}–${hi} Hz`),
    automation: (label, stored, effective) =>
      pl
        ? `Automatyzacja ${label}: zapisane ${stored} · skuteczne ${effective}`
        : `Automation ${label}: stored ${stored} · effective ${effective}`,
    gainNote: (db) => (pl ? `Wzmocnienie ${db} dB` : `GAIN ${db} dB`),
    voiceContrast: (db) => (pl ? `Kontrast głosu ${db} dB.` : `Voice contrast ${db} dB.`),
    showing: (title, timecode) =>
      pl ? `Pokazuję ${title} przy ${timecode}.` : `Showing ${title} at ${timecode}.`,
    playheadAnnounce: (timecode, label) => (pl ? `Głowica ${timecode}. ${label}.` : `Playhead ${timecode}. ${label}.`),
    noEvents: (scope) =>
      pl
        ? `Brak kwalifikujących zdarzeń w zakresie ${scope}. Krótkie albo równe zaznaczenie często ich nie ma. Wyczyść zaznaczenie, aby skanować cały sample, albo wybierz fragment z wyraźnym atakiem albo przerwą.`
        : `No qualifying events in ${scope}. A short or steady selection often has none. Clear the selection to scan the full sample, or choose a passage with a clear attack or a gap.`,
    heardAt: (pitch) => (pl ? ` · słyszane przy ${pitch} st` : ` · heard at ${pitch} st`),
    originalPitch: pl ? ' · oryginalny pitch' : ' · original pitch',
    loudnessNow: (value) => (pl ? `Teraz ${value}` : `Now ${value}`),
    loudnessStopped: pl ? 'Odtwarzanie jest zatrzymane.' : 'Playback is stopped.',
    loudnessValue: (word, live, peak, rms) =>
      pl
        ? `${word}. ${live} Szczyt sample ${peak}. RMS ${rms}.`
        : `${word}. ${live} Sample peak ${peak}. RMS ${rms}.`,
    playTag: (label) => (pl ? `Odtwórz ${label}` : `Play ${label}`),
    soundTip: pl ? SOUND_TIP_PL : SOUND_TIP_EN,
    spaceTip: pl ? SPACE_TIP_PL : SPACE_TIP_EN,
    focusTip: pl ? FOCUS_TIP_PL : FOCUS_TIP_EN,
    section: pl
      ? { sound: 'Dźwięk', events: 'Zdarzenia', space: 'Przestrzeń', dynamics: 'Dynamika', compare: 'Porównanie', haptics: 'Haptyka' }
      : { sound: 'Sound', events: 'Events', space: 'Space', dynamics: 'Dynamics', compare: 'Compare', haptics: 'Haptics' },
    summaryLabel: pl
      ? { level: 'Poziom', low: 'Dół', mid: 'Środek', high: 'Góra', space: 'Przestrzeń', dynamics: 'Dynamika', transients: 'Transjenty' }
      : { level: 'Level', low: 'Low', mid: 'Mid', high: 'High', space: 'Space', dynamics: 'Dynamics', transients: 'Transients' },
    legend: pl
      ? {
          transient: 'transjent',
          attack: '▲ atak',
          clip: '! przester',
          level: 'słupek = poziom',
          silence: '▭ cisza',
          loud: '● głośno',
          tone: '♩ ton',
          click: '◆ klik',
          transients: 'Transjenty',
          symbols: 'Symbole',
          hideLine: 'Ukryj linię transjentu',
          showLine: 'Pokaż linię transjentu',
        }
      : {
          transient: 'transient',
          attack: '▲ attack',
          clip: '! clip',
          level: 'bar = level',
          silence: '▭ silence',
          loud: '● loud',
          tone: '♩ tone',
          click: '◆ click',
          transients: 'Transients',
          symbols: 'Symbols',
          hideLine: 'Hide transient line',
          showLine: 'Show transient line',
        },
    profileLabel: (id) => (pl ? (PROFILES[id]?.label ?? id) : id === 'assisted' ? 'Assisted listening' : id === 'visual' ? 'Visual first' : id === 'visual-haptic' ? 'Visual + haptic' : id),
    profileDetail: (id) =>
      pl
        ? (PROFILES[id]?.detail ?? '')
        : id === 'assisted'
          ? 'Visual measurements beside auditory monitoring.'
          : id === 'visual'
            ? 'Sound map, fingerprint, events, and numbers. Does not assume you can hear the result.'
            : id === 'visual-haptic'
              ? 'The visual profile plus optional pulses where the device supports them.'
              : '',
    layerLabel: (id) =>
      pl
        ? (LAYERS[id] ?? id)
        : id === 'soundMap'
          ? 'Sound map'
          : id === 'descriptors'
            ? 'Live description'
            : id === 'events'
              ? 'Event detection'
              : id === 'dynamicsMap'
                ? 'Dynamics map'
                : id === 'space'
                  ? 'Space map'
                  : id === 'compare'
                    ? 'Before / after'
                    : id === 'assistant'
                      ? 'Visual mixing assistant'
                      : id === 'voiceEstimate'
                        ? 'Voice / background estimate'
                        : id,
    tag: (id, english) => {
      if (!pl) return english
      if (id === 'tone') return english
      if (id === 'imbalance') return english.startsWith('LEFT') ? 'WIĘCEJ Z LEWEJ' : 'WIĘCEJ Z PRAWEJ'
      return TAGS[id] ?? english
    },
    detail: (english) => (pl ? translateDetail(english) : english),
    findingTitle: (id, english) => (pl ? (FINDINGS[id] ?? english) : english),
    band: (id, english) => (pl ? (BANDS[id] ?? english) : english),
    scope: (english) => (pl ? (SCOPES[english] ?? english) : english),
    eventLabel: (kind, english) => (pl ? (EVENTS[kind] ?? english) : english),
    eventFilter: (kind) => (pl ? (EVENT_FILTERS[kind] ?? kind) : kind),
    summaryWord: (english) => (pl ? (SUMMARY[english] ?? english) : english),
    voiceLabel: (english) => (pl ? (VOICE[english] ?? english) : english),
    roomWord: (english) => (pl ? (ROOMS[english] ?? english) : english),
    distanceWord: (english) => (pl ? (DISTANCES[english] ?? english) : english),
    balance: (english) => {
      if (!pl) return english
      if (english === 'CENTER') return 'ŚRODEK'
      return english
    },
    compareGroup: (english) => (pl ? (GROUPS[english] ?? english) : english),
    compareRow: (english) => (pl ? translateRow(english) : english),
    cell: (english) => (pl ? translateDetail(english) : english),
    alertTitle: (english) => (pl ? (ALERTS[english] ?? english) : english),
    intensityLabel: (english) => (pl ? (INTENSITY[english] ?? english) : english),
    loudnessWord: (english) => (pl ? (LOUDNESS[english] ?? english) : english),
    reverbLine: (direct, early, tail) =>
      pl ? `Bezpośredni ${direct}% · wczesne ${early} · ogon ${tail} s` : `Direct ${direct}% · early ${early} · tail ${tail} s`,
    headAria: (room, distance, side) =>
      pl
        ? `Widok głowy. Pokój: ${ROOMS[room] ?? room}. Źródło jest ${DISTANCES[distance] ?? distance} i ${SIDES[side] ?? side}, przed głową. Przód jest u góry. Większy pokój albo większa odległość rysuje mniejszą głowę.`
        : `Head view. Room is ${room}. Source is ${distance} and ${side}, in front of the head. Front is up. A larger room or a greater distance draws a smaller head.`,
    monitorBand: (label) => (pl ? `Podbicie odsłuchu, ${label}` : `${label} monitor emphasis`),
  }
}

export function hearingUi(locale: Locale): HearingCopy {
  return build(locale)
}
