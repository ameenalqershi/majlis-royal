# Royal Majlis — Claude Opus expert UI / UX critique and implementation brief

Repository: `ameenalqershi/majlis-royal` (private). Scope: **application user interface only**.

## The ironclad exclusion
Do not touch or redesign **the actual playable board surfaces**: Jackaroo canvas geometry, marbles, pieces, board rendering, and Uno play-table visuals. Immutable files for this pass: `public/board.js`, `public/geometry.js`, `public/mercy-ui.js`, `public/mercy-cards.js`, `public/mercy.css`, `core/`, and all rules/gameplay code. Do not modify game mechanics or network API contracts. Preserve all element IDs and event handlers.

## Your role
Act as a world-class Arabic-first mobile game product design director and meticulous frontend engineer. Perform a **critical** audit of the app shell and propose high-impact, production-quality improvements, not generic praise. Target luxury social gaming, elegant contemporary Arabic design, cultural warmth, restraint, and polished ergonomics. Preserve fast loading and offline/local-network behavior.

## Files to review
1. `public/index.html` (document, landing, cards, header, footer, dialogs)
2. `public/style.css` (legacy base styles, including excluded board selectors)
3. `public/premium-ui.css` (isolated new UI design layer)
4. `public/app.js` (only understand DOM contracts for lobby/create/join/invitation; do not rewrite gameplay)
5. `scripts/check-ui.mjs` (existing behavioral and visual test)

Review landing desktop/mobile, create/join modal, QR invitation, empty seats/lobby, status bar, rules dialogs, footer and focus/keyboard/RTL experiences. You may improve in-game outer chrome and control panels, never the playing boards themselves.

## Deliverables
- A severity-ranked UX audit: problems, impact, recommended changes.
- A refined design system with accurate Arabic typography and accessible contrast.
- Surgical diffs for allowed UI-only files; do not alter the immutable files or break IDs/selectors.
- Responsive states for 320, 360, 390, 740, 1024, 1365 px.
- Accessibility: semantic landmarks, labels, contrast, touch targets, reduced motion, dialog focus, error clarity.
- Performance: avoid external CDN dependencies, huge images, unnecessary animation, and reflows.
- QA: test checklist with existing `node --test test/*.test.mjs` and Chromium harness, plus screenshot/overflow review.

Use concrete evidence from the provided code. Explain tradeoffs. Never claim a test passed unless actually run. Output complete, compilable changes and a concise acceptance checklist.

## Brief in Arabic
أعطنا أفضل ما لديك في تصميم وتجربة مستخدم فائقة الاحتراف لصالة مجلس رويال ونوافذ إنشاء الطاولات والانضمام إليها والدعوة والإرشاد. **ممنوع تمامًا تعديل لوحات اللعب الخاصة بجاكارو أو أونو، وأي منطق للعبة**. حافظ على الهوية العربية، سرعة التطبيق، وتناسق الواجهات على الهواتف.
