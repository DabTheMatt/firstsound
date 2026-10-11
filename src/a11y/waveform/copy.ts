import { countNoun, polishCardinal } from '../../i18n/plural'
import type { LandmarkType, NavStepId } from './types'

export type WaveNavCopy = {
  title: string
  open: string
  close: string
  empty: string
  short: string
  region: (fileName: string) => string
  meta: (channels: string, duration: string, rate: string) => string
  mono: string
  stereo: string
  channels: (count: number) => string
  rate: (khz: string) => string
  position: string
  readPosition: string
  positionNow: (spoken: string) => string
  step: string
  steps: Record<NavStepId, string>
  goStart: string
  goEnd: string
  stepBack: (step: string) => string
  stepForward: (step: string) => string
  goTime: string
  go: string
  goSelectionStart: string
  goSelectionEnd: string
  setStart: string
  setEnd: string
  editTimes: string
  selectionStart: string
  selectionEnd: string
  clear: string
  selection: (start: string, end: string, duration: string) => string
  noSelection: string
  preview: string
  previewed: string
  trim: string
  fadeIn: string
  fadeOut: string
  normalize: string
  loop: string
  loopOn: string
  loopOff: string
  exportSelection: string
  undo: string
  previous: string
  next: string
  filter: string
  filters: Record<'all' | 'transient' | 'low-level' | 'level' | 'selection' | 'structural', string>
  detail: string
  list: string
  emptyList: string
  landmark: (clock: string, label: string) => string
  labels: Record<LandmarkType, string>
  spoken: Record<LandmarkType, (time: string) => string>
  moved: (time: string) => string
  none: string
  inspect: string
  inspectWindow: string
  peak: (channel: string, level: string) => string
  rms: (channel: string, level: string) => string
  activity: string
  quiet: string
  units: string
  learnTransient: string
  learnSilence: string
  learnRms: string
  analysing: string
  unavailable: string
  clearedNone: string
  appliedTrim: string
  appliedFade: string
  appliedNormalize: string
  appliedExport: string
  appliedUndo: string
}

const stepsEn: WaveNavCopy['steps'] = {
  '10s': '10 seconds',
  '1s': '1 second',
  '100ms': '100 milliseconds',
  '10ms': '10 milliseconds',
  sample: '1 sample',
}

const stepsPl: WaveNavCopy['steps'] = {
  '10s': '10 sekund',
  '1s': '1 sekunda',
  '100ms': '100 milisekund',
  '10ms': '10 milisekund',
  sample: '1 próbka',
}

const labelsEn: Record<LandmarkType, string> = {
  'recording-start': 'Recording start',
  'recording-end': 'Recording end',
  'selection-start': 'Selection start',
  'selection-end': 'Selection end',
  'loop-start': 'Loop start',
  'loop-end': 'Loop end',
  transient: 'Detected transient',
  'low-level-start': 'Possible silence begins',
  'low-level-end': 'Possible silence ends',
  'level-change': 'Level change',
}

const labelsPl: Record<LandmarkType, string> = {
  'recording-start': 'Początek nagrania',
  'recording-end': 'Koniec nagrania',
  'selection-start': 'Początek zaznaczenia',
  'selection-end': 'Koniec zaznaczenia',
  'loop-start': 'Początek pętli',
  'loop-end': 'Koniec pętli',
  transient: 'Wykryty transjent',
  'low-level-start': 'Możliwa cisza zaczyna się',
  'low-level-end': 'Możliwa cisza kończy się',
  'level-change': 'Zmiana poziomu',
}

function spokenFrom(labels: Record<LandmarkType, string>, locale: 'en' | 'pl'): WaveNavCopy['spoken'] {
  const at = locale === 'pl' ? 'o' : 'at'
  return {
    'recording-start': (time) => `${labels['recording-start']} ${at} ${time}.`,
    'recording-end': (time) => `${labels['recording-end']} ${at} ${time}.`,
    'selection-start': (time) => `${labels['selection-start']} ${at} ${time}.`,
    'selection-end': (time) => `${labels['selection-end']} ${at} ${time}.`,
    'loop-start': (time) => `${labels['loop-start']} ${at} ${time}.`,
    'loop-end': (time) => `${labels['loop-end']} ${at} ${time}.`,
    transient: (time) =>
      locale === 'pl' ? `Wykryty transjent o ${time}.` : `Detected transient at ${time}.`,
    'low-level-start': (time) =>
      locale === 'pl' ? `Możliwa cisza zaczyna się o ${time}.` : `Possible silence begins at ${time}.`,
    'low-level-end': (time) =>
      locale === 'pl' ? `Możliwa cisza kończy się o ${time}.` : `Possible silence ends at ${time}.`,
    'level-change': (time) =>
      locale === 'pl' ? `Zmiana poziomu o ${time}.` : `Level change at ${time}.`,
  }
}

