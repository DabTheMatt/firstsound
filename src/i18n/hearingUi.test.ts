import { describe, expect, it } from 'vitest'
import { hearingUi } from './hearingUi'

describe('hearingUi', () => {
  const en = hearingUi('en')
  const pl = hearingUi('pl')

  it('keeps the English hearing chrome and wave legend', () => {
    expect(en.title).toBe('Hearing Access')
    expect(en.dock).toBe('Dock')
    expect(en.restore).toBe('Restore')
    expect(en.section.sound).toBe('Sound')
    expect(en.legend).toEqual({
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
    })
    expect(en.tag('quiet', 'QUIET')).toBe('QUIET')
    expect(en.detail('86% of spectral power is below 250 Hz')).toBe('86% of spectral power is below 250 Hz')
    expect(en.findingTitle('high-low-energy', 'VERY HIGH LOW-FREQUENCY ENERGY')).toBe('VERY HIGH LOW-FREQUENCY ENERGY')
  })

  it('translates the wave legend and the sound-tab tags', () => {
    expect(pl.title).toBe('Dostęp słuchowy')
    expect(pl.dock).toBe('Dokuj')
    expect(pl.restore).toBe('Przywróć')
    expect(pl.enlarge).toBe('Powiększ')
    expect(pl.close).toBe('Zamknij')
    expect(pl.section).toMatchObject({
      sound: 'Dźwięk',
      events: 'Zdarzenia',
      space: 'Przestrzeń',
      dynamics: 'Dynamika',
      compare: 'Porównanie',
      haptics: 'Haptyka',
    })
    expect(pl.legend.transient).toBe('transjent')
    expect(pl.legend.attack).toBe('▲ atak')
    expect(pl.legend.clip).toBe('! przester')
    expect(pl.legend.level).toBe('słupek = poziom')
    expect(pl.legend.transients).toBe('Transjenty')
    expect(pl.legend.symbols).toBe('Symbole')
    expect(pl.legend.hideLine).toBe('Ukryj linię transjentu')
    expect(pl.tag('quiet', 'QUIET')).toBe('CICHO')
    expect(pl.tag('midrange-dominant', 'MIDRANGE-DOMINANT')).toBe('ŚRODEK DOMINUJE')
    expect(pl.tag('wide', 'WIDE STEREO')).toBe('SZEROKIE STEREO')
    expect(pl.tag('imbalance', 'RIGHT-HEAVY')).toBe('WIĘCEJ Z PRAWEJ')
    expect(pl.tag('imbalance', 'LEFT-HEAVY')).toBe('WIĘCEJ Z LEWEJ')
    expect(pl.tag('strong-transients', 'STRONG TRANSIENTS')).toBe('MOCNE TRANSJENTY')
    expect(pl.tag('tonal', 'TONAL')).toBe('TONALNY')
    expect(pl.tag('sustained', 'SUSTAINED')).toBe('UTRZYMANY')
    expect(pl.tag('tone', 'E6 · 1319 Hz')).toBe('E6 · 1319 Hz')
    expect(pl.originalHeard).toBe('Oryginał → słyszane')
    expect(pl.band('lowMid', 'LOW MID')).toBe('NISKI ŚR.')
    expect(pl.band('mid', 'MID')).toBe('ŚRODEK')
    expect(pl.band('air', 'AIR')).toBe('AIR')
    expect(pl.scope('SELECTION')).toBe('ZAZNACZENIE')
    expect(pl.findingTitle('high-low-energy', 'VERY HIGH LOW-FREQUENCY ENERGY')).toBe('BARDZO DUŻO NISKICH')
    expect(pl.detail('86% of spectral power is below 250 Hz')).toBe('86% mocy widma jest poniżej 250 Hz')
    expect(pl.show).toBe('Pokaż')
    expect(pl.assistant).toBe('Wizualny asystent miksu')
    expect(pl.automation('Wzmocnienie', '-3.00', '-3.00')).toBe('Automatyzacja Wzmocnienie: zapisane -3.00 · skuteczne -3.00')
    expect(pl.affected(7933, 20000)).toBe(' · zakres 7933–20000 Hz')
    expect(pl.eventLabel('transient', 'TRANSIENT')).toBe('TRANSJENT')
    expect(pl.detail('2 full-scale samples.')).toBe('2 próbki pełnej skali.')
    expect(pl.detail('5 full-scale samples')).toBe('5 próbek pełnej skali')
    expect(pl.detail('Correlation 0.10. Possible mono compatibility issue.')).toBe(
      'Korelacja 0.10. Możliwy problem zgodności z mono.',
    )
    expect(pl.detail('Not a known sentence.')).toBe('Not a known sentence.')
  })
})
