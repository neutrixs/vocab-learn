#!/usr/bin/env python3
"""Generate or ingest one daily Turkish reading text ("metin").

This file serves TWO consumers that share the same validation + file/index
mechanics but differ in how the passage is produced:

  • Server cron (Anthropic API) — `--generate` (default). Calls the API with
    tool-use to get a structured passage, validates it, writes the file + index.
    Requires ANTHROPIC_API_KEY.

  • Claude Code cron — Claude Code writes the passage itself (no API key), saves
    it to a JSON file, then calls `--ingest` to run the SAME validation and the
    SAME file/index writing. No ANTHROPIC_API_KEY needed for this path.

The writing rules the passage must follow live in `metin/spec.md` (single source
of truth, shared by both paths).

Modes
-----
  --pick                Print the chosen (topic, subtopic) pair + labels as JSON
                        and exit. No API key. Used by the Claude Code path to
                        learn what to write.
  --generate (default)  Generate via the Anthropic API, validate, write.
                        Requires ANTHROPIC_API_KEY.
  --ingest FILE         Validate a pre-generated {title, body, vocab} JSON file
                        and write it + update the index. No API key.

Run `python scripts/gen_metin.py --help` for the full flag list.

Pair selection (all modes): if --topic/--subtopic are omitted, the pair is
chosen deterministically by date:  index = days_since_epoch mod (#subtopics).

Output: data/{lang}/texts/{YYYY-MM-DD}_{topic}_{subtopic}.json, plus a prepended
entry in data/{lang}/texts/_index.json.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = REPO_ROOT / "metin" / "spec.md"
DEFAULT_LANG = "tr"
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000

BRACKET_RE = re.compile(r"\[([^\]\[|]+)\|([^\]\[|]+)\]")

# Tool exposed to the API so the passage comes back as structured input rather
# than free-form text we have to parse. Mirrors the "Output shape" in spec.md.
SUBMIT_TOOL = {
    "name": "submit_reading_text",
    "description": "Submit the finished Turkish reading passage.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Turkish title."},
            "body": {
                "type": "string",
                "description": (
                    "Turkish passage with [display|lemma] brackets and \\n\\n "
                    "between paragraphs."
                ),
            },
            "vocab": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Distinct dictionary-form lemmas bracketed in body, in order "
                    "of first appearance."
                ),
            },
        },
        "required": ["title", "body", "vocab"],
    },
}


# --------------------------------------------------------------------------- #
# Data loading                                                                #
# --------------------------------------------------------------------------- #
def load_topics(lang: str) -> dict:
    path = REPO_ROOT / "data" / lang / "texts" / "_topics.json"
    return json.loads(path.read_text(encoding="utf-8"))


def load_word_index(lang: str) -> list[dict]:
    path = REPO_ROOT / "data" / lang / "_index.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("words", [])


def load_texts_index(lang: str) -> dict:
    path = REPO_ROOT / "data" / lang / "texts" / "_index.json"
    if not path.exists():
        return {"lang": lang, "texts": []}
    return json.loads(path.read_text(encoding="utf-8"))


def save_texts_index(lang: str, index: dict) -> None:
    path = REPO_ROOT / "data" / lang / "texts" / "_index.json"
    path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- #
# Pair selection (shared by all modes)                                        #
# --------------------------------------------------------------------------- #
def flatten_subtopics(topics: dict) -> list[tuple[dict, dict]]:
    out: list[tuple[dict, dict]] = []
    for topic in topics["topics"]:
        for sub in topic["subtopics"]:
            out.append((topic, sub))
    return out


def pick_pair_for_date(topics: dict, date: dt.date) -> tuple[dict, dict]:
    pairs = flatten_subtopics(topics)
    if not pairs:
        raise SystemExit("No subtopics defined in _topics.json")
    days = (date - dt.date(1970, 1, 1)).days
    idx = days % len(pairs)
    return pairs[idx]


def find_pair(topics: dict, topic_id: str, subtopic_id: str) -> tuple[dict, dict]:
    for topic in topics["topics"]:
        if topic["id"] != topic_id:
            continue
        for sub in topic["subtopics"]:
            if sub["id"] == subtopic_id:
                return topic, sub
        raise SystemExit(f"Subtopic '{subtopic_id}' not found under topic '{topic_id}'")
    raise SystemExit(f"Topic '{topic_id}' not found")


def resolve_pair(lang: str, topic_id: str | None, subtopic_id: str | None,
                 date: dt.date) -> tuple[dict, dict]:
    """Return the (topic, subtopic) pair: explicit if given, else date-based."""
    topics = load_topics(lang)
    if topic_id:
        return find_pair(topics, topic_id, subtopic_id)  # type: ignore[arg-type]
    return pick_pair_for_date(topics, date)


def label_field_for(lang: str) -> str:
    return "label_tr" if lang == "tr" else "label_en"


# --------------------------------------------------------------------------- #
# Prompt assembly (API path only)                                             #
# --------------------------------------------------------------------------- #
def load_spec() -> str:
    if not SPEC_PATH.exists():
        raise SystemExit(f"Spec not found: {SPEC_PATH.relative_to(REPO_ROOT)}")
    return SPEC_PATH.read_text(encoding="utf-8").strip()


def build_words_json(words: list[dict]) -> str:
    slim = [
        {"word": w["word"], "difficulty": w.get("difficulty", 1), "pos": w.get("part_of_speech", "")}
        for w in words
    ]
    return json.dumps(slim, ensure_ascii=False)


def build_user_prompt(topic: dict, sub: dict, lang: str) -> str:
    label = label_field_for(lang)
    return (
        f"Topic: **{topic[label]}** ({topic['id']})\n"
        f"Subtopic: **{sub[label]}** ({sub['id']})\n\n"
        "Write a short Turkish reading passage for this subtopic, following the "
        "spec exactly. A word index is provided as a separate cached block — "
        "prefer lemmas that already appear there. Submit the result by calling "
        "the submit_reading_text tool."
    )


def call_anthropic(system: str, user: str, words_json: str) -> dict:
    """Call the API with tool-use and return the submitted {title, body, vocab}."""
    try:
        import anthropic  # type: ignore
    except ImportError:
        raise SystemExit(
            "anthropic package not installed. Run: pip install -r scripts/requirements.txt"
        )

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise SystemExit("ANTHROPIC_API_KEY not set in environment")

    client = anthropic.Anthropic(api_key=api_key)

    # Prompt caching: put the (large, stable) word index in a cached system block
    # and the (small, varying) instructions in a separate block.
    system_blocks = [
        {"type": "text", "text": system},
        {
            "type": "text",
            "text": f"Word index (authoritative lemma list):\n```json\n{words_json}\n```",
            "cache_control": {"type": "ephemeral"},
        },
    ]

    resp = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_blocks,
        tools=[SUBMIT_TOOL],
        tool_choice={"type": "tool", "name": SUBMIT_TOOL["name"]},
        messages=[{"role": "user", "content": user}],
    )

    for block in resp.content:
        if getattr(block, "type", None) == "tool_use" and block.name == SUBMIT_TOOL["name"]:
            return block.input  # type: ignore[return-value]
    raise SystemExit("Model did not return a submit_reading_text tool call")


# --------------------------------------------------------------------------- #
# Validation (shared by --generate and --ingest)                              #
# --------------------------------------------------------------------------- #
def validate(payload: dict, words: list[dict]) -> list[str]:
    """Validate a {title, body, vocab} payload. Returns the bracketed lemmas not
    yet present in the word DB (allowed — they render as plain text in the app
    until their dictionary entries are generated). Raises SystemExit on any hard
    error so both the API and Claude Code paths fail loudly and identically."""
    for key in ("title", "body", "vocab"):
        if key not in payload:
            raise SystemExit(f"Missing key: {key}")
    if not isinstance(payload["title"], str) or not payload["title"].strip():
        raise SystemExit("title must be a non-empty string")
    if not isinstance(payload["body"], str) or not payload["body"].strip():
        raise SystemExit("body must be a non-empty string")
    if not isinstance(payload["vocab"], list) or not payload["vocab"]:
        raise SystemExit("vocab must be a non-empty list")

    body = payload["body"]
    if "[[" in body:
        raise SystemExit("body contains '[[' (nested brackets are not allowed)")

    # Verify brackets are well-formed. Lemmas are NOT required to already exist in
    # the word DB — a relevant word may be marked now and have its dictionary entry
    # generated later. Missing lemmas are reported as a warning (see below).
    lemma_set = {w["word"].lower() for w in words}
    seen_lemmas: list[str] = []
    seen_lemmas_set: set[str] = set()
    missing: list[str] = []
    for match in BRACKET_RE.finditer(body):
        display, lemma = match.group(1), match.group(2)
        if not display.strip() or not lemma.strip():
            raise SystemExit(f"Empty bracket part in: {match.group(0)}")
        if lemma not in seen_lemmas_set:
            seen_lemmas_set.add(lemma)
            seen_lemmas.append(lemma)
            if lemma.lower() not in lemma_set:
                missing.append(lemma)

    # Detect stray brackets / pipes outside the well-formed token.
    stripped = BRACKET_RE.sub("X", body)
    if "[" in stripped or "]" in stripped or "|" in stripped:
        raise SystemExit("body contains stray '[', ']' or '|' outside [display|lemma] tokens")

    vocab_decl = payload["vocab"]
    if [v.lower() for v in vocab_decl] != [v.lower() for v in seen_lemmas]:
        raise SystemExit(
            "vocab does not match lemmas in body order.\n"
            f"  vocab: {vocab_decl}\n  body lemmas: {seen_lemmas}"
        )

    distinct = len(seen_lemmas)
    if distinct < 8 or distinct > 15:
        raise SystemExit(f"Expected 8–15 distinct bracketed lemmas, got {distinct}")

    # Word count (rough — split on whitespace).
    plain = BRACKET_RE.sub(lambda m: m.group(1), body)
    word_count = len([t for t in re.split(r"\s+", plain) if t])
    if word_count < 130 or word_count > 280:
        raise SystemExit(f"body length out of range: {word_count} words (target 150–250)")

    if missing:
        print(
            "⚠ "
            + str(len(missing))
            + " bracketed lemma(s) are not yet in the word DB and will render as "
            "plain text in the app until generated: "
            + ", ".join(missing),
            file=sys.stderr,
        )

    return missing


# --------------------------------------------------------------------------- #
# Write file + index (shared by --generate and --ingest)                      #
# --------------------------------------------------------------------------- #
def write_text(payload: dict, topic: dict, sub: dict, lang: str, date: dt.date,
               *, force: bool) -> Path:
    """Write the passage file and prepend its index entry. Returns the file path."""
    text_id = f"{date.isoformat()}_{topic['id']}_{sub['id']}"
    out_path = REPO_ROOT / "data" / lang / "texts" / f"{text_id}.json"

    if out_path.exists() and not force:
        raise SystemExit(f"{out_path.relative_to(REPO_ROOT)} already exists (use --force to overwrite)")

    entry = {
        "id": text_id,
        "lang": lang,
        "date": date.isoformat(),
        "topic": topic["id"],
        "subtopic": sub["id"],
        "title": payload["title"].strip(),
        "body": payload["body"].strip(),
        "vocab": [v.lower() for v in payload["vocab"]],
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ Wrote {out_path.relative_to(REPO_ROOT)}")

    index = load_texts_index(lang)
    index["texts"] = [
        {
            "id": text_id,
            "date": date.isoformat(),
            "topic": topic["id"],
            "subtopic": sub["id"],
            "title": entry["title"],
            "file": f"{text_id}.json",
        }
    ] + [t for t in index.get("texts", []) if t.get("id") != text_id]
    save_texts_index(lang, index)
    print(f"✓ Updated data/{lang}/texts/_index.json")
    return out_path


def report_missing(missing: list[str]) -> None:
    # FUTURE: generate dictionary entries for any lemmas not yet in the DB so the
    # app can make them tappable. For now we only report them — the reader renders
    # unknown lemmas as plain text, so the text is still fully usable.
    if missing:
        print(
            f"  ↳ {len(missing)} lemma(s) still need word files: " + ", ".join(missing),
            file=sys.stderr,
        )


# --------------------------------------------------------------------------- #
# Modes                                                                       #
# --------------------------------------------------------------------------- #
def mode_pick(args: argparse.Namespace, date: dt.date) -> None:
    topic, sub = resolve_pair(args.lang, args.topic, args.subtopic, date)
    label = label_field_for(args.lang)
    print(json.dumps({
        "date": date.isoformat(),
        "lang": args.lang,
        "topic": topic["id"],
        "topic_label": topic[label],
        "subtopic": sub["id"],
        "subtopic_label": sub[label],
        "id": f"{date.isoformat()}_{topic['id']}_{sub['id']}",
    }, ensure_ascii=False, indent=2))


def mode_generate(args: argparse.Namespace, date: dt.date) -> None:
    topic, sub = resolve_pair(args.lang, args.topic, args.subtopic, date)

    text_id = f"{date.isoformat()}_{topic['id']}_{sub['id']}"
    out_path = REPO_ROOT / "data" / args.lang / "texts" / f"{text_id}.json"
    if out_path.exists() and not args.force and not args.dry_run:
        raise SystemExit(f"{out_path.relative_to(REPO_ROOT)} already exists (use --force to overwrite)")

    words = load_word_index(args.lang)
    if not words:
        raise SystemExit(f"No words found in data/{args.lang}/_index.json")

    system = load_spec()
    user_prompt = build_user_prompt(topic, sub, args.lang)
    words_json = build_words_json(words)

    print(f"→ Generating text for {date.isoformat()} · {topic['id']}/{sub['id']}", file=sys.stderr)
    payload = call_anthropic(system, user_prompt, words_json)
    missing = validate(payload, words)

    if args.dry_run:
        entry = {
            "id": text_id, "lang": args.lang, "date": date.isoformat(),
            "topic": topic["id"], "subtopic": sub["id"],
            "title": payload["title"].strip(), "body": payload["body"].strip(),
            "vocab": [v.lower() for v in payload["vocab"]],
        }
        print(json.dumps(entry, ensure_ascii=False, indent=2))
        report_missing(missing)
        return

    write_text(payload, topic, sub, args.lang, date, force=args.force)
    report_missing(missing)


def mode_ingest(args: argparse.Namespace, date: dt.date) -> None:
    in_path = Path(args.ingest)
    if not in_path.exists():
        raise SystemExit(f"Ingest file not found: {in_path}")
    try:
        payload = json.loads(in_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise SystemExit(f"Ingest file is not valid JSON: {e}")

    topic, sub = resolve_pair(args.lang, args.topic, args.subtopic, date)
    words = load_word_index(args.lang)
    if not words:
        raise SystemExit(f"No words found in data/{args.lang}/_index.json")

    missing = validate(payload, words)

    if args.dry_run:
        print("✓ Valid (dry run — nothing written)")
        report_missing(missing)
        return

    write_text(payload, topic, sub, args.lang, date, force=args.force)
    report_missing(missing)


# --------------------------------------------------------------------------- #
# CLI                                                                         #
# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="gen_metin.py",
        description="Generate or ingest one daily Turkish reading text (\"metin\").",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
modes:
  (default)            Generate via the Anthropic API (needs ANTHROPIC_API_KEY),
                       validate, and write the file + index.
  --pick               Print the chosen topic/subtopic + labels as JSON and exit
                       (no API key). The Claude Code path uses this to learn what
                       to write.
  --ingest FILE        Validate a pre-generated {title, body, vocab} JSON file and
                       write it + update the index (no API key). The Claude Code
                       path uses this after writing the passage itself.

examples:
  # Server cron — generate today's text via the API
  python scripts/gen_metin.py

  # Preview without writing
  python scripts/gen_metin.py --dry-run

  # Force a specific pair and date
  python scripts/gen_metin.py --topic health --subtopic hospital-visit --date 2026-06-29

  # Claude Code cron — step 1: what should I write today?
  python scripts/gen_metin.py --pick

  # Claude Code cron — step 2 (after writing out.json yourself):
  python scripts/gen_metin.py --ingest out.json --topic health --subtopic hospital-visit

The writing rules the passage must follow live in metin/spec.md.
""",
    )
    parser.add_argument("--pick", action="store_true",
                        help="print chosen topic/subtopic as JSON and exit (no API key)")
    parser.add_argument("--ingest", metavar="FILE",
                        help="validate + write a pre-generated JSON passage (no API key)")
    parser.add_argument("--topic", help="topic ID (defaults to date-based round-robin)")
    parser.add_argument("--subtopic", help="subtopic ID (defaults to date-based round-robin)")
    parser.add_argument("--date", help="YYYY-MM-DD (defaults to today)")
    parser.add_argument("--lang", default=DEFAULT_LANG, help="language code (default: tr)")
    parser.add_argument("--dry-run", action="store_true",
                        help="validate/print but do not write any files")
    parser.add_argument("--force", action="store_true", help="overwrite an existing text file")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.pick and args.ingest:
        parser.error("--pick and --ingest are mutually exclusive")
    if (args.topic and not args.subtopic) or (args.subtopic and not args.topic):
        parser.error("--topic and --subtopic must be given together (or neither)")

    date = dt.date.fromisoformat(args.date) if args.date else dt.date.today()

    if args.pick:
        mode_pick(args, date)
    elif args.ingest:
        mode_ingest(args, date)
    else:
        mode_generate(args, date)


if __name__ == "__main__":
    main()