const EN: WaveNavCopy = {
  title: 'Accessible waveform navigation',
  open: 'Open waveform navigation',
  close: 'Close waveform navigation',
  empty: 'Load a recording to navigate it.',
  short: 'This recording is too short to step through.',
  region: (fileName) => `Waveform navigation, ${fileName}.`,
  meta: (channels, duration, rate) => `${channels} Duration ${duration}. ${rate}`,
  mono: 'Mono recording.',
  stereo: 'Stereo recording.',
  channels: (count) =>
    `${countNoun('en', count, { one: 'channel', other: 'channels' }, { one: 'kanał', few: 'kanały', many: 'kanałów' })}.`,
  rate: (khz) => `Sample rate ${khz} kilohertz.`,
  position: 'Playhead position',
  readPosition: 'Read playhead position',
  positionNow: (spoken) => `Playhead position, ${spoken}.`,
  step: 'Navigation step',
  steps: stepsEn,
  goStart: 'Go to start',
  goEnd: 'Go to end',
  stepBack: (step) => `Step backward, ${step}`,
  stepForward: (step) => `Step forward, ${step}`,
  goTime: 'Go to time',
  go: 'Go',
  goSelectionStart: 'Go to selection start',
  goSelectionEnd: 'Go to selection end',
  setStart: 'Set start at playhead',
  setEnd: 'Set end at playhead',
  editTimes: 'Edit selection times',
  selectionStart: 'Selection start',
  selectionEnd: 'Selection end',
  clear: 'Clear selection',
  selection: (start, end, duration) => `Selection from ${start} to ${end}. Duration ${duration}.`,
  noSelection: 'No partial selection. The play region is the whole recording.',
  preview: 'Preview selection',
  previewed: 'Playing the selection.',
  trim: 'Trim',
  fadeIn: 'Fade in',
  fadeOut: 'Fade out',
  normalize: 'Normalize',
  loop: 'Loop',
  loopOn: 'Loop on',
  loopOff: 'Loop off',
  exportSelection: 'Export selection',
  undo: 'Undo',
  previous: 'Previous landmark',
  next: 'Next landmark',
  filter: 'Landmark filter',
  filters: {
    all: 'All',
    transient: 'Transients',
    'low-level': 'Low-level sections',
    level: 'Level changes',
    selection: 'Selection boundaries',
    structural: 'Structural boundaries',
  },
  detail: 'More landmark detail',
  list: 'Landmarks',
  emptyList: 'No landmarks in this filter.',
  landmark: (clock, label) => `${clock} ${label}`,
  labels: labelsEn,
  spoken: spokenFrom(labelsEn, 'en'),
  moved: (time) => `Playhead at ${time}.`,
  none: 'No landmark in that direction.',
  inspect: 'Inspect signal',
  inspectWindow: 'Peak and RMS use a 50 millisecond window around the playhead.',
  peak: (channel, level) => `${channel} peak ${level}.`,
  rms: (channel, level) => `${channel} RMS ${level}.`,
  activity: 'Signal present in this window.',
  quiet: 'Low-level activity in this window.',
  units: 'Peak and RMS are digital levels in dBFS.',
  learnTransient: 'What is a transient?',
  learnSilence: 'What is silence detection?',
  learnRms: 'What does RMS mean?',
  analysing: 'Looking for landmarks.',
  unavailable: 'Landmark analysis is not available for this recording.',
  clearedNone: 'There is no partial selection to clear.',
  appliedTrim: 'Trim applied.',
  appliedFade: 'Fade updated.',
  appliedNormalize: 'Normalize applied.',
  appliedExport: 'Export opened.',
  appliedUndo: 'Undo applied.',
}

