import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { WordPreviewModal } from './WordPreviewModal';
import { useLanguage } from '../../context/LanguageContext';
import { useProgress } from '../../context/ProgressContext';
import { loadText, preloadWords } from '../../lib/dataLoader';
import { getLocale } from '../../lib/locale';
import type { TextEntry } from '../../types/text';

interface MetinReaderProps {
  textId: string;
  onBack: () => void;
}

// Matches `[display|lemma]` tokens. Disallows nested `[` or `]` in either side.
const BRACKET_RE = /(\[[^\][|]+\|[^\][|]+\])/g;

function renderParagraph(text: string, onWordClick: (lemma: string) => void): ReactNode[] {
  const parts = text.split(BRACKET_RE);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']') && part.includes('|')) {
      const inner = part.slice(1, -1);
      const pipe = inner.indexOf('|');
      const display = inner.slice(0, pipe);
      const lemma = inner.slice(pipe + 1);
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
    return <span key={i}>{part}</span>;
  });
}

export function MetinReader({ textId, onBack }: MetinReaderProps) {
  const { lang } = useLanguage();
  const { recordTextRead, isTextRead } = useProgress();
  const t = getLocale(lang);
  const [text, setText] = useState<TextEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openLemma, setOpenLemma] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
    loadText(lang, textId)
      .then((entry) => {
        if (cancelled) return;
        setText(entry);
        if (entry.vocab?.length) {
          preloadWords(lang, entry.vocab).catch(() => {});
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
              <p key={i}>{renderParagraph(p, setOpenLemma)}</p>
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
