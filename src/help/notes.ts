import type { ParamId } from '../audio/parameters/types'
import type { LocalizedText } from '../i18n/locale'

const text = (en: string, pl: string): LocalizedText => ({ en, pl })

export type HelpNote = {
  practical?: LocalizedText
  technical?: LocalizedText
  /** Reuse a Learn Audio topic instead of copying it. */
  topicId?: string
  manualId?: string
  shortcutIds?: readonly string[]
  summary?: LocalizedText
  title?: LocalizedText
}

export function writtenNoteParagraphs(id: string, locale: 'en' | 'pl'): string[] {
  const note = TOOL_NOTES[id]
  if (!note) return []
  return [note.summary, note.practical, note.technical]
    .map((item) => item?.[locale]?.trim() ?? '')
    .filter((paragraph) => paragraph.length > 0)
}

export function paramFamily(id: string): 'eq.freq' | 'eq.gain' | 'eq.q' | null {
  if (/^eq\d+Freq$/.test(id)) return 'eq.freq'
  if (/^eq\d+Gain$/.test(id)) return 'eq.gain'
  if (/^eq\d+Q$/.test(id)) return 'eq.q'
  return null
}

export const FAMILY_NOTES: Record<'eq.freq' | 'eq.gain' | 'eq.q', HelpNote> = {
  'eq.freq': {
    manualId: 'eq',
    practical: text(
      'Frequency chooses where the band sits. Low numbers are bass. High numbers are treble. It does not boost or cut by itself.',
      'Częstotliwość wybiera miejsce pasma. Niskie liczby to bas. Wysokie to góra. Sama nie podbija i nie tłumi.',
    ),
    technical: text(
      'Hertz pick the band center or the filter corner. Frequency is not gain and it is not Q. Shelf, bell, pass, and notch filters all use this same control for their corner.',
      'Herce ustawiają środek pasma albo narożnik filtra. Częstotliwość nie jest wzmocnieniem i nie jest dobrocią. Półka, dzwon, przepust i notch używają tej samej kontrolki jako narożnika.',
    ),
  },
  'eq.gain': {
    manualId: 'eq',
    practical: text(
      'Gain boosts or cuts that band in decibels. It does not move the frequency. A boost can also raise the level, so leave headroom.',
      'Wzmocnienie podbija albo tłumi to pasmo w decybelach. Nie przesuwa częstotliwości. Podbicie może też podnieść poziom, więc zostaw zapas poziomu.',
    ),
    technical: text(
      'Band gain applies to a bell and to low and high shelves. Low-pass, high-pass, notch, and band-pass do not use this gain. The amount is decibels, not a percentage of loudness.',
      'Wzmocnienie pasma działa przy filtrze dzwonowym oraz przy półce dolnej i górnej. Dolnoprzepustowy, górnoprzepustowy, pasmowo-zaporowy i pasmowoprzepustowy nie używają tego wzmocnienia. Wartość jest w decybelach, nie w procentach głośności.',
    ),
  },
  'eq.q': {
    topicId: 'q',
    manualId: 'eq',
    practical: text(
      'Q sets how wide the band is. A higher Q is narrower. It does not choose the frequency and it does not set the boost.',
      'Dobroć filtra ustawia szerokość pasma. Wyższe Q jest węższe. Nie wybiera częstotliwości i nie ustawia podbicia.',
    ),
    technical: text(
      'On a bell, Q is the width of the peak. On a notch or band-pass, Q is the width of the cut or the pass. On a low-pass or high-pass, Q emphasizes the cutoff on the last section. Slope is a separate control.',
      'Przy dzwonie Q to szerokość szczytu. Przy filtrze pasmowo-zaporowym albo pasmowoprzepustowym Q to szerokość wycięcia albo przepustu. Przy dolno- i górnoprzepustowym Q podkreśla odcięcie na ostatniej sekcji. Nachylenie jest osobną kontrolką.',
    ),
  },
}

export const PARAM_NOTES: Partial<Record<ParamId, HelpNote>> = {
  gain: {
    topicId: 'gain',
    manualId: 'input',
    practical: text(
      'This is input gain, before the rest of the chain. It is not output gain, track volume, or normalize.',
      'To wzmocnienie wejścia, zanim sygnał wejdzie w resztę łańcucha. To nie jest wzmocnienie wyjścia, głośność śladu ani normalizacja.',
    ),
    technical: text(
      'Input gain scales the signal in decibels ahead of the effects. +6 dB is about twice the amplitude, not twice the perceived loudness. It does not move the output fader.',
      'Wzmocnienie wejścia skaluje sygnał w decybelach przed efektami. +6 dB to około dwa razy większa amplituda, nie dwa razy większa odczuwana głośność. Nie rusza suwaka wyjścia.',
    ),
  },
  outputGain: {
    manualId: 'out',
    practical: text(
      'This is the level at the end of the instrument, after the effects. It does not replace input gain.',
      'To poziom na końcu instrumentu, po efektach. Nie zastępuje wzmocnienia wejścia.',
    ),
    technical: text(
      'Output gain is a final decibel trim on the instrument output. It is not the mixer track volume and it is not normalize.',
      'Wzmocnienie wyjścia to końcowa korekta w decybelach na wyjściu instrumentu. To nie jest głośność śladu w mikserze i nie jest normalizacją.',
    ),
  },
  mixVolume: {
    manualId: 'out',
    practical: text(
      'Track volume is how loud this track is in the mix. It is not input gain and it is not the instrument output gain.',
      'Głośność śladu to, jak głośny jest ten ślad w miksie. To nie jest wzmocnienie wejścia i nie jest wzmocnieniem wyjścia instrumentu.',
    ),
    technical: text(
      'The control is a percent trim of this track before the master sum. Changing it does not rewrite input gain or output gain.',
      'Kontrolka to procentowa korekta tego śladu przed sumą master. Jej zmiana nie przepisuje wzmocnienia wejścia ani wzmocnienia wyjścia.',
    ),
  },
  compressorThreshold: {
    manualId: 'comp',
    practical: text(
      'Set the threshold where louder moments should start being turned down. Sound below it is left alone.',
      'Ustaw próg tam, gdzie głośniejsze momenty mają zacząć być ściszane. Dźwięk poniżej progu zostaje.',
    ),
    technical: text(
      'Threshold is the level where gain reduction begins. FIELD maps it onto a DynamicsCompressorNode. This compressor is not the output limiter.',
      'Próg to poziom, od którego zaczyna się redukcja wzmocnienia. FIELD podaje go do DynamicsCompressorNode. Ten kompresor nie jest limiterem wyjścia.',
    ),
  },
  compressorRatio: {
    manualId: 'comp',
    practical: text(
      'Ratio sets how hard levels above the threshold are turned down. 1:1 barely changes the signal. A higher ratio squashes more.',
      'Stopień kompresji ustawia, jak mocno poziomy powyżej progu są ściszane. 1:1 prawie nie zmienia sygnału. Wyższy stopień ściska mocniej.',
    ),
    technical: text(
      'Ratio is the input-to-output slope above the threshold, written :1. Knee softens that corner. Ratio does not move the threshold.',
      'Stopień kompresji to nachylenie wejście-wyjście powyżej progu, zapisywane jako :1. Kolano łagodzi ten narożnik. Stopień nie przesuwa progu.',
    ),
  },
  compressorKnee: {
    manualId: 'comp',
    practical: text(
      'Knee 0 dB is a hard corner. A wider knee eases into compression around the threshold instead of switching on at one level.',
      'Kolano 0 dB to ostry narożnik. Szersze kolano łagodnie wchodzi w kompresję wokół progu, zamiast włączać się na jednym poziomie.',
    ),
    technical: text(
      'Knee is the width, in decibels, of the soft transition around the threshold. It does not change ratio, attack, or release.',
      'Kolano to szerokość, w decybelach, miękkiego przejścia wokół progu. Nie zmienia stopnia kompresji, ataku ani zwolnienia.',
    ),
  },
  compressorAttack: {
    manualId: 'comp',
    practical: text(
      'Attack is how quickly the compressor starts reducing level. A short attack catches hits. A longer one lets them through.',
      'Atak to, jak szybko kompresor zaczyna obniżać poziom. Krótki atak łapie uderzenia. Dłuższy je przepuszcza.',
    ),
    technical: text(
      'The control is in milliseconds. The compressor node receives that time in seconds, divided by 1000. Attack is not stored as a musical note.',
      'Kontrolka jest w milisekundach. Węzeł kompresora dostaje ten czas w sekundach, po podzieleniu przez 1000. Atak nie jest zapisany jako nuta.',
    ),
  },
  compressorRelease: {
    manualId: 'comp',
    practical: text(
      'Release is how quickly the compressor lets go after the signal drops. Very short release can pump. Longer release is smoother.',
      'Zwolnienie to, jak szybko kompresor puszcza sygnał, gdy poziom opada. Bardzo krótkie zwolnienie może pompować. Dłuższe jest gładsze.',
    ),
    technical: text(
      'Shown in milliseconds and applied as seconds on the compressor node, divided by 1000. Release does not add makeup gain.',
      'Pokazane w milisekundach i podawane jako sekundy na węzeł kompresora, po podzieleniu przez 1000. Zwolnienie nie dodaje wzmocnienia kompensacyjnego.',
    ),
  },
  compressorMakeup: {
    manualId: 'comp',
    practical: text(
      'Makeup gain restores level after compression. It does not change how much the compressor turned the peaks down.',
      'Wzmocnienie kompensacyjne przywraca poziom po kompresji. Nie zmienia tego, ile kompresor ściszył szczyty.',
    ),
    technical: text(
      'Makeup sits after the gain-reduction stage. It is used when auto makeup is off. It does not move the gain-reduction amount.',
      'Wzmocnienie kompensacyjne jest po stopniu redukcji. Działa, gdy automatyczne wyrównanie jest wyłączone. Nie przesuwa wielkości redukcji wzmocnienia.',
    ),
  },
  compressorAutoMakeup: {
    manualId: 'comp',
    practical: text(
      'Auto makeup estimates level from the threshold and ratio. Turn it off to set makeup gain by hand.',
      'Automatyczne wyrównanie szacuje poziom z progu i stopnia kompresji. Wyłącz je, aby ustawić wzmocnienie kompensacyjne ręcznie.',
    ),
    technical: text(
      'The estimate is a fixed calculation from threshold and ratio. It is not a live loudness matcher.',
      'Szacunek to stałe wyliczenie z progu i stopnia kompresji. To nie jest bieżące wyrównywanie głośności.',
    ),
  },
  compressorInput: {
    manualId: 'comp',
    practical: text(
      'Input is the level into this compressor. Raising it can push more of the signal over the threshold.',
      'Wejście to poziom wchodzący do tego kompresora. Podniesienie go może przepchnąć więcej sygnału ponad próg.',
    ),
    technical: text(
      'Compressor input gain is applied before the threshold comparison. It is not the instrument input gain and it is not makeup.',
      'Wzmocnienie wejścia kompresora jest przed porównaniem z progiem. To nie jest wzmocnienie wejścia instrumentu i nie jest wzmocnieniem kompensacyjnym.',
    ),
  },
  compressorLowCut: {
    manualId: 'comp',
    practical: text(
      'Frequencies below this are kept out of the compressor’s detector. At the bottom of the control the whole signal is compressed.',
      'Częstotliwości poniżej tej wartości nie wchodzą do detektora kompresora. Na dole kontrolki kompresowany jest cały sygnał.',
    ),
    technical: text(
      'Low cut is a side path around the compressor for sound under the cutoff. The minimum is shown as off and compresses the full signal. It is not an EQ band.',
      'Dolne cięcie to obejście kompresora dla dźwięku poniżej odcięcia. Minimum jest pokazane jako wyłączone i kompresuje cały sygnał. To nie jest pasmo EQ.',
    ),
  },
  reverbSize: {
    topicId: 'reverb',
    manualId: 'reverb',
    practical: text(
      'Size changes how large the space feels. It is not a room measured in meters.',
      'Wielkość zmienia, jak duża wydaje się przestrzeń. To nie jest pomieszczenie mierzone w metrach.',
    ),
    technical: text(
      'Size is a percent control on this reverb instance. Decay is the separate time of the tail. Size does not set pre-delay.',
      'Wielkość to kontrolka procentowa tej instancji pogłosu. Wybrzmienie to osobny czas ogona. Wielkość nie ustawia opóźnienia wstępnego.',
    ),
  },
  reverbDecay: {
    manualId: 'reverb',
    practical: text(
      'Decay is how long the reverb tail lasts. A short decay is a tight room. A long one keeps ringing.',
      'Wybrzmienie to, jak długo trwa ogon pogłosu. Krótkie wybrzmienie to ciasne pomieszczenie. Długie zostawia wybrzmiewanie.',
    ),
    technical: text(
      'Decay is in seconds. It is not size, and it is not the wet mix. The tail is generated by this reverb, not by an acoustic model of a real hall.',
      'Wybrzmienie jest w sekundach. To nie jest wielkość i nie jest miks wet. Ogon generuje ten pogłos, a nie model akustyczny prawdziwej sali.',
    ),
  },
  reverbPredelay: {
    manualId: 'reverb',
    practical: text(
      'Pre-delay waits before the reverb starts, so the dry sound stays clear for a moment.',
      'Opóźnienie wstępne czeka, zanim zacznie się pogłos, więc suchy dźwięk przez chwilę zostaje czysty.',
    ),
    technical: text(
      'Pre-delay is milliseconds between the dry signal and the onset of the tail. It does not change decay time.',
      'Opóźnienie wstępne to milisekundy między sygnałem suchym a początkiem ogona. Nie zmienia czasu wybrzmienia.',
    ),
  },
  reverbDamping: {
    manualId: 'reverb',
    practical: text(
      'Damping darkens the tail by absorbing highs as the reverb fades. The dry sound stays as it is.',
      'Tłumienie przyciemnia ogon, pochłaniając górę w miarę gaśnięcia pogłosu. Suchy dźwięk zostaje, jaki jest.',
    ),
    technical: text(
      'Damping is a high-frequency loss inside the reverb tail. It is not the EQ and it does not change wet level.',
      'Tłumienie to utrata wysokich częstotliwości wewnątrz ogona pogłosu. To nie jest EQ i nie zmienia poziomu wet.',
    ),
  },
  reverbWet: {
    topicId: 'wet',
    manualId: 'reverb',
    practical: text(
      'Wet is how much reverb you hear. If the original disappears, turn wet back down.',
      'Wet to, ile pogłosu słyszysz. Jeśli oryginał znika, obniż wet.',
    ),
    technical: text(
      'When dry and wet are linked they are one mix, with an equal-power crossfade. Unlinked, they are separate levels. Wet does not change decay or size.',
      'Gdy dry i wet są połączone, są jednym miksem, ze zanikaniem o równej mocy. Rozłączone są osobnymi poziomami. Wet nie zmienia wybrzmienia ani wielkości.',
    ),
  },
  reverbDry: {
    topicId: 'wet',
    manualId: 'reverb',
    practical: text(
      'Dry is the original sound through the reverb module. Turn it down when you want mostly the space.',
      'Dry to oryginalny dźwięk przez moduł pogłosu. Obniż go, gdy chcesz głównie przestrzeń.',
    ),
    technical: text(
      'Dry is the uneffected path of this reverb instance. Linked with wet, it follows the mix. It does not bypass the module.',
      'Dry to ścieżka bez efektu tej instancji pogłosu. Połączony z wet podąża za miksem. Nie omija modułu.',
    ),
  },
  delayTime: {
    topicId: 'delay',
    manualId: 'delay',
    practical: text(
      'Delay time is the gap before the repeat. Short is a slap. Longer is a clear echo.',
      'Czas delay to odstęp przed powtórzeniem. Krótki to szybkie odbicie. Dłuższy to wyraźne echo.',
    ),
    technical: text(
      'The free time is milliseconds on the left or mono path. When sync is on, that path follows the tempo and the selected note instead. Stereo on gives the right side its own time.',
      'Wolny czas to milisekundy na ścieżce lewej albo mono. Gdy synchronizacja jest włączona, ta ścieżka idzie za tempem i wybraną nutą. Włączone stereo daje prawej stronie własny czas.',
    ),
  },
  delayTimeR: {
    manualId: 'delay',
    practical: text(
      'Right delay time is the gap on the right side when stereo delay is on.',
      'Prawy czas delay to odstęp po prawej stronie, gdy stereo delay jest włączone.',
    ),
    technical: text(
      'Used when delay stereo is on. Sync on the right follows the right note value. It does not move the left time.',
      'Działa, gdy stereo delay jest włączone. Synchronizacja po prawej idzie za prawą wartością nuty. Nie rusza czasu lewego.',
    ),
  },
  delayFeedback: {
    manualId: 'delay',
    practical: text(
      'Feedback sends some of the repeat back into the delay, so it can echo again. Too much becomes a smear.',
      'Sprzężenie zwrotne zawraca część powtórzenia do delay, więc echo może wrócić jeszcze raz. Za dużo zamienia się w smugę.',
    ),
    technical: text(
      'Feedback is the percent returned into the same delay path. The control stops below a full loop. It does not change delay time.',
      'Sprzężenie zwrotne to procent zawracany do tej samej ścieżki delay. Kontrolka zatrzymuje się poniżej pełnej pętli. Nie zmienia czasu delay.',
    ),
  },
  delayFeedbackR: {
    manualId: 'delay',
    practical: text(
      'Right feedback is the repeat amount on the right side when stereo delay is on.',
      'Prawe sprzężenie zwrotne to ilość powtórzeń po prawej, gdy stereo delay jest włączone.',
    ),
    technical: text(
      'Applied to the right line only while stereo delay is on. It does not change the left feedback.',
      'Działa na prawej linii tylko przy włączonym stereo delay. Nie zmienia lewego sprzężenia.',
    ),
  },
  delayWet: {
    topicId: 'wet',
    manualId: 'delay',
    practical: text(
      'Wet is how loud the repeats are next to the dry sound.',
      'Wet to, jak głośne są powtórzenia obok suchego dźwięku.',
    ),
    technical: text(
      'Left or mono wet level. With stereo on, the right wet is separate. Wet does not change delay time or feedback.',
      'Poziom wet lewy albo mono. Przy włączonym stereo prawy wet jest osobny. Wet nie zmienia czasu delay ani sprzężenia zwrotnego.',
    ),
  },
  delayDry: {
    topicId: 'wet',
    manualId: 'delay',
    practical: text(
      'Dry is the undelayed sound through the delay module.',
      'Dry to dźwięk bez opóźnienia przez moduł delay.',
    ),
    technical: text(
      'Dry and wet can be linked so they stay complementary, or unlinked so each level is independent.',
      'Dry i wet mogą być połączone, wtedy się uzupełniają, albo rozłączone, wtedy każdy poziom jest niezależny.',
    ),
  },
  delayStereo: {
    manualId: 'delay',
    practical: text(
      'Stereo delay gives left and right their own time. Off keeps one shared delay.',
      'Stereo delay daje lewej i prawej stronie własny czas. Wyłączone zostawia jeden wspólny delay.',
    ),
    technical: text(
      'This is a switch, not a width knob. On uses the right time, feedback, and wet. Width is the separate stereo-width control.',
      'To przełącznik, nie gałka szerokości. Włączenie używa prawego czasu, sprzężenia i wet. Szerokość to osobna kontrolka szerokości stereo.',
    ),
  },
  delaySync: {
    manualId: 'delay',
    practical: text(
      'Sync locks the delay to the tempo so repeats land on note values.',
      'Synchronizacja wiąże delay z tempem, żeby powtórzenia padały na wartości nut.',
    ),
    technical: text(
      'When sync is on, the left or mono time follows BPM and the selected note division. The free millisecond time is not the one you hear.',
      'Gdy synchronizacja jest włączona, czas lewy albo mono idzie za BPM i wybranym podziałem nuty. Wolny czas w milisekundach nie jest tym, który słyszysz.',
    ),
  },
  delayWidth: {
    manualId: 'delay',
    practical: text(
      'Width spreads the delay return in the stereo field. It does not turn stereo delay on.',
      'Szerokość rozkłada powrót delay w polu stereo. Nie włącza stereo delay.',
    ),
    technical: text(
      'Width is the stereo spread of the return. The stereo switch is what splits left and right times.',
      'Szerokość to rozpiętość stereo powrotu. Przełącznik stereo rozdziela czasy lewy i prawy.',
    ),
  },
  filterCutoff: {
    manualId: 'filter',
    practical: text(
      'Cutoff is the corner the filter opens or closes around. It is the filter module, not an EQ band.',
      'Odcięcie to narożnik, wokół którego filtr się otwiera albo zamyka. To moduł filtra, nie pasmo EQ.',
    ),
    technical: text(
      'Cutoff is in hertz on the filter instance. The filter type chooses low-pass, high-pass, and the other modes. EQ bands are a different module.',
      'Odcięcie jest w hercach na instancji filtra. Typ filtra wybiera dolnoprzepustowy, górnoprzepustowy i pozostałe tryby. Pasma EQ to inny moduł.',
    ),
  },
  filterReso: {
    manualId: 'filter',
    practical: text(
      'Resonance emphasizes the cutoff. A little adds tone. A lot can whistle.',
      'Rezonans podkreśla odcięcie. Odrobina dodaje barwy. Dużo może gwizdać.',
    ),
    technical: text(
      'Resonance is the emphasis at the cutoff of this filter. It is not the EQ Q of a bell band.',
      'Rezonans to podkreślenie przy odcięciu tego filtra. To nie jest dobroć Q pasma dzwonowego EQ.',
    ),
  },
  filterKind: {
    manualId: 'filter',
    practical: text(
      'Filter type chooses the shape: what passes and what is turned down. Off bypasses the filter.',
      'Typ filtra wybiera kształt: co przechodzi, a co jest ściszane. Wyłączony omija filtr.',
    ),
    technical: text(
      'The type is the filter module’s response. EQ strips use the same family of shapes on their own bands.',
      'Typ to odpowiedź modułu filtra. Paski EQ używają tej samej rodziny kształtów na własnych pasmach.',
    ),
  },
  filterLfoRate: {
    manualId: 'lfo',
    practical: text(
      'Rate is how fast the filter LFO moves the cutoff. The sample itself is not rewritten.',
      'Tempo to, jak szybko LFO filtra rusza odcięcie. Sam sample nie jest przepisywany.',
    ),
    technical: text(
      'Rate is the LFO speed for this filter. Sync can lock it to tempo. The LFO changes the cutoff over time. It does not replace the source buffer.',
      'Tempo to szybkość LFO tego filtra. Synchronizacja może związać je z tempem utworu. LFO zmienia odcięcie w czasie. Nie zastępuje bufora źródła.',
    ),
  },
  filterLfoDepth: {
    manualId: 'lfo',
    practical: text(
      'Depth is how far the LFO swings the cutoff around its setting.',
      'Głębokość to, jak daleko LFO odchyla odcięcie od ustawionej wartości.',
    ),
    technical: text(
      'Depth is the modulation amount around the cutoff. Zero depth leaves the cutoff still. The stored cutoff remains the center.',
      'Głębokość to wielkość modulacji wokół odcięcia. Zerowa głębokość zostawia odcięcie w miejscu. Zapisane odcięcie zostaje środkiem.',
    ),
  },
  filterLfoShape: {
    manualId: 'lfo',
    practical: text(
      'Shape is the pattern of the movement: smooth, edged, or stepped. It does not change the sample waveform.',
      'Kształt to wzór ruchu: gładki, ostry albo schodkowy. Nie zmienia fali sampla.',
    ),
    technical: text(
      'The filter LFO shape is the modulator waveform. It drives the cutoff. It is not the audio oscillator of the loaded sample.',
      'Kształt LFO filtra to fala modulatora. Steruje odcięciem. To nie jest oscylator audio wczytanego sampla.',
    ),
  },
}

export const TOOL_NOTES: Record<string, HelpNote> = {
  'wave.editor': {
    topicId: 'waveform',
    manualId: 'wave',
    shortcutIds: ['transport.back', 'transport.forward', 'transport.toStart', 'transport.toEnd'],
    practical: text(
      'The playhead is the current time. Drag a range to select. Pinch or use the zoom controls to look closer. The clock is the timecode.',
      'Głowica to bieżący czas. Przeciągnij zakres, aby zaznaczyć. Uszczypnij albo użyj zbliżenia, aby podejść bliżej. Zegar to kod czasowy.',
    ),
  },
  'wave.playhead': {
    manualId: 'transport',
    shortcutIds: ['transport.back', 'transport.forward', 'transport.toStart', 'transport.toEnd', 'transport.play'],
    title: text('Playhead', 'Głowica odtwarzania'),
    summary: text(
      'The playhead is the moment FIELD is reading. Moving it seeks. It does not trim the sample.',
      'Głowica to moment, który FIELD odczytuje. Jej przesunięcie przewija. Nie przycina sampla.',
    ),
    practical: text(
      'Use the arrow keys for a small step, Home and End for the ends, or type a time in the drag-free playhead field.',
      'Strzałki robią mały krok, Home i End idą na krańce, a pole głowicy bez przeciągania przyjmuje wpisany czas.',
    ),
    technical: text(
      'Seeking while audio plays fades the jump so the move does not click. The playhead does not rebuild the audio graph.',
      'Przewijanie w trakcie grania wygasza skok, więc ruch nie klika. Głowica nie buduje grafu audio od nowa.',
    ),
  },
  'wave.selection': {
    topicId: 'selection',
    manualId: 'selection',
    shortcutIds: ['edit.copy', 'edit.cut', 'edit.paste'],
  },
  'wave.trim': {
    topicId: 'trim',
    manualId: 'selection',
  },
  'wave.fadeIn': {
    topicId: 'fade',
    manualId: 'fades',
    title: text('Fade in', 'Narastanie'),
    summary: text(
      'Fade in starts the edge from silence so a hard cut does not click.',
      'Narastanie zaczyna krawędź od ciszy, żeby twarde cięcie nie kliknęło.',
    ),
    practical: text(
      'A short fade is often enough. The same curve is used in Simple and Technical.',
      'Krótkie narastanie często wystarcza. Ta sama krzywa jest w Prostym i w Technicznym.',
    ),
  },
  'wave.fadeOut': {
    topicId: 'fade',
    manualId: 'fades',
    title: text('Fade out', 'Wygaszanie'),
    summary: text(
      'Fade out ends the edge in silence.',
      'Wygaszanie kończy krawędź w ciszy.',
    ),
    practical: text(
      'Use it on the end of a selection or a loop so the join does not click.',
      'Użyj go na końcu zaznaczenia albo pętli, żeby złączenie nie kliknęło.',
    ),
  },
  'wave.loop': {
    manualId: 'loop',
    shortcutIds: ['transport.loop'],
    title: text('Loop', 'Pętla'),
    summary: text(
      'Loop repeats the current selection. Fades are heard on every pass.',
      'Pętla powtarza bieżące zaznaczenie. Zanikanie słychać przy każdym przejściu.',
    ),
  },
  'wave.zoom': {
    manualId: 'wave',
    title: text('Zoom', 'Zbliżenie'),
    summary: text(
      'Zoom changes how much of the sample you see. It does not change the audio.',
      'Zbliżenie zmienia, ile sampla widać. Nie zmienia dźwięku.',
    ),
    practical: text(
      'Fit returns the view to the whole sample. Pinch with two fingers on a touch screen.',
      'Dopasuj wraca widokiem do całego sampla. Na ekranie dotykowym uszczypnij dwoma palcami.',
    ),
    technical: text(
      'Zoom and pan edit the view. The source buffer, the selection, and the playhead time stay as they are until you edit them.',
      'Zbliżenie i przesuwanie edytują widok. Bufor źródła, zaznaczenie i czas głowicy zostają, dopóki ich nie zmienisz.',
    ),
  },
  'wave.timecode': {
    manualId: 'transport',
    title: text('Timecode', 'Kod czasowy'),
    summary: text(
      'Timecode is the clock for the playhead and the selection. It reads hours, minutes, seconds, and milliseconds.',
      'Kod czasowy to zegar głowicy i zaznaczenia. Czyta godziny, minuty, sekundy i milisekundy.',
    ),
    practical: text(
      'A reading such as 00:12.450 is twelve seconds and 450 milliseconds. It is not a musical bar number.',
      'Odczyt taki jak 00:12.450 to dwanaście sekund i 450 milisekund. To nie jest numer taktu.',
    ),
    technical: text(
      'The display is time in the sample, not SMPTE locked to an external clock. Keyboard fields accept the same time.',
      'Wskazanie to czas w samplu, nie SMPTE spięty z zewnętrznym zegarem. Pola klawiatury przyjmują ten sam czas.',
    ),
  },
  'wave.markers': {
    manualId: 'audio-markers',
    shortcutIds: ['markers.add', 'markers.previous', 'markers.next', 'markers.open'],
    title: text('Markers', 'Znaczniki'),
    summary: text(
      'Markers are named times you keep. Detected places are only suggestions until you save one as a marker.',
      'Znaczniki to nazwane czasy, które zostawiasz. Wykryte miejsca są tylko podpowiedzią, dopóki nie zapiszesz jednego jako znacznik.',
    ),
  },
  'wave.reverse': {
    topicId: 'reverse',
    manualId: 'wave',
  },
  'markers.user': {
    manualId: 'audio-markers',
    shortcutIds: ['markers.add', 'markers.open'],
    title: text('User markers', 'Znaczniki użytkownika'),
    summary: text(
      'A user marker is a name, a time, and an optional description you created.',
      'Znacznik użytkownika to nazwa, czas i opcjonalny opis, które sam utworzyłeś.',
    ),
    practical: text(
      'Add one at the playhead. Rename it, retime it, or delete it. It is stored with the project for this audio.',
      'Dodaj go przy głowicy. Zmień nazwę, czas albo usuń. Jest zapisany z projektem dla tego audio.',
    ),
    technical: text(
      'Markers ride the engine snapshot and undo history. They are not a second playhead. A different audio file does not inherit them.',
      'Znaczniki jadą ze zrzutem silnika i historią cofania. To nie jest druga głowica. Inny plik audio ich nie dziedziczy.',
    ),
  },
  'markers.detected': {
    topicId: 'transient',
    manualId: 'audio-markers',
    title: text('Detected landmarks', 'Wykryte miejsca'),
    summary: text(
      'Detected landmarks are automatic suggestions, such as a possible hit or a quiet stretch. They are not markers until you save one.',
      'Wykryte miejsca to automatyczne podpowiedzi, na przykład możliwe uderzenie albo cichy odcinek. Nie są znacznikami, dopóki jednego nie zapiszesz.',
    ),
    practical: text(
      'Treat them as hints. Listen, then save the one you want.',
      'Traktuj je jako podpowiedź. Posłuchaj, a potem zapisz ten, który chcesz.',
    ),
  },
  'markers.navigate': {
    manualId: 'audio-markers',
    shortcutIds: ['markers.previous', 'markers.next'],
    title: text('Marker navigation', 'Nawigacja znaczników'),
    summary: text(
      'Previous and next marker move the playhead to a user marker. They do not wrap past the ends.',
      'Poprzedni i następny znacznik przenoszą głowicę do znacznika użytkownika. Nie zawijają za krańce.',
    ),
    practical: text(
      'Landmark navigation is a different action. It visits detected places, not your marker list.',
      'Nawigacja po punktach to inna czynność. Odwiedza wykryte miejsca, nie twoją listę znaczników.',
    ),
    technical: text(
      'The shortcuts come from the live shortcut registry. They do not fire while a text field is focused.',
      'Skróty pochodzą z bieżącego rejestru skrótów. Nie działają, gdy fokus jest w polu tekstowym.',
    ),
  },
  'markers.edit': {
    manualId: 'audio-markers',
    title: text('Marker editing', 'Edycja znacznika'),
    summary: text(
      'Edit the name, the time, and the description of a marker you already saved.',
      'Edytuj nazwę, czas i opis znacznika, który już zapisałeś.',
    ),
    practical: text(
      'An invalid time is refused. Undo can put a deleted marker back.',
      'Niepoprawny czas jest odrzucany. Cofnięcie może przywrócić usunięty znacznik.',
    ),
    technical: text(
      'Time uses the same parser as the other typed times. Color is a label, not an audio change.',
      'Czas używa tego samego parsera co inne wpisywane czasy. Kolor jest etykietą, nie zmianą dźwięku.',
    ),
  },
  'markers.save': {
    manualId: 'audio-markers',
    title: text('Save as marker', 'Zapisz jako znacznik'),
    summary: text(
      'Save as marker copies one detected place into your marker list. The suggestion itself stays a suggestion.',
      'Zapisz jako znacznik kopiuje jedno wykryte miejsce na twoją listę znaczników. Sama podpowiedź zostaje podpowiedzią.',
    ),
    practical: text(
      'Use it when a detected hit or quiet gap is worth keeping by name.',
      'Użyj tego, gdy wykryte uderzenie albo cicha przerwa warto zatrzymać pod nazwą.',
    ),
    technical: text(
      'Saving does not run a new analysis and does not turn every landmark into a marker.',
      'Zapis nie uruchamia nowej analizy i nie zamienia każdego punktu w znacznik.',
    ),
  },
  'auto.lane': {
    manualId: 'auto',
    title: text('Automation lane', 'Ścieżka automatyzacji'),
    summary: text(
      'A lane draws one parameter over time. The title is that effect and parameter.',
      'Ścieżka rysuje jeden parametr w czasie. Tytuł to ten efekt i parametr.',
    ),
    practical: text(
      'Select the lane, then add points where the value should change.',
      'Wybierz ścieżkę, a potem dodaj punkty tam, gdzie wartość ma się zmienić.',
    ),
    technical: text(
      'The lane stays on the effect instance that owns it. Two modules of the same type do not share one lane.',
      'Ścieżka zostaje przy instancji efektu, która ją ma. Dwa moduły tego samego typu nie dzielą jednej ścieżki.',
    ),
  },
  'auto.point': {
    manualId: 'auto',
    shortcutIds: ['auto.delete'],
    title: text('Automation point', 'Punkt automatyzacji'),
    summary: text(
      'A point is a value at one time on the lane. Drag it to move the value or the time.',
      'Punkt to wartość w jednym czasie na ścieżce. Przeciągnij go, aby ruszyć wartość albo czas.',
    ),
    practical: text(
      'Delete removes the selected point. The parameter returns to the surrounding segment.',
      'Usuń kasuje wybrany punkt. Parametr wraca do otaczającego odcinka.',
    ),
    technical: text(
      'Outside the first and last points the value holds. Between points it follows the segment curve.',
      'Poza pierwszym i ostatnim punktem wartość jest trzymana. Między punktami idzie za krzywą odcinka.',
    ),
  },
  'auto.interpolation': {
    manualId: 'auto',
    title: text('Interpolation', 'Interpolacja'),
    summary: text(
      'Interpolation is how the value moves from one point to the next.',
      'Interpolacja to, jak wartość przechodzi od jednego punktu do następnego.',
    ),
    practical: text(
      'Linear is a straight ramp. Smooth eases the middle. Step holds the previous value until the next point.',
      'Liniowa to prosty przebieg. Gładka łagodzi środek. Schodek trzyma poprzednią wartość aż do następnego punktu.',
    ),
  },
  'lfo.rate': {
    manualId: 'lfo',
    title: text('LFO rate', 'Tempo LFO'),
    summary: text(
      'Rate is how fast the modulation repeats. The LFO moves a parameter. It does not replace the sample.',
      'Tempo to, jak szybko powtarza się modulacja. LFO rusza parametr. Nie zastępuje sampla.',
    ),
    practical: text(
      'Slow rate is a drift. Fast rate is a tremble or a gate-like chop, depending on the shape.',
      'Wolne tempo to dryf. Szybkie to drżenie albo cięcie podobne do bramki, zależnie od kształtu.',
    ),
    technical: text(
      'Rate is the modulator speed in hertz, or a tempo division when that route is synced. The audio buffer is unchanged.',
      'Tempo to szybkość modulatora w hercach albo podział tempa, gdy ta trasa jest zsynchronizowana. Bufor audio zostaje bez zmian.',
    ),
  },
  'lfo.depth': {
    manualId: 'lfo',
    title: text('LFO depth', 'Głębokość LFO'),
    summary: text(
      'Depth is how far the parameter swings around its current value.',
      'Głębokość to, jak daleko parametr odchyla się od bieżącej wartości.',
    ),
    practical: text(
      'Start small. Depth zero leaves the parameter still.',
      'Zacznij od małej wartości. Zerowa głębokość zostawia parametr w miejscu.',
    ),
    technical: text(
      'The swing is limited by the parameter range. The stored value stays the center. Automation, when playing, is applied before the LFO around that center.',
      'Wychylenie jest ograniczone zakresem parametru. Zapisana wartość zostaje środkiem. Automatyzacja, gdy gra, jest liczona przed LFO wokół tego środka.',
    ),
  },
  'lfo.shape': {
    manualId: 'lfo',
    title: text('LFO shape', 'Kształt LFO'),
    summary: text(
      'Shape is the pattern used to move the target parameter over time.',
      'Kształt to wzór, którym celowany parametr jest ruszany w czasie.',
    ),
    practical: text(
      'Sine is smooth. Triangle is a steady ramp. Square jumps between two values. Saw ramps one way. Sample and hold steps to new values.',
      'Sinus jest gładki. Trójkąt to równy przebieg. Prostokąt skacze między dwiema wartościami. Piła przebiega w jedną stronę. Sample and hold skacze do nowych wartości.',
    ),
    technical: text(
      'FIELD shapes are sine, triangle, square, saw, and sample-and-hold. The shape modulates the target parameter. It is not the waveform of the loaded sample.',
      'Kształty w FIELD to sinus, trójkąt, prostokąt, piła i sample-and-hold. Kształt moduluje parametr celu. To nie jest fala wczytanego sampla.',
    ),
  },
  'lfo.target': {
    manualId: 'lfo',
    title: text('Modulation target', 'Cel modulacji'),
    summary: text(
      'The target is the parameter the LFO moves. Modulation changes that value over time. It does not change the underlying sample.',
      'Cel to parametr, który LFO rusza. Modulacja zmienia tę wartość w czasie. Nie zmienia źródłowego sampla.',
    ),
    practical: text(
      'Assign a target on the effect you are editing. A route on one delay does not move another delay.',
      'Przypisz cel na efekcie, który edytujesz. Trasa na jednym delay nie rusza drugiego delay.',
    ),
    technical: text(
      'Assignment stores a stable parameter id, and an EQ route also stores the band id. Bypass keeps the route. Remove clears it.',
      'Przypisanie zapisuje stały identyfikator parametru, a trasa EQ zapisuje też identyfikator pasma. Ominięcie zostawia trasę. Usunięcie ją czyści.',
    ),
  },
  'lfo.assign': {
    manualId: 'lfo',
    title: text('Add an LFO', 'Dodaj LFO'),
    summary: text(
      'This icon adds an LFO for the parameter, or opens the one already connected. The LFO moves that value over time. It does not rewrite the sample.',
      'Ta ikona dodaje LFO dla parametru albo otwiera już podłączone. LFO rusza tę wartość w czasie. Nie przepisuje sampla.',
    ),
    practical: text(
      'Choose a shape, a rate, and a depth, then leave the route connected. Depth zero holds the parameter still. The LFO center in the header lists every route.',
      'Wybierz kształt, tempo i głębokość, potem zostaw trasę podłączoną. Zerowa głębokość trzyma parametr w miejscu. Centrum LFO w nagłówku pokazuje każdą trasę.',
    ),
    technical: text(
      'The stored value stays the center. Depth swings around it, inside the parameter range. Bypass keeps the route. Remove clears it. Automation, when playing, is applied before the LFO.',
      'Zapisana wartość zostaje środkiem. Głębokość odchyla się wokół niej, w zakresie parametru. Ominięcie zostawia trasę. Usunięcie ją czyści. Automatyzacja, gdy gra, jest liczona przed LFO.',
    ),
  },
  'random.once': {
    manualId: 'lfo',
    title: text('Randomize this value', 'Losuj tę wartość'),
    summary: text(
      'This icon rolls a new value for this parameter once. It does not start continuous motion and it does not change the sample.',
      'Ta ikona losuje nową wartość tego parametru jeden raz. Nie uruchamia ciągłego ruchu i nie zmienia sampla.',
    ),
    practical: text(
      'One roll works without Chaos. Auto Random, on the effect, needs Chaos. The setup control on the effect chooses which parameters take part.',
      'Jedno losowanie działa bez Chaosu. Auto Random na efekcie potrzebuje Chaosu. Ustawienie na efekcie wybiera, które parametry biorą udział.',
    ),
    technical: text(
      'The roll stays inside the parameter range and writes the stored value. A connected LFO still moves around that new center.',
      'Losowanie zostaje w zakresie parametru i zapisuje wartość. Podłączone LFO nadal rusza się wokół tego nowego środka.',
    ),
  },
  'fft.spectrum': {
    manualId: 'fft-3d',
    title: text('Frequency spectrum', 'Widmo częstotliwości'),
    summary: text(
      'The spectrum shows level across frequency at the analyzer. It is a picture of the signal, not an EQ move.',
      'Widmo pokazuje poziom względem częstotliwości w analizatorze. To obraz sygnału, nie ruch EQ.',
    ),
    practical: text(
      'The horizontal axis is frequency. The vertical axis is level. Bars and the line are display choices.',
      'Oś pozioma to częstotliwość. Oś pionowa to poziom. Słupki i linia to wybory widoku.',
    ),
    technical: text(
      'Before is the analyzer ahead of the chain. After is the output tap. The spectrum is not the EQ filter curve.',
      'Przed to analizator przed łańcuchem. Po to odczep wyjścia. Widmo nie jest krzywą filtra EQ.',
    ),
  },
  'fft.history': {
    manualId: 'fft-3d',
    title: text('Spectral history', 'Historia widma'),
    summary: text(
      'Spectral history is the 3D view of the spectrum over time. It is the picture often called a spectrogram or a waterfall. FIELD does not run a second analyzer under another name.',
      'Historia widma to widok 3D widma w czasie. To obraz często nazywany spektrogramem albo waterfall. FIELD nie uruchamia drugiego analizatora pod inną nazwą.',
    ),
    practical: text(
      'Depth is recent time. Brighter or taller ridges are stronger moments. The view does not edit the sample.',
      'Głębia to niedawny czas. Jaśniejsze albo wyższe granie to mocniejsze momenty. Widok nie edytuje sampla.',
    ),
    technical: text(
      'History length is a display preference in seconds of playback. It does not change FFT processing of the audio you export.',
      'Długość historii to preferencja widoku w sekundach odtwarzania. Nie zmienia przetwarzania FFT dźwięku, który eksportujesz.',
    ),
  },
  'fft.freqAxis': {
    manualId: 'fft-3d',
    title: text('Frequency axis', 'Oś częstotliwości'),
    summary: text(
      'The frequency axis runs from low to high. Scale can be linear, logarithmic, or mel. That choice is the display.',
      'Oś częstotliwości biegnie od niskich do wysokich. Skala może być liniowa, logarytmiczna albo mel. Ten wybór dotyczy widoku.',
    ),
    practical: text(
      'Logarithmic scale gives more room to bass. Linear gives equal hertz equal space.',
      'Skala logarytmiczna daje więcej miejsca basowi. Liniowa daje równym hercom równe miejsce.',
    ),
    technical: text(
      'Changing the EQ scale does not change the FFT scale. Each view keeps its own display settings.',
      'Zmiana skali EQ nie zmienia skali FFT. Każdy widok trzyma własne ustawienia widoku.',
    ),
  },
  'fft.levelAxis': {
    manualId: 'fft-3d',
    title: text('Level axis', 'Oś poziomu'),
    summary: text(
      'The level axis is how far down the spectrum is drawn, in decibels from 0 dB. It does not scale the EQ curve.',
      'Oś poziomu to, jak głęboko rysowane jest widmo, w decybelach od 0 dB. Nie skaluje krzywej EQ.',
    ),
    practical: text(
      'A deeper range shows quieter parts. It does not make the audio quieter.',
      'Głębszy zakres pokazuje cichsze części. Nie robi dźwięku cichszym.',
    ),
    technical: text(
      'Range is an analyzer display window. It is independent of EQ gain and of output gain.',
      'Zakres to okno widoku analizatora. Jest niezależny od wzmocnienia EQ i od wzmocnienia wyjścia.',
    ),
  },
  'fft.window': {
    manualId: 'fft-3d',
    title: text('FFT window', 'Okno FFT'),
    summary: text(
      'Window size is the FFT length. A longer window resolves lower frequencies more finely and updates more slowly.',
      'Rozmiar okna to długość FFT. Dłuższe okno rozdziela niskie częstotliwości dokładniej i odświeża się wolniej.',
    ),
    practical: text(
      'Use a longer window to inspect bass. Use a shorter one when you want the picture to react faster.',
      'Dłuższe okno służy do oglądania basu. Krótsze, gdy obraz ma reagować szybciej.',
    ),
  },
  'gain.normalize': {
    topicId: 'decibels',
    manualId: 'input',
    title: text('Normalize', 'Normalizacja'),
    summary: text(
      'Normalize raises the selection toward a steady peak. It is not compression and it is not the gain knob.',
      'Normalizacja podnosi zaznaczenie ku stałemu szczytowi. To nie jest kompresja i nie jest gałką wzmocnienia.',
    ),
    practical: text(
      'Use it when the selection is quiet and you want a consistent peak. Listen afterwards so the result does not clip.',
      'Użyj jej, gdy zaznaczenie jest ciche i chcesz równy szczyt. Posłuchaj potem, żeby wynik się nie przesterował.',
    ),
    technical: text(
      'Normalize is a one-shot level edit toward a target peak. It does not apply the compressor’s threshold or ratio.',
      'Normalizacja to jednorazowa edycja poziomu ku docelowemu szczytowi. Nie stosuje progu ani stopnia kompresji.',
    ),
  },
  'gain.clipping': {
    topicId: 'clipping',
    manualId: 'meter',
    title: text('Clipping', 'Przesterowanie'),
    summary: text(
      'Clipping flattens the wave when the signal tries to pass the loudest digital level.',
      'Przesterowanie spłaszcza falę, gdy sygnał chce przekroczyć najgłośniejszy poziom cyfrowy.',
    ),
    practical: text(
      'If a boost sounds broken, ease the gain back and leave headroom under 0 dBFS.',
      'Jeśli podbicie brzmi łamliwie, cofnij wzmocnienie i zostaw zapas poziomu pod 0 dBFS.',
    ),
  },
  'gain.headroom': {
    topicId: 'clipping',
    manualId: 'meter',
    title: text('Headroom', 'Zapas poziomu'),
    summary: text(
      'Headroom is the gap between the peak and full scale. It is spare room, not a separate fader.',
      'Zapas poziomu to odstęp między szczytem a pełną skalą. To wolne miejsce, nie osobny suwak.',
    ),
    practical: text(
      'Leave some gap under 0 dBFS before export, especially after EQ boosts or makeup gain.',
      'Zostaw trochę miejsca pod 0 dBFS przed eksportem, szczególnie po podbiciach EQ albo wzmocnieniu kompensacyjnym.',
    ),
    technical: text(
      '0 dBFS is digital full scale. Headroom is not the same control as input gain, output gain, or normalize.',
      '0 dBFS to cyfrowa pełna skala. Zapas poziomu nie jest tą samą kontrolką co wzmocnienie wejścia, wzmocnienie wyjścia albo normalizacja.',
    ),
  },
  'module.eq': {
    topicId: 'eq',
    manualId: 'eq',
  },
  'module.compressor': {
    manualId: 'comp',
    title: text('Compressor', 'Kompresor'),
    summary: text(
      'The compressor turns down level above the threshold. Threshold, ratio, attack, release, knee, and makeup gain are its controls.',
      'Kompresor ścisza poziom powyżej progu. Próg, stopień kompresji, atak, zwolnienie, kolano i wzmocnienie kompensacyjne to jego kontrolki.',
    ),
    practical: text(
      'Focus a control and ask again to read that one control. This compressor is not the safety limiter.',
      'Ustaw fokus na kontrolce i zapytaj jeszcze raz, aby przeczytać właśnie ją. Ten kompresor nie jest limiterem bezpieczeństwa.',
    ),
    technical: text(
      'Each compressor instance keeps its own settings. Low cut can keep bass out of the detector. Auto makeup is an estimate from threshold and ratio, not a loudness matcher.',
      'Każda instancja kompresora trzyma własne ustawienia. Dolne cięcie może trzymać bas poza detektorem. Automatyczne wyrównanie to szacunek z progu i stopnia kompresji, nie wyrównywanie głośności.',
    ),
  },
  'module.reverb': {
    topicId: 'reverb',
    manualId: 'reverb',
  },
  'module.delay': {
    topicId: 'delay',
    manualId: 'delay',
  },
  'module.gain': {
    topicId: 'gain',
    manualId: 'input',
    title: text('Input', 'Wejście'),
    summary: text(
      'Input gain, speed, and pitch shape the source before the chain. Output gain and track volume are later, separate controls.',
      'Wzmocnienie wejścia, szybkość i wysokość kształtują źródło przed łańcuchem. Wzmocnienie wyjścia i głośność śladu są później i osobno.',
    ),
    practical: text(
      'Normalize is a separate action on the selection. Clipping means the peak hit full scale. Headroom is the gap you leave under it.',
      'Normalizacja to osobna czynność na zaznaczeniu. Przesterowanie znaczy, że szczyt doszedł do pełnej skali. Zapas poziomu to odstęp, który pod nią zostawiasz.',
    ),
  },
  'module.output': {
    manualId: 'out',
    title: text('Output', 'Wyjście'),
    summary: text(
      'Output is the last level of the instrument. It is not input gain and it is not track volume.',
      'Wyjście to ostatni poziom instrumentu. To nie jest wzmocnienie wejścia i nie jest głośnością śladu.',
    ),
    practical: text(
      'Use it for the final trim. If the meters clip, ease this level or an earlier boost.',
      'Użyj go do końcowej korekty. Jeśli wskaźniki się przesterowują, obniż ten poziom albo wcześniejsze podbicie.',
    ),
    technical: text(
      'Output gain is after the effect chain. Mute silences the output without removing modules.',
      'Wzmocnienie wyjścia jest po łańcuchu efektów. Wyciszenie milczy na wyjściu bez usuwania modułów.',
    ),
  },
  'module.filter': {
    manualId: 'filter',
    title: text('Filter', 'Filtr'),
    summary: text(
      'The filter module is separate from EQ. Cutoff, resonance, drive, mix, and its LFO belong to this instance.',
      'Moduł filtra jest osobno od EQ. Odcięcie, rezonans, drive, miks i jego LFO należą do tej instancji.',
    ),
  },
  'module.limiter': {
    manualId: 'out',
    title: text('Limiter', 'Limiter'),
    summary: text(
      'The limiter catches peaks at the end. It is not the compressor module.',
      'Limiter łapie szczyty na końcu. To nie jest moduł kompresora.',
    ),
    practical: text(
      'Ceiling is the top it aims for. Threshold is where reduction starts. They are not interchangeable with compressor controls.',
      'Pułap to góra, do której mierzy. Próg to miejsce, gdzie zaczyna się redukcja. Nie są wymienne z kontrolkami kompresora.',
    ),
    technical: text(
      'Limiter threshold, ratio, attack, release, knee, and makeup belong to the limiter instance. Random does not target the safety limiter.',
      'Próg, stopień, atak, zwolnienie, kolano i wzmocnienie kompensacyjne limitera należą do instancji limitera. Losowość nie celuje w limiter bezpieczeństwa.',
    ),
  },
  'module.distortion': {
    manualId: 'dist',
    title: text('Distortion', 'Zniekształcenie'),
    summary: text(
      'Distortion adds harmonics and grit on this module. It is not the compressor and it is not EQ.',
      'Zniekształcenie dodaje harmoniczne i brud na tym module. To nie jest kompresor i nie jest EQ.',
    ),
  },
  'module.grain': {
    manualId: 'dist',
    title: text('Grain', 'Ziarno'),
    summary: text(
      'Grain breaks playback into short grains. Grain size and density shape that texture.',
      'Ziarno rozbija odtwarzanie na krótkie ziarna. Długość ziarna i gęstość kształtują tę fakturę.',
    ),
    technical: text(
      'Grain controls belong to the grain engine. They do not rewrite the stored sample buffer until you edit or export.',
      'Kontrolki ziarna należą do silnika ziaren. Nie przepisują zapisanego bufora sampla, dopóki nie edytujesz albo nie eksportujesz.',
    ),
  },
  'module.midside': {
    manualId: 'dist',
    title: text('Mid / side', 'Mid / side'),
    summary: text(
      'Mid is the center. Side is the stereo difference. Width and the mid and side levels edit that image.',
      'Mid to środek. Side to różnica stereo. Szerokość oraz poziomy mid i side edytują ten obraz.',
    ),
    technical: text(
      'Mid/side is its own module. It is not a second EQ instance, though it has its own tonal controls.',
      'Mid/side to własny moduł. To nie jest druga instancja EQ, choć ma własne kontrolki barwy.',
    ),
  },
  'export.format': {
    topicId: 'export',
    manualId: 'export',
    title: text('Format', 'Format'),
    summary: text(
      'Format is the file type written to disk. Rendering the sound and encoding the file are two steps.',
      'Format to typ pliku zapisywanego na dysk. Renderowanie dźwięku i kodowanie pliku to dwa kroki.',
    ),
    practical: text(
      'FIELD writes WAV. The project in the browser stays as it is.',
      'FIELD zapisuje WAV. Projekt w przeglądarce zostaje, jaki jest.',
    ),
  },
  'export.sampleRate': {
    manualId: 'export',
    title: text('Sample rate', 'Częstotliwość próbkowania'),
    summary: text(
      'Sample rate is how many samples per second the file stores. It is not bit depth.',
      'Częstotliwość próbkowania to, ile próbek na sekundę zapisuje plik. To nie jest głębia bitowa.',
    ),
    practical: text(
      'Keeping the original rate avoids a resample. A different rate converts the timing grid.',
      'Zostawienie oryginalnej częstotliwości unika przeliczania. Inna częstotliwość przelicza siatkę czasu.',
    ),
    technical: text(
      'Encoding chooses the file rate. The preview is a listen-back, not a claim that every encoded sample matches the preview bit for bit.',
      'Kodowanie wybiera częstotliwość pliku. Podgląd to odsłuch, nie twierdzenie, że każda zakodowana próbka zgadza się z podglądem bit w bit.',
    ),
  },
  'export.bitDepth': {
    manualId: 'export',
    title: text('Bit depth', 'Głębia bitowa'),
    summary: text(
      'Bit depth is how finely each sample is stored. It is not the sample rate and it is not bitrate.',
      'Głębia bitowa to, jak dokładnie zapisana jest każda próbka. To nie jest częstotliwość próbkowania i nie jest bitrate.',
    ),
    practical: text(
      '16-bit and 24-bit are integer PCM. 32-bit in FIELD is floating point.',
      '16 bitów i 24 bity to całkowite PCM. 32 bity w FIELD to liczba zmiennoprzecinkowa.',
    ),
    technical: text(
      'Rendering produces the processed signal. Encoding then quantizes it to the chosen word length. The preview is not documented as bit-exact with the file.',
      'Renderowanie daje przetworzony sygnał. Kodowanie potem kwantuje go do wybranej długości słowa. Podgląd nie jest opisany jako bitowo zgodny z plikiem.',
    ),
  },
  'export.channels': {
    manualId: 'export',
    title: text('Channels', 'Kanały'),
    summary: text(
      'Channels are how the file carries stereo: both sides, one side, or a swap. Mono sums to one channel when that is the source.',
      'Kanały to, jak plik niesie stereo: obie strony, jedna strona albo zamiana. Mono sumuje do jednego kanału, gdy takie jest źródło.',
    ),
    practical: text(
      'Check the channel line in Export Check before you write the file.',
      'Sprawdź wiersz kanałów w kontroli eksportu, zanim zapiszesz plik.',
    ),
    technical: text(
      'Channel layout is an encode choice on the rendered buffer. It does not retune EQ or delay.',
      'Układ kanałów to wybór kodowania na wyrenderowanym buforze. Nie przestraja EQ ani delay.',
    ),
  },
  'export.range': {
    manualId: 'export',
    title: text('Export range', 'Zakres eksportu'),
    summary: text(
      'Export range is the time that is written: the whole piece or the selection. A tail can keep delay and reverb ringing after that end.',
      'Zakres eksportu to czas, który jest zapisywany: całość albo zaznaczenie. Ogon może zostawić wybrzmienie delay i pogłosu po tym końcu.',
    ),
    practical: text(
      'If the selection is the whole file, selection export is not a shorter range.',
      'Jeśli zaznaczenie jest całym plikiem, eksport zaznaczenia nie jest krótszym zakresem.',
    ),
    technical: text(
      'The range is applied when the bounce is rendered. Encoding does not choose a different musical region by itself.',
      'Zakres jest stosowany, gdy zgranie jest renderowane. Kodowanie samo nie wybiera innego regionu muzycznego.',
    ),
  },
  'export.check': {
    manualId: 'export',
    title: text('Export check', 'Kontrola eksportu'),
    summary: text(
      'Export check reads the current format, rate, depth, channels, and range and reports problems before you write the file.',
      'Kontrola eksportu czyta bieżący format, częstotliwość, głębię, kanały i zakres i zgłasza problemy, zanim zapiszesz plik.',
    ),
    practical: text(
      'A warning is something to listen for. An error blocks the export until you change that setting.',
      'Ostrzeżenie to coś, czego warto posłuchać. Błąd blokuje eksport, dopóki nie zmienisz tego ustawienia.',
    ),
    technical: text(
      'The check does not render the file and does not change parameters. It inspects the export settings and the loaded audio.',
      'Kontrola nie renderuje pliku i nie zmienia parametrów. Ogląda ustawienia eksportu i wczytane audio.',
    ),
  },
  'export.preview': {
    manualId: 'export',
    title: text('Export preview', 'Podgląd eksportu'),
    summary: text(
      'Preview plays a listen of the export range. It is not the encoded file and it is not claimed to match that file bit for bit.',
      'Podgląd odtwarza odsłuch zakresu eksportu. To nie jest zakodowany plik i nie jest opisany jako zgodny z tym plikiem bit w bit.',
    ),
    practical: text(
      'Use it to hear the range, including a tail, before you export.',
      'Użyj go, aby usłyszeć zakres, także z ogonem, zanim wyeksportujesz.',
    ),
    technical: text(
      'Preview renders a short audition of the processed range. Encoding to WAV, with its bit depth and rate, is the later write.',
      'Podgląd renderuje krótki odsłuch przetworzonego zakresu. Kodowanie do WAV, z głębią bitową i częstotliwością, jest późniejszym zapisem.',
    ),
  },
  'a11y.highVisibility': {
    manualId: 'high-visibility',
    title: text('High visibility', 'Wysoka widoczność'),
    summary: text(
      'High visibility strengthens outlines, shapes, and labels so controls are easier to see. It does not change the sound.',
      'Wysoka widoczność wzmacnia obrysy, kształty i etykiety, żeby kontrolki było łatwiej zobaczyć. Nie zmienia dźwięku.',
    ),
    practical: text(
      'Turn it on when edges and states are hard to separate. Color is not the only cue.',
      'Włącz, gdy krawędzie i stany trudno rozdzielić. Kolor nie jest jedyną wskazówką.',
    ),
    technical: text(
      'The preference sets document tokens for contrast and focus. It does not rebuild the audio graph.',
      'Preferencja ustawia tokeny dokumentu dla kontrastu i fokusu. Nie buduje grafu audio od nowa.',
    ),
  },
  'a11y.sensoryComfort': {
    manualId: 'sensory-comfort',
    title: text('Sensory comfort', 'Komfort sensoryczny'),
    summary: text(
      'Sensory comfort calms decorative motion and busy meters. The audio engine keeps running as it was.',
      'Komfort sensoryczny uspokaja dekoracyjny ruch i ruchliwe wskaźniki. Silnik audio gra dalej, jak grał.',
    ),
    practical: text(
      'Use it when flashing, extra motion, or dense analyzers get in the way. Reduced motion is the related system setting.',
      'Użyj go, gdy miganie, dodatkowy ruch albo gęste analizatory przeszkadzają. Ograniczenie animacji to powiązane ustawienie systemowe.',
    ),
    technical: text(
      'Calm meters and a calmer spectrum change the picture rate and decoration. They do not retune DSP block size or effect parameters.',
      'Spokojne wskaźniki i spokojniejsze widmo zmieniają tempo obrazu i dekorację. Nie przestrajają rozmiaru bloku DSP ani parametrów efektów.',
    ),
  },
  'a11y.attentionFocus': {
    manualId: 'attention-focus',
    title: text('Attention focus', 'Koncentracja uwagi'),
    summary: text(
      'Attention focus marks the control you are editing and can quiet the surroundings. It does not lock the interface.',
      'Koncentracja uwagi oznacza kontrolkę, którą edytujesz, i może wyciszyć otoczenie. Nie blokuje interfejsu.',
    ),
    practical: text(
      'Turn it on when you want the current edit easier to find. You can still reach the other controls.',
      'Włącz, gdy bieżącą edycję ma być łatwiej znaleźć. Do pozostałych kontrolek nadal dojdziesz.',
    ),
    technical: text(
      'Highlight and reduce are display layers. They do not change parameter values or playback.',
      'Podświetlenie i wyciszenie to warstwy widoku. Nie zmieniają wartości parametrów ani odtwarzania.',
    ),
  },
  'a11y.predictableLayout': {
    manualId: 'predictable-layout',
    title: text('Predictable layout', 'Przewidywalny układ'),
    summary: text(
      'Predictable layout keeps tools in stable places and can remember the workspace arrangement in this browser.',
      'Przewidywalny układ trzyma narzędzia w stałych miejscach i może pamiętać układ obszaru w tej przeglądarce.',
    ),
    practical: text(
      'Use it when panels jumping between visits makes the editor harder to use.',
      'Użyj go, gdy panele skaczące między wizytami utrudniają edytor.',
    ),
    technical: text(
      'The memory is interface layout, not the audio project. It does not move the playhead or rewrite presets.',
      'Pamięć to układ interfejsu, nie projekt audio. Nie rusza głowicy i nie przepisuje presetów.',
    ),
  },
  'a11y.assisted': {
    manualId: 'drag-free',
    title: text('Assisted controls', 'Wspomagana edycja'),
    summary: text(
      'Assisted controls are the drag-free editors: typed time, stepped fades, and buttons instead of a required drag.',
      'Wspomagana edycja to edytory bez przeciągania: wpisywany czas, zanikanie krokami i przyciski zamiast koniecznego przeciągania.',
    ),
    practical: text(
      'Turn on drag-free editing when a pointer drag is not a good way to edit. Keyboard access stays available either way.',
      'Włącz edytowanie bez przeciągania, gdy przeciąganie wskaźnikiem nie jest dobrym sposobem edycji. Dostęp z klawiatury zostaje w obu przypadkach.',
    ),
    technical: text(
      'The editors write the same selection, fade, and playhead state as the pointer tools. They do not add a second audio engine.',
      'Edytory zapisują ten sam stan zaznaczenia, zanikania i głowicy co narzędzia wskaźnika. Nie dodają drugiego silnika audio.',
    ),
  },
  'a11y.dragFree': {
    manualId: 'drag-free',
    title: text('Drag-free editing', 'Edytowanie bez przeciągania'),
    summary: text(
      'Drag-free editing shows stepped and typed controls for the selection, the playhead, fades, and trim.',
      'Edytowanie bez przeciągania pokazuje kontrolki krokowe i wpisywane dla zaznaczenia, głowicy, zanikania i przycięcia.',
    ),
    practical: text(
      'The same edits remain on the waveform if you also use a pointer.',
      'Te same edycje zostają na fali, jeśli używasz też wskaźnika.',
    ),
    technical: text(
      'This is the assisted-controls switch. It does not disable keyboard shortcuts.',
      'To przełącznik wspomaganej edycji. Nie wyłącza skrótów klawiszowych.',
    ),
  },
  'a11y.interfaceSize': {
    manualId: 'scaling',
    title: text('Interface size', 'Rozmiar interfejsu'),
    summary: text(
      'Interface size scales controls and chrome. Text size is a separate control.',
      'Rozmiar interfejsu skaluje kontrolki i ramkę. Rozmiar tekstu to osobna kontrolka.',
    ),
    practical: text(
      'Raise it when targets are hard to hit. The waveform, transport, and inspector keep their jobs.',
      'Podnieś go, gdy w cele trudno trafić. Fala, transport i inspektor zostają przy swoich rolach.',
    ),
    technical: text(
      'The scale is a document preference up to 150%. It does not change sample rate or parameter ranges.',
      'Skala to preferencja dokumentu do 150%. Nie zmienia częstotliwości próbkowania ani zakresów parametrów.',
    ),
  },
  'a11y.textSize': {
    manualId: 'scaling',
    title: text('Text size', 'Rozmiar tekstu'),
    summary: text(
      'Text size scales type without using the interface-size control. Explanations wrap instead of being cut off.',
      'Rozmiar tekstu skaluje pismo bez kontrolki rozmiaru interfejsu. Wyjaśnienia zawijają się, zamiast być obcinane.',
    ),
    practical: text(
      'Use it when words are small but the controls are already large enough.',
      'Użyj go, gdy słowa są małe, a kontrolki są już wystarczająco duże.',
    ),
    technical: text(
      'Text scale runs up to 200% and is stored beside the other accessibility preferences. It does not change DSP.',
      'Skala tekstu dochodzi do 200% i jest zapisana obok pozostałych preferencji dostępności. Nie zmienia DSP.',
    ),
  },
  'a11y.keyboardFirst': {
    manualId: 'keyboard-first',
    title: text('Keyboard-first', 'Obsługa klawiaturą'),
    summary: text(
      'Keyboard-first adds extra navigation tools. Keyboard access stays on when this switch is off.',
      'Obsługa klawiaturą dodaje dodatkowe narzędzia nawigacji. Dostęp z klawiatury zostaje włączony, gdy ten przełącznik jest wyłączony.',
    ),
    practical: text(
      'Explain this still opens with F1. Shortcuts come from the registry, not from a second list.',
      'Wyjaśnij nadal otwiera się klawiszem F1. Skróty pochodzą z rejestru, nie z drugiej listy.',
    ),
  },
}

