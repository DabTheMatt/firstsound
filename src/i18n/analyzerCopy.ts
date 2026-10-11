import type { Locale } from './locale'

export type AnalyzerCopy = {
  graph: string
  layer: string
  before: string
  after: string
  both: string
  mode: string
  history: string
  time: string
  view: string
  freeze: string
  freezeHint: string
  front: string
  angled: string
  top: string
  picture: string
  density: string
  auto: string
  low: string
  high: string
  normal: string
  draw: string
  lines: string
  surface: string
  color: string
  level: string
  frequency: string
  trails: string
  resetView: string
  clearHistory: string
  analyzer: string
  range: string
  columns: string
  fall: string
  slow: string
  fast: string
  follow: string
  peak: string
  eqChannel: string
  shared: string
  sharedHint: string
  left: string
  leftHint: string
  right: string
  rightHint: string
  display: string
  grid: string
  gridHint: string
  layerHint: string
  scale: string
  scaleHint: string
  scaleLog: string
  scaleLin: string
  scaleMel: string
  rangeHint: string
  colorHint: string
  fftColorHint: string
  nodes: string
  nodesHint: string
  regions: string
  regionsHint: string
  bars: string
  barsHint: string
  line: string
  lineHint: string
  legend: string
  legendHint: string
  guides: string
  guidesHint: string
  length: string
  holdLengthHint: string
  on: string
  off: string
  graphSettings: string
  fftView: string
  fftSize: string
  smooth: string
  smoothing: string
  source: string
  output: string
  signal: string
  sourceAndOutput: string
  beforeChain: string
  afterChain: string
  eqLayer: string
  eqOverlay: string
  scaleChange: string
  eqChannelTitle: string
  columnsTitle: string
  rangeChrome: string
  resolution: string
  resolutionTitle: string
  fallAria: string
  fallTitle: string
  followTitle: string
  curves: string
  filter: string
  analyzerRegion: string
  slowBars: string
  fill: string
  peakLine: string
  slowLine: string
  beforeAfter: string
  hoverLandmark: string
  peakTrails: string
  settings3d: string
  history3d: string
}

