# Claude Opus / Lorka UI design handoff — 2026-11-23

## Requested work
Create an **original, independent premium Arabic RTL app-shell UI** for Majlis Royal (not a revision of the other assistant's design), on this branch derived from `main`.

### Approved UI scope
- Landing, header/navigation, game selection cards for Jackaroo and UNO No Mercy
- Room-creation and joining dialogs, QR invitation, waiting lobby, footer, accessibility/responsive CSS
- Preserve all existing DOM IDs, buttons, API contracts, Arabic fonts and local offline assets

### Unchangeable game areas
**Do not modify** `public/board.js`, `public/geometry.js`, `public/mercy-ui.js`, `public/mercy.css`, `core/`, `server.mjs`, `android/`, or the actual board surfaces and game rules.
Do not change `.board`, `.felt`, `.mercyArena`, `.face`, `.piles`, `.handCard` / gameplay card styling.

## External model attempt
- TinyFish Ameen Lorka profile: `prof_7a0e632f9e3a428b`.
- Lorka URL: https://app.lorka.ai/l/chat/05?model=claude
- Selector lists `Claude Opus 5.5` (displayed provider model value `anthropic/claude-opus-5.5`).
- TinyFish attempts to select it and send a code-aware UI design brief encountered **'Sign up or log in'**; session is not authenticated to Lorka.
- **No design output has been produced by Claude. Do not attribute any UI code to Claude until a genuine response is received.**
- After the user signs into and saves the Lorka profile, retry with Claude Opus 5.5 and capture full code output, apply that exact solution to this branch, then test and produce a second debug APK.

## Existing independent first design
- Branch: `feat/premium-lounge-ui-20261123`
- Draft PR: https://github.com/ameenalqershi/majlis-royal/pull/1
- Isolated build on authorized VPS: `/var/lib/dcagent/projects/majlis-royal-ui-review/build/android/majlis.apk`
- Built and verified with Android apksigner locally; not yet uploaded to a public download host.
- The independent Claude branch should remain based on `main`, never merge the other design into it.

## Required QA
`node --test test/*.test.mjs`; `CHROME=... node scripts/check-ui.mjs`; `bash scripts/build-android.sh`; verify APK signing and screenshot differences at 390px and 1365px.
