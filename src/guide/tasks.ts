import type { GuideStep, GuideTask, Localized, StepCompletion } from './types'

const text = (en: string, pl: string): Localized => ({ en, pl })

function step(
  id: string,
  title: Localized,
  instruction: Localized,
  extras: {
    target?: GuideStep['target']
    completion?: StepCompletion
    skippable?: boolean
    topics?: readonly string[]
    hint?: Localized | null
    why?: Localized | null
    more?: Localized | null
    advanced?: Localized | null
    success?: Localized | null
    tryThis?: Localized | null
  } = {},
): GuideStep {
  return {
    id,
    target: extras.target ?? null,
    completion: extras.completion ?? { kind: 'manual' },
    skippable: extras.skippable ?? false,
    topics: extras.topics ?? [],
    title,
    instruction,
    hint: extras.hint ?? null,
    why: extras.why ?? null,
    more: extras.more ?? null,
    advanced: extras.advanced ?? null,
    success: extras.success ?? null,
    tryThis: extras.tryThis ?? null,
  }
}

const play = (id: string, title: Localized, instruction: Localized, why: Localized): GuideStep =>
  step(id, title, instruction, {
    target: 'transport.play',
    completion: { kind: 'any', actions: ['playback.started'] },
    topics: ['waveform'],
    why,
    success: text('Done — you are listening.', 'Gotowe — słuchasz.'),
  })

