import type { Locale } from '../i18n/locale'

export const TOUR_IDS = ['sound', 'modes', 'edit', 'tone', 'access', 'look', 'save', 'together'] as const

export type TourId = (typeof TOUR_IDS)[number]

export type TourStepCopy = {
  id: TourId
  title: string
  body: readonly string[]
  points?: readonly string[]
}

export type HelpSectionId = 'intro' | 'guide' | 'modes' | 'basics' | 'access' | 'look' | 'keys' | 'status'

export type HelpSectionCopy = {
  id: HelpSectionId
  title: string
  body: readonly string[]
}

export type HelpTopicId =
  | 'simple'
  | 'sensory'
  | 'wave'
  | 'wave-focus'
  | 'eq'
  | 'eq-focus'
  | 'fft'
  | 'fft-focus'
  | 'auto'
  | 'auto-focus'
  | 'hearing'
  | 'hearing-focus'
  | 'fx-filter'
  | 'fx-grain'
  | 'fx-distortion'
  | 'fx-midside'
  | 'fx-delay'
  | 'fx-reverb'
  | 'fx-compressor'
  | 'fx-limiter'
  | 'fx-input'
  | 'fx-output'

export type HelpTopicCopy = {
  title: string
  body: readonly string[]
  points?: readonly string[]
}

export type Impression = 'very-positive' | 'positive' | 'neutral' | 'negative' | 'very-negative'
export type Ease = 'yes' | 'mostly' | 'not-really' | 'no'
export type AccessUse = 'yes' | 'no' | 'later'
export type DeviceKind = 'computer' | 'tablet' | 'phone' | 'other'

export type Choice<T extends string> = {
  id: T
  label: string
}

export type IntroCopy = {
  welcomeTitle: string
  welcomeLead: string
  welcomeBody: readonly string[]
  discover: string
  start: string
  dismiss: string
  welcomeStartup: string
  close: string
  back: string
  next: string
  skip: string
  pin: string
  unpin: string
  step: (index: number, total: number) => string
  showAccess: string
  sendFeedback: string
  helpWord: string
  helpLabel: string
  helpMenu: string
  feedbackTooltip: string
  feedbackLabel: string
  tour: readonly TourStepCopy[]
  helpTitle: string
  scopeLabel: string
  scopeContext: string
  scopeGeneral: string
  parametersHeading: string
  topics: Record<HelpTopicId, HelpTopicCopy>
  helpSections: readonly HelpSectionCopy[]
  replayWelcome: string
  replayTour: string
  openAccess: string
  openKeys: string
  openManual: string
  openGuided: string
  formTitle: string
  formLead: string
  formOptional: string
  qImpression: string
  impressions: readonly Choice<Impression>[]
  qEase: string
  ease: readonly Choice<Ease>[]
  qDifficulty: string
  difficultyPlaceholder: string
  qAccess: string
  accessChoices: readonly Choice<AccessUse>[]
  qAccessNote: string
  qIdeas: string
  ideasPlaceholder: string
  qDevice: string
  devices: readonly Choice<DeviceKind>[]
  email: string
  emailHint: string
  techLabel: string
  submit: string
  cancel: string
  sending: string
  thanksTitle: string
  thanksBody: string
  errorUnconfigured: string
  errorNetwork: string
  errorRejected: string
  activationTitle: string
  activationBody: string
  errorRate: string
  errorEmpty: string
  errorEmail: string
  errorLength: string
  unconfiguredNote: string
  privacyNote: string
  blank: string
  contact: string
  technicalHeading: string
  versionLabel: string
  localeLabel: string
  modeLabel: string
  viewportLabel: string
  browserLabel: string
}

