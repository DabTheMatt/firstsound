import type { Locale } from '../i18n/locale'
import type { GuideCategory, GuideDifficulty, TopicCategory } from './types'

export type GuideChrome = {
  title: string
  subtitle: string
  guideMe: string
  learnAudio: string
  close: string
  back: string
  next: string
  skip: string
  exit: string
  minimize: string
  restore: string
  dock: string
  float: string
  showMe: string
  why: string
  learnMore: string
  hide: string
  tryThis: string
  already: string
  backKeeps: string
  step: (index: number, total: number) => string
  continueTask: string
  restart: string
  library: string
  doneTitle: string
  doneBody: string
  needTitle: string
  needBody: string
  loadSample: string
  loadDemo: string
  modeTitle: string
  modeStay: string
  modeSwitch: (mode: string) => string
  modeSimple: string
  modeTechnical: string
  focusTitle: string
  focusBody: string
  focusReveal: string
  focusStay: string
  search: string
  searchEmpty: string
  concepts: string
  minutes: (n: number) => string
  autoAdvance: string
  resume: string
  categories: Record<GuideCategory, string>
  difficulties: Record<GuideDifficulty, string>
  topicCategories: Record<TopicCategory, string>
  levelPractical: string
  levelTechnical: string
}

const en: GuideChrome = {
  title: 'Guided Tasks',
  subtitle: 'Learn by doing.',
  guideMe: 'Guide me',
  learnAudio: 'Learn Audio',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  skip: 'Skip',
  exit: 'Exit',
  minimize: 'Minimize',
  restore: 'Restore guidance',
  dock: 'Dock',
  float: 'Float',
  showMe: 'Show me where',
  why: 'Why?',
  learnMore: 'Learn more',
  hide: 'Hide',
  tryThis: 'Try this',
  already: 'Already done. You can continue. Back does not undo the edit.',
  backKeeps: 'Back returns to the previous instruction. It does not undo your edit.',
  step: (index, total) => `Step ${index} of ${total}`,
  continueTask: 'Continue',
  restart: 'Restart guidance',
  library: 'All tasks',
  doneTitle: 'Task finished',
  doneBody: 'You can keep editing. Restart walks the steps again and leaves the sound alone.',
  needTitle: 'You need a sound to begin.',
  needBody: 'Load a sample, or generate the demo sample that FIELD already has. The guide will not replace a sound later.',
  loadSample: 'Load sample',
  loadDemo: 'Generate demo sample',
  modeTitle: 'This task fits another view',
  modeStay: 'Stay here',
  modeSwitch: (mode) => `Switch to ${mode}`,
  modeSimple: 'Simple',
  modeTechnical: 'Technical',
  focusTitle: 'This control is outside Focus Mode',
  focusBody: 'Focus is still on. Exit Focus to reach this control. Playback, the selection, and effects stay as they are.',
  focusReveal: 'Exit Focus and show control',
  focusStay: 'Stay in Focus',
  search: 'Search topics',
  searchEmpty: 'No matching topic.',
  concepts: 'Concepts',
  minutes: (n) => `${n} min`,
  autoAdvance: 'Move on after a step completes',
  resume: 'Resume',
  categories: {
    basic: 'Basic editing',
    improve: 'Improve sound',
    creative: 'Creative sound',
    understand: 'Understand audio',
  },
  difficulties: { easy: 'Easy', moderate: 'Moderate' },
  topicCategories: {
    picture: 'Picture',
    level: 'Level',
    edit: 'Editing',
    tone: 'Tone',
    space: 'Space',
    time: 'Time',
  },
  levelPractical: 'In practice',
  levelTechnical: 'A bit more detail',
}

const pl: GuideChrome = {
  title: 'Zadania z przewodnikiem',
  subtitle: 'Ucz się, robiąc.',
  guideMe: 'Prowadź mnie',
  learnAudio: 'Poznaj dźwięk',
  close: 'Zamknij',
  back: 'Wstecz',
  next: 'Dalej',
  skip: 'Pomiń',
  exit: 'Wyjdź',
  minimize: 'Minimalizuj',
  restore: 'Wznów prowadzenie',
  dock: 'Dokuj',
  float: 'Unieś',
  showMe: 'Pokaż gdzie',
  why: 'Dlaczego?',
  learnMore: 'Dowiedz się więcej',
  hide: 'Ukryj',
  tryThis: 'Spróbuj',
  already: 'Już zrobione. Możesz iść dalej. Wstecz nie cofa edycji.',
  backKeeps: 'Wstecz wraca do poprzedniej instrukcji. Nie cofa edycji.',
  step: (index, total) => `Krok ${index} z ${total}`,
  continueTask: 'Kontynuuj',
  restart: 'Zacznij prowadzenie od nowa',
  library: 'Wszystkie zadania',
  doneTitle: 'Zadanie skończone',
  doneBody: 'Możesz dalej edytować. Ponowne rozpoczęcie przechodzi kroki jeszcze raz i nie rusza dźwięku.',
  needTitle: 'Potrzebujesz dźwięku, żeby zacząć.',
  needBody: 'Wczytaj sample albo wygeneruj próbkę demo, którą FIELD już ma. Prowadzenie nie podmieni dźwięku później.',
  loadSample: 'Wczytaj sample',
  loadDemo: 'Wygeneruj próbkę demo',
  modeTitle: 'To zadanie pasuje do innego widoku',
  modeStay: 'Zostań tutaj',
  modeSwitch: (mode) => `Przełącz na ${mode}`,
  modeSimple: 'Prosty',
  modeTechnical: 'Techniczny',
  focusTitle: 'Ta kontrolka jest poza trybem Focus',
  focusBody: 'Focus nadal jest włączony. Wyjdź z Focus, żeby dojść do tej kontrolki. Odtwarzanie, zaznaczenie i efekty zostają, jakie są.',
  focusReveal: 'Wyjdź z Focus i pokaż kontrolkę',
  focusStay: 'Zostań w Focus',
  search: 'Szukaj tematów',
  searchEmpty: 'Brak pasującego tematu.',
  concepts: 'Pojęcia',
  minutes: (n) => `${n} min`,
  autoAdvance: 'Przechodź dalej, gdy krok się skończy',
  resume: 'Wznów',
  categories: {
    basic: 'Podstawowa edycja',
    improve: 'Popraw dźwięk',
    creative: 'Dźwięk kreatywny',
    understand: 'Zrozumieć dźwięk',
  },
  difficulties: { easy: 'Łatwe', moderate: 'Średnie' },
  topicCategories: {
    picture: 'Obraz',
    level: 'Poziom',
    edit: 'Edycja',
    tone: 'Barwa',
    space: 'Przestrzeń',
    time: 'Czas',
  },
  levelPractical: 'W praktyce',
  levelTechnical: 'Trochę więcej',
}

export function guideChrome(locale: Locale): GuideChrome {
  return locale === 'pl' ? pl : en
}
