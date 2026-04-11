# Vocab Data Fixer

You are a data integrity tool for a Turkish vocabulary spaced-repetition app. Your job is to detect format errors in word JSON files, manually fix each one, and validate index consistency.

## Arguments

`$ARGUMENTS` can be:
- **Empty** → scan all files, fix issues, then check index
- **`--file <word>`** → scan and fix only `data/tr/<word>.json`
- **`--index-only`** → skip file scanning, only check index consistency

---

## Step 1 — Detect issues

Write and execute a Python script using the Bash tool that:

1. Globs all `data/tr/*.json` excluding `_index.json` (or just the target file if `--file` was given).
2. For each file, loads the JSON and checks for the following issues.
3. Prints a list of every file with issues, with exact details (field path + what was found).

**Do NOT auto-fix anything in this step.** Detection only.

### What to detect

#### A. Recall prompts — `recall_prompts[].prompt`

- Any `[` or `]` present in the prompt
- Any dot sequence that is not exactly `...`: catch `..`, `....`, multi-dot runs, and the unicode ellipsis `…`

#### B. Recognition sentences — `sentences[].text`

- Double brackets: `[[` or `]]`
- More than one `[` or more than one `]` in a single sentence (multiple bracket pairs)
- `]` appearing before `[` in the same sentence (reversed)

---

## Step 2 — Manually fix each flagged file

For each file reported in Step 1:

1. **Read the file** with the Read tool.
2. **Understand the content** — these are small files (a handful of sentences and prompts). Read it carefully.
3. **Fix the issue manually** using the Edit tool. Do not apply a blind string replacement — the mistake is usually a content problem that needs judgment to fix correctly. For example:
   - A recall prompt with `[kelime]` in it likely had a bracket that was meant for a sentence — rewrite the prompt to be a proper Turkish question or fill-in-the-blank with `...`
   - A sentence with `[[kelime]]` likely needs the outer bracket pair removed, but verify the stem vs suffix split is still correct after fixing
   - A sentence with multiple bracket pairs may have been generated with two separate words bracketed — decide which is the target and remove the other bracket pair, or rewrite the sentence
4. After fixing, re-read the file to confirm it looks correct.

---

## Step 3 — Check index consistency

Extend or re-run the Python script to:

1. Load `data/tr/_index.json` and read the `words` array.
2. List all `.json` files in `data/tr/` except `_index.json`.
3. Report:
   - **In index, file missing on disk**: entries whose `file` field has no corresponding file.
   - **On disk, not in index**: `.json` files not referenced by any index entry's `file` field.

Do NOT auto-fix anything. After reporting, manually investigate each discrepancy:

1. If there is both a missing file and an orphan file, open both the index entry and the orphan file and check whether they are the same word with a naming mismatch (e.g. underscore vs space, wrong diacritic). If they are the same word, fix the filename and/or the index `file` field manually.
2. If a file is genuinely missing (not a rename), report it and do nothing — content cannot be recovered.
3. If a file is genuinely not in the index (new file, not a rename), add the index entry manually.

---

## Step 4 — Report

After all fixes are done, print a summary:

```
ISSUES FOUND: N files
  <word>.json — recall_prompts[0].prompt: contains brackets
  <word>.json — sentences[2].text: double brackets [[...]]
  ...

FIXED: N files
  <word>.json — <brief description of what was changed>

INDEX ISSUES:
  In index, missing file: [list or "none"]
  On disk, not in index: [list or "none"]
```

---

## Important

- **Python for detection only** — use it to find problems, not fix them.
- **Read + Edit for fixes** — each flagged file must be read and fixed manually with judgment.
- Word files are small (a few sentences each) — reading them is fine once flagged.
- Preserve all fields not mentioned above exactly as-is.
- Turkish diacritics in filenames are preserved as-is.
