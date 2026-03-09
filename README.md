# Sözcük — Turkish Vocabulary Flashcards

A spaced-repetition flashcard app for building Turkish vocabulary through immersive, Turkish-only study sessions.

## What Is This?

Sözcük uses the SM-2 spaced-repetition algorithm to schedule vocabulary reviews at optimal intervals — new words appear daily, while known words resurface only when you're about to forget them. Study sessions are fully in Turkish: English glosses appear only after you reveal an answer.

Two study modes per word:
- **Recognition** — read a Turkish sentence, recall the meaning
- **Active Recall** — answer a Turkish prompt by typing the correct form

## Setup

```bash
# Frontend
cd frontend && npm install

# Development (two terminals)
make dev-server       # Go API server on :8080
make dev-frontend     # Vite dev server on :5173

# Production
make build            # builds frontend + Go binary
./bin/server          # serves everything on :8080
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `JWT_SECRET` | random | JWT signing key |
| `DATA_DIR` | `./data` | Word data directory |
| `DB_PATH` | `./vocab-learn.db` | SQLite database path |

## Project Structure

```
vocab-learn/
├── cmd/server/              Go server entry point
├── internal/
│   ├── api/                 HTTP handlers (auth, words, progress)
│   ├── db/                  SQLite schema + init
│   └── middleware/          JWT auth
├── data/
│   └── tr/                  Turkish word files
│       ├── _index.json      Word registry
│       └── *.json           One file per word
├── frontend/                Vite + React + TypeScript
│   ├── src/
│   │   ├── components/      UI and study components
│   │   ├── context/         Auth, Language, Progress providers
│   │   ├── lib/             SM-2 algorithm, scheduler, data loading
│   │   ├── pages/           Home, Study, Settings, Login
│   │   └── types/           TypeScript type definitions
│   └── package.json
├── Makefile
└── go.mod
```

## Adding Vocabulary

See [`data/README.md`](data/README.md) for the word data schema. Use the `/gen-vocab` slash command to generate words with AI assistance.