const pl: IntroCopy = {
  welcomeTitle: 'FIELD',
  welcomeLead: 'Przestrzeń do odkrywania dźwięku.',
  welcomeBody: [
    'Nie musisz znać się na produkcji muzycznej ani rozumieć wszystkich narzędzi.',
    'Wczytaj dźwięk. Posłuchaj go. Zmień coś.',
    'Możesz pracować precyzyjnie albo po prostu eksperymentować. Nie ma jednej właściwej drogi.',
    'Kiedy na ekranie jest za dużo naraz, tryb Focus zostawia jeden obszar pracy i chowa resztę. Dźwięk się nie zmienia.',
    'Zacznij od jednego dźwięku.',
  ],
  discover: 'Odkryj FIELD',
  start: 'Rozpocznij pracę',
  dismiss: 'Nie pokazuj tego okna przy starcie',
  welcomeStartup: 'Pokazuj ekran powitalny przy starcie',
  close: 'Zamknij',
  back: 'Wstecz',
  next: 'Dalej',
  skip: 'Pomiń',
  pin: 'Zostaw podczas edycji',
  unpin: 'Wróć na środek',
  step: (index, total) => `Krok ${index} z ${total}`,
  showAccess: 'Pokaż ustawienia dostępności',
  sendFeedback: 'Prześlij opinię',
  helpWord: 'Pomoc',
  helpLabel: 'Pomoc',
  helpMenu: 'Pomoc',
  feedbackTooltip: 'Prześlij opinię',
  feedbackLabel: 'Prześlij opinię',
  tour: [
    {
      id: 'sound',
      title: 'Twój dźwięk',
      body: [
        'Wszystko zaczyna się od dźwięku.',
        'Wczytaj nagranie przyciskiem „Wczytaj sample”, upuść plik na edytor albo wygeneruj próbkę demo. Zobaczysz przebieg i możesz zacząć odsłuch.',
        'Możesz pracować z nagraniem terenowym, głosem, muzyką albo dowolnym innym materiałem.',
      ],
    },
    {
      id: 'modes',
      title: 'Wybierz sposób pracy',
      body: [
        'Ten sam dźwięk można opracować na kilka sposobów. Żaden tryb nie jest lepszy od pozostałych.',
        'Na początek wygodny bywa Prosty. Przełącznik jest w nagłówku.',
      ],
      points: [
        'Prosty wykańcza nagranie: przycięcie, narastanie, wygaszanie, brzmienie, pogłos, opóźnienie i zapis.',
        'Techniczny otwiera pełny edytor, łańcuch efektów i inspektor. Domyślny układ to Workspace.',
        'Sensoryczny kształtuje dźwięk przez odczucie, bez stołu mikserskiego.',
        'Focus, w rogu obrazu w trybie Technicznym, chowa otoczenie i zostawia falę, EQ, widmo, automatyzację albo Hearing. Pomaga, gdy reszta interfejsu rozprasza. Wyjście przywraca otoczenie bez zmiany dźwięku.',
      ],
    },
    {
      id: 'edit',
      title: 'Podstawowa edycja',
      body: [
        'Odtwarzanie i pauza są na transporcie, obok zatrzymania. Przeciągnij po przebiegu, żeby zaznaczyć fragment, a potem go przytnij albo dodaj narastanie i wygaszanie. W łańcuchu Technicznego nowy efekt dodajesz przyciskiem „Dodaj efekt”.',
        'Po zmianie odsłuchaj rezultat. W trybie Prostym porównasz Oryginał i Po.',
        'Przebieg to obraz dźwięku w czasie. Wyższe miejsca to większe wychylenie fali, nie pełna miara głośności.',
      ],
    },
    {
      id: 'tone',
      title: 'Zmieniaj brzmienie',
      body: [
        'Jeden dźwięk. Wiele możliwości.',
        'Możesz rozjaśnić brzmienie, dodać przestrzeń, wydobyć szczegóły albo zmienić charakter nagrania. Eksperymentuj i słuchaj, co się zmienia.',
        'Nie musisz znać parametrów. F1 wyjaśnia kontrolkę w fokusie — tekstem, bez zatrzymywania odtwarzania.',
      ],
      points: [
        'Prosty: brzmienie, pogłos i opóźnienie.',
        'Techniczny: EQ, filtr, pogłos, delay, kompresor, limiter, zniekształcenie i Mid/Side.',
        'Sensoryczny prowadzi przez odczucie, a pod spodem zostaje ten sam dźwięk.',
        'Przy parametrach, które to obsługują, możesz podłączyć LFO albo wylosować wartość. Centrum LFO jest w nagłówku.',
        'Chaos w nagłówku poszerza losowanie i włącza limiter bezpieczeństwa łańcucha, jeśli był pominięty. Jedno losowanie działa także bez Chaosu. Auto Random potrzebuje Chaosu.',
      ],
    },
    {
      id: 'access',
      title: 'FIELD dla różnych użytkowników',
      body: [
        'FIELD możesz dostosować do siebie.',
        'Ustawienia → Dostępność otwierają FIELD ACCESS. To nie jest osobny tryb i nie zastępuje czytnika ekranu. Wybierz sposób pracy, który jest dla Ciebie najwygodniejszy.',
        'Te wybory działają, dopóki karta jest otwarta. Odświeżenie strony wraca do wartości początkowych.',
      ],
      points: [
        'Rozmiar interfejsu i rozmiar tekstu, większe kontrolki oraz kontrolki o zwiększonej widoczności.',
        'Wyraźniejszy fokus. Tab i Shift+Tab przechodzą między kontrolkami. Fokus jest widoczny także bez tego wzmocnienia.',
        'Spacja odtwarza i pauzuje, gdy skróty transportu są włączone. Strzałki zmieniają suwak, Escape zamyka okna.',
        'Najpierw klawiatura oraz edycja bez przeciągania: przyciski i dokładne wartości zamiast samego gestu.',
        'Dostępna nawigacja przebiegu dodaje czas i punkty orientacyjne. Klawiatura i czytnik sięgają fali także wtedy, gdy ta opcja jest wyłączona.',
        'Opisy parametrów są włączone na starcie. Optymalizacje czytnika ściszają dodatkowe komunikaty na żywo. Nazwy i wartości zostają.',
        'F1 pokazuje objaśnienie kontrolki. To tekst w aplikacji, nie synteza mowy. Czasy dla czytnika są podawane słownie.',
        'Motyw zmienisz w nagłówku. Są wśród nich Black & White oraz przyjazne oczom Soft Slate, Warm Paper i Dusk. Więcej → Wysoki kontrast / słabowidzący.',
        'Ograniczenie ruchu uwzględnia też ustawienie systemu. Komfort sensoryczny uspokaja mierniki, widmo i ozdobny ruch.',
        'Hearing, obok Fali, EQ, FFT i Auto, rysuje dźwięk. Przydaje się każdemu, kto woli zobaczyć nagranie, nie tylko osobom, którym przeszkadza słuch. Dostęp słuchowy w sekcji Więcej pokazuje te same cechy wizualnie i może użyć wibracji. To nie jest czytnik ekranu ani aparat słuchowy.',
      ],
    },
    {
      id: 'look',
      title: 'Wygląd i klimat',
      body: [
        'Motyw wybierasz w nagłówku. Są ciemne, jasne, przyjazne oczom i mocniej graficzne. Własny zestaw kolorów możesz zapisać.',
        'Dodaj tło, obok motywu w nagłówku, przyjmuje JPG albo PNG. Zdjęcie albo wzór zostaje za przebiegiem i może przywołać klimat nagrania. Obok ustawiasz krycie i ziarno.',
        'Obraz zostaje tylko na tę sesję i nie zmienia dźwięku. Przy otwartym panelu tła możesz go wkleić.',
      ],
    },
    {
      id: 'save',
      title: 'Zapisz rezultat',
      body: [
        'Eksport zapisuje WAV przetworzonego nagrania albo samego zaznaczenia. W oknie sprawdzisz częstotliwość próbkowania, głębię bitową i kanały.',
        'Ogon pogłosu i delay możesz zostawić albo uciąć razem z nagraniem.',
        'Plik powstaje w przeglądarce. FIELD nie wysyła nagrań do chmury i nie łączy się z Google Drive.',
      ],
    },
    {
      id: 'together',
      title: 'FIELD rozwija się razem z użytkownikami',
      body: [
        'FIELD jest wciąż rozwijany.',
        'To działająca aplikacja, ale jednocześnie przestrzeń eksperymentów i testów. Niektóre funkcje mogą się zmieniać, a czasem coś może nie działać zgodnie z oczekiwaniami.',
        'Twoje doświadczenia, pomysły i uwagi pomagają rozwijać FIELD. Jeżeli coś jest niejasne, niewygodne lub nie działa — daj znać.',
      ],
    },
  ],
  helpTitle: 'Pomoc',
  scopeLabel: 'Zakres pomocy',
  scopeContext: 'Kontekstowa',
  scopeGeneral: 'Ogólna',
  parametersHeading: 'Parametry',
  topics: {
    simple: {
      title: 'Prosty',
      body: [
        'Prosty wykańcza nagranie: przycięcie, narastanie, wygaszanie, brzmienie, pogłos, opóźnienie i zapis.',
        'Obok siebie porównujesz Oryginał i Po. To ten sam dźwięk co w pozostałych trybach, w krótszym układzie.',
      ],
    },
    sensory: {
      title: 'Sensoryczny',
      body: [
        'Sensoryczny kształtuje dźwięk przez odczucie, bez stołu mikserskiego.',
        'Pod spodem zostaje ten sam dźwięk. Przełącznik trybu jest w nagłówku.',
      ],
    },
    wave: {
      title: 'Fala',
      body: [
        'Fala pokazuje przebieg w czasie. Wyższe miejsca to większe wychylenie, nie pełna miara głośności.',
        'Przeciągnij po przebiegu, żeby zaznaczyć fragment. Potem możesz go przyciąć albo dodać narastanie i wygaszanie.',
      ],
      points: ['Ikona {focus} w prawym górnym rogu obrazu otwiera Focus fali. Ta sama ikona z niego wychodzi. Dźwięk, zaznaczenie i głowica zostają.'],
    },
    'wave-focus': {
      title: 'Focus fali',
      body: [
        'Focus fali zostawia przebieg i mały transport: odtwarzanie, stop, pętlę i czas. Reszta otoczenia jest schowana.',
        'Uchwyty zaniku są pod paskiem. Wyjście przywraca otoczenie i nie zmienia dźwięku.',
      ],
    },
    eq: {
      title: 'EQ',
      body: [
        'EQ w Workspace otwiera korektor w inspektorze, gdy equalizer jest w łańcuchu. Wykres zajmuje wysokość nad transportem.',
        'Każdy filtr to jeden wiersz na całą szerokość: wybór typu i pokrętła, których ten typ używa.',
      ],
      points: [
        'Kliknij dwa razy na wykresie EQ, żeby utworzyć filtr dzwonkowy w tym miejscu.',
        'Przycisk „Add band” w inspektorze dodaje kolejny filtr.',
        'Punkt na wykresie przeciągasz, a pokrętłem kręcisz ten sam parametr.',
        'Ikona {focus} w rogu obrazu otwiera EQ Focus. Dźwięk się od tego nie zmienia.',
      ],
    },
    'eq-focus': {
      title: 'EQ Focus',
      body: [
        'EQ Focus to ten sam korektor bez otaczającego interfejsu. Zostaje, gdy reszta ekranu rozprasza.',
        'Filtry są wypisane po lewej stronie wykresu. Pokrętła stoją na środku i unoszą się nad siatką. Menu typu filtra jest w nagłówku pasma, obok nazwy.',
        'Ta sama ikona {focus} w rogu wychodzi z Focus. Odtwarzanie, zaznaczenie i głowica zostają.',
      ],
      points: [
        'Kliknij dwa razy na wykresie, żeby dodać filtr dzwonkowy w tym miejscu.',
        '{plus} w nagłówku pasma dodaje filtr. Ma nazwę „Dodaj pasmo”.',
        'Przeciągnij punkt na wykresie albo obróć pokrętło częstotliwości, wzmocnienia albo dobroci. Zostają te, których używa wybrany typ.',
        'Wskazówka pokrętła pokazuje wartość skuteczną. Gdy na pokrętle jest LFO, wskazówka idzie za tym ruchem.',
        '{trash} w nagłówku pasma wyłącza ten filtr. Ma nazwę „Usuń węzeł”.',
        'Zakres w menu {dots}, 60, 90 albo 120 dB, mówi, jak głęboko sięgają słupki widma. Nie skaluje krzywej EQ.',
      ],
    },
    fft: {
      title: 'FFT',
      body: [
        'FFT pokazuje widmo nagrania. Na belce obrazu zostają Before, After, Both oraz 2D / 3D.',
        '{dots} na końcu belki otwiera ustawienia analizatora. To pomiar dźwięku, nie krzywa korektora.',
      ],
      points: ['Ikona {focus} w rogu otwiera FFT Focus. Dźwięk się nie zmienia.'],
    },
    'fft-focus': {
      title: 'FFT Focus',
      body: [
        'FFT Focus zostawia widmo. Ustawienia analizatora są pod {dots} na belce.',
        'Ta sama ikona {focus} wychodzi z Focus i przywraca otoczenie.',
      ],
    },
    auto: {
      title: 'Auto',
      body: [
        'Auto pokazuje automatyzację parametru w czasie, na tym samym obrazie.',
        'Krzywa mówi, jak wartość zmienia się wzdłuż nagrania. Ikona {focus} w rogu otwiera Focus automatyzacji.',
      ],
    },
    'auto-focus': {
      title: 'Focus automatyzacji',
      body: [
        'Focus automatyzacji zostawia krzywą parametru i mały transport.',
        'Wyjście przywraca otoczenie. Zaznaczenie i głowica zostają.',
      ],
    },
    hearing: {
      title: 'Hearing',
      body: [
        'Hearing rysuje dźwięk obok Fali, EQ, FFT i Auto. Jest dla każdego, kto woli zobaczyć nagranie, nie tylko dla osób, którym przeszkadza słuch.',
        'To nie jest czytnik ekranu ani aparat słuchowy. Ikona {focus} w rogu otwiera Hearing Focus.',
      ],
    },
    'hearing-focus': {
      title: 'Hearing Focus',
      body: [
        'Hearing Focus zostawia mapę dźwięku w tej samej ramce co pozostałe widoki Focus.',
        'Przeciągnięcie po fali zaznacza fragment. Puszczenie zamienia zaznaczenie w pętlę. Klik tylko przesuwa głowicę.',
        'Ta sama ikona {focus} wychodzi z Focus i nie zmienia dźwięku.',
      ],
    },
    'fx-filter': {
      title: 'Filter',
      body: [
        'Filter jest osobnym efektem w łańcuchu, nie korektorem EQ.',
        'Do tej instancji należą cutoff, rezonans, drive, mix i jej LFO. Przycisk {power} na kafelku omija efekt i go nie usuwa.',
      ],
    },
    'fx-grain': {
      title: 'Grain',
      body: [
        'Przełącznik Grain w inspektorze przechodzi między zwykłym odtwarzaniem a trybem ziarna.',
        'Pokrętła w tym inspektorze należą do tej instancji. Ominięcie na kafelku nie usuwa modułu.',
      ],
    },
    'fx-distortion': {
      title: 'Zniekształcenie',
      body: [
        'W inspektorze wybierasz typ zniekształcenia, a potem pokrętła tej instancji.',
        'Ominięcie na kafelku wyłącza efekt bez usuwania go z łańcucha.',
      ],
    },
    'fx-midside': {
      title: 'Mid/Side',
      body: [
        'Mid/Side ustawia środek i boki: wzmocnienie mid i side, obrót i crossfeed.',
        'To osobny moduł, nie EQ. Ominięcie na kafelku zostawia go w łańcuchu.',
      ],
    },
    'fx-delay': {
      title: 'Delay',
      body: [
        'Czas, feedback i wet są osobne dla tej instancji delay.',
        'Kill FX ucina ogon delay bez usuwania modułu z łańcucha.',
      ],
    },
    'fx-reverb': {
      title: 'Pogłos',
      body: [
        'Ta instancja ma własny rozmiar, wybrzmienie i miks wet.',
        'Gdy Dry i Wet są zlinkowane, to jeden Mix. Kill FX ucina ogon pogłosu i nie usuwa modułu.',
      ],
    },
    'fx-compressor': {
      title: 'Kompresor',
      body: [
        'Ta instancja ma własny próg, ratio, atak, zwolnienie, kolano i makeup.',
        'To nie jest limiter bezpieczeństwa łańcucha. Drugi kompresor nie dzieli z nim ustawień.',
      ],
    },
    'fx-limiter': {
      title: 'Limiter',
      body: [
        'Limiter trzyma szczyty tego miejsca w łańcuchu.',
        'Chaos włącza ten limiter, jeśli był pominięty albo go nie było. Nie dodaje drugiego limitera.',
      ],
    },
    'fx-input': {
      title: 'Wejście',
      body: [
        'Wejście stoi na początku łańcucha. Wzmocnienie, szybkość i wysokość kształtują źródło, zanim sygnał wejdzie w efekty.',
        'To nie jest głośność wyjścia ani głośność śladu. Normalizacja jest osobną czynnością na zaznaczeniu.',
      ],
    },
    'fx-output': {
      title: 'Wyjście',
      body: [
        'Wyjście jest ostatnim poziomem instrumentu, po efektach.',
        'Wyciszenie milczy na wyjściu i nie usuwa modułów z łańcucha.',
      ],
    },
  },
  helpSections: [
    {
      id: 'intro',
      title: 'Krótkie wprowadzenie',
      body: [
        'FIELD jest przestrzenią do odkrywania dźwięku. Nie musisz znać wszystkich narzędzi, żeby wczytać nagranie, posłuchać go i coś zmienić.',
      ],
    },
    {
      id: 'guide',
      title: 'Przewodnik po interfejsie',
      body: [
        'Krótki przewodnik prowadzi przez dźwięk, tryby i Focus, edycję, brzmienie, dostępność, wygląd, zapis i rozwój FIELD.',
        'Możesz go pominąć i wrócić później. Otwarcie pomocy nie zatrzymuje odtwarzania.',
      ],
    },
    {
      id: 'modes',
      title: 'Tryby pracy',
      body: [
        'Prosty, Techniczny i Sensoryczny pracują na tym samym dźwięku.',
        'Prosty wykańcza nagranie. Techniczny daje pełny edytor. Sensoryczny prowadzi przez odczucie. Żaden nie jest właściwszy.',
        'Focus chowa otoczenie jednego obszaru pracy, kiedy reszta ekranu rozprasza. Dźwięk zostaje.',
      ],
    },
    {
      id: 'basics',
      title: 'Podstawowe operacje',
      body: [
        'Wczytaj sample, odtwórz go, zaznacz fragment na przebiegu i przytnij albo dodaj narastanie i wygaszanie. W łańcuchu nowy efekt to „Dodaj efekt”.',
        'Przy wielu parametrach jest LFO i losowanie wartości. Chaos poszerza to losowanie. F1 wyjaśnia kontrolkę w fokusie. Dobroć Q ma już swoje objaśnienie.',
      ],
    },
    {
      id: 'access',
      title: 'Dostępność',
      body: [
        'Ustawienia → Dostępność (FIELD ACCESS) zbiera rozmiar, kontrast, fokus, ruch i sposób obsługi.',
        'Hearing rysuje dźwięk dla każdego, kto chce go zobaczyć. Dostęp słuchowy nie jest czytnikiem ekranu ani aparatem słuchowym.',
        'Czytnik ekranu zostaje w Twoim systemie. FIELD nie odczytuje przewodnika głosem sam z siebie.',
      ],
    },
    {
      id: 'look',
      title: 'Wygląd',
      body: [
        'Motyw jest w nagłówku. Dodaj tło stoi obok niego i przyjmuje JPG albo PNG na tę sesję, także wklejony przy otwartym panelu. Krycie i ziarno zostają przy obrazie.',
      ],
    },
    {
      id: 'keys',
      title: 'Skróty klawiaturowe',
      body: [
        'Poniżej są najczęstsze skróty z aktualnego rejestru. Pełna lista jest w osobnym oknie.',
        'Tab nie jest przechwytywany. Pole tekstowe dalej przyjmuje spację.',
      ],
    },
    {
      id: 'status',
      title: 'Rozwój aplikacji',
      body: [
        'FIELD jest rozwijany i testowany. Część rzeczy może się jeszcze zmienić.',
        'Jeśli coś jest niejasne albo nie działa, prześlij opinię. Nagrania nie trafiają same do chmury.',
      ],
    },
  ],
  replayWelcome: 'Pokaż wprowadzenie',
  replayTour: 'Uruchom przewodnik',
  openAccess: 'Pokaż ustawienia dostępności',
  openKeys: 'Wszystkie skróty',
  openManual: 'Podręcznik',
  openGuided: 'Zadania z przewodnikiem',
  formTitle: 'Pomóż rozwijać FIELD',
  formLead: 'FIELD jest w fazie rozwoju i testów. Twoja opinia pomoże nam stworzyć narzędzie, z którego korzysta się wygodniej.',
  formOptional: 'Nie musisz odpowiadać na wszystkie pytania.',
  qImpression: 'Jak oceniasz pierwsze wrażenie?',
  impressions: [
    { id: 'very-positive', label: 'Bardzo pozytywnie' },
    { id: 'positive', label: 'Raczej pozytywnie' },
    { id: 'neutral', label: 'Neutralnie' },
    { id: 'negative', label: 'Raczej negatywnie' },
    { id: 'very-negative', label: 'Bardzo negatywnie' },
  ],
  qEase: 'Czy łatwo było Ci rozpocząć pracę?',
  ease: [
    { id: 'yes', label: 'Tak' },
    { id: 'mostly', label: 'Raczej tak' },
    { id: 'not-really', label: 'Raczej nie' },
    { id: 'no', label: 'Nie' },
  ],
  qDifficulty: 'Co sprawiło Ci największą trudność?',
  difficultyPlaceholder: 'Np. znalezienie funkcji, zrozumienie parametru, obsługa na telefonie…',
  qAccess: 'Czy korzystasz z funkcji dostępności?',
  accessChoices: [
    { id: 'yes', label: 'Tak' },
    { id: 'no', label: 'Nie' },
    { id: 'later', label: 'Jeszcze nie, ale zamierzam' },
  ],
  qAccessNote: 'Co działa dobrze, a co można poprawić?',
  qIdeas: 'Co warto zmienić lub dodać w FIELD?',
  ideasPlaceholder: 'Opcjonalnie',
  qDevice: 'Na jakim urządzeniu korzystasz z FIELD?',
  devices: [
    { id: 'computer', label: 'Komputer' },
    { id: 'tablet', label: 'Tablet' },
    { id: 'phone', label: 'Telefon' },
    { id: 'other', label: 'Inne' },
  ],
  email: 'Adres e-mail',
  emailHint: 'Podaj adres tylko wtedy, gdy chcesz umożliwić nam odpowiedź.',
  techLabel: 'Dołącz wersję FIELD, język interfejsu i podstawowe dane przeglądarki. Bez konta i bez danych, które Cię identyfikują.',
  submit: 'Wyślij opinię',
  cancel: 'Anuluj',
  sending: 'Wysyłanie…',
  thanksTitle: 'Dziękujemy!',
  thanksBody: 'Twoja opinia została przesłana. Dzięki takim wiadomościom FIELD może stawać się coraz lepszy.',
  errorUnconfigured: 'Nie udało się wysłać opinii, bo wysyłka nie jest jeszcze włączona na tym serwerze. Odpowiedzi zostały w formularzu.',
  errorNetwork: 'Nie udało się wysłać opinii. Sprawdź połączenie i spróbuj ponownie. Odpowiedzi zostały w formularzu.',
  errorRejected: 'Serwer nie potwierdził wysłania. Odpowiedzi zostały w formularzu.',
  activationTitle: 'Sprawdź skrzynkę',
  activationBody:
    'Na skrzynkę FIELD poszła prośba o aktywację adresu, nie wypełniona opinia. Otwórz tę wiadomość i potwierdź adres. Potem wyślij formularz jeszcze raz — wtedy pojawi się potwierdzenie wysłania.',
  errorRate: 'Z tej karty wysłano już kilka opinii. Spróbuj ponownie później. Odpowiedzi zostały w formularzu.',
  errorEmpty: 'Dodaj choć jedną odpowiedź. Puste zgłoszenie nie zostanie wysłane.',
  errorEmail: 'Adres e-mail wygląda na niepełny. Możesz go poprawić albo zostawić pole puste.',
  errorLength: 'Jedna z odpowiedzi jest zbyt długa. Skróć ją i spróbuj ponownie.',
  unconfiguredNote: 'Ta kopia FIELD nie ma jeszcze włączonej wysyłki. Formularz jest gotowy, a odpowiedzi nie zapisują się w przeglądarce.',
  privacyNote: 'Odpowiedzi zostają tylko w tej karcie, dopóki ich nie wyślesz albo nie odświeżysz strony.',
  blank: '—',
  contact: 'Kontakt',
  technicalHeading: 'Dane techniczne',
  versionLabel: 'Wersja FIELD',
  localeLabel: 'Język interfejsu',
  modeLabel: 'Tryb',
  viewportLabel: 'Okno',
  browserLabel: 'Przeglądarka',
}

