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

## Prywatność

Sample pozostają w przeglądarce. Presety to zwykły JSON parametrów, bez audio.
