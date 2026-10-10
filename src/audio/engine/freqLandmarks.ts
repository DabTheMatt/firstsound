/**
 * Hover landmarks for the EQ / FFT frequency axis.
 *
 * Ranges follow mixing practice, not a single instrument's fundamental:
 * - Mike Senior and Paul White, "Using EQ", Sound On Sound, August 2001.
 *   Kick punch about 80–100 Hz, kick warmth 200–300 Hz, beater click 2.5–6 kHz.
 *   Snare fatness 120–400 Hz, box 800 Hz–1.2 kHz, ring 2–4 kHz, attack 4–8 kHz.
 *   Vocal presence 4–5 kHz, sibilance 7–12 kHz, crispness 16–18 kHz.
 * - iZotope, "EQ Cheat Sheet". Kick punch 60–80 Hz, snare attack 2–3.5 kHz,
 *   vocal air from about 10 kHz.
 *
 * A landmark is a place to listen, not a rule for every recording.
 */

export type FrequencyLandmark = {
  id: string
  minHz: number
  maxHz: number
  title: string
  text: string
}

export const FREQUENCY_LANDMARKS: readonly FrequencyLandmark[] = [
  {
    id: 'sub',
    minHz: 10,
    maxHz: 60,
    title: 'Sub',
    text: 'Felt more than heard. Rumble, and the lowest weight under a kick or bass.',
  },
  {
    id: 'kick',
    minHz: 60,
    maxHz: 120,
    title: 'Kick boom',
    text: 'Kick boom and bass weight. Bass-drum punch often sits around 80–100 Hz.',
  },
  {
    id: 'warm',
    minHz: 120,
    maxHz: 250,
    title: 'Warmth',
    text: 'Bass body and the fat part of a snare. A warmer kick often lives near 200 Hz.',
  },
  {
    id: 'box',
    minHz: 250,
    maxHz: 500,
    title: 'Box',
    text: 'Low mids. Boxiness and mud in kicks, snares, and a boomy vocal.',
  },
  {
    id: 'nasal',
    minHz: 500,
    maxHz: 1000,
    title: 'Low voice',
    text: 'Vocal body, and a nasal or ringing snare. Kick boom is lower, near 80–100 Hz.',
  },
  {
    id: 'voice',
    minHz: 1000,
    maxHz: 2000,
    title: 'Voice',
    text: 'Human voice. Vowels, and a boxy or papery snare. Not the kick boom.',
  },
  {
    id: 'crack',
    minHz: 2000,
    maxHz: 5000,
    title: 'Crack',
    text: 'Speech consonants, vocal presence, snare crack, and the click of a kick beater.',
  },
  {
    id: 'edge',
    minHz: 5000,
    maxHz: 8000,
    title: 'Edge',
    text: 'Snare snap and vocal edge. Cymbal ring and harshness often show up here.',
  },
  {
    id: 'sibilance',
    minHz: 8000,
    maxHz: 12000,
    title: 'Sibilance',
    text: 'Ess and breath, cymbal sizzle, and hi-hat air.',
  },
  {
    id: 'air',
    minHz: 12000,
    maxHz: 24000,
    title: 'Air',
    text: 'Air and shimmer. Vocal crispness above the speech band, and cymbal sheen.',
  },
]

export function frequencyLandmark(hz: number): FrequencyLandmark | null {
  if (!(hz > 0) || !Number.isFinite(hz)) return null
  for (const mark of FREQUENCY_LANDMARKS) {
    if (hz >= mark.minHz && hz < mark.maxHz) return mark
  }
  const last = FREQUENCY_LANDMARKS[FREQUENCY_LANDMARKS.length - 1]
  if (last && hz >= last.minHz && hz <= last.maxHz) return last
  return null
}

/** Second line of the graph pointer when frequency landmarks are on. */
export function formatFrequencyLandmark(hz: number): string | null {
  const mark = frequencyLandmark(hz)
  if (!mark) return null
  return `${mark.title}. ${mark.text}`
}
