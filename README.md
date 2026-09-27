# FIELD

Przeglądarkowy instrument do kreatywnej manipulacji samplami i nagraniami terenowymi. Wszystko dzieje się lokalnie — pliki audio nie są wysyłane na serwer.

Live (po merge na `main` i włączeniu Pages): **https://dabthematt.github.io/firstsound/**

## Milestone 0.1

- ładowanie sampla (picker + drag and drop)
- waveform, region start/end, play / stop / loop
- speed, pitch, gain
- silnik granularny (size, density, position, scatter, pitch, pitch spread)
- preset JSON (Save / Load preset)
- UI „FIELD / organic minimal” (Inter, knoby, touch + mysz)

## Dev

```bash
npm install
npm test
npm run dev
```

Aplikacja: **http://localhost:5199/**

Build:

```bash
npm run build
```

Wynik: `dist/`. Workflow `.github/workflows/pages.yml` publikuje `main` na GitHub Pages. W repozytorium włącz Pages: **Settings → Pages → Source: GitHub Actions**.

## Import na iPhone / iPad

Safari na iOS pozwala wgrać dźwięk przez **Load sample** (picker Files) albo — na iPadzie — przeciągnięcie pliku. `decodeAudioData` dekoduje:

- WAV (PCM)
- AIFF
- MP3
- M4A / AAC (także ścieżka audio w MP4)
- CAF

OGG i WebM zwykle **nie** działają na iOS. Pliki zostają w przeglądarce (nic nie idzie na serwer).

## Prywatność

Sample pozostają w przeglądarce. Presety to zwykły JSON parametrów, bez audio.