export const GUIDE_TASKS: readonly GuideTask[] = [
  {
    id: 'trim-recording',
    category: 'basic',
    difficulty: 'easy',
    minutes: 3,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['transport', 'waveform', 'trim'],
    topics: ['selection', 'trim', 'waveform'],
    title: text('Trim a recording', 'Przytnij nagranie'),
    description: text(
      'Keep the part you want and leave the rest out.',
      'Zostaw fragment, którego chcesz, a resztę odetnij.',
    ),
    modeNote: text(
      'Simple keeps Trim next to the waveform. Your sound stays as it is if you switch.',
      'W Simple przycięcie jest przy fali. Po przełączeniu dźwięk zostaje, jaki jest.',
    ),
    steps: [
      play(
        'play',
        text('Play the recording', 'Odtwórz nagranie'),
        text('Press play and listen once through.', 'Naciśnij odtwarzanie i przesłuchaj raz.'),
        text('You need to hear where the useful part starts and ends.', 'Musisz usłyszeć, gdzie zaczyna się i kończy potrzebny fragment.'),
      ),
      step(
        'select',
        text('Select the part you want to keep', 'Zaznacz fragment, który zostaje'),
        text('Drag across the waveform. Cover only the part you want to keep.', 'Przeciągnij po fali. Obejmij tylko fragment, który chcesz zostawić.'),
        {
          target: 'waveform.main',
          completion: { kind: 'any', actions: ['selection.created'] },
          topics: ['selection', 'waveform'],
          hint: text('The edges of the highlight are the start and the end.', 'Krawędzie zaznaczenia to początek i koniec.'),
          why: text('Trim uses this range. Nothing is deleted until you trim.', 'Przycięcie używa tego zakresu. Nic nie znika, dopóki nie przytniesz.'),
          more: text('You can drag the edges again if the range is too long or too short.', 'Możesz znowu pociągnąć krawędzie, jeśli zakres jest za długi albo za krótki.'),
          success: text('Done — a range is selected.', 'Gotowe — zakres jest zaznaczony.'),
        },
      ),
      step(
        'trim',
        text('Trim to the selected region', 'Przytnij do zaznaczenia'),
        text('Press Trim. FIELD keeps the selection and removes the audio outside it.', 'Naciśnij Przytnij. FIELD zostawia zaznaczenie i usuwa audio poza nim.'),
        {
          target: 'edit.trim',
          completion: { kind: 'any', actions: ['trim.completed'] },
          topics: ['trim', 'selection'],
          why: text('Trimming is how a long recording becomes the piece you meant to keep.', 'Przycięcie zamienia długie nagranie w kawałek, który chciałeś zostawić.'),
          more: text('What is trimming? It crops time. It does not change tone, reverb, or level.', 'Czym jest przycięcie? Obcina czas. Nie zmienia barwy, pogłosu ani poziomu.'),
          advanced: text('The working buffer is replaced by the rendered region. Undo can bring the previous buffer back.', 'Roboczy bufor zastępuje wyrenderowany region. Cofnięcie może przywrócić poprzedni bufor.'),
          success: text('Done — the recording is trimmed.', 'Gotowe — nagranie jest przycięte.'),
        },
      ),
      play(
        'listen',
        text('Listen to the result', 'Posłuchaj wyniku'),
        text('Press play again. You should hear the part you kept.', 'Naciśnij odtwarzanie jeszcze raz. Powinieneś usłyszeć fragment, który zostawiłeś.'),
        text('Hearing the edit is how you know the cut is right.', 'Słuchanie edycji mówi, czy cięcie jest dobre.'),
      ),
      step(
        'explain',
        text('What trimming does', 'Co robi przycięcie'),
        text('Trim keeps a time range and drops the rest. It does not fade the edges for you.', 'Przycięcie zostawia zakres czasu i odrzuca resztę. Samo nie wygładza krawędzi.'),
        {
          skippable: true,
          topics: ['trim'],
          why: text('A click at the new start or end is a hard edge, not a bad trim.', 'Klik na nowym początku albo końcu to twarda krawędź, nie złe przycięcie.'),
          more: text('The next useful edit is often a short fade on those edges.', 'Następną użyteczną edycją jest często krótkie zanikanie na tych krawędziach.'),
        },
      ),
    ],
  },
  {
    id: 'smooth-edges',
    category: 'basic',
    difficulty: 'easy',
    minutes: 4,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['waveform', 'fade', 'transport'],
    topics: ['fade', 'waveform'],
    title: text('Make a smooth start and end', 'Zrób łagodny początek i koniec'),
    description: text(
      'Soften the edges so the recording does not click.',
      'Złagodź krawędzie, żeby nagranie nie klikało.',
    ),
    modeNote: text(
      'Simple shows fade in and fade out as curves beside the wave.',
      'Simple pokazuje fade in i fade out jako krzywe obok fali.',
    ),
    steps: [
      step(
        'start',
        text('Look at the beginning', 'Spójrz na początek'),
        text('Find the start of the waveform. A steep edge can click when playback begins.', 'Znajdź początek fali. Stroma krawędź może kliknąć, gdy odtwarzanie rusza.'),
        {
          target: 'waveform.main',
          topics: ['fade', 'waveform'],
          why: text('A click is a sudden jump in the signal, often at a cut.', 'Klik to nagły skok sygnału, często na cięciu.'),
          more: text('The same thing can happen at the end if the wave stops in the middle of a swing.', 'To samo może stać się na końcu, gdy fala urywa się w połowie wychylenia.'),
        },
      ),
      step(
        'fade-in',
        text('Apply fade in', 'Dodaj fade in'),
        text('Choose a fade in longer than none. Short is a good first try.', 'Wybierz fade in dłuższy niż brak. Krótki to dobry pierwszy krok.'),
        {
          target: 'edit.fadeIn',
          completion: { kind: 'any', actions: ['fade.in'] },
          topics: ['fade'],
          why: text('Fade in rises from silence, so the start does not jump.', 'Fade in narasta od ciszy, więc początek nie skacze.'),
          success: text('Done — fade in is on.', 'Gotowe — fade in jest włączony.'),
          tryThis: text('If the start still feels abrupt, choose a longer curve and play it.', 'Jeśli początek nadal jest ostry, wybierz dłuższą krzywą i odtwórz.'),
        },
      ),
      step(
        'fade-out',
        text('Apply fade out', 'Dodaj fade out'),
        text('Choose a fade out at the end. Short or medium both work.', 'Wybierz fade out na końcu. Krótki albo średni, oba są dobre.'),
        {
          target: 'edit.fadeOut',
          completion: { kind: 'any', actions: ['fade.out'] },
          topics: ['fade'],
          why: text('Fade out falls to silence, so the ending does not stop dead.', 'Fade out opada do ciszy, więc koniec nie urywa się nagle.'),
          success: text('Done — fade out is on.', 'Gotowe — fade out jest włączony.'),
        },
      ),
      step(
        'listen',
        text('Listen and compare', 'Posłuchaj i porównaj'),
        text('Play the recording. If Original and After are available, switch them and listen again.', 'Odtwórz nagranie. Jeśli są Oryginał i Po, przełącz je i posłuchaj jeszcze raz.'),
        {
          target: 'transport.compare',
          completion: { kind: 'any', actions: ['playback.started', 'compare.used'] },
          topics: ['fade'],
          success: text('Done — you compared the edge.', 'Gotowe — porównałeś krawędź.'),
        },
      ),
    ],
  },
  {
    id: 'adjust-volume',
    category: 'basic',
    difficulty: 'easy',
    minutes: 3,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['transport', 'gain'],
    topics: ['gain', 'decibels', 'clipping'],
    title: text('Adjust volume', 'Ustaw głośność'),
    description: text(
      'Make the recording quieter or louder with Gain.',
      'Zrób nagranie ciszej albo głośniej za pomocą Gain.',
    ),
    modeNote: text(
      'In Simple, Gain is under Sound, in Level. The guide will not move it for you.',
      'W Simple Gain jest w Dźwięk, w sekcji Poziom. Prowadzenie samo go nie ruszy.',
    ),
    steps: [
      play(
        'play',
        text('Play the recording', 'Odtwórz nagranie'),
        text('Listen to the level you have now.', 'Posłuchaj poziomu, który masz teraz.'),
        text('You need a memory of the current level before you change it.', 'Potrzebujesz pamięci obecnego poziomu, zanim go zmienisz.'),
      ),
      step(
        'find',
        text('Find Gain', 'Znajdź Gain'),
        text('Open Sound and find Gain. It is the level control, in decibels.', 'Otwórz Dźwięk i znajdź Gain. To kontrolka poziomu, w decybelach.'),
        {
          target: 'input.gain',
          topics: ['gain', 'decibels'],
          why: text('Gain changes signal level. It is the direct volume control.', 'Gain zmienia poziom sygnału. To bezpośrednia kontrolka głośności.'),
          more: text('dB is the scale. A higher number is louder. A lower number is quieter.', 'dB to skala. Wyższa liczba jest głośniejsza. Niższa jest cichsza.'),
        },
      ),
      step(
        'change',
        text('Change Gain', 'Zmień Gain'),
        text('Move Gain a little. Louder or quieter is your choice. Do not push it until the sound breaks.', 'Przesuń Gain odrobinę. Głośniej albo ciszej, jak wolisz. Nie podnoś, aż dźwięk się złamie.'),
        {
          target: 'input.gain',
          completion: { kind: 'any', actions: ['gain.changed'] },
          topics: ['gain', 'decibels', 'clipping'],
          why: text('A small change is easier to judge than a huge one.', 'Małą zmianę łatwiej ocenić niż ogromną.'),
          more: text('If the top of the sound flattens or crackles, that is clipping. Ease the gain down. The spare room under the ceiling is headroom.', 'Jeśli szczyt dźwięku się spłaszcza albo trzeszczy, to przesterowanie. Zmniejsz gain. Zapas pod sufitem to headroom.'),
          advanced: text('Gain does not raise perceived loudness in a simple straight line. +6 dB is about twice the amplitude.', 'Gain nie podnosi odczuwanej głośności w prostej linii. +6 dB to około dwa razy większa amplituda.'),
          success: text('Done — Gain moved.', 'Gotowe — Gain się przesunął.'),
          tryThis: text('Move it up, listen, then move it back down and listen again.', 'Podnieś, posłuchaj, potem obniż i posłuchaj jeszcze raz.'),
        },
      ),
      step(
        'compare',
        text('Compare the result', 'Porównaj wynik'),
        text('Play again. Use Original and After if you want the uneffected level beside this one.', 'Odtwórz jeszcze raz. Użyj Oryginał i Po, jeśli chcesz zestawić poziom bez efektu z tym.'),
        {
          target: 'transport.compare',
          completion: { kind: 'any', actions: ['playback.started', 'compare.used'] },
          topics: ['gain'],
          success: text('Done — you heard the new level.', 'Gotowe — usłyszałeś nowy poziom.'),
        },
      ),
    ],
  },
  {
    id: 'prepare-export',
    category: 'basic',
    difficulty: 'moderate',
    minutes: 6,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['waveform', 'trim', 'fade', 'gain', 'export'],
    topics: ['selection', 'trim', 'fade', 'gain', 'export'],
    title: text('Prepare a sample for export', 'Przygotuj sample do eksportu'),
    description: text(
      'Choose the region, tidy the edges and level, then write a file.',
      'Wybierz region, uporządkuj krawędzie i poziom, potem zapisz plik.',
    ),
    modeNote: text(
      'Simple export writes the current result, including trim, fades, tone, reverb, and delay.',
      'Eksport w Simple zapisuje bieżący wynik, razem z przycięciem, zanikami, barwą, pogłosem i delay.',
    ),
    steps: [
      step(
        'select',
        text('Select the useful region', 'Zaznacz potrzebny region'),
        text('Drag the part that should be in the file.', 'Przeciągnij fragment, który ma być w pliku.'),
        {
          target: 'waveform.main',
          completion: { kind: 'any', actions: ['selection.created'] },
          skippable: true,
          topics: ['selection'],
          hint: text('Skip this if the whole recording should stay.', 'Pomiń, jeśli ma zostać całe nagranie.'),
          success: text('Done — the region is set.', 'Gotowe — region jest ustawiony.'),
        },
      ),
      step(
        'trim',
        text('Trim if you need to', 'Przytnij, jeśli trzeba'),
        text('Press Trim only if audio outside the selection should leave the file.', 'Naciśnij Przytnij tylko wtedy, gdy audio poza zaznaczeniem ma zniknąć z pliku.'),
        {
          target: 'edit.trim',
          completion: { kind: 'any', actions: ['trim.completed'] },
          skippable: true,
          topics: ['trim'],
          hint: text('Skip if you already like the length.', 'Pomiń, jeśli długość już jest dobra.'),
          success: text('Done — trimmed.', 'Gotowe — przycięte.'),
        },
      ),
      step(
        'fades',
        text('Apply fades', 'Dodaj zanikanie'),
        text('Add a fade in and a fade out so the file does not click at the edges.', 'Dodaj fade in i fade out, żeby plik nie klikał na krawędziach.'),
        {
          target: 'edit.fadeIn',
          completion: { kind: 'all', actions: ['fade.in', 'fade.out'] },
          topics: ['fade'],
          hint: text('Set fade out as well. The outline moves there when fade in is done.', 'Ustaw też fade out. Obrys przejdzie tam, gdy fade in będzie gotowy.'),
          success: text('Done — both fades are in.', 'Gotowe — oba zaniki są.'),
        },
      ),
      step(
        'level',
        text('Check the level', 'Sprawdź poziom'),
        text('Look at Gain. If the recording is too quiet or too hot, move it. Leave a little room under the top.', 'Spójrz na Gain. Jeśli nagranie jest za ciche albo za ostre, przesuń go. Zostaw trochę miejsca pod szczytem.'),
        {
          target: 'input.gain',
          topics: ['gain', 'decibels', 'clipping'],
          why: text('Export keeps the level you hear. Clipping in the file stays in the file.', 'Eksport zachowuje poziom, który słyszysz. Przesterowanie w pliku zostaje w pliku.'),
          more: text('Headroom is unused space before 0 dB. This step does not normalize the audio.', 'Headroom to wolne miejsce przed 0 dB. Ten krok nie normalizuje audio.'),
        },
      ),
      step(
        'open',
        text('Open Export', 'Otwórz eksport'),
        text('Press Export. The dialog is the existing FIELD export, not a new one.', 'Naciśnij Eksport. Okno to istniejący eksport FIELD, nie nowy.'),
        {
          target: 'export.open',
          completion: { kind: 'any', actions: ['export.opened'] },
          topics: ['export'],
          success: text('Done — Export is open.', 'Gotowe — eksport jest otwarty.'),
        },
      ),
      step(
        'write',
        text('Export the audio', 'Wyeksportuj audio'),
        text('Write the file. This saves the processed sound you have now.', 'Zapisz plik. To zapisuje przetworzony dźwięk, który masz teraz.'),
        {
          target: 'export.confirm',
          completion: { kind: 'any', actions: ['export.completed'] },
          topics: ['export'],
          why: text('The browser project stays. The file is a copy of the result.', 'Projekt w przeglądarce zostaje. Plik jest kopią wyniku.'),
          success: text('Done — the file was written.', 'Gotowe — plik został zapisany.'),
        },
      ),
    ],
  },
  {
    id: 'speech-clearer',
    category: 'improve',
    difficulty: 'easy',
    minutes: 4,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['transport', 'eq'],
    topics: ['frequency', 'eq'],
    title: text('Make speech clearer', 'Zrób mowę wyraźniejszą'),
    description: text(
      'Shift the tone so words are easier to hear.',
      'Przesuń barwę, żeby słowa było łatwiej usłyszeć.',
    ),
    modeNote: text(
      'Simple has a Clearer sound character. It uses the existing EQ. It does not erase noise.',
      'Simple ma charakter Wyraźniej. Używa istniejącego EQ. Nie wymazuje szumu.',
    ),
    steps: [
      play(
        'listen',
        text('Listen to the original', 'Posłuchaj oryginału'),
        text('Play the speech once and notice what feels muddy or dull.', 'Odtwórz mowę raz i zauważ, co brzmi mulisto albo matowo.'),
        text('You need a before, so the change has something to compare with.', 'Potrzebujesz stanu przed, żeby zmiana miała się z czym porównać.'),
      ),
      step(
        'find',
        text('Find the clarity controls', 'Znajdź kontrolki wyrazistości'),
        text('Open Sound. Clearer is the character for speech. Softer is the opposite direction.', 'Otwórz Dźwięk. Wyraźniej to charakter do mowy. Miękko idzie w drugą stronę.'),
        {
          target: 'sound.clarity',
          topics: ['eq', 'frequency'],
          why: text('Low rumble can mask words. A little presence helps consonants.', 'Niski pomruk może maskować słowa. Odrobina prezencji pomaga spółgłoskom.'),
        },
      ),
      step(
        'choose',
        text('Choose Clearer', 'Wybierz Wyraźniej'),
        text('Select Clearer. In Technical, an EQ move that lifts presence does the same job.', 'Wybierz Wyraźniej. W Technical ruch EQ, który podnosi prezencję, robi tę samą robotę.'),
        {
          target: 'sound.clarity',
          completion: { kind: 'any', actions: ['eq.clarity', 'eq.changed'] },
          topics: ['eq', 'frequency'],
          why: text('EQ changes frequency balance. It does not remove all noise.', 'EQ zmienia balans częstotliwości. Nie usuwa całego szumu.'),
          more: text('Low frequencies are the deep body. Mids carry the voice. Presence is the upper middle, where speech detail sits.', 'Niskie częstotliwości to głębokie ciało. Środek niesie głos. Prezencja to górny środek, gdzie siedzi szczegół mowy.'),
          advanced: text('The Clearer preset eases a low-mid band and lifts a band near 2.8 kHz. Amount scales that move.', 'Preset Wyraźniej ścisza pasmo niskiego środka i podnosi pasmo koło 2,8 kHz. Ilość skaluje ten ruch.'),
          success: text('Done — the tone shifted toward clarity.', 'Gotowe — barwa przesunęła się ku wyrazistości.'),
        },
      ),
      step(
        'compare',
        text('Compare before and after', 'Porównaj przed i po'),
        text('Use Original and After, or play again and listen for the words.', 'Użyj Oryginał i Po albo odtwórz jeszcze raz i słuchaj słów.'),
        {
          target: 'transport.compare',
          completion: { kind: 'any', actions: ['compare.used', 'playback.started'] },
          topics: ['eq'],
          success: text('Done — you compared the tone.', 'Gotowe — porównałeś barwę.'),
          tryThis: text('Switch to Original, listen, then back to After.', 'Przełącz na Oryginał, posłuchaj, potem wróć na Po.'),
        },
      ),
    ],
  },
  {
    id: 'warmth-brightness',
    category: 'improve',
    difficulty: 'easy',
    minutes: 4,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['transport', 'eq'],
    topics: ['frequency', 'eq'],
    title: text('Add warmth or brightness', 'Dodaj ciepło albo jasność'),
    description: text(
      'Tilt the tone darker and rounder, or brighter.',
      'Przechyl barwę w ciemniejszą i okrąglejszą albo w jaśniejszą.',
    ),
    modeNote: text(
      'Simple characters Warmer and Brighter are the easy path. Technical EQ is the same processor in more detail.',
      'Charaktery Cieplej i Jaśniej w Simple to prosta droga. EQ w Technical to ten sam procesor, dokładniej.',
    ),
    steps: [
      play(
        'listen',
        text('Listen to the original', 'Posłuchaj oryginału'),
        text('Notice if the sound feels thin, harsh, or dull.', 'Zauważ, czy dźwięk jest cienki, ostry albo matowy.'),
        text('The comparison only works if you remember the start.', 'Porównanie działa tylko wtedy, gdy pamiętasz początek.'),
      ),
      step(
        'find',
        text('Find the tone controls', 'Znajdź kontrolki barwy'),
        text('Open Sound. Warmer adds body and eases the sharp top. Brighter adds treble.', 'Otwórz Dźwięk. Cieplej dodaje ciało i łagodzi ostrą górę. Jaśniej dodaje wysokie.'),
        {
          target: 'sound.warmth',
          topics: ['frequency', 'eq'],
          why: text('Bass, midrange, and treble are the three broad ranges you are balancing.', 'Bas, środek i góra to trzy szerokie zakresy, które równoważysz.'),
        },
      ),
      step(
        'choose',
        text('Choose a character', 'Wybierz charakter'),
        text('Pick Warmer or Brighter. Any real EQ move in Technical counts too.', 'Wybierz Cieplej albo Jaśniej. Prawdziwy ruch EQ w Technical też się liczy.'),
        {
          target: 'sound.warmth',
          completion: { kind: 'any', actions: ['eq.tone', 'eq.changed'] },
          topics: ['eq', 'frequency'],
          success: text('Done — the balance changed.', 'Gotowe — balans się zmienił.'),
          tryThis: text('Try the other character too, then return to the one you prefer.', 'Spróbuj też drugiego charakteru, potem wróć do tego, który wolisz.'),
        },
      ),
      step(
        'compare',
        text('Compare before and after', 'Porównaj przed i po'),
        text('Use Original and After, then play.', 'Użyj Oryginał i Po, potem odtwórz.'),
        {
          target: 'transport.compare',
          completion: { kind: 'any', actions: ['compare.used', 'playback.started'] },
          topics: ['eq'],
          success: text('Done — you heard the difference.', 'Gotowe — usłyszałeś różnicę.'),
        },
      ),
    ],
  },
  {
    id: 'add-space',
    category: 'creative',
    difficulty: 'easy',
    minutes: 5,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['transport', 'reverb'],
    topics: ['reverb'],
    title: text('Add space to a sound', 'Dodaj przestrzeń do dźwięku'),
    description: text(
      'Put the sound in a room, using the reverb that is already in FIELD.',
      'Umieść dźwięk w pomieszczeniu, używając pogłosu, który już jest w FIELD.',
    ),
    modeNote: text(
      'Effects in Simple holds Reverb. It is the existing reverb, not a new one.',
      'Efekty w Simple mają pogłos. To istniejący pogłos, nie nowy.',
    ),
    steps: [
      play(
        'listen',
        text('Listen to the original', 'Posłuchaj oryginału'),
        text('Play the dry sound once, with no room on it.', 'Odtwórz raz suchy dźwięk, bez pomieszczenia.'),
        text('Space is easier to hear when you know the dry version.', 'Przestrzeń łatwiej usłyszeć, gdy znasz suchą wersję.'),
      ),
      step(
        'find',
        text('Find Reverb', 'Znajdź pogłos'),
        text('Open Effects and find Reverb.', 'Otwórz Efekty i znajdź pogłos.'),
        {
          target: 'effect.reverb',
          topics: ['reverb'],
          why: text('Reverb is the room. Delay, next door, is a separate echo.', 'Pogłos to pomieszczenie. Delay obok to osobne echo.'),
        },
      ),
      step(
        'enable',
        text('Turn Reverb on', 'Włącz pogłos'),
        text('Enable Reverb. FIELD will not enable it for you.', 'Włącz pogłos. FIELD nie włączy go za ciebie.'),
        {
          target: 'effect.reverb',
          completion: { kind: 'any', actions: ['reverb.enabled'] },
          topics: ['reverb'],
          success: text('Done — Reverb is on.', 'Gotowe — pogłos jest włączony.'),
        },
      ),
      step(
        'space',
        text('Choose a moderate room', 'Wybierz umiarkowany pokój'),
        text('Choose Medium. Small is closer. Large is a bigger hall. Medium is the moderate one.', 'Wybierz Średni. Mały jest bliżej. Duży to większa sala. Średni jest umiarkowany.'),
        {
          target: 'effect.reverb',
          completion: { kind: 'any', actions: ['reverb.shaped'] },
          topics: ['reverb'],
          why: text('Size and decay decide how big the room feels and how long it hangs.', 'Rozmiar i decay decydują, jak duży wydaje się pokój i jak długo wisi.'),
          more: text('Reflections are the bounces off walls. Decay is how long they take to die.', 'Odbicia to odbicia od ścian. Decay to czas, w jakim gasną.'),
          success: text('Done — a room size is chosen.', 'Gotowe — rozmiar pokoju jest wybrany.'),
        },
      ),
      step(
        'amount',
        text('Adjust the amount', 'Ustaw ilość'),
        text('Move Amount. More room, or less, until the dry sound is still clear.', 'Przesuń Ilość. Więcej pokoju albo mniej, aż suchy dźwięk nadal jest czysty.'),
        {
          target: 'effect.reverb',
          completion: { kind: 'any', actions: ['reverb.amount'] },
          topics: ['reverb'],
          why: text('Amount is the wet and dry balance: how much room sits beside the original.', 'Ilość to balans wet i dry: ile pokoju stoi obok oryginału.'),
          success: text('Done — the amount changed.', 'Gotowe — ilość się zmieniła.'),
          tryThis: text('Raise the amount and listen. Then lower it and listen again.', 'Podnieś ilość i posłuchaj. Potem obniż i posłuchaj jeszcze raz.'),
        },
      ),
      step(
        'compare',
        text('Compare before and after', 'Porównaj przed i po'),
        text('Switch Original and After, or play the result.', 'Przełącz Oryginał i Po albo odtwórz wynik.'),
        {
          target: 'transport.compare',
          completion: { kind: 'any', actions: ['compare.used', 'playback.started'] },
          topics: ['reverb'],
          success: text('Done — you heard the space.', 'Gotowe — usłyszałeś przestrzeń.'),
        },
      ),
    ],
  },
  {
    id: 'create-echo',
    category: 'creative',
    difficulty: 'easy',
    minutes: 5,
    preferredMode: 'simple',
    requiresSample: true,
    capabilities: ['transport', 'delay'],
    topics: ['delay'],
    title: text('Create an echo', 'Zrób echo'),
    description: text(
      'Add a repeat with the delay that is already in FIELD.',
      'Dodaj powtórzenie delayem, który już jest w FIELD.',
    ),
    modeNote: text(
      'Effects in Simple holds Delay. Enabling it does not change EQ or reverb.',
      'Efekty w Simple mają Delay. Włączenie go nie zmienia EQ ani pogłosu.',
    ),
    steps: [
      play(
        'listen',
        text('Listen to the original', 'Posłuchaj oryginału'),
        text('Play once so you know the sound before the repeats.', 'Odtwórz raz, żeby znać dźwięk przed powtórzeniami.'),
        text('Echo is a copy arriving later. The dry hit has to be familiar first.', 'Echo to kopia, która przychodzi później. Suche uderzenie musi być najpierw znajome.'),
      ),
      step(
        'find',
        text('Find Delay', 'Znajdź Delay'),
        text('Open Effects and find Delay.', 'Otwórz Efekty i znajdź Delay.'),
        {
          target: 'effect.delay',
          topics: ['delay'],
          why: text('Delay repeats. Reverb washes. They are different.', 'Delay powtarza. Pogłos rozmywa. To coś innego.'),
        },
      ),
      step(
        'enable',
        text('Turn Delay on', 'Włącz Delay'),
        text('Enable Delay.', 'Włącz Delay.'),
        {
          target: 'effect.delay',
          completion: { kind: 'any', actions: ['delay.enabled'] },
          topics: ['delay'],
          success: text('Done — Delay is on.', 'Gotowe — Delay jest włączony.'),
        },
      ),
      step(
        'length',
        text('Choose a short or medium echo', 'Wybierz krótkie albo średnie echo'),
        text('Short is a quick repeat. Medium is a little longer. Long is optional. You do not need an extreme setting.', 'Krótki to szybkie powtórzenie. Średni jest trochę dłuższy. Długi jest opcjonalny. Nie potrzebujesz skrajnego ustawienia.'),
        {
          target: 'effect.delay',
          completion: { kind: 'any', actions: ['delay.shaped'] },
          topics: ['delay'],
          why: text('Delay time is the gap before you hear the copy.', 'Czas delay to odstęp, zanim usłyszysz kopię.'),
          more: text('Feedback is how much of that copy is sent back to echo again. Simple keeps it gentle.', 'Feedback to, ile tej kopii wraca, żeby znowu echo. Simple trzyma to łagodnie.'),
          success: text('Done — an echo length is set.', 'Gotowe — długość echa jest ustawiona.'),
        },
      ),
      step(
        'amount',
        text('Adjust the amount', 'Ustaw ilość'),
        text('Move Amount until the repeat is audible and the original is still in front.', 'Przesuń Ilość, aż powtórzenie słychać, a oryginał nadal jest z przodu.'),
        {
          target: 'effect.delay',
          completion: { kind: 'any', actions: ['delay.amount'] },
          topics: ['delay'],
          why: text('Amount is the mix: how loud the echoes are next to the dry sound.', 'Ilość to miks: jak głośne są echa obok suchego dźwięku.'),
          success: text('Done — the echo level changed.', 'Gotowe — poziom echa się zmienił.'),
          tryThis: text('Raise the amount, listen, then lower it and listen again.', 'Podnieś ilość, posłuchaj, potem obniż i posłuchaj jeszcze raz.'),
        },
      ),
      step(
        'compare',
        text('Compare', 'Porównaj'),
        text('Use Original and After, or play the echo.', 'Użyj Oryginał i Po albo odtwórz echo.'),
        {
          target: 'transport.compare',
          completion: { kind: 'any', actions: ['compare.used', 'playback.started'] },
          topics: ['delay'],
          success: text('Done — you heard the repeats.', 'Gotowe — usłyszałeś powtórzenia.'),
        },
      ),
    ],
  },
  {
    id: 'transform-sound',
    category: 'creative',
    difficulty: 'moderate',
    minutes: 5,
    preferredMode: 'technical',
    requiresSample: true,
    capabilities: ['transport', 'speed', 'pitch', 'reverse'],
    topics: ['speed', 'pitch', 'reverse'],
    title: text('Transform a sound', 'Przekształć dźwięk'),
    description: text(
      'Change speed, pitch, and direction. Any amount is enough.',
      'Zmień szybkość, wysokość i kierunek. Wystarczy dowolna wielkość.',
    ),
    modeNote: text(
      'Speed, pitch, and reverse live on the input in Technical. Switching does not replace the sample.',
      'Szybkość, wysokość i odwrócenie są na wejściu w Technical. Przełączenie nie podmienia sampla.',
    ),
    steps: [
      play(
        'listen',
        text('Listen to the original', 'Posłuchaj oryginału'),
        text('Play the sound as it is.', 'Odtwórz dźwięk taki, jaki jest.'),
        text('Speed, pitch, and reverse each change a different thing.', 'Szybkość, wysokość i odwrócenie zmieniają coś innego.'),
      ),
      step(
        'find-speed',
        text('Find Speed', 'Znajdź szybkość'),
        text('Open the input controls and find Speed.', 'Otwórz kontrolki wejścia i znajdź szybkość.'),
        {
          target: 'input.speed',
          topics: ['speed'],
          why: text('Speed changes how fast the recording plays, and how long it lasts.', 'Szybkość zmienia, jak szybko nagranie gra i jak długo trwa.'),
        },
      ),
      step(
        'speed',
        text('Change Speed a little', 'Zmień szybkość odrobinę'),
        text('Move Speed. A small step is enough. There is no target number.', 'Przesuń szybkość. Mały krok wystarcza. Nie ma docelowej liczby.'),
        {
          target: 'input.speed',
          completion: { kind: 'any', actions: ['speed.changed'] },
          topics: ['speed'],
          success: text('Done — speed changed.', 'Gotowe — szybkość się zmieniła.'),
          tryThis: text('Play it faster, then slower, and leave it where you like.', 'Odtwórz szybciej, potem wolniej i zostaw tam, gdzie ci pasuje.'),
        },
      ),
      step(
        'pitch',
        text('Change Pitch', 'Zmień wysokość'),
        text('Move Pitch up or down a little. Pitch moves the note. It is not the same as speed.', 'Przesuń wysokość trochę w górę albo w dół. Wysokość przesuwa nutę. To nie to samo co szybkość.'),
        {
          target: 'input.pitch',
          completion: { kind: 'any', actions: ['pitch.changed'] },
          topics: ['pitch', 'speed'],
          why: text('Pitch is how high the tone sits. Speed is how fast time passes.', 'Wysokość to, jak wysoko leży ton. Szybkość to, jak szybko płynie czas.'),
          success: text('Done — pitch changed.', 'Gotowe — wysokość się zmieniła.'),
        },
      ),
      step(
        'reverse',
        text('Try Reverse', 'Spróbuj odwrócenia'),
        text('Switch direction to reverse, then play. Switch back when you want forward again.', 'Przełącz kierunek na odwrócenie, potem odtwórz. Wróć, gdy znowu chcesz do przodu.'),
        {
          target: 'input.reverse',
          completion: { kind: 'any', actions: ['reverse.changed'] },
          topics: ['reverse'],
          why: text('Reverse flips time. Attacks trail off instead of striking.', 'Odwrócenie przewraca czas. Ataki wybrzmiewają zamiast uderzać.'),
          success: text('Done — direction changed.', 'Gotowe — kierunek się zmienił.'),
        },
      ),
      play(
        'listen-after',
        text('Listen to the result', 'Posłuchaj wyniku'),
        text('Play once more and notice which change you actually hear.', 'Odtwórz jeszcze raz i zauważ, którą zmianę naprawdę słyszysz.'),
        text('Hearing them apart is the point of the experiment.', 'Rozróżnienie ich uchem jest sensem tego ćwiczenia.'),
      ),
    ],
  },
  {
    id: 'understand-waveform',
    category: 'understand',
    difficulty: 'easy',
    minutes: 4,
    preferredMode: 'any',
    requiresSample: true,
    capabilities: ['waveform', 'transport'],
    topics: ['waveform', 'amplitude', 'selection'],
    title: text('Understand the waveform', 'Zrozumieć falę'),
    description: text(
      'Read time, amplitude, hits, quiet, the selection, and the playhead.',
      'Odczytaj czas, amplitudę, uderzenia, ciszę, zaznaczenie i głowicę.',
    ),
    modeNote: null,
    steps: [
      step(
        'time',
        text('Time runs left to right', 'Czas biegnie od lewej do prawej'),
        text('Look along the waveform. The left side is earlier. The right side is later.', 'Popatrz wzdłuż fali. Lewa strona jest wcześniej. Prawa jest później.'),
        {
          target: 'waveform.main',
          topics: ['waveform'],
          why: text('The horizontal axis is time, not pitch and not loudness.', 'Oś pozioma to czas, nie wysokość i nie głośność.'),
          more: text('A longer recording is a longer drawing, unless the view is zoomed.', 'Dłuższe nagranie to dłuższy rysunek, chyba że widok jest przybliżony.'),
        },
      ),
      step(
        'amplitude',
        text('Height is amplitude', 'Wysokość to amplituda'),
        text('Click the waveform. Tall parts swing further. Flat parts are quiet. Height is not the whole of loudness.', 'Kliknij falę. Wysokie fragmenty wychylają się dalej. Płaskie są ciche. Wysokość nie jest całą głośnością.'),
        {
          target: 'waveform.main',
          completion: { kind: 'any', actions: ['waveform.touched'] },
          topics: ['amplitude', 'waveform'],
          why: text('The vertical direction is how far the signal moves from silence.', 'Kierunek pionowy to, jak daleko sygnał odchodzi od ciszy.'),
          advanced: text('Perceived loudness also depends on frequency and duration. Do not read the picture as a loudness meter.', 'Odczuwana głośność zależy też od częstotliwości i czasu. Nie czytaj rysunku jak miernika głośności.'),
          success: text('Done — you touched the waveform.', 'Gotowe — dotknąłeś fali.'),
        },
      ),
      step(
        'transients',
        text('Hits and quiet', 'Uderzenia i cisza'),
        text('Find a sharp spike. That is a transient, a fast attack. Find a low flat stretch. That is a quiet region.', 'Znajdź ostry szpic. To transjent, szybki atak. Znajdź niski płaski odcinek. To cichy region.'),
        {
          target: 'waveform.main',
          topics: ['waveform', 'amplitude'],
          why: text('Transients are short and tall. Quiet regions sit near the center line.', 'Transjenty są krótkie i wysokie. Ciche regiony leżą blisko linii środka.'),
        },
      ),
      step(
        'selection',
        text('Make a selection', 'Zrób zaznaczenie'),
        text('Drag across a short piece of the waveform. That range is the selection.', 'Przeciągnij po krótkim kawałku fali. Ten zakres to zaznaczenie.'),
        {
          target: 'waveform.main',
          completion: { kind: 'any', actions: ['selection.created'] },
          topics: ['selection'],
          success: text('Done — a selection exists.', 'Gotowe — zaznaczenie istnieje.'),
        },
      ),
      step(
        'playhead',
        text('Watch the playhead', 'Obserwuj głowicę'),
        text('Press play. The moving line is the playhead. It shows where time is now.', 'Naciśnij odtwarzanie. Ruchoma linia to głowica. Pokazuje, gdzie jest czas teraz.'),
        {
          target: 'transport.play',
          completion: { kind: 'any', actions: ['playback.started'] },
          topics: ['waveform'],
          success: text('Done — the playhead is moving.', 'Gotowe — głowica się rusza.'),
        },
      ),
      step(
        'loudness',
        text('Height is not loudness', 'Wysokość to nie głośność'),
        text('A taller wave can be a stronger signal. It is still not a full picture of how loud the sound feels.', 'Wyższa fala może być silniejszym sygnałem. To nadal nie jest pełny obraz tego, jak głośno dźwięk się czuje.'),
        {
          skippable: true,
          topics: ['amplitude', 'decibels'],
          why: text('Loudness is a hearing judgment. The drawing is amplitude over time.', 'Głośność to ocena słuchu. Rysunek to amplituda w czasie.'),
        },
      ),
    ],
  },
]

const TASK_BY_ID = new Map(GUIDE_TASKS.map((task) => [task.id, task]))

export function taskById(id: string | null): GuideTask | null {
  if (!id) return null
  return TASK_BY_ID.get(id) ?? null
}

export function tasksInCategory(category: GuideTask['category']): GuideTask[] {
  return GUIDE_TASKS.filter((task) => task.category === category)
}

/** Tasks whose capabilities are not available stay out of the library. All ten are available. */
export function taskAvailable(task: GuideTask, available: ReadonlySet<string>): boolean {
  return task.capabilities.every((item) => available.has(item))
}

export const AVAILABLE_CAPABILITIES: readonly string[] = [
  'transport',
  'waveform',
  'trim',
  'fade',
  'gain',
  'eq',
  'reverb',
  'delay',
  'export',
  'speed',
  'pitch',
  'reverse',
]
