# Vocabulary Data

How word content is structured, so you can add or edit words manually or via tooling.

## Directory Layout

```
public/data/
├── _template.json        # Schema reference — not loaded by the app
└── tr/                   # One directory per language code (ISO 639-1)
    ├── _index.json       # Word registry
    └── *.json            # One file per word
```

## `_index.json`

Registry of all words for a language. The app fetches this first to build the study session.

```json
{
  "lang": "tr",
  "words": [
    {
      "word": "kalkmak",
      "file": "kalkmak.json",
      "difficulty": 1,
      "part_of_speech": "verb",
      "tags": ["movement", "daily"]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `lang` | string | ISO 639-1 language code (`"tr"`) |
| `words` | array | Ordered list of word entries |
| `word` | string | Canonical spelling (diacritics preserved) |
| `file` | string | Filename — must match the actual file exactly |
| `difficulty` | 1–3 | See difficulty levels below |
| `part_of_speech` | string | `verb`, `noun`, `adjective`, `adverb`, etc. |
| `tags` | string[] | Optional topic tags, may be empty |

## Per-Word JSON (`{word}.json`)

One file per word. The filename equals the word spelling (Turkish diacritics preserved).

```json
{
  "word": "kalkmak",
  "lang": "tr",
  "difficulty": 1,
  "part_of_speech": "verb",
  "english_gloss": "to get up, to rise, to leave",
  "sentences": [
    {
      "id": "kalkmak_s1",
      "text": "Her sabah erken [kalkıyorum].",
      "note": null
    },
    {
      "id": "kalkmak_s2",
      "text": "Uçak saat ikide [kalkacak].",
      "note": "kalkacak: future tense"
    }
  ],
  "recall_prompts": [
    {
      "id": "kalkmak_r1",
      "prompt": "Sabah alarm çaldığında ne yaparsın?",
      "accepted_forms": ["kalkarım", "kalkıyorum", "kalktım", "kalktı", "kalkar"],
      "note": null
    }
  ]
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `word` | string | Canonical spelling — matches filename and `_index.json` |
| `lang` | string | Language code |
| `difficulty` | 1–3 | See difficulty levels below |
| `part_of_speech` | string | Grammatical category |
| `english_gloss` | string | Brief English translation — **shown only on Reveal** |
| `sentences` | array | 3–5 example sentences in Turkish |
| `sentences[].id` | string | Unique ID: `{word}_s1`, `{word}_s2`, … |
| `sentences[].text` | string | Turkish sentence — target word in `[brackets]` |
| `sentences[].note` | string \| null | Optional grammar note |
| `recall_prompts` | array | 2+ prompts for active recall |
| `recall_prompts[].id` | string | Unique ID: `{word}_r1`, `{word}_r2`, … |
| `recall_prompts[].prompt` | string | Turkish-language prompt or fill-in-the-blank |
| `recall_prompts[].accepted_forms` | string[] | 3–5 valid answers, lowercased |
| `recall_prompts[].note` | string \| null | Optional hint shown after answer |

## Rules

These are enforced by `/gen-vocab` and expected by the app:

- **Turkish only in study-facing fields** — `sentences[].text` and `recall_prompts[].prompt` must contain no English
- **Bracket the word** — the target word (in an appropriate inflected form) must appear in `[square brackets]` in every sentence
- **3–5 sentences** per word
- **2+ recall prompts** per word, each with **3–5 accepted forms** (lowercased, trimmed)
- **`english_gloss` stays brief** — it's a hint shown after reveal, not a dictionary entry

## Filename Convention

- Filename = the word spelling, e.g. `içmek.json` (not `icmek.json`)
- Turkish diacritics (ç ğ ı ö ş ü) are **preserved** in filenames
- `fetch()` automatically percent-encodes non-ASCII characters — no normalization is needed in code
- The `"file"` field in `_index.json` must match the actual filename **exactly**
- Do **not** normalize diacritics — different words can differ only by a diacritic (e.g. `durum` ≠ `dürüm`)

## Difficulty Levels

| Level | CEFR | Description |
|-------|------|-------------|
| `1` | A1–A2 | Common everyday vocabulary |
| `2` | B1 | Intermediate — useful but less frequent |
| `3` | B2+ | Advanced — formal, abstract, or literary |

## Adding Words Manually

1. Copy `public/data/_template.json` to `public/data/tr/{word}.json` (keep diacritics in filename)
2. Fill in all fields following the schema above
3. Write 3–5 Turkish sentences with the word in `[brackets]`
4. Write 2+ Turkish recall prompts with `accepted_forms` (lowercased)
5. Add an entry to `public/data/tr/_index.json` under `"words"`:
   ```json
   { "word": "sözcük", "file": "sözcük.json", "difficulty": 1, "part_of_speech": "noun", "tags": [] }
   ```
6. Restart the dev server — the word will appear in the next session

## Adding Words via /gen-vocab

Use the `/gen-vocab` slash command in Claude Code to generate word files automatically. See [`.claude/commands/README.md`](../../.claude/commands/README.md) for usage.
