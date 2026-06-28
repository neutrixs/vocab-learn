#!/usr/bin/env python3
"""Generate one daily Turkish reading text via the Anthropic API.

Usage:
    python scripts/gen_metin.py [--topic ID --subtopic ID] [--date YYYY-MM-DD]
                                 [--lang tr] [--dry-run] [--force]

Picks a (topic, subtopic) pair deterministically by date if not given:
    index = (days_since_epoch) mod (number of subtopics)

Writes data/{lang}/texts/{YYYY-MM-DD}_{topic}_{subtopic}.json and prepends
an entry to data/{lang}/texts/_index.json.
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
DEFAULT_LANG = "tr"
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000

BRACKET_RE = re.compile(r"\[([^\]\[|]+)\|([^\]\[|]+)\]")


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


def load_prompt() -> tuple[str, str]:
    """Split metin_prompt.md into system and user sections."""
    path = REPO_ROOT / "scripts" / "prompts" / "metin_prompt.md"
    raw = path.read_text(encoding="utf-8")
    parts = raw.split("# User prompt", 1)
    if len(parts) != 2:
        raise SystemExit("metin_prompt.md must contain '# User prompt' divider")
    system = parts[0].replace("# System prompt", "", 1).strip()
    user_template = parts[1].strip()
    return system, user_template


def build_words_json(words: list[dict]) -> str:
    slim = [
        {"word": w["word"], "difficulty": w.get("difficulty", 1), "pos": w.get("part_of_speech", "")}
        for w in words
    ]
    return json.dumps(slim, ensure_ascii=False)


def call_anthropic(system: str, user: str, words_json: str) -> str:
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
        messages=[{"role": "user", "content": user}],
    )

    text_parts: list[str] = []
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(block.text)
    return "".join(text_parts).strip()


def extract_json(raw: str) -> dict:
    # Strip code fences if the model added them.
    s = raw.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        if s.endswith("```"):
            s = s.rsplit("```", 1)[0]
        s = s.strip()
    try:
        return json.loads(s)
    except json.JSONDecodeError as e:
        raise SystemExit(f"Model output is not valid JSON: {e}\n--- raw ---\n{raw}")


def validate(payload: dict, words: list[dict]) -> list[str]:
    """Validate the model output. Returns the list of bracketed lemmas that are
    not yet present in the word DB (these are allowed; they render as plain text
    in the app until their dictionary entries are generated)."""
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a daily Turkish reading text.")
    parser.add_argument("--topic", help="Topic ID (defaults to date-based round-robin)")
    parser.add_argument("--subtopic", help="Subtopic ID (defaults to date-based round-robin)")
    parser.add_argument("--date", help="YYYY-MM-DD (defaults to today)")
    parser.add_argument("--lang", default=DEFAULT_LANG, help="Language code (default: tr)")
    parser.add_argument("--dry-run", action="store_true", help="Print JSON to stdout instead of writing")
    parser.add_argument("--force", action="store_true", help="Overwrite existing file")
    args = parser.parse_args()

    if (args.topic and not args.subtopic) or (args.subtopic and not args.topic):
        parser.error("--topic and --subtopic must be given together (or neither)")

    date = dt.date.fromisoformat(args.date) if args.date else dt.date.today()

    topics = load_topics(args.lang)
    if args.topic:
        topic, sub = find_pair(topics, args.topic, args.subtopic)
    else:
        topic, sub = pick_pair_for_date(topics, date)

    text_id = f"{date.isoformat()}_{topic['id']}_{sub['id']}"
    out_path = REPO_ROOT / "data" / args.lang / "texts" / f"{text_id}.json"

    if out_path.exists() and not args.force and not args.dry_run:
        raise SystemExit(f"{out_path.relative_to(REPO_ROOT)} already exists (use --force to overwrite)")

    words = load_word_index(args.lang)
    if not words:
        raise SystemExit(f"No words found in data/{args.lang}/_index.json")

    system, user_template = load_prompt()
    label_field = "label_tr" if args.lang == "tr" else "label_en"
    user_prompt = (
        user_template
        .replace("{topic_label}", topic[label_field])
        .replace("{topic_id}", topic["id"])
        .replace("{subtopic_label}", sub[label_field])
        .replace("{subtopic_id}", sub["id"])
        .replace("{words_json}", "")  # word list is sent in the cached system block
        .strip()
    )
    words_json = build_words_json(words)

    print(f"→ Generating text for {date.isoformat()} · {topic['id']}/{sub['id']}", file=sys.stderr)
    raw = call_anthropic(system, user_prompt, words_json)
    payload = extract_json(raw)
    missing = validate(payload, words)

    entry = {
        "id": text_id,
        "lang": args.lang,
        "date": date.isoformat(),
        "topic": topic["id"],
        "subtopic": sub["id"],
        "title": payload["title"].strip(),
        "body": payload["body"].strip(),
        "vocab": [v.lower() for v in payload["vocab"]],
    }

    if args.dry_run:
        print(json.dumps(entry, ensure_ascii=False, indent=2))
        return

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ Wrote {out_path.relative_to(REPO_ROOT)}")

    index = load_texts_index(args.lang)
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
    save_texts_index(args.lang, index)
    print(f"✓ Updated data/{args.lang}/texts/_index.json")

    # FUTURE: generate dictionary entries for any lemmas not yet in the DB so the
    # app can make them tappable. For now we only report them — the reader renders
    # unknown lemmas as plain text, so the text is still fully usable.
    if missing:
        print(
            f"  ↳ {len(missing)} lemma(s) still need word files: " + ", ".join(missing),
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