export const FILTER_HEARD: Record<string, HelpNote> = {
  off: {
    manualId: 'eq',
    title: text('Off', 'Wyłączony'),
    summary: text(
      'Off bypasses this band. The frequency, gain, and Q stay stored, but this band does not filter.',
      'Wyłączony omija to pasmo. Częstotliwość, wzmocnienie i Q zostają zapisane, ale to pasmo nie filtruje.',
    ),
  },
  lowpass: {
    manualId: 'eq',
    title: text('Low-pass', 'Dolnoprzepustowy'),
    summary: text(
      'A low-pass keeps what is below the cutoff and turns down what is above it.',
      'Dolnoprzepustowy zostawia to, co jest poniżej odcięcia, i ścisza to, co jest powyżej.',
    ),
    practical: text(
      'Use it to darken a harsh top. Frequency is the corner. Gain is not used.',
      'Użyj go, aby przyciemnić ostrą górę. Częstotliwość to narożnik. Wzmocnienie nie jest używane.',
    ),
  },
  highpass: {
    manualId: 'eq',
    title: text('High-pass', 'Górnoprzepustowy'),
    summary: text(
      'A high-pass turns down what is below the cutoff and keeps what is above it.',
      'Górnoprzepustowy ścisza to, co jest poniżej odcięcia, i zostawia to, co jest powyżej.',
    ),
    practical: text(
      'Use it to thin rumble. It is not a bell boost.',
      'Użyj go, aby odchudzić dudnienie. To nie jest podbicie dzwonem.',
    ),
  },
  lowshelf: {
    manualId: 'eq',
    title: text('Low shelf', 'Półka dolna'),
    summary: text(
      'A low shelf boosts or cuts everything below the corner, then flattens.',
      'Półka dolna podbija albo tłumi wszystko poniżej narożnika, a potem się wypłaszcza.',
    ),
    practical: text(
      'Gain sets how much the bass moves. Frequency sets where the shelf reaches that gain.',
      'Wzmocnienie ustawia, jak bardzo rusza się bas. Częstotliwość ustawia, gdzie półka dochodzi do tego wzmocnienia.',
    ),
  },
  highshelf: {
    manualId: 'eq',
    title: text('High shelf', 'Półka górna'),
    summary: text(
      'A high shelf boosts or cuts everything above the corner, then flattens.',
      'Półka górna podbija albo tłumi wszystko powyżej narożnika, a potem się wypłaszcza.',
    ),
    practical: text(
      'Use gain for air or for taming harshness. It is broader than a bell.',
      'Użyj wzmocnienia dla powietrza albo żeby utemperować ostrość. Jest szersza niż dzwon.',
    ),
  },
  peaking: {
    manualId: 'eq',
    title: text('Bell', 'Dzwonowy'),
    summary: text(
      'A bell boosts or cuts around one frequency. The sides return toward zero.',
      'Dzwon podbija albo tłumi wokół jednej częstotliwości. Boki wracają ku zeru.',
    ),
    practical: text(
      'Frequency picks the center. Gain picks the amount. Q picks the width.',
      'Częstotliwość wybiera środek. Wzmocnienie wybiera wielkość. Q wybiera szerokość.',
    ),
  },
  notch: {
    manualId: 'eq',
    title: text('Notch', 'Pasmowo-zaporowy'),
    summary: text(
      'A notch cuts a narrow dip at the frequency. It does not use the gain knob.',
      'Notch wycina wąski dołek na częstotliwości. Nie używa gałki wzmocnienia.',
    ),
    practical: text(
      'Use a higher Q for a narrower cut. Frequency chooses where the dip sits.',
      'Wyższe Q daje węższe wycięcie. Częstotliwość wybiera, gdzie siedzi dołek.',
    ),
  },
  bandpass: {
    manualId: 'eq',
    title: text('Band-pass', 'Pasmowoprzepustowy'),
    summary: text(
      'A band-pass keeps a region around the frequency and turns down the rest. Gain is not the level knob for this shape.',
      'Pasmowoprzepustowy zostawia okolice częstotliwości i ścisza resztę. Wzmocnienie nie jest gałką poziomu tego kształtu.',
    ),
    practical: text(
      'Frequency is the center. Q sets how much of the neighbors remain.',
      'Częstotliwość to środek. Q ustawia, ile sąsiadów zostaje.',
    ),
  },
}