const en: AnalyzerCopy = {
  graph: 'Graph',
  layer: 'Layer',
  before: 'Before',
  after: 'After',
  both: 'Both',
  mode: 'Mode',
  history: 'History',
  time: 'Time',
  view: 'View',
  freeze: 'Freeze',
  freezeHint: 'Freeze history. Audio keeps playing.',
  front: 'Front',
  angled: 'Angled',
  top: 'Top',
  picture: 'Picture',
  density: 'Density',
  auto: 'Auto',
  low: 'Low',
  high: 'High',
  normal: 'Normal',
  draw: 'Draw',
  lines: 'Lines',
  surface: 'Surface',
  color: 'Color',
  level: 'Level',
  frequency: 'Frequency',
  trails: 'Trails',
  resetView: 'Reset view',
  clearHistory: 'Clear history',
  analyzer: 'Analyzer',
  range: 'Range',
  columns: 'Columns',
  fall: 'Fall',
  slow: 'Slow',
  fast: 'Fast',
  follow: 'Follow',
  peak: 'Peak',
  eqChannel: 'EQ ch',
  shared: 'Shared',
  sharedHint: 'One EQ curve for both channels.',
  left: 'Left',
  leftHint: 'Edit and hear EQ on the left channel.',
  right: 'Right',
  rightHint: 'Edit and hear EQ on the right channel.',
  display: 'Display',
  grid: 'Grid',
  gridHint: 'Vertical guides. 6, 12, or 24 frequency lines across the graph.',
  layerHint: 'Which spectrum to draw. Before is the input of the chain. After is the output. Both draws them together.',
  scale: 'Scale',
  scaleHint: 'How frequency is spaced. Log is the usual musical spacing. Lin is even in hertz. Mel follows hearing.',
  scaleLog: 'Logarithmic frequency axis (octaves).',
  scaleLin: 'Linear hertz axis.',
  scaleMel: 'Mel axis. Denser around speech frequencies.',
  rangeHint: 'How far down the spectrum bars reach, from 0 dB. The EQ curve keeps its own scale, from −24 dB to +24 dB.',
  colorHint: 'EQ graph only. Tints the spectrum columns by sub, bass, mids, presence, or air.',
  fftColorHint: 'FFT only. Off, Level, or Frequency. It paints the FFT bars, the FFT line, and the 3D ridges. It does not recolor the EQ graph.',
  nodes: 'Freq nodes',
  nodesHint: 'EQ only. Each handle, the filter list, and the band name take the color of the frequency. FFT color does not change them.',
  regions: 'Regions',
  regionsHint: 'EQ graph only. Tints each spectrum column by sub, bass, mids, presence, or air. FFT color is a separate setting.',
  bars: 'Bars',
  barsHint: 'Spectrum columns. Off leaves the outline, when Line is on.',
  line: 'Line',
  lineHint: 'Spectrum outline drawn over the columns.',
  legend: 'Legend',
  legendHint: 'Color key. Names the region colors, or what the bars and the line are. On the EQ graph this sits at the lower left.',
  guides: 'Guides',
  guidesHint: 'Frequency landmarks. Hover the graph to read what usually lives there, such as kick boom, voice, snare crack, or air.',
  length: 'Length',
  holdLengthHint: 'How long that fragment is. 0.05 s, 0.1 s, 0.25 s, 0.5 s, or 1 s. Changing it while Hold is on restarts the loop at the new length.',
  on: 'On',
  off: 'Off',
  graphSettings: 'Graph settings',
  fftView: 'FFT view',
  fftSize: 'FFT size',
  smooth: 'Smooth',
  smoothing: 'Smoothing',
  source: 'Source',
  output: 'Output',
  signal: 'Signal',
  sourceAndOutput: 'Source and output',
  beforeChain: 'Before the effect chain',
  afterChain: 'After the effect chain',
  eqLayer: 'EQ spectrum layer',
  eqOverlay: 'EQ overlay',
  scaleChange: 'Change how Hertz are spaced across the FFT',
  eqChannelTitle: 'Shared EQ, or independent left / right curves',
  columnsTitle: 'How many columns the bars use. Does not change FFT resolution.',
  rangeChrome: 'Spectrum scale from 0 dB down. Quiet bins stay measured; this does not stretch them. The EQ curve keeps its own scale.',
  resolution: 'Analyzer resolution',
  resolutionTitle: 'FFT length. 8192 resolves lower frequencies and reacts more slowly than 1024. Separate from display columns.',
  fallAria: 'Spectrum fall speed',
  fallTitle: 'Time-based release of the spectrum. Fast, Normal, and Slow all reach the floor. Slow is a longer release, not a freeze.',
  followTitle: 'Peak trace, slow trace, or both. Fall sets how quickly they drop.',
  curves: 'Response curves',
  filter: 'Filter',
  analyzerRegion: 'Spectrum analyzer',
  slowBars: 'Slow bars',
  fill: 'Fill',
  peakLine: 'Peak line',
  slowLine: 'Slow line',
  beforeAfter: 'Before / after',
  hoverLandmark: 'Hover a frequency for a landmark',
  peakTrails: 'Peak trails',
  settings3d: '3D Spectral History settings',
  history3d: '3D Spectral History',
}

const pl: AnalyzerCopy = {
  graph: 'Wykres',
  layer: 'Warstwa',
  before: 'Przed',
  after: 'Po',
  both: 'Oba',
  mode: 'Tryb',
  history: 'Historia',
  time: 'Czas',
  view: 'Widok',
  freeze: 'Stopklatka',
  freezeHint: 'Zatrzymuje historię widma. Dźwięk gra dalej.',
  front: 'Przód',
  angled: 'Skos',
  top: 'Góra',
  picture: 'Obraz',
  density: 'Gęstość',
  auto: 'Auto',
  low: 'Niska',
  high: 'Wysoka',
  normal: 'Zwykła',
  draw: 'Rysunek',
  lines: 'Linie',
  surface: 'Powierzchnia',
  color: 'Kolor',
  level: 'Poziom',
  frequency: 'Częstotliwość',
  trails: 'Ślady',
  resetView: 'Resetuj widok',
  clearHistory: 'Wyczyść historię',
  analyzer: 'Analizator',
  range: 'Zakres',
  columns: 'Kolumny',
  fall: 'Opadanie',
  slow: 'Wolno',
  fast: 'Szybko',
  follow: 'Śledzenie',
  peak: 'Szczyt',
  eqChannel: 'EQ kan.',
  shared: 'Wspólny',
  sharedHint: 'Jedna krzywa EQ dla obu kanałów.',
  left: 'Lewy',
  leftHint: 'Edytuj i słuchaj EQ na lewym kanale.',
  right: 'Prawy',
  rightHint: 'Edytuj i słuchaj EQ na prawym kanale.',
  display: 'Podgląd',
  grid: 'Siatka',
  gridHint: 'Pionowe prowadnice. 6, 12 albo 24 linie częstotliwości na wykresie.',
  layerHint: 'Które widmo rysować. Przed to wejście łańcucha. Po to wyjście. Oba rysuje je razem.',
  scale: 'Skala',
  scaleHint: 'Rozkład częstotliwości. Log to zwykły rozkład muzyczny. Lin jest równy w hercach. Mel idzie za słuchem.',
  scaleLog: 'Logarytmiczna oś częstotliwości (oktawy).',
  scaleLin: 'Liniowa oś w hercach.',
  scaleMel: 'Oś mel. Gęstsza wokół częstotliwości mowy.',
  rangeHint: 'Jak nisko sięgają słupki widma, od 0 dB. Krzywa EQ ma własną skalę, od −24 dB do +24 dB.',
  colorHint: 'Tylko wykres EQ. Barwi słupki widma według sub, basu, środka, prezencji albo powietrza.',
  fftColorHint: 'Tylko FFT. Wył., poziom albo częstotliwość. Maluje słupki FFT, linię FFT i grzbiety 3D. Nie przemalowuje wykresu EQ.',
  nodes: 'Węzły',
  nodesHint: 'Tylko EQ. Uchwyt, lista filtrów i nazwa pasma biorą kolor częstotliwości. Kolor FFT ich nie zmienia.',
  regions: 'Regiony',
  regionsHint: 'Tylko wykres EQ. Barwi słupek według sub, basu, środka, prezencji albo powietrza. Kolor FFT jest osobny.',
  bars: 'Słupki',
  barsHint: 'Kolumny widma. Wyłączenie zostawia kontur, gdy Linia jest włączona.',
  line: 'Linia',
  lineHint: 'Kontur widma rysowany nad kolumnami.',
  legend: 'Legenda',
  legendHint: 'Klucz kolorów. Nazywa kolory regionów albo to, czym są słupki i linia. Na wykresie EQ stoi z lewej u dołu.',
  guides: 'Prowadnice',
  guidesHint: 'Punkty częstotliwości. Najedź na wykres, aby zobaczyć, co zwykle tam mieszka, na przykład uderzenie stopy, głos, werbel albo powietrze.',
  length: 'Długość',
  holdLengthHint: 'Jak długi jest ten fragment. 0,05 s, 0,1 s, 0,25 s, 0,5 s albo 1 s. Zmiana przy włączonym Hold zaczyna pętlę od nowej długości.',
  on: 'Wł.',
  off: 'Wył.',
  graphSettings: 'Ustawienia wykresu',
  fftView: 'Widok FFT',
  fftSize: 'Rozmiar FFT',
  smooth: 'Wygł.',
  smoothing: 'Wygładzanie',
  source: 'Źródło',
  output: 'Wyjście',
  signal: 'Sygnał',
  sourceAndOutput: 'Źródło i wyjście',
  beforeChain: 'Przed łańcuchem efektów',
  afterChain: 'Po łańcuchu efektów',
  eqLayer: 'Warstwa widma EQ',
  eqOverlay: 'Nakładka EQ',
  scaleChange: 'Zmienia rozkład herców na FFT',
  eqChannelTitle: 'Wspólne EQ albo osobne krzywe lewego i prawego kanału',
  columnsTitle: 'Ile kolumn używają słupki. Nie zmienia rozdzielczości FFT.',
  rangeChrome: 'Skala widma od 0 dB w dół. Ciche prążki zostają zmierzone; to ich nie rozciąga. Krzywa EQ ma własną skalę.',
  resolution: 'Rozdzielczość analizatora',
  resolutionTitle: 'Długość FFT. 8192 rozdziela niższe częstotliwości i reaguje wolniej niż 1024. Osobno od kolumn podglądu.',
  fallAria: 'Szybkość opadania widma',
  fallTitle: 'Zwolnienie widma w czasie. Szybko, Zwykle i Wolno schodzą do podłogi. Wolno to dłuższe zwolnienie, nie stopklatka.',
  followTitle: 'Ślad szczytu, wolny ślad albo oba. Opadanie mówi, jak szybko spadają.',
  curves: 'Krzywe odpowiedzi',
  filter: 'Filtr',
  analyzerRegion: 'Analizator widma',
  slowBars: 'Wolne słupki',
  fill: 'Wypełnienie',
  peakLine: 'Linia szczytu',
  slowLine: 'Wolna linia',
  beforeAfter: 'Przed / po',
  hoverLandmark: 'Najedź na częstotliwość, aby zobaczyć punkt orientacyjny',
  peakTrails: 'Ślady szczytu',
  settings3d: 'Ustawienia historii widma 3D',
  history3d: 'Historia widma 3D',
}

export function analyzerCopy(locale: Locale): AnalyzerCopy {
  return locale === 'pl' ? pl : en
}
