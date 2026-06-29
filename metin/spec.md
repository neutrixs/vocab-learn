# Metin generation spec

Single source of truth for **how a daily Turkish reading passage ("metin") is
written**. Harness-agnostic: the same rules apply whether the passage is written
by the Anthropic API (`scripts/gen_metin.py --generate`) or by Claude Code (the
`gen-metin` skill). Only the *delivery mechanics* differ between those two paths —
the writing rules below do not.

The reader is a **B1-level Turkish learner whose native language is English.**

## Writing rules

1. The `title` and `body` MUST be in Turkish.
2. The `body` is between **150 and 250** Turkish words.
3. Bracket the words you want the learner to study using this exact convention:
   `[display|lemma]`
   - `display` is the word **exactly as it appears in the sentence** — keep its
     inflection, suffixes, possessives, and capitalization.
   - `lemma` is the **dictionary headword** (citation form) of that word. THIS IS
     THE MOST IMPORTANT RULE. The lemma is what gets looked up in the dictionary,
     so it must be the base form, never an inflected form.
4. Lemma = dictionary form. Apply these rules strictly:
   - **Verbs → the infinitive ending in -mak / -mek.** Never a conjugated form.
     - `içiyorum` → lemma `içmek`
     - `gidiyoruz` → lemma `gitmek`
     - `öksürüyordu` → lemma `öksürmek`
     - `uyudu` → lemma `uyumak`
   - **Nouns → bare nominative singular** (strip possessives, plurals, cases).
     - `Boğazım` → lemma `boğaz`
     - `kitabımı` → lemma `kitap`
     - `Hastaneye` → lemma `hastane`
     - `evde` → lemma `ev`
   - **Adjectives/adverbs → bare base form.**
     - `güzeldi` → lemma `güzel`
     - `hızlıca` → lemma `hızlı`
   The lemma must be lowercase (with correct Turkish diacritics), even when the
   display form is capitalized at the start of a sentence.
5. Bracket **8 to 15 distinct lemmas**, all genuinely relevant to the requested
   subtopic. Do NOT bracket filler, function words, or anything unrelated — only
   words a learner would actually want to study for this subtopic. A lemma may be
   bracketed more than once if it recurs naturally; count distinct lemmas.
6. Prefer lemmas that appear in the provided word index (those already have
   dictionary entries). You MAY bracket a strongly relevant word that is not in
   the index, but only if its lemma is a correct dictionary form — its entry will
   be created later.
7. Never nest brackets. Never use `|` outside of a bracket. Never write `[[`.
8. Style: pick one of `dialog`, `vignette`, or `inner monologue` and commit to
   it. Use paragraphs separated by a blank line.

## Output shape

Produce an object with exactly these fields:

```json
{
  "title": "string",
  "body": "string with [display|lemma] brackets and \\n\\n between paragraphs",
  "vocab": ["lemma1", "lemma2", ...]
}
```

`vocab` MUST equal the set of distinct lemmas you bracketed in `body`, in order
of first appearance. Every entry in `vocab` is a dictionary-form lemma (rule 4),
never an inflected form.

> **Delivery differs by path, the shape does not:**
> - **API path** (`--generate`): this shape is enforced as a tool schema
>   (`submit_reading_text`); the model returns it as a tool call, not as prose.
> - **Claude Code path** (skill): write this object to a JSON file, then hand it
>   to `scripts/gen_metin.py --ingest`, which validates it and writes it into
>   `data/{lang}/texts/`.
