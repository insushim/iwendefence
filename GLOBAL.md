# Global Notes

## 2026-03-13

- Project deploy target is Cloudflare Pages via `wrangler`.
- Manual deploy command used successfully: `npx wrangler pages deploy out --project-name wordguard`
- Latest successful manual deploy URL on this date: `https://d3b67517.wordguard.pages.dev`
- Current branch workflow used successfully: `npm run lint` -> `npm run build` -> `git commit` -> `wrangler pages deploy out --project-name wordguard` -> `git push origin main`
- `next.config.ts` uses `output: 'export'` and `trailingSlash: true`, so production artifacts are emitted to `out/`

- Gameplay work completed today:
- `src/app/(game)/play/page.tsx`
- Added wave-start cue overlay and hero skill/ultimate cast cue overlay
- Fixed revive quiz flow so revive is consumed only after quiz resolution
- Fixed revive success behavior to actually restore HP and grant brief invincibility
- Fixed wave bonus quiz flow so correct answers actually grant bonus gold
- Added compact damage/range badges to tower cards

- Stability / cleanup completed today:
- `src/app/page.tsx`
- Replaced render-time `Math.random()` usage with deterministic seeded values to satisfy React purity lint rules
- Replaced several `a[href="/..."]` navigations with `next/link`
- `src/widgets/hud/GameHUD.tsx`
- Deferred effect-driven state updates to avoid `react-hooks/set-state-in-effect` lint errors
- `src/app/(game)/endless/page.tsx`
- Fixed endless high-score persistence to use store state updates instead of direct object mutation

- Validation state at end of session:
- `npm run lint` passes
- `npm run build` passes
- Changes were committed and pushed as `c82f6d7` with message: `Polish game cues and fix quiz reward flow`
