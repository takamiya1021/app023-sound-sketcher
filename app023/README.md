# Sound Sketcher

Sound Sketcher is a keyboard-driven beat sketch tool for video editors and producers. Tap drum ideas, visualize them on a timeline, export cues, and ask Gemini for suggestions.

## Requirements

- Node.js 18+
- npm 9+
- (Optional) Google Gemini API key

## Project structure

- `app/` – App Router UI (`KeyboardGuide`, `Timeline`, `AIBeatSuggestion`, `BpmControl`)
- `lib/` – Core services (`audioEngine`, `geminiService`, `storage`)
- `public/sounds/` – Low-latency percussive samples used by Tone.js
- `__tests__/` – Jest unit/integration tests
- `e2e/` – Playwright end-to-end tests

## Scripts

```bash
npm run dev          # start dev server on http://localhost:3000
npm run test         # run Jest suite
npm run test:e2e     # run Playwright (installs Chromium on first run)
npm run build        # production build (static export)
npm run start        # serve production build
```

## Gemini AI setup

1. Obtain an API key from Google AI Studio.
2. Enter the key in the **AI Suggestions** card and press **Save**. The key is stored in `localStorage` under `gemini_api_key`.
3. Click **Analyze Beat** to send the current recording to Gemini and display genre, summary, and next pattern suggestions.  
4. Use **Apply Pattern** to append the suggested pattern to the current recording.

## BPM guardrails

The BPM control (60–240 BPM) validates input before committing changes. Invalid values keep the previous BPM and display an inline error.

## Testing

- Unit/integration tests (Jest): `npm test`
- Browser regression tests (Playwright): `npm run test:e2e`

The Playwright config spins up `npm run dev` automatically on port `3100`, so make sure the port is free before running.

## Static export

`next.config.ts` is configured with `output: 'export'` and unoptimized images for compatibility with static hosting/CDN distribution. After `npm run build`, the static site is emitted to the `out/` directory.
