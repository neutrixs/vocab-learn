# TODO / Roadmap

Future work captured from the Metin (daily reading) feature + data-storage
discussion. Ordered by *when you'd actually need it*, not by effort.

---

## Next up — do this when texts start piling up (~500–1000 files)

### Server-built, paginated texts index
**Problem.** Every new text rewrites the whole committed `data/tr/texts/_index.json`
(it's prepended), and the frontend fetches the *entire* index to render the page.
At thousands of texts this becomes git churn + a fat payload on mobile. This is the
**only** part of the design that degrades with scale — flat files themselves are fine.

**Do:**
- Stop committing `_index.json`. Have the Go backend build the index by scanning
  `data/{lang}/texts/*.json` (cache in memory, invalidate on dir mtime).
- Add pagination + filtering to `GET /api/texts/{lang}`
  (e.g. `?topic=health&page=1&limit=30`).
- Update `MetinPage` / `MetinBrowse` to request pages/filters instead of the full list.

**Effort:** ~half a day. **Trigger:** index payload feels heavy or commits get noisy.

---

## When it grows / nice-to-have

### Auto-generate missing word files after a metin
Hook is already stubbed in `scripts/gen_metin.py` (search `FUTURE`). After writing a
text, for any bracketed lemma not in `data/{lang}/_index.json`, generate its word file
(reuse the `/gen-vocab` pipeline) and append to the word index. Then **every** highlighted
word in a fresh metin is guaranteed tappable, not just the ones that happened to exist.

### Bucket text files by year
`data/tr/texts/2026/2026-06-27_*.json` instead of one flat folder. Pure tidiness — the
server reads one file by name regardless. Touches the write path in `gen_metin.py` and the
path join in `internal/api/texts.go`.

### Server-built word index (drop committed `data/{lang}/_index.json`)
Same pattern as the texts index above, applied to words. Today, adding words rewrites
(and re-sorts) the ~310 KB `_index.json`, which makes diffs noisy, invites merge conflicts,
and ships a 310 KB payload to the client. Fix: have the backend build the word index by
scanning `data/{lang}/*.json` (cache in memory), and stop committing the file.

**Storage is NOT the reason to do this** — git delta-compresses the rewrites; 21 historical
index rewrites + all 2,196 word files pack into a 2.5 MB `.git`. Do it only if the diff
noise / merge conflicts / client payload bother you.

**Prerequisite / catch:** `tags` currently live *only* in the index, not in the word files
(`abi.json` has no `tags` key). Before the index can be regenerated from files, migrate
`tags` into each word file (one-time script), or accept dropping tags. Low priority since
words change rarely.

### Daily generation on a schedule
Currently manual (`python scripts/gen_metin.py`) or user-owned cron. For hands-off:
a server cron/systemd timer, or a scheduled CI job that runs the script, commits the new
text, and deploys.

### Highlight toggle as a global default
Today the highlight on/off preference is per-reader in `localStorage`. Could promote it to
a real setting in `SettingsPage` (synced via the `user_settings` table) so it follows the
account across devices.

### Richer text schema
Optional English translation reveal + comprehension questions per text. The per-text JSON
can grow these fields; the reader renders them when present. (Deliberately out of scope for v1.)

---

## Probably NOT needed — decisions recorded so they aren't re-litigated

### Move WORD data to SQLite
Considered for indexing/serving the ~2,200 word files. **Decision: not worth it at
current/expected scale** (no expectation of >10k words). All word data packs into ~2.4 MB
in git, and the server reads one file per request (`os.ReadFile`, O(1)).

Only revisit if words ever pass ~20–50k **or** you add binary media (audio/images). Then
load words into a *read-only* SQLite file (you already use SQLite for users/progress),
turning 2,200 files into one artifact and switching handlers from `os.ReadFile` to a query —
still shippable in git / as one build artifact so deploy stays "clone and run."

### Move TEXTS to SQLite
Same reasoning, stronger no: texts are offline-generated, immutable, and committed — flat
files + the server-built index (above) scale fine to tens of thousands. A DB would
reintroduce a generate→sync step and break "git clone = ready to run." Only if you someday
need full-text search across all texts.

---

### Background notes
- Word/text data lives in git **on purpose**: it's text, compresses well, and deploy is just
  `git clone`. ~2.5 MB packed today; a decade of daily texts adds only single-digit MB.
- **"Isn't rewriting the big `_index.json` every word-add bad?"** No — git delta-compresses
  successive versions. 21 index rewrites would be 3.2 MB stored naively, but the *entire*
  `.git` (those rewrites + all word files + code + history) is 2.5 MB. The downside of the
  committed monolithic index is diff noise / merge conflicts / client payload, not storage —
  see "Server-built word index" above for the fix.
- Vocab tooling: use the existing `/gen-vocab` and `/fix-vocab` skills (see `CLAUDE.md`).
