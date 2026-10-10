import type { LearningTopic, Localized, TopicCategory } from './types'

const text = (en: string, pl: string): Localized => ({ en, pl })

export const TOPIC_CATEGORIES: readonly TopicCategory[] = ['picture', 'level', 'edit', 'tone', 'space', 'time']

export const LEARNING_TOPICS: readonly LearningTopic[] = [
  {
    id: 'waveform',
    category: 'picture',
    title: text('Waveform', 'Fala'),
    summary: text(
      'The drawing moves in time from left to right. Up and down is how far the signal swings, which is amplitude.',
      'Rysunek biegnie w czasie od lewej do prawej. Góra i dół to wychylenie sygnału, czyli amplituda.',
    ),
    practical: text(
      'A tall spike is a strong moment in the signal. A flat stretch is quiet or silent. The height is not a complete measure of how loud it feels.',
      'Wysoki szpic to silny moment sygnału. Płaski odcinek jest cichy albo milczy. Wysokość nie jest pełną miarą tego, jak głośno to brzmi.',
    ),
    technical: text(
      'The trace is sample amplitude over time. Perceived loudness also depends on duration, frequency, and the ear. FIELD does not treat peak height as loudness.',
      'Ślad to amplituda próbek w czasie. Odczuwana głośność zależy też od czasu trwania, częstotliwości i ucha. FIELD nie traktuje wysokości szczytu jako głośności.',
    ),
  },
  {
    id: 'amplitude',
    category: 'picture',
    title: text('Amplitude', 'Amplituda'),
    summary: text(
      'Amplitude is how far the signal moves away from silence. On the waveform, that is the vertical direction.',
      'Amplituda to odległość sygnału od ciszy. Na fali jest to kierunek pionowy.',
    ),
    practical: text(
      'A bigger swing can mean a stronger signal. It still does not tell you the whole story of loudness.',
      'Większe wychylenie może oznaczać silniejszy sygnał. To nadal nie jest cała historia głośności.',
    ),
    technical: text(
      'Amplitude here is the stored sample value. Gain multiplies that level later. Loudness is a perceptual measure, not the raw height.',
      'Amplituda to tu zapisana wartość próbki. Gain mnoży ten poziom później. Głośność jest miarą słuchową, nie samą wysokością rysunku.',
    ),
  },
  {
    id: 'selection',
    category: 'picture',
    title: text('Selection', 'Zaznaczenie'),
    summary: text(
      'A selection is the time range you are working on. Drag across the waveform to set its start and end.',
      'Zaznaczenie to zakres czasu, nad którym pracujesz. Przeciągnij po fali, aby ustawić początek i koniec.',
    ),
    practical: text(
      'Trim, fades, and loop use that range. The rest of the recording stays outside it until you include it.',
      'Przycięcie, zanikanie i pętla używają tego zakresu. Reszta nagrania zostaje poza nim, dopóki jej nie obejmiesz.',
    ),
    technical: text(
      'The range is the play region: start and end in seconds. It does not delete audio until you trim or run another edit.',
      'Zakres to region odtwarzania: początek i koniec w sekundach. Samo zaznaczenie nie kasuje audio, dopóki nie przytniesz albo nie zrobisz innej edycji.',
    ),
  },
  {
    id: 'gain',
    category: 'level',
    title: text('Gain', 'Gain'),
    summary: text(
      'Gain turns the signal level up or down. It is volume for the editor, shown in decibels.',
      'Gain podnosi albo obniża poziom sygnału. W edytorze to głośność, pokazana w decybelach.',
    ),
    practical: text(
      'A small move is often enough. Louder is not always clearer. Compare before and after with your ears.',
      'Często wystarczy mały ruch. Głośniej nie znaczy wyraźniej. Porównaj przed i po uchem.',
    ),
    technical: text(
      'Input gain scales the signal before the rest of the chain. It does not change level in a simple one-to-one way with perceived loudness.',
      'Gain wejścia skaluje sygnał przed resztą łańcucha. Nie zmienia poziomu w prosty, proporcjonalny sposób względem odczuwanej głośności.',
    ),
  },
  {
    id: 'decibels',
    category: 'level',
    title: text('Decibels', 'Decybele'),
    summary: text(
      'Decibels, written dB, are a scale for level. Zero dB on a file is the top of the digital scale, called full scale.',
      'Decybele, zapisywane dB, to skala poziomu. Zero dB w pliku to szczyt skali cyfrowej, czyli pełna skala.',
    ),
    practical: text(
      'Negative numbers are below that top. −6 dB is a comfortable peak for many recordings. Going past 0 dBFS clips.',
      'Liczby ujemne są poniżej tego szczytu. −6 dB to wygodny szczyt dla wielu nagrań. Przekroczenie 0 dBFS przesterowuje.',
    ),
    technical: text(
      'dBFS means decibels relative to full scale. FIELD input gain uses the same decibel idea. +6 dB is about twice the amplitude, not twice the loudness.',
      'dBFS to decybele względem pełnej skali. Gain wejścia w FIELD używa tej samej idei. +6 dB to około dwa razy większa amplituda, nie dwa razy większa głośność.',
    ),
  },
  {
    id: 'clipping',
    category: 'level',
    title: text('Clipping', 'Przesterowanie'),
    summary: text(
      'Clipping happens when the signal tries to go past the loudest level the system can hold. The top flattens.',
      'Przesterowanie jest wtedy, gdy sygnał chce przekroczyć najgłośniejszy poziom, jaki system utrzyma. Szczyt się spłaszcza.',
    ),
    practical: text(
      'Leave a little room under 0 dB. That spare room is called headroom. If it sounds broken after a loud gain move, ease the gain back.',
      'Zostaw trochę miejsca pod 0 dB. Ten zapas nazywa się headroom. Jeśli po mocnym gainie dźwięk się łamie, cofnij gain.',
    ),
    technical: text(
      'Digital clipping is flattening at full scale. Headroom is the gap between the peak and 0 dBFS. Gain can cause it. EQ boosts can too.',
      'Cyfrowe przesterowanie to spłaszczenie przy pełnej skali. Headroom to odstęp między szczytem a 0 dBFS. Może je wywołać gain. Podbicie EQ też.',
    ),
  },
  {
    id: 'trim',
    category: 'edit',
    title: text('Trim', 'Przycięcie'),
    summary: text(
      'Trim keeps the selected time and removes the audio outside it. You choose the part first, then trim.',
      'Przycięcie zostawia zaznaczony czas i usuwa audio poza nim. Najpierw wybierasz fragment, potem przycinasz.',
    ),
    practical: text(
      'Play the result. If you cut too much, undo is still there. Trim does not add fades by itself.',
      'Odsłuchaj wynik. Jeśli uciąłeś za dużo, cofnięcie nadal jest. Samo przycięcie nie dodaje zanikania.',
    ),
    technical: text(
      'FIELD crops the working buffer to the play region. The new file covers that region from start to end.',
      'FIELD przycina roboczy bufor do regionu odtwarzania. Nowy materiał obejmuje ten region od początku do końca.',
    ),
  },
  {
    id: 'fade',
    category: 'edit',
    title: text('Fade', 'Zanikanie'),
    summary: text(
      'A fade in starts from silence. A fade out ends in silence. Both soften a hard edge.',
      'Fade in startuje od ciszy. Fade out kończy w ciszy. Oba łagodzą twardą krawędź.',
    ),
    practical: text(
      'A hard cut at the start or end can click. A short fade is often enough. Longer fades feel smoother and less sudden.',
      'Twarde cięcie na początku albo końcu może kliknąć. Krótki zanik często wystarcza. Dłuższy jest łagodniejszy i mniej nagły.',
    ),
    technical: text(
      'The fade is a gain curve over time at the region edge. FIELD uses the same curve in Simple and Technical. It does not change the middle of the recording.',
      'Zanik to krzywa gainu w czasie na krawędzi regionu. FIELD używa tej samej krzywej w Simple i Technical. Środek nagrania zostaje bez zmian.',
    ),
  },
  {
    id: 'export',
    category: 'edit',
    title: text('Export', 'Eksport'),
    summary: text(
      'Export writes a new audio file from the current result. The project in the browser stays as it is.',
      'Eksport zapisuje nowy plik audio z bieżącego wyniku. Projekt w przeglądarce zostaje, jaki jest.',
    ),
    practical: text(
      'Check the region, the fades, and the level before you export. With a tail, delay and reverb can ring after the sample ends.',
      'Przed eksportem sprawdź region, zanikanie i poziom. Z ogonem delay i pogłos mogą wybrzmiewać po końcu sampla.',
    ),
    technical: text(
      'Simple bounces the current processing to WAV. Technical uses the existing export of the processed region. Guidance does not add a second exporter.',
      'Simple zgrywa bieżące przetwarzanie do WAV. Technical używa istniejącego eksportu przetworzonego regionu. Prowadzenie nie dodaje drugiego eksportera.',
    ),
  },
  {
    id: 'frequency',
    category: 'tone',
    title: text('Frequency', 'Częstotliwość'),
    summary: text(
      'Frequency is how fast the sound vibrates. Low frequencies feel deep. High frequencies feel bright or airy.',
      'Częstotliwość to tempo drgania dźwięku. Niskie częstotliwości brzmią głęboko. Wysokie brzmią jasno albo powietrznie.',
    ),
    practical: text(
      'Bass sits low. Speech clarity often lives in the middle and a bit above. Treble is the bright top.',
      'Bas jest nisko. Wyrazistość mowy często siedzi w środku i trochę wyżej. Góra to jasny szczyt.',
    ),
    technical: text(
      'Frequency is measured in hertz (Hz). EQ changes the balance between ranges. It does not delete a sound by name.',
      'Częstotliwość mierzy się w hercach (Hz). EQ zmienia balans między zakresami. Nie usuwa dźwięku po nazwie.',
    ),
  },
  {
    id: 'eq',
    category: 'tone',
    title: text('EQ', 'EQ'),
    summary: text(
      'EQ changes the balance between low, middle, and high frequencies. It shapes tone. It does not remove all noise.',
      'EQ zmienia balans między niskimi, średnimi i wysokimi częstotliwościami. Kształtuje barwę. Nie usuwa całego szumu.',
    ),
    practical: text(
      'Clearer speech often means a little less low mud and a little more presence. Warmer means more body and less sharp top. Brighter means more treble.',
      'Wyraźniejsza mowa to często odrobina mniej niskiego mulenia i odrobina więcej prezencji. Cieplej to więcej ciała i mniej ostrej góry. Jaśniej to więcej wysokich.',
    ),
    technical: text(
      'Simple characters are presets on the existing EQ. Presence is energy around the upper mids, where consonants carry. A boost can also raise level, so watch clipping.',
      'Charaktery w Simple to presety na istniejącym EQ. Prezencja to energia w górnym środku, gdzie niosą spółgłoski. Podbicie może też podnieść poziom, więc pilnuj przesterowania.',
    ),
  },
  {
    id: 'reverb',
    category: 'space',
    title: text('Reverb', 'Pogłos'),
    summary: text(
      'Reverb adds the sound of a room: many soft reflections that bloom and then fade.',
      'Pogłos dodaje brzmienie pomieszczenia: wiele miękkich odbić, które narastają i gasną.',
    ),
    practical: text(
      'A small space is close. A large space is wide and long. Amount is how much of that space you hear next to the dry sound.',
      'Mała przestrzeń jest blisko. Duża jest szeroka i długa. Ilość to, ile tej przestrzeni słyszysz obok suchego dźwięku.',
    ),
    technical: text(
      'Decay is how long the wash lasts. Early reflections are the first bounces. Wet is the effect. Dry is the original. Amount in Simple is that wet mix, kept in a modest range.',
      'Decay to czas trwania smugi. Wczesne odbicia to pierwsze odbicia. Wet to efekt. Dry to oryginał. Ilość w Simple to ten miks wet, trzymany w skromnym zakresie.',
    ),
  },
  {
    id: 'delay',
    category: 'space',
    title: text('Delay', 'Delay'),
    summary: text(
      'Delay plays the sound again after a short time. Those repeats are the echo.',
      'Delay odtwarza dźwięk ponownie po krótkiej chwili. Te powtórzenia to echo.',
    ),
    practical: text(
      'A short delay is a quick slap. A longer one is a clear echo. Amount is how loud the repeats are.',
      'Krótki delay to szybkie odbicie. Dłuższy to wyraźne echo. Ilość to głośność powtórzeń.',
    ),
    technical: text(
      'Delay time is the gap before the repeat. Feedback sends some of the repeat back in, so it can echo again. Mix is the wet level against the dry sound.',
      'Czas delay to odstęp przed powtórzeniem. Feedback zawraca część powtórzenia, więc może echo wrócić jeszcze raz. Miks to poziom wet wobec suchego dźwięku.',
    ),
  },
  {
    id: 'pitch',
    category: 'time',
    title: text('Pitch', 'Wysokość'),
    summary: text(
      'Pitch is how high or low the note sounds. Changing pitch moves the tone up or down.',
      'Wysokość to, jak wysoko albo nisko brzmi nuta. Zmiana wysokości przesuwa ton w górę albo w dół.',
    ),
    practical: text(
      'A small shift is subtle. A large shift sounds like a different note. Pitch does not have to change the length.',
      'Małe przesunięcie jest subtelne. Duże brzmi jak inna nuta. Wysokość nie musi zmieniać długości.',
    ),
    technical: text(
      'FIELD pitch is in semitones. It retunes playback. Speed is a separate control and can change length and pitch together.',
      'Wysokość w FIELD jest w półtonach. Przestroja odtwarzanie. Szybkość to osobna kontrolka i może zmienić długość i wysokość razem.',
    ),
  },
  {
    id: 'speed',
    category: 'time',
    title: text('Speed', 'Szybkość'),
    summary: text(
      'Speed plays the recording faster or slower. Faster is shorter. Slower is longer.',
      'Szybkość odtwarza nagranie szybciej albo wolniej. Szybciej jest krócej. Wolniej jest dłużej.',
    ),
    practical: text(
      'Try a small change first. Extreme speed can sound like an effect. You do not need a specific number.',
      'Najpierw spróbuj małej zmiany. Skrajna szybkość może brzmieć jak efekt. Nie potrzebujesz konkretnej liczby.',
    ),
    technical: text(
      'Speed scales time. In this engine it is separate from the pitch control, so you can change one without forcing the other.',
      'Szybkość skaluje czas. W tym silniku jest osobno od wysokości, więc możesz zmienić jedną bez wymuszania drugiej.',
    ),
  },
  {
    id: 'reverse',
    category: 'time',
    title: text('Reverse', 'Odwrócenie'),
    summary: text(
      'Reverse plays the recording backwards, from the end toward the start.',
      'Odwrócenie odtwarza nagranie wstecz, od końca ku początkowi.',
    ),
    practical: text(
      'Attacks become fades. It is a different gesture from speed or pitch. Turn it off to go forward again.',
      'Ataki stają się zanikami. To inny gest niż szybkość albo wysokość. Wyłącz, aby znowu iść do przodu.',
    ),
    technical: text(
      'Direction flips the playhead through the buffer. It does not change EQ, reverb, or delay settings.',
      'Kierunek odwraca bieg głowicy przez bufor. Nie zmienia ustawień EQ, pogłosu ani delay.',
    ),
  },
  {
    id: 'chain',
    category: 'edit',
    title: text('Effect chain', 'Łańcuch efektów'),
    summary: text(
      'The effect chain is the path the sound takes. Input is first. Output is last. Effects sit between them.',
      'Łańcuch efektów to droga dźwięku. Wejście jest pierwsze. Wyjście jest ostatnie. Efekty siedzą między nimi.',
    ),
    practical: text(
      'Click + to add an effect. Select a tile to open its Inspector. Order matters: an effect later in the chain hears what came before it.',
      'Kliknij +, żeby dodać efekt. Wybierz kafelek, żeby otworzyć jego inspektor. Kolejność ma znaczenie: późniejszy efekt słyszy to, co było wcześniej.',
    ),
    technical: text(
      'Each tile is one module instance with a stable id. Two delays are two instances. The guide follows one id and does not edit the other.',
      'Każdy kafelek to jedna instancja modułu ze stałym identyfikatorem. Dwa delaye to dwie instancje. Przewodnik idzie za jednym identyfikatorem i nie edytuje drugiego.',
    ),
  },
  {
    id: 'bypass',
    category: 'edit',
    title: text('Bypass', 'Bypass'),
    summary: text(
      'Bypass lets the sound pass that effect without using it. The effect stays in the chain.',
      'Bypass przepuszcza dźwięk obok efektu. Efekt zostaje w łańcuchu.',
    ),
    practical: text(
      'The power mark on a tile turns that effect off without deleting it. Turn it on again and the settings are still there.',
      'Znaczek zasilania na kafelku wyłącza ten efekt bez usuwania go. Włączysz go znowu, a ustawienia nadal tam są.',
    ),
    technical: text(
      'Bypass is not a parameter change. It does not remove the module, its automation, or its modulation.',
      'Bypass nie jest zmianą parametru. Nie usuwa modułu, jego automatyzacji ani modulacji.',
    ),
  },
  {
    id: 'q',
    category: 'tone',
    title: text('Q', 'Q'),
    summary: text(
      'Q is how wide an EQ band is. A low Q is a broad slope. A high Q is a narrow notch or peak.',
      'Q to szerokość pasma EQ. Niskie Q to szerokie zbocze. Wysokie Q to wąski dołek albo szczyt.',
    ),
    practical: text(
      'Start with a moderate width. A very narrow band is easy to miss and easy to overdo.',
      'Zacznij od umiarkowanej szerokości. Bardzo wąskie pasmo łatwo przeoczyć i łatwo przesadzić.',
    ),
    technical: text(
      'Q is the filter quality factor. It sets bandwidth around the band frequency. Gain sets how far that band moves.',
      'Q to dobroć filtra. Ustawia szerokość wokół częstotliwości pasma. Gain ustawia, jak daleko to pasmo się rusza.',
    ),
  },
  {
    id: 'wet',
    category: 'space',
    title: text('Wet and dry', 'Wet i dry'),
    summary: text(
      'Dry is the original sound. Wet is the effect. The mix is how much of each you hear.',
      'Dry to oryginalny dźwięk. Wet to efekt. Miks to, ile słyszysz każdego z nich.',
    ),
    practical: text(
      'Turn Wet up a little. If the original disappears, turn it back down. You do not need an extreme setting.',
      'Podnieś Wet odrobinę. Jeśli oryginał znika, obniż go z powrotem. Nie potrzebujesz skrajnego ustawienia.',
    ),
    technical: text(
      'Reverb and delay each have their own wet control. Raising wet does not change delay time, feedback, or the dry recording.',
      'Pogłos i delay mają własne kontrolki wet. Podniesienie wet nie zmienia czasu delay, feedbacku ani suchego nagrania.',
    ),
  },
]

const TOPIC_BY_ID = new Map(LEARNING_TOPICS.map((topic) => [topic.id, topic]))

export function topicById(id: string | null): LearningTopic | null {
  if (!id) return null
  return TOPIC_BY_ID.get(id) ?? null
}

export function topicsInCategory(category: TopicCategory): LearningTopic[] {
  return LEARNING_TOPICS.filter((topic) => topic.category === category)
}
