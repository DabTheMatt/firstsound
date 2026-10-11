# Polish coverage (pl-PL)

Architecture: `src/i18n/messages.ts` (`EN` / `PL`), `src/i18n/plParams.ts`, `src/i18n/locale.ts`, plus catalogs that already followed the same locale pair (`src/guide`, `src/manual/content.ts`, `src/a11y/waveform/copy.ts`). New catalogs in this change use the same pair: `analyzerCopy`, `filterTypes`, `prepCopy`, `plural`.

Language control: English and Polski. It is on the opening mode screen and in Settings. It is not a new toolbar control. The choice is stored in `localStorage` under `field.uiLocale`. No saved choice stays English. `document.documentElement.lang` becomes `pl` or `en`. Changing it does not construct an `AudioContext`.

## Checked

- Message keys are one TypeScript type, so a missing Polish field does not compile.
- Critical strings (gain, fades, markers, export, accessibility, errors) differ from English.
- Polish plurals: 1 / 2 / 5 for znacznik, ścieżka, and kanał.
- Parameter labels for gain, ratio, makeup, release, and feedback.
- Guided Tasks and the Manual already had Polish bodies. The Manual now has a Language section.

## Still English on purpose

- Units and formats: dB, dBFS, Hz, kHz, ms, BPM, timecode `00:12.450`.
- Abbreviations: EQ, FFT, RMS, LUFS, Q, LFO, MIDI, WAV, MP3, FLAC, PCM, LP, HP, LS, HS, BP, 2D, 3D, Log, Lin, Mel.
- Effect name Delay on the technical module. Simple mode says Opóźnienie.
- Wet and Dry on technical mix controls.
- Theme names.
- Hearing measurement codes such as BASS-HEAVY. They are labels of a measurement, not prose.
- Internal DSP identifiers (`lowpass`, parameter ids, preset JSON).

## Remaining prose to watch

Hearing Access explanations, the original-versus-heard chart, and some spectrum landmark hover names still mix English measurement names with Polish sentences. Analyzer chrome, transport scrub labels, waveform resize names, and LFO stored-value hints are in the catalogs. A later pass can move the remaining Hearing sentences into the catalogs without changing the measurements.

The coverage test in `src/i18n/coverage.test.ts` fails if a critical Polish string is empty or identical to English.
