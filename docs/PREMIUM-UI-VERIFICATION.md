# Royal Majlis premium UI — verified change report
Date: 2026-11-23

## Allowed scope
- Landing and welcome section, game-selection cards, information architecture
- Header/footer, create/join/rules dialog visual styling, lobby and invitation chrome
- Arabic typography, responsive presentation, focus/reduced motion states

## Intentionally untouched
- Jackaroo board canvas: `public/board.js`, `public/geometry.js`
- Uno game board and its card presentation: `public/mercy-ui.js`, `public/mercy.css`
- Game rules, server API and Android activity: `core/`, `server.mjs`, `android/`
- No changes to gameplay state machine, networking protocol or room lifecycle

## Files changed
- `public/index.html`: semantic premium welcome, clearer game cards, helpful steps, retains all essential DOM IDs and script includes.
- `public/premium-ui.css`: isolated premium shell styling, no selectors for `.board`, `.felt`, `.piles`, `.handCard`, `.mercyHand`.
- `docs/CLAUDE-OPUS-UI-REVIEW.md`: prompt and review rubric for external Claude Opus audit.
- This report.

## Tests executed
- `node --test test/*.test.mjs`: 16 passed, 0 failed.
- `node --check` on game UI JS, core JS and server JS: passed.
- HTML ID uniqueness, CSS link, excluded gameplay selectors: passed.
- Existing Chromium `scripts/check-ui.mjs` with Chromium 141 headless and isolated server at `172.18.0.1:18987`: completed with exit code 0.
- Verified Jackaroo 4/6 seat journey, invite QR scanning, game action, reconnect, mobile layout; Uno complete game, rematch, mobile layout; custom Arabic fonts.
- Reviewed generated 1365px desktop and 390px mobile landing captures. Game assets originally present in GitHub were not all mirrored to the isolated test checkout, so inspect these assets on a final device before release.

## Review needed before merge
- Verify on physical Android device and check touch handling/Android System WebView, 320px screen, RTL navigation and QR camera permissions.
- Claude Opus/Poe review remains **pending sign-in to Poe**; it did not author or assess this patch.
- Do not merge automatically; treat this PR as the review checkpoint.
