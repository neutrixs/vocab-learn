# CLAUDE.md

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run lint         # eslint
npx tsc -b           # type-check only
npm run start        # production preview (PORT env var, default 4173)
```

## TypeScript

- `verbatimModuleSyntax` is on — always use `import type { Foo }` for type-only imports
- Strict mode with `noUnusedLocals` and `noUnusedParameters`
- Path alias: `@/*` → `./src/*`
- Use `ReactElement` instead of `JSX.Element`

## Architecture

- **Two contexts**: `LanguageContext` (active lang, word index, data cache) and `ProgressContext` (SM-2 state, auto-saves to localStorage)
- **SM-2 card keys**: `{word}::recognition` or `{word}::recall`
- **Scheduler priority**: overdue → due today → new (capped at 10 new words per session)
- **Data loading**: word data fetched on demand and cached in context; `fetch()` handles diacritics in URLs automatically
- **Routing**: React Router v6

## Conventions

- **Turkish diacritics preserved in filenames** — `içmek.json`, `güzel.json`, etc. Do NOT normalize (durum ≠ dürüm)
- **Locale system** (`src/lib/locale.ts`): all UI strings are pre-uppercased in locale objects. Never use CSS `text-transform: uppercase` — Turkish İ/I casing breaks with it
- **Hand-rolled CSS** in `src/index.css` with design tokens as CSS custom properties. No UI library
- **Fonts**: @fontsource/inter (UI) + @fontsource/lora (display), imported in main.tsx

## Data

- Word files: `public/data/{lang}/{word}.json` (diacritics preserved)
- Word index: `public/data/{lang}/_index.json`
- localStorage key: `vocab_progress_v1`
