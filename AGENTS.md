# FIELD — agent guidelines

FIELD is the user-facing name of this browser-based granular sample instrument (Vite + React + TypeScript + Web Audio), deployed to GitHub Pages from `main` via `.github/workflows/pages.yml`.

## Communication

- Always reply to the user in **Polish** (prose, summaries, questions, explanations).
- Keep code, identifiers, file paths, commit messages, and inline code comments in English so they stay consistent with the codebase.

## Code

- Keep DSP/audio logic in `src/audio` (the engine owns the clock); React only drives UI/visual state.
- The parameter model in `src/audio/parameters` is the single source of truth for both UI and audio.
- Prefer small, unit-testable pure helpers; run `npm run lint`, `npm test`, and `npm run build` before deploying.
- `package.json` `version` is the FIELD version (`src/version.ts`). A user-facing change pushed to `main` updates it: patch for a fix, minor for a feature, major for a breaking milestone. Update `src/manual/content.ts` in the same change. Do not bump version from a git hook.
