# Claude Code Slash Commands

## /gen-vocab

AI-assisted vocabulary generator. Generates Turkish word JSON files and updates `_index.json`.

### Usage

```
/gen-vocab                          → auto-pick 5 common Turkish words
/gen-vocab 10                       → auto-pick 10 words
/gen-vocab yapmak okumak            → generate specific words
/gen-vocab --replace kalkmak        → regenerate (overwrite) an existing word
/gen-vocab 10 --lang tr             → specify language (default: tr)
```

### What It Does

1. Reads `public/data/tr/_index.json` to see which words already exist
2. Reads `public/data/_template.json` to confirm the schema
3. Generates word JSON for each requested word (or auto-picks if given a number)
4. Writes `public/data/tr/{word}.json` — skips existing files unless `--replace` is given
5. Adds new entries to `_index.json` (never removes existing entries)
6. Prints a summary: words written (✓), replaced (⟳), or skipped (✗)

### Key Constraints Enforced

- Turkish-only sentences and prompts — no English in study-facing content
- Target word (in an inflected form) must appear in `[square brackets]` in every sentence
- 3–5 sentences per word, 2+ recall prompts with 3–5 accepted forms each
- Turkish diacritics (ç ğ ı ö ş ü) are preserved in filenames

### Tips

- Switch to a cheaper/faster model (e.g. Haiku) before invoking for bulk generation of many words
- Use `--replace` to regenerate a word if the existing content has errors or poor quality
- After generation, spot-check a few files to confirm Turkish-only content and correct bracketing