const en: IntroCopy = {
  welcomeTitle: 'FIELD',
  welcomeLead: 'A place to discover sound.',
  welcomeBody: [
    'You do not need to know music production, or every tool.',
    'Load a sound. Listen to it. Change something.',
    'You can work precisely, or just experiment. There is no single right way.',
    'When the screen is too busy, Focus mode keeps one workspace and hides the rest. The sound stays as it is.',
    'Start with one sound.',
  ],
  discover: 'Discover FIELD',
  start: 'Start working',
  dismiss: 'Don’t show this window at startup',
  welcomeStartup: 'Show the welcome screen at startup',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  skip: 'Skip',
  pin: 'Keep open while editing',
  unpin: 'Return to the center',
  step: (index, total) => `Step ${index} of ${total}`,
  showAccess: 'Show accessibility settings',
  sendFeedback: 'Send feedback',
  helpWord: 'Help',
  helpLabel: 'Help',
  helpMenu: 'Help',
  feedbackTooltip: 'Send feedback',
  feedbackLabel: 'Send feedback',
  tour: [
    {
      id: 'sound',
      title: 'Your sound',
      body: [
        'Everything starts with a sound.',
        'Load a recording with Load sample, drop a file on the editor, or generate the demo sample. You will see the waveform and can start listening.',
        'Field recordings, voice, music, or any other material are all fine.',
      ],
    },
    {
      id: 'modes',
      title: 'Choose a way of working',
      body: [
        'The same sound can be shaped in more than one way. No mode is better than the others.',
        'Simple is an easy place to begin. The switch is in the header.',
      ],
      points: [
        'Simple finishes a recording: trim, fade in, fade out, tone, reverb, delay, and export.',
        'Technical opens the full editor, the effect chain, and the inspector. Workspace is the default layout.',
        'Sensory shapes sound by feeling, without a mixing desk.',
        'Focus, in the corner of the picture in Technical, hides the surrounding chrome and leaves the wave, EQ, spectrum, automation, or Hearing. It helps when the rest of the interface is distracting. Leaving it restores the chrome and does not change the sound.',
      ],
    },
    {
      id: 'edit',
      title: 'A simple edit',
      body: [
        'Play and pause sit on the transport, next to stop. Drag across the waveform to select a region, then trim it or add a fade in and a fade out. In the Technical chain, a new effect is the Add effect button.',
        'Listen to the result. In Simple you can compare Original and After.',
        'The waveform is a picture of the sound over time. Taller places are a larger swing of the wave, not a full measure of loudness.',
      ],
    },
    {
      id: 'tone',
      title: 'Change the sound',
      body: [
        'One sound. Many possibilities.',
        'You can brighten it, add space, bring out detail, or change its character. Experiment, and listen to what changes.',
        'You do not need to know the parameters. F1 explains the focused control in text, and playback keeps going.',
      ],
      points: [
        'Simple: tone, reverb, and delay.',
        'Technical: EQ, filter, reverb, delay, compressor, limiter, distortion, and Mid/Side.',
        'Sensory leads by feeling. Underneath, it is the same sound.',
        'On parameters that support it, you can connect an LFO or randomize the value. The LFO center is in the header.',
        'Chaos in the header widens randomization and enables the chain safety limiter if it was bypassed. One randomization still works without Chaos. Auto Random needs Chaos.',
      ],
    },
    {
      id: 'access',
      title: 'FIELD for different people',
      body: [
        'You can make FIELD fit the way you work.',
        'Settings → Accessibility opens FIELD ACCESS. It is not a separate mode, and it does not replace a screen reader. Choose the way of working that feels comfortable.',
        'These choices last while the tab is open. A reload returns to the defaults.',
      ],
      points: [
        'Interface size and text size, larger controls, and high-visibility controls.',
        'Enhanced focus. Tab and Shift+Tab move between controls. Focus is visible even without that extra emphasis.',
        'Space plays and pauses while transport shortcuts are on. Arrow keys change a slider. Escape closes windows.',
        'Keyboard-First and Drag-Free Editing: buttons and exact values, not only a gesture.',
        'Accessible Waveform Navigation adds time and landmarks. Keyboard and screen reader access to the wave stays available when that option is off.',
        'Parameter descriptions start on. Screen reader optimizations keep extra live updates quiet. Names and values stay.',
        'F1 explains the focused control. That note is text in the app, not speech synthesis. Times are written out for a screen reader.',
        'Themes are in the header, including Black & White and the eyes-friendly Soft Slate, Warm Paper, and Dusk. More → High Contrast / Low Vision Theme.',
        'Reduced Motion also follows the system setting. Sensory Comfort calms meters, the spectrum, and decorative motion.',
        'Hearing, beside Wave, EQ, FFT, and Auto, draws the sound. It is there for anyone who wants to see a recording, not only for people whose hearing gets in the way. Hearing Access, under More, shows those same cues visually and can use device vibration. It is not a screen reader and not a hearing aid.',
      ],
    },
    {
      id: 'look',
      title: 'Look and mood',
      body: [
        'Choose a theme in the header. There are dark, light, eyes-friendly, and more graphic sets. You can save your own colors.',
        'Add background, beside the theme in the header, takes a JPG or PNG. A photo or a pattern sits behind the waveform and can recall the mood of the recording. Opacity and grain sit beside it.',
        'The image lasts for this session only and does not change the sound. With the background panel open, you can paste it.',
      ],
    },
    {
      id: 'save',
      title: 'Save the result',
      body: [
        'Export writes a WAV of the processed recording, or of the selection alone. The dialog checks sample rate, bit depth, and channels.',
        'You can keep the tail of reverb and delay, or end the file with the audio.',
        'The file is made in the browser. FIELD does not upload recordings, and it does not connect to Google Drive.',
      ],
    },
    {
      id: 'together',
      title: 'FIELD grows with the people who use it',
      body: [
        'FIELD is still being developed.',
        'It is a working app, and also a place for experiments and tests. Some things may change, and sometimes something may not behave as you expect.',
        'Your experience, ideas, and notes help FIELD grow. If something is unclear, awkward, or broken, tell us.',
      ],
    },
  ],
  helpTitle: 'Help',
  scopeLabel: 'Help scope',
  scopeContext: 'Contextual',
  scopeGeneral: 'General',
  parametersHeading: 'Parameters',
  topics: {
    simple: {
      title: 'Simple',
      body: [
        'Simple finishes a recording: trim, fades, tone, reverb, delay, and export.',
        'Original and After sit side by side. It is the same sound as the other modes, in a shorter layout.',
      ],
    },
    sensory: {
      title: 'Sensory',
      body: [
        'Sensory shapes the sound by feeling, without a mixing desk.',
        'The same sound stays underneath. The mode switch is in the header.',
      ],
    },
    wave: {
      title: 'Wave',
      body: [
        'Wave shows the recording across time. Taller parts are a larger swing of the wave, not a full measure of loudness.',
        'Drag across the waveform to select a region. You can then trim it or add a fade in and a fade out.',
      ],
      points: ['The {focus} icon in the top-right corner of the picture opens Wave Focus. The same icon leaves it. The sound, the selection, and the playhead stay.'],
    },
    'wave-focus': {
      title: 'Wave Focus',
      body: [
        'Wave Focus keeps the waveform and a small transport: play, stop, loop, and the time. The rest of the chrome is hidden.',
        'Fade handles sit below the bar. Leaving restores the chrome and does not change the sound.',
      ],
    },
    eq: {
      title: 'EQ',
      body: [
        'EQ in Workspace opens the equalizer in the inspector when an equalizer is in the chain. The graph uses the height above the transport.',
        'Each filter is one full-width row: a type and the knobs that type uses.',
      ],
      points: [
        'Double-click the EQ graph to create a bell filter at that point.',
        'Add band in the inspector adds the next filter.',
        'Drag a point on the graph, or turn a knob, to change the same parameter.',
        'The {focus} icon in the corner of the picture opens EQ Focus. The sound does not change because of that.',
      ],
    },
    'eq-focus': {
      title: 'EQ Focus',
      body: [
        'EQ Focus is the same equalizer without the surrounding chrome. It stays when the rest of the screen is distracting.',
        'Filters are listed to the left of the graph. The knobs sit in the center and float over the grid. The filter type menu is in the band header, next to the name.',
        'The same {focus} icon in the corner leaves Focus. Playback, the selection, and the playhead stay.',
      ],
      points: [
        'Double-click the graph to add a bell filter at that point.',
        'The {plus} in the band header adds a filter. Its name is Add band.',
        'Drag a point on the graph, or turn the frequency, gain, or Q knob. A type keeps only the knobs it uses.',
        'The knob indicator shows the effective value. When an LFO is on that knob, the indicator follows the motion.',
        'The {trash} in the band header turns that filter off. Its name is Delete node.',
        'Range in the {dots} menu, 60, 90, or 120 dB, is how far down the spectrum bars reach. It does not scale the EQ curve.',
      ],
    },
    fft: {
      title: 'FFT',
      body: [
        'FFT shows the spectrum of the recording. Before, After, Both, and 2D / 3D stay on the picture bar.',
        '{dots} at the end of that bar opens the analyzer settings. It measures the sound. It does not draw the EQ curve.',
      ],
      points: ['The {focus} icon in the corner opens FFT Focus. The sound does not change.'],
    },
    'fft-focus': {
      title: 'FFT Focus',
      body: [
        'FFT Focus keeps the spectrum. Analyzer settings stay under {dots} on the bar.',
        'The same {focus} icon leaves Focus and restores the chrome.',
      ],
    },
    auto: {
      title: 'Auto',
      body: [
        'Auto shows a parameter’s automation across time, on the same picture.',
        'The curve is how that value changes along the recording. The {focus} icon in the corner opens automation Focus.',
      ],
    },
    'auto-focus': {
      title: 'Automation Focus',
      body: [
        'Automation Focus keeps the parameter curve and a small transport.',
        'Leaving restores the chrome. The selection and the playhead stay.',
      ],
    },
    hearing: {
      title: 'Hearing',
      body: [
        'Hearing draws the sound beside Wave, EQ, FFT, and Auto. It is there for anyone who wants to see a recording, not only for people whose hearing gets in the way.',
        'It is not a screen reader and not a hearing aid. The {focus} icon in the corner opens Hearing Focus.',
      ],
    },
    'hearing-focus': {
      title: 'Hearing Focus',
      body: [
        'Hearing Focus keeps the sound map in the same frame as the other Focus views.',
        'Drag across the waveform to select a fragment. Releasing that drag turns the selection into the loop. A click only moves the playhead.',
        'The same {focus} icon leaves Focus and does not change the sound.',
      ],
    },
    'fx-filter': {
      title: 'Filter',
      body: [
        'Filter is its own effect in the chain, separate from the EQ.',
        'Cutoff, resonance, drive, mix, and its LFO belong to this instance. The {power} button on the tile bypasses it and does not remove it.',
      ],
    },
    'fx-grain': {
      title: 'Grain',
      body: [
        'The Grain switch in the inspector moves between ordinary playback and the grain engine.',
        'The knobs in that inspector belong to this instance. Bypass on the tile does not delete the module.',
      ],
    },
    'fx-distortion': {
      title: 'Distortion',
      body: [
        'Choose a distortion type in the inspector, then the knobs for this instance.',
        'Bypass on the tile turns the effect off without removing it from the chain.',
      ],
    },
    'fx-midside': {
      title: 'Mid/Side',
      body: [
        'Mid/Side sets the center and the sides: mid gain, side gain, rotate, and crossfeed.',
        'It is its own module, not the EQ. Bypass on the tile leaves it in the chain.',
      ],
    },
    'fx-delay': {
      title: 'Delay',
      body: [
        'Time, feedback, and wet belong to this delay instance.',
        'Kill FX cuts the delay tail without removing the module from the chain.',
      ],
    },
    'fx-reverb': {
      title: 'Reverb',
      body: [
        'This instance keeps its own size, decay, and wet mix.',
        'When Dry and Wet are linked, they are one Mix. Kill FX cuts the reverb tail and does not remove the module.',
      ],
    },
    'fx-compressor': {
      title: 'Compressor',
      body: [
        'This instance has its own threshold, ratio, attack, release, knee, and makeup.',
        'It is not the chain safety limiter. A second compressor does not share its settings.',
      ],
    },
    'fx-limiter': {
      title: 'Limiter',
      body: [
        'The limiter holds the peaks at this place in the chain.',
        'Chaos turns this limiter on if it was bypassed or missing. It does not add a second limiter.',
      ],
    },
    'fx-input': {
      title: 'Input',
      body: [
        'Input is the start of the chain. Gain, speed, and pitch shape the source before the signal reaches the effects.',
        'This is not output level and it is not track volume. Normalize is a separate action on the selection.',
      ],
    },
    'fx-output': {
      title: 'Output',
      body: [
        'Output is the last level of the instrument, after the effects.',
        'Mute silences the output and does not remove modules from the chain.',
      ],
    },
  },
  helpSections: [
    {
      id: 'intro',
      title: 'A short introduction',
      body: [
        'FIELD is a place to discover sound. You do not need every tool before you load a recording, listen, and change something.',
      ],
    },
    {
      id: 'guide',
      title: 'Interface guide',
      body: [
        'The short guide walks through sound, modes and Focus, editing, tone, accessibility, appearance, export, and how FIELD is growing.',
        'You can skip it and return later. Opening help does not stop playback.',
      ],
    },
    {
      id: 'modes',
      title: 'Ways of working',
      body: [
        'Simple, Technical, and Sensory work on the same sound.',
        'Simple finishes a recording. Technical is the full editor. Sensory leads by feeling. None of them is the right one.',
        'Focus hides the chrome around one workspace when the rest of the screen is distracting. The sound stays.',
      ],
    },
    {
      id: 'basics',
      title: 'Basic actions',
      body: [
        'Load a sample, play it, select a region on the waveform, then trim or add fades. In the chain, a new effect is Add effect.',
        'Many parameters can take an LFO or a randomized value. Chaos widens that randomization. F1 explains the focused control. Filter Q already has its explanation.',
      ],
    },
    {
      id: 'access',
      title: 'Accessibility',
      body: [
        'Settings → Accessibility (FIELD ACCESS) gathers size, contrast, focus, motion, and how you operate the controls.',
        'Hearing draws the sound for anyone who wants to see it. Hearing Access is not a screen reader and not a hearing aid.',
        'A screen reader stays in your system. FIELD does not read this guide aloud on its own.',
      ],
    },
    {
      id: 'look',
      title: 'Appearance',
      body: [
        'The theme is in the header. Add background sits beside it and takes a JPG or PNG for this session, including a paste while its panel is open. Opacity and grain stay with the image.',
      ],
    },
    {
      id: 'keys',
      title: 'Keyboard shortcuts',
      body: [
        'The shortcuts below come from the live registry. The full list opens in its own window.',
        'Tab is never captured. A text field still takes the space character.',
      ],
    },
    {
      id: 'status',
      title: 'How FIELD is growing',
      body: [
        'FIELD is in development and in testing. Some things may still change.',
        'If something is unclear or broken, send feedback. Recordings are not uploaded on their own.',
      ],
    },
  ],
  replayWelcome: 'Show the introduction',
  replayTour: 'Start the guide',
  openAccess: 'Show accessibility settings',
  openKeys: 'All shortcuts',
  openManual: 'Manual',
  openGuided: 'Guided Tasks',
  formTitle: 'Help FIELD grow',
  formLead: 'FIELD is in development and in testing. Your note helps make the tool more comfortable to use.',
  formOptional: 'You do not have to answer every question.',
  qImpression: 'How was your first impression?',
  impressions: [
    { id: 'very-positive', label: 'Very positive' },
    { id: 'positive', label: 'Mostly positive' },
    { id: 'neutral', label: 'Neutral' },
    { id: 'negative', label: 'Mostly negative' },
    { id: 'very-negative', label: 'Very negative' },
  ],
  qEase: 'Was it easy to start?',
  ease: [
    { id: 'yes', label: 'Yes' },
    { id: 'mostly', label: 'Mostly' },
    { id: 'not-really', label: 'Not really' },
    { id: 'no', label: 'No' },
  ],
  qDifficulty: 'What was most difficult?',
  difficultyPlaceholder: 'For example: finding a function, understanding a parameter, using it on a phone…',
  qAccess: 'Do you use the accessibility options?',
  accessChoices: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
    { id: 'later', label: 'Not yet, but I plan to' },
  ],
  qAccessNote: 'What works well, and what could be better?',
  qIdeas: 'What should change or be added in FIELD?',
  ideasPlaceholder: 'Optional',
  qDevice: 'Which device are you using?',
  devices: [
    { id: 'computer', label: 'Computer' },
    { id: 'tablet', label: 'Tablet' },
    { id: 'phone', label: 'Phone' },
    { id: 'other', label: 'Other' },
  ],
  email: 'Email address',
  emailHint: 'Leave an address only if you want a reply.',
  techLabel: 'Include the FIELD version, interface language, and basic browser details. No account, and nothing that identifies you.',
  submit: 'Send feedback',
  cancel: 'Cancel',
  sending: 'Sending…',
  thanksTitle: 'Thank you!',
  thanksBody: 'Your feedback was sent. Notes like this help FIELD get better.',
  errorUnconfigured: 'The note could not be sent, because delivery is not turned on for this copy of FIELD yet. Your answers are still in the form.',
  errorNetwork: 'The note could not be sent. Check the connection and try again. Your answers are still in the form.',
  errorRejected: 'The server did not confirm the send. Your answers are still in the form.',
  activationTitle: 'Check the mailbox',
  activationBody:
    'FIELD’s mailbox received an address activation request, not a filled-in note. Open that message and confirm the address. Send the form once more after that, and FIELD will show that it was sent.',
  errorRate: 'A few notes were already sent from this tab. Try again later. Your answers are still in the form.',
  errorEmpty: 'Add at least one answer. An empty note is not sent.',
  errorEmail: 'That email address looks incomplete. You can correct it, or leave the field empty.',
  errorLength: 'One of the answers is too long. Shorten it and try again.',
  unconfiguredNote: 'This copy of FIELD does not have delivery turned on yet. The form is ready, and answers are not stored in the browser.',
  privacyNote: 'Answers stay in this tab until you send them or reload the page.',
  blank: '—',
  contact: 'Contact',
  technicalHeading: 'Technical details',
  versionLabel: 'FIELD version',
  localeLabel: 'Interface language',
  modeLabel: 'Mode',
  viewportLabel: 'Window',
  browserLabel: 'Browser',
}

export function introCopy(locale: Locale): IntroCopy {
  return locale === 'pl' ? pl : en
}

export function choiceLabel<T extends string>(choices: readonly Choice<T>[], id: T | ''): string {
  if (!id) return ''
  return choices.find((choice) => choice.id === id)?.label ?? ''
}
