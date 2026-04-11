# CLAUDE.md

## Commands

```bash
# Development (run in separate terminals)
make dev-server       # Go server on :8080
make dev-frontend     # Vite on :5173 (proxies /api → :8080)

# Frontend only
cd frontend && npm run dev       # Vite dev server
cd frontend && npm run build     # tsc -b && vite build
cd frontend && npm run lint      # eslint
cd frontend && npx tsc -b        # type-check only

# Production build
make build            # builds frontend + Go binary → bin/server
./bin/server          # serves everything on :8080
```

## Environment Variables

- `PORT` — server port (default 8080)
- `DATA_DIR` — word data directory (default `./data`)
- `DB_PATH` — SQLite database path (default `./vocab-learn.db`)
- `DIST_DIR` — built frontend path (default `./frontend/dist`)

## Project Structure

```
├── cmd/server/          Go entry point
├── internal/
│   ├── api/             HTTP handlers (auth, words, progress)
│   ├── db/              SQLite init + schema
│   └── middleware/       JWT auth middleware
├── data/tr/             Word JSON files (served by Go)
├── frontend/            Vite + React app
│   └── src/
└── Makefile
```

## Go Backend

- **Standard library** `net/http` router (Go 1.22+ path values)
- **SQLite** via `modernc.org/sqlite` (pure Go, no CGO)
- **JWT** via `golang-jwt/jwt/v5`, bcrypt for passwords
- API: `/api/auth/register`, `/api/auth/login`, `/api/words/{lang}`, `/api/words/{lang}/{word}`, `/api/progress/{lang}` (GET/PUT, auth required)
- SPA fallback: non-API routes serve `index.html` from dist/

## TypeScript (frontend/)

- `verbatimModuleSyntax` — always use `import type { Foo }` for type-only imports
- Strict mode with `noUnusedLocals` and `noUnusedParameters`
- Path alias: `@/*` → `./src/*`
- Use `ReactElement` instead of `JSX.Element`

## Architecture

- **Three contexts**: `AuthContext` (JWT auth), `LanguageContext` (active lang), `ProgressContext` (SM-2 state — localStorage + server sync)
- **SM-2 card keys**: `{word}::recognition` or `{word}::recall`
- **Scheduler priority**: overdue → due today → new (capped at 10 new words per session)
- **Data loading**: word data fetched via `/api/words/` and cached in-memory
- **Progress sync**: localStorage for immediate persistence, async push to server every 5s + on page unload

## Error Handling

- **Never silently swallow errors** — if an operation fails and you can't recover, surface it (log, return, or throw). Empty `catch {}` blocks are only acceptable for truly fire-and-forget network calls (e.g. background sync) where retrying is built in.
- **Go**: always check and handle `error` return values. Use `log.Printf` at minimum for unexpected errors; `log.Fatal` only at startup.
- **TypeScript**: don't hide fetch/parse failures from the user unless there's a clear offline/retry strategy in place. Log unexpected errors to the console at minimum.
- If you can't fully fix an error path, call it out explicitly rather than leaving a silent `catch {}`.

## Conventions

- **Turkish diacritics preserved in filenames** — `içmek.json`, `güzel.json`, etc. Do NOT normalize (durum ≠ dürüm)
- **Locale system** (`frontend/src/lib/locale.ts`): all UI strings are pre-uppercased. Never use CSS `text-transform: uppercase` — Turkish İ/I casing breaks
- **Hand-rolled CSS** in `frontend/src/index.css` with design tokens as CSS custom properties. No UI library
- **Fonts**: @fontsource/inter (UI) + @fontsource/lora (display), imported in main.tsx

## Data

- Word files: `data/{lang}/{word}.json` (diacritics preserved)
- Word index: `data/{lang}/_index.json`
- SQLite: `vocab-learn.db` (users + progress tables)
- localStorage: `vocab_progress_v1` (offline cache), `vocab_auth` (JWT token)

## Data Directory Rules

- **Never use the Read tool on `data/`** — the directory contains thousands of files and is too large to browse or read directly.
- **Always interact with `data/` programmatically** — use `jq`, shell scripts, or Python.
- **If reading is truly unavoidable**, limit output length (e.g. `head`, `jq` with `limit/2`, or `--head-limit` on Grep).
