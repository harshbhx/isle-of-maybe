# 06 · Client shell — design

- Structure: `docs/05-ARCHITECTURE.md` §1 (`src/client/screens`, `island`, `chart`, `ui`).
- Routing inside `game.tsx`: a tiny state machine `{ screen: 'dispatch' | 'practice' | 'pick' | 'hunt' | 'reveal' | 'bury' | 'chart' | 'ink' | 'result' | 'boards' | 'hall' }`, no router library.
- Data: one `api.ts` client with typed fetch wrappers from `src/shared/api.ts`; errors mapped to copy keys.
- Tokens: `styles.css` `:root` variables; Tailwind 4 theme maps to the variables (`@theme`), so classes like `bg-parchment` work.
- Fonts: WOFF2 in `src/client/fonts/`, `@font-face` with `font-display: swap`.
- Glyphs: `chart/glyphs.tsx` exports SVG path data used by both SVG `<symbol>`s and Canvas `Path2D`.
- Practice Cove: a hard-coded 16×16 island in `src/shared/practice.ts`, played fully client-side, then `POST /api/practice/done`.
- Performance: island canvas draws terrain once to an offscreen canvas; per frame draws terrain image + fog image + sprites.
