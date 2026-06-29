import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { WordPreviewModal } from './WordPreviewModal';
import { useLanguage } from '../../context/LanguageContext';
import { useProgress } from '../../context/ProgressContext';
import { loadText, loadIndex, preloadWords } from '../../lib/dataLoader';
import { getLocale } from '../../lib/locale';
import type { TextEntry } from '../../types/text';

interface MetinReaderProps {
  textId: string;
  onBack: () => void;
}

// Matches `[display|lemma]` tokens. Disallows nested `[` or `]` in either side.
const BRACKET_RE = /(\[[^\][|]+\|[^\][|]+\])/g;

const HIGHLIGHT_PREF_KEY = 'metin_highlight';

/**
 * Renders a paragraph, turning `[display|lemma]` tokens into tappable highlights.
 * A word is only highlighted/clickable when its lemma exists in the word DB
 * (`known`) AND highlighting is enabled. Otherwise the plain inflected form is
 * shown — unknown lemmas always render as plain prose.
 */
function renderParagraph(
  text: string,
  known: Set<string>,
  highlight: boolean,
  onWordClick: (lemma: string) => void,
): ReactNode[] {
  const parts = text.split(BRACKET_RE);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']') && part.includes('|')) {
      const inner = part.slice(1, -1);
      const pipe = inner.indexOf('|');
      const display = inner.slice(0, pipe);
      const lemma = inner.slice(pipe + 1);
      if (highlight && known.has(lemma.toLowerCase())) {
        return (
          <button
            key={i}
            type="button"
            className="word-highlight word-highlight--tappable"
            onClick={() => onWordClick(lemma)}
          >
            {display}
          </button>
        );
      }
      // Highlighting off, or word not in the DB → just show the plain form.
      return <span key={i}>{display}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function MetinReader({ textId, onBack }: MetinReaderProps) {
  const { lang } = useLanguage();
  const { recordTextRead, isTextRead } = useProgress();
  const t = getLocale(lang);
  const [text, setText] = useState<TextEntry | null>(null);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [openLemma, setOpenLemma] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<boolean>(
    () => localStorage.getItem(HIGHLIGHT_PREF_KEY) !== 'off',
  );

  function toggleHighlight() {
    setHighlight((on) => {
      const next = !on;
      localStorage.setItem(HIGHLIGHT_PREF_KEY, next ? 'on' : 'off');
      if (!next) setOpenLemma(null);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    // text/error start null on mount; the parent keys this component on textId,
    // so navigating to another text remounts and resets them (no in-effect reset).
    // Load the text and the word index in parallel. The index is the source of
    // truth for which lemmas exist; only those become tappable.
    Promise.all([loadText(lang, textId), loadIndex(lang)])
      .then(([entry, index]) => {
        if (cancelled) return;
        const dbWords = new Set(index.words.map((w) => w.word.toLowerCase()));
        const present = (entry.vocab ?? []).filter((v) => dbWords.has(v.toLowerCase()));
        setText(entry);
        setKnown(new Set(present.map((v) => v.toLowerCase())));
        // Warm the cache for the words that actually exist so the modal is instant.
        if (present.length) {
          preloadWords(lang, present).catch(() => {});
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
      });
    return () => { cancelled = true; };
  }, [lang, textId]);

  const paragraphs = useMemo(() => {
    if (!text) return [];
    return text.body.split(/\n\n+/).filter((p) => p.trim().length > 0);
  }, [text]);

  const read = isTextRead(lang, textId);

  return (
    <div className="page metin-reader-page">
      <div className="metin-reader-toolbar">
        <Button variant="ghost" onClick={onBack}>{t.metin_back}</Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleHighlight}
          aria-pressed={highlight}
        >
          {highlight ? t.metin_highlight_hide : t.metin_highlight_show}
        </Button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!text && !error && <p className="text-secondary">{t.loading}</p>}

      {text && (
        <Card className="metin-reader-card">
          <h2 className="metin-reader-title">{text.title}</h2>
          <div className="metin-reader-meta">
            <span>{text.date}</span>
          </div>
          <div className="metin-body">
            {paragraphs.map((p, i) => (
              <p key={i}>{renderParagraph(p, known, highlight, setOpenLemma)}</p>
            ))}
          </div>
          <div className="metin-reader-actions">
            {read ? (
              <Badge variant="success">{t.metin_marked_read}</Badge>
            ) : (
              <Button onClick={() => recordTextRead(lang, textId)}>
                {t.metin_mark_read}
              </Button>
            )}
          </div>
        </Card>
      )}

      {openLemma && (
        <WordPreviewModal lemma={openLemma} onClose={() => setOpenLemma(null)} />
      )}
    </div>
  );
}