export const SENSORY_NOTES: Record<string, HelpNote> = {
  character: {
    manualId: 'simple',
    practical: text(
      'Toward tight the tone gets boxed and darker. Toward open it gets wider and brighter. You hear an EQ change.',
      'W stronę ciasno barwa robi się pudełkowata i ciemniejsza. W stronę otwarcie robi się szersza i jaśniejsza. Słyszysz zmianę EQ.',
    ),
    technical: text(
      'Character morphs EQ only. It does not add reverb or delay, and it does not replace the sample.',
      'Charakter morphuje tylko EQ. Nie dodaje pogłosu ani delay i nie zastępuje sampla.',
    ),
  },
  space: {
    manualId: 'reverb',
    practical: text(
      'Toward vast you hear a larger, wetter space. Close leaves the sound dry. This is not a room measured in meters.',
      'W stronę szeroko słyszysz większą, bardziej mokrą przestrzeń. Blisko zostawia dźwięk suchy. To nie jest pomieszczenie mierzone w metrach.',
    ),
    technical: text(
      'Space morphs the reverb. Size here is the reverb’s own size control, not an acoustic simulation of a hall.',
      'Przestrzeń morphuje pogłos. Wielkość to tu własna kontrolka wielkości pogłosu, nie symulacja akustyczna sali.',
    ),
  },
  echo: {
    manualId: 'delay',
    practical: text(
      'Toward echo you hear repeats. Dry leaves the delay quiet. The original recording is still the source.',
      'W stronę echa słyszysz powtórzenia. Sucho zostawia delay cicho. Oryginalne nagranie nadal jest źródłem.',
    ),
    technical: text(
      'Echo morphs the delay, including its time, feedback, and wet mix. It does not rewrite the source buffer.',
      'Echo morphuje delay, w tym jego czas, sprzężenie zwrotne i miks wet. Nie przepisuje bufora źródła.',
    ),
  },
}
