---
name: gen-metin
description: Generate today's daily Turkish reading text ("metin") as Claude Code (no API key) and write it into data/tr/texts/. Use for the Claude Code cron path. For the server/API path, run scripts/gen_metin.py --generate directly instead.
---

# Generate a daily metin (Claude Code path)

You write the passage yourself (no Anthropic API key needed) and reuse the
project's Python script for the deterministic parts — pair selection, validation,
and writing the file + index. The writing rules are the single source of truth in
`metin/spec.md`; do **not** restate or improvise them.

## Steps

1. **Read the rules.** Read `metin/spec.md` in full. Every constraint there
   (bracket convention, lemma = dictionary form, 8–15 distinct lemmas, 150–250
   words, style) is binding.

2. **Pick the topic.** Run:
   ```bash
   python scripts/gen_metin.py --pick
   ```
   This prints today's `{topic, topic_label, subtopic, subtopic_label, id}` as
   JSON. (Add `--date YYYY-MM-DD` or `--topic X --subtopic Y` to override.)

3. **See which lemmas already have entries.** Skim the word index so you can
   prefer existing lemmas (rule 6). Load it programmatically — never Read it
   directly, it is huge:
   ```bash
   python -c "import json; print(json.dumps([w['word'] for w in json.load(open('data/tr/_index.json'))['words']], ensure_ascii=False))" | head -c 4000
   ```

4. **Write the passage** for the chosen subtopic, following `metin/spec.md`
   exactly. Save it as a JSON object `{title, body, vocab}` to a scratch file,
   e.g. `/tmp/metin_out.json`.

5. **Validate + write via the shared script** (this runs the SAME validation the
   API path uses, then writes the file + updates the index — no API key):
   ```bash
   python scripts/gen_metin.py --ingest /tmp/metin_out.json \
       --topic <topic> --subtopic <subtopic>
   ```
   Pass the same `--topic`/`--subtopic` (and `--date` if you overrode it) you got
   from `--pick`.

6. **If validation fails**, the script exits with a specific error (bad lemma
   count, stray brackets, length out of range, vocab/body mismatch). Fix the
   passage and re-run `--ingest`. Do not edit the data files by hand.

## Notes

- A warning that some lemmas "are not yet in the word DB" is **not** an error —
  those words render as plain text until their dictionary entries exist. The text
  is still written and usable.
- Use `--dry-run` with `--ingest` to validate without writing while iterating.
