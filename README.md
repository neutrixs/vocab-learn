# Sözcük — Turkish Vocabulary Flashcards

A spaced-repetition flashcard app for building Turkish vocabulary through immersive, Turkish-only study sessions.

## What Is This?

Sözcük uses the SM-2 spaced-repetition algorithm to schedule vocabulary reviews at optimal intervals — new words appear daily, while known words resurface only when you're about to forget them. Study sessions are fully in Turkish: English glosses appear only after you reveal an answer.

Two study modes per word:
- **Recognition** — read a Turkish sentence, recall the meaning
- **Active Recall** — answer a Turkish prompt by typing the correct form

Beyond flashcards, **Metin** offers daily short Turkish reading texts on rotating topics. Words that exist in your vocabulary DB are highlighted and tappable — tap one to preview its entry inline while reading.

## Setup

```bash
# Frontend
cd frontend && npm install

# Development (two terminals)
make dev-server       # Go API server on :8080
make dev-frontend     # Vite dev server on :5173

# Production (run from repo root)
make build            # builds frontend + Go binary
./bin/server          # serves everything on :8080
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `DATA_DIR` | `./data` | Word data directory |
| `DB_DIR` | _(required)_ | Directory holding `vocab-learn.db` and `.jwt_secret`. Created if missing; keep it outside the work tree so a deploy's `git clean` can't wipe it. |
| `DIST_DIR` | `./frontend/dist` | Built frontend path |

## Project Structure

```
vocab-learn/
├── cmd/server/              Go server entry point
├── internal/
│   ├── api/                 HTTP handlers (auth, words, progress, texts, settings)
│   ├── db/                  SQLite schema + init
│   └── middleware/          JWT auth
├── data/
│   └── tr/                  Turkish word files
│       ├── _index.json      Word registry
│       ├── *.json           One file per word
│       └── texts/           Daily reading texts ("metin")
│           ├── _index.json  Text registry
│           ├── _topics.json Topic / subtopic catalog
│           └── *.json       One file per text
├── frontend/                Vite + React + TypeScript
│   ├── src/
│   │   ├── components/      UI, study, and metin (reader/browse) components
│   │   ├── context/         Auth, Language, Progress, Settings providers
│   │   ├── lib/             SM-2 algorithm, scheduler, data loading
│   │   ├── pages/           Home, Study, Metin, Settings, Login
│   │   └── types/           TypeScript type definitions
│   └── package.json
├── metin/
│   └── spec.md              Writing rules for reading texts (shared by API + Claude Code paths)
├── scripts/
│   ├── gen_metin.py         Daily reading-text generator (--pick / --generate / --ingest)
│   └── requirements.txt
├── Makefile
└── go.mod
```

## Adding Vocabulary

See [`data/README.md`](data/README.md) for the word data schema. Use the `/gen-vocab` slash command to generate words with AI assistance.
