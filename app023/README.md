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

## Keyboard Controls

Sound Sketcher uses keyboard keys to trigger drum sounds. Press any of the following keys to play the corresponding sound:

| Key | Sound |
|-----|-------|
| `A` | Kick (Bass Drum) |
| `S` | Snare |
| `D` | Hi-Hat (Closed) |
| `F` | Hi-Hat (Open) |
| `J` | Clap |
| `K` | Tom |
| `L` | Cymbal |
| `;` | Rim Shot |

### Recording & Playback

- Click the **Record** button or press the record button to start recording your beat
- Tap keys while recording to add drum hits to the timeline
- Click **Stop** to end recording
- Click **Play** to hear your recorded beat
- The timeline visualizes your drum pattern with color-coded markers for each sound

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

## Security

### Security headers & WAF protection

This project implements security headers and Content Security Policy (CSP) to protect against common web vulnerabilities.

#### Implemented protections

- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME sniffing attacks
- **X-XSS-Protection**: Legacy XSS protection for older browsers
- **Referrer-Policy**: Controls referrer information leakage
- **Permissions-Policy**: Restricts access to browser features (camera, microphone, geolocation, etc.)
- **Content-Security-Policy**: Prevents XSS, data injection, and unauthorized resource loading

#### Platform-specific configuration

Security headers are automatically applied on supported platforms:

**Vercel**
- Configured via `vercel.json`
- Headers are automatically applied on deployment

**Netlify / Cloudflare Pages**
- Configured via `public/_headers`
- Headers are automatically applied on deployment

**Other platforms**
- Manually configure the following headers in your hosting platform's settings:
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  ```

#### CSP configuration notes

The Content Security Policy is configured to:
- Allow inline scripts/styles for Tone.js and Tailwind CSS (`'unsafe-inline'`)
- Allow connections to Google Gemini API (`https://generativelanguage.googleapis.com`)
- Prevent iframe embedding (`frame-ancestors 'none'`)
- Restrict resource loading to same-origin and explicitly allowed sources

#### Testing security headers

After deployment, verify security headers using:
- [Security Headers](https://securityheaders.com/)
- Browser DevTools Network tab
- `curl -I https://your-domain.com`
