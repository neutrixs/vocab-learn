# Vocab Generator

You are a Turkish vocabulary content generator for a spaced-repetition flashcard app. Your job is to generate word data files following the exact schema below, then write them to disk and update the word index.

## Arguments

`$ARGUMENTS` can be:
- **A list of words** — e.g. `yapmak okumak çalışmak` → generate those specific words
- **A number** — e.g. `5` → auto-pick 5 useful Turkish words not already in the index
- **Empty** → auto-pick 5 words
- **A word + `--replace`** → overwrite that word's existing file if it exists
- **`--lang <code>`** — defaults to `tr`

Parse `$ARGUMENTS` now to determine: which words to generate, which language, and whether to replace existing files.

---

## Step 1 — Read existing state

1. Read `public/data/tr/_index.json` to see which words already exist.
2. Read `public/data/_template.json` to confirm the schema (for reference).
3. If auto-picking words, choose common Turkish vocabulary not already in the index — prefer everyday verbs, adjectives, and nouns useful for A1–B1 learners. Avoid duplicates.

---

## Step 2 — Generate word data

For **each word**, produce a JSON object matching this schema exactly:

```json
{
  "word": "TARGET_WORD",
  "lang": "tr",
  "difficulty": 1,
  "part_of_speech": "verb|noun|adjective|adverb|etc",
  "english_gloss": "concise English translation (shown only on Reveal)",
  "sentences": [
    { "id": "WORD_s1", "text": "Turkish sentence with [WORD_FORM] in brackets.", "note": null },
    { "id": "WORD_s2", "text": "Another sentence using [WORD_FORM].", "note": "optional grammar note" }
  ],
  "recall_prompts": [
    {
      "id": "WORD_r1",
      "prompt": "Turkish scenario or fill-in-blank question that requires the word",
      "accepted_forms": ["form1", "form2", "form3"],
      "note": null
    }
  ]
}
```

### Rules — follow these strictly:

**Sentences:**
- Write **3–5 sentences** per word
- Every sentence is in **Turkish only** — no English whatsoever in `text`
- The target word (in an appropriate inflected form) must appear **in square brackets** `[like this]` in every sentence
- Sentences should be natural, varied in structure, and showcase different grammatical contexts
- `note` can contain a brief Turkish grammar observation or be `null`
- IDs follow pattern: `{word}_s1`, `{word}_s2`, etc.

**Recall prompts:**
- Write **2 recall prompts** per word
- The `prompt` is a **Turkish-language scenario or fill-in-blank** that strongly implies the target word — written entirely in Turkish, no English
- `accepted_forms` lists 3–5 inflected forms the learner might correctly write (lowercased, trimmed)
- IDs follow pattern: `{word}_r1`, `{word}_r2`, etc.

**Difficulty:**
- 1 = common, everyday (A1–A2)
- 2 = intermediate (B1)
- 3 = advanced (B2+)

**File naming:** Use the word as-is for the filename — Turkish diacritics (ç, ğ, ı, ö, ş, ü) are preserved. Both `"word"` and `"file"` fields use the same spelling.

---

## Step 3 — Write files

For each generated word:

1. The filename is `{word}.json` — keep Turkish diacritics as-is (ç, ğ, ı, ö, ş, ü stay in the filename).
2. Check if `public/data/tr/{filename}.json` exists.
   - If it exists and `--replace` was NOT specified: **skip it** and note it was skipped.
   - If it exists and `--replace` was specified: overwrite it.
   - If it doesn't exist: create it.
3. Write the JSON with 2-space indentation.

---

## Step 4 — Update the index

Read `public/data/tr/_index.json`, then:
- For each newly written word, add an entry to `words[]` if not already present:
  ```json
  { "word": "TARGET_WORD", "file": "filename.json", "difficulty": 1, "part_of_speech": "verb", "tags": [] }
  ```
- Do **not** remove existing entries.
- Write the updated index back.

---

## Step 5 — Report

Print a concise summary:
- ✓ words written (with filename)
- ⟳ words replaced (if --replace used)
- ✗ words skipped (already existed, no --replace)
- Updated index entry count

---

## Important reminders

- **No English in sentences or prompts** — Turkish only in the study-facing fields
- **Always bracket the word form** in every sentence
- Keep `english_gloss` brief — it's a hint, not a dictionary entry
- The app fetches files at `/data/tr/{filename}` — filenames must match exactly what's in `_index.json`