const PL: WaveNavCopy = {
  title: 'Dostępna nawigacja po nagraniu',
  open: 'Otwórz nawigację po nagraniu',
  close: 'Zamknij nawigację po nagraniu',
  empty: 'Wczytaj nagranie, aby po nim przejść.',
  short: 'To nagranie jest za krótkie, aby iść krokami.',
  region: (fileName) => `Nawigacja po fali, ${fileName}.`,
  meta: (channels, duration, rate) => `${channels} Czas ${duration}. ${rate}`,
  mono: 'Nagranie mono.',
  stereo: 'Nagranie stereo.',
  channels: (count) =>
    `${countNoun('pl', count, { one: 'channel', other: 'channels' }, { one: 'kanał', few: 'kanały', many: 'kanałów' })}.`,
  rate: (khz) => {
    const n = Number(String(khz).replace(',', '.'))
    const unit = Number.isFinite(n)
      ? polishCardinal(Math.round(n), { one: 'kiloherc', few: 'kiloherce', many: 'kiloherców' })
      : 'kHz'
    return `Częstotliwość próbkowania ${khz} ${unit}.`
  },
  position: 'Pozycja głowicy',
  readPosition: 'Odczytaj pozycję głowicy',
  positionNow: (spoken) => `Pozycja głowicy, ${spoken}.`,
  step: 'Krok nawigacji',
  steps: stepsPl,
  goStart: 'Idź na początek',
  goEnd: 'Idź na koniec',
  stepBack: (step) => `Krok wstecz, ${step}`,
  stepForward: (step) => `Krok naprzód, ${step}`,
  goTime: 'Idź do czasu',
  go: 'Idź',
  goSelectionStart: 'Idź na początek zaznaczenia',
  goSelectionEnd: 'Idź na koniec zaznaczenia',
  setStart: 'Ustaw początek na głowicy',
  setEnd: 'Ustaw koniec na głowicy',
  editTimes: 'Edytuj czasy zaznaczenia',
  selectionStart: 'Początek zaznaczenia',
  selectionEnd: 'Koniec zaznaczenia',
  clear: 'Wyczyść zaznaczenie',
  selection: (start, end, duration) => `Zaznaczenie od ${start} do ${end}. Czas ${duration}.`,
  noSelection: 'Brak częściowego zaznaczenia. Region odtwarzania to całe nagranie.',
  preview: 'Odsłuch zaznaczenia',
  previewed: 'Odtwarzanie zaznaczenia.',
  trim: 'Przytnij',
  fadeIn: 'Narastanie',
  fadeOut: 'Wygaszanie',
  normalize: 'Normalizuj',
  loop: 'Pętla',
  loopOn: 'Pętla włączona',
  loopOff: 'Pętla wyłączona',
  exportSelection: 'Eksportuj zaznaczenie',
  undo: 'Cofnij',
  previous: 'Poprzedni punkt',
  next: 'Następny punkt',
  filter: 'Filtr punktów',
  filters: {
    all: 'Wszystkie',
    transient: 'Transjenty',
    'low-level': 'Ciche odcinki',
    level: 'Zmiany poziomu',
    selection: 'Granice zaznaczenia',
    structural: 'Granice strukturalne',
  },
  detail: 'Więcej szczegółów punktów',
  list: 'Punkty charakterystyczne',
  emptyList: 'Brak punktów w tym filtrze.',
  landmark: (clock, label) => `${clock} ${label}`,
  labels: labelsPl,
  spoken: spokenFrom(labelsPl, 'pl'),
  moved: (time) => `Głowica o ${time}.`,
  none: 'Brak punktu w tę stronę.',
  inspect: 'Zbadaj sygnał',
  inspectWindow: 'Szczyt i RMS liczone są w oknie 50 milisekund wokół głowicy.',
  peak: (channel, level) => `${channel} szczyt ${level}.`,
  rms: (channel, level) => `${channel} RMS ${level}.`,
  activity: 'W tym oknie jest sygnał.',
  quiet: 'W tym oknie aktywność jest niska.',
  units: 'Szczyt i RMS to poziomy cyfrowe w dBFS.',
  learnTransient: 'Czym jest transjent?',
  learnSilence: 'Czym jest wykrywanie ciszy?',
  learnRms: 'Co znaczy RMS?',
  analysing: 'Szukam punktów charakterystycznych.',
  unavailable: 'Analiza punktów nie jest dostępna dla tego nagrania.',
  clearedNone: 'Nie ma częściowego zaznaczenia do wyczyszczenia.',
  appliedTrim: 'Przycięcie zastosowane.',
  appliedFade: 'Zanik zaktualizowany.',
  appliedNormalize: 'Normalizacja zastosowana.',
  appliedExport: 'Eksport otwarty.',
  appliedUndo: 'Cofnięcie zastosowane.',
}

export function waveNavCopy(locale: 'en' | 'pl'): WaveNavCopy {
  return locale === 'pl' ? PL : EN
}
