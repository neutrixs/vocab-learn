# Sözcük — Turkish Vocabulary Flashcards

A spaced-repetition flashcard app for building Turkish vocabulary through immersive, Turkish-only study sessions.

## What Is This?

Sözcük uses the SM-2 spaced-repetition algorithm to schedule vocabulary reviews at optimal intervals — new words appear daily, while known words resurface only when you're about to forget them. Study sessions are fully in Turkish: no English during practice. English glosses appear only after you reveal an answer.

There are two study modes per word: **recognition** (read a sentence, recall meaning) and **active recall** (answer a Turkish prompt by typing the correct Turkish form).

## Getting Started

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## Project Structure

```
vocab-learn/
├── public/
│   └── data/
│       ├── _template.json        # Schema reference (not loaded by app)
│       └── tr/
│           ├── _index.json       # Word registry for Turkish
│           └── *.json            # One file per word
├── src/
│   ├── components/
│   │   ├── layout/               # AppShell, PageHeader
│   │   ├── study/                # RecognitionCard, RecallCard, AnswerInput, SentenceList
│   │   └── ui/                   # Badge, Button, Card, ProgressBar
│   ├── context/
│   │   ├── LanguageContext.tsx   # Active language + localStorage persistence
│   │   └── ProgressContext.tsx   # SM-2 state, reducer, auto-save
│   ├── lib/
│   │   ├── dataLoader.ts         # fetch() + module-level Map cache
│   │   ├── keyboard.ts           # Keyboard shortcut helpers
│   │   ├── scheduler.ts          # buildSession() — priority queue
│   │   ├── sm2.ts                # SM-2 algorithm
│   │   └── storage.ts            # localStorage read/write + streak logic
│   ├── pages/
│   │   ├── HomePage.tsx          # Dashboard — due counts, start session
│   │   ├── StudyPage.tsx         # Study session controller
│   │   └── SettingsPage.tsx      # Language selector, reset progress
│   ├── types/
│   │   ├── progress.ts           # ProgressStore, LangProgress, SM2Card
│   │   ├── study.ts              # StudyItem, StudyMode, ReviewGrade
│   │   └── word.ts               # WordEntry, WordIndex, WordIndexEntry
│   ├── App.tsx                   # Router + context providers
│   ├── index.css                 # All styles (CSS custom properties)
│   └── main.tsx                  # Entry point, font imports
├── .claude/
│   └── commands/
│       └── gen-vocab.md          # /gen-vocab slash command
└── package.json
```

## Architecture

### Data Flow

```
_index.json
    │
    ▼
buildSession()          scheduler.ts — priority: overdue → due → new (capped, shuffled)
    │
    ▼
loadWord()              dataLoader.ts — fetch() + Map cache
    │
    ▼
RecognitionCard         show sentence with [word] highlighted
RecallCard              show Turkish prompt, accept typed answer
    │
    ▼
recordReview(grade)     ProgressContext dispatch
    │
    ▼
applyReview(card, grade)  sm2.ts — update interval, ease factor
    │
    ▼
localStorage            auto-saved on every state change (vocab_progress_v1)
```

### Routing

| Path | Page | Notes |
|------|------|-------|
| `/` | `HomePage` | Dashboard with due counts |
| `/study` | `StudyPage` | Active study session |
| `/settings` | `SettingsPage` | Language selector, reset |

### Contexts

**`LanguageContext`** (`src/context/LanguageContext.tsx`)
- Holds the active language code (default `"tr"`)
- Persists to `localStorage` key `vocab_lang`

**`ProgressContext`** (`src/context/ProgressContext.tsx`)
- Holds the full `ProgressStore` (all languages, all cards, stats)
- Reducer actions: `RECORD_REVIEW`, `RESET_LANG`, `RESET_ALL`
- Auto-saves to `localStorage` on every state change via `useEffect`

### SM-2 Algorithm (`src/lib/sm2.ts`)

Each card tracks: `ease_factor` (starts 2.5), `interval` (days), `repetitions`, `due`, `last_reviewed`.

On **pass** (`grade = 4`):
- rep 1 → interval = 1 day
- rep 2 → interval = 6 days
- rep N → interval = round(prev_interval × ease_factor)
- ease update: `EF = max(1.3, EF + 0.1 − (5−q) × (0.08 + (5−q) × 0.02))`

On **fail** (`grade = 1`):
- repetitions reset to 0, interval reset to 1 day
- ease factor still updated (decreases)

### Session Scheduler (`src/lib/scheduler.ts`)

`buildSession(allWords, progress, maxNew = 10)` returns an ordered `StudyItem[]`:

1. **Overdue** — cards whose `due` date is before today (highest priority)
2. **Due today** — cards whose `due` date is today
3. **New** — unseen cards, shuffled by word then capped at `maxNew` unique words (both modes per word are included)

Card key format: `{word}::recognition` or `{word}::recall`

### Data Loading (`src/lib/dataLoader.ts`)

- `loadIndex(lang)` — fetches `_index.json`, cached in module-level variable
- `loadWord(lang, word)` — fetches `{word}.json`, cached in module-level `Map`
- `preloadWords(lang, words[])` — parallel `Promise.allSettled` prefetch
- `clearCache()` — clears both caches (used on language switch)

## Study Modes

### Word Recognition

Shows a Turkish sentence with the target word highlighted in brackets. The learner must recall the meaning before revealing. On reveal: English gloss + full word data are shown. Grade: **pass** or **fail**.

Keyboard shortcuts: `Space` / `Enter` to reveal, `1` fail / `2` pass after reveal.

### Active Recall

Shows a Turkish-language prompt (scenario or fill-in-the-blank). The learner types a Turkish answer. Accepted forms are checked case-insensitively against `accepted_forms[]`. On submit: correct/incorrect feedback shown.

Keyboard shortcuts: type answer → `Enter` to submit, `Enter` again to advance.

## Design System

All styles live in `src/index.css` using CSS custom properties. No external UI library.

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg` | `#f5f4ef` | Page background (cream) |
| `--color-card` | `#faf9f6` | Card surface |
| `--color-border` | `#e2e0d9` | Borders |
| `--color-accent` | `#d4a853` | Amber — buttons, highlights |
| `--color-success` | `#3d7a5c` | Correct answer feedback |
| `--color-error` | `#a0442a` | Wrong answer feedback |
| `--color-highlight-bg` | `#f0e6c8` | Word highlight in sentences |
| `--font-sans` | Inter | UI text |
| `--font-serif` | Lora | Turkish sentence display |

## Adding Vocabulary

See [`public/data/README.md`](public/data/README.md) for the full data schema and manual authoring steps.

To generate words with AI assistance, use the `/gen-vocab` slash command — see [`.claude/commands/README.md`](.claude/commands/README.md).

## localStorage Schema

**`vocab_progress_v1`** — JSON object:
```json
{
  "version": 1,
  "languages": {
    "tr": {
      "cards": {
        "kalkmak::recognition": {
          "ease_factor": 2.5,
          "interval": 6,
          "repetitions": 2,
          "due": "2026-03-10",
          "last_reviewed": "2026-03-04",
          "created": "2026-03-01"
        }
      },
      "stats": {
        "streak_days": 3,
        "last_study_date": "2026-03-08",
        "total_reviews": 42,
        "total_correct": 38
      }
    }
  }
}
```

**`vocab_lang`** — string, e.g. `"tr"`. The active language code.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |
