import { useEffect, useState } from 'react';
import { SentenceList } from '../study/SentenceList';
import { Button } from '../ui/Button';
import { loadWord } from '../../lib/dataLoader';
import { useLanguage } from '../../context/LanguageContext';
import { getLocale } from '../../lib/locale';
import type { WordEntry } from '../../types/word';

interface WordPreviewModalProps {
  lemma: string;
  onClose: () => void;
}

export function WordPreviewModal({ lemma, onClose }: WordPreviewModalProps) {
  const { lang } = useLanguage();
  const t = getLocale(lang);
  const [word, setWord] = useState<WordEntry | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWord(null);
    setNotFound(false);
    loadWord(lang, lemma)
      .then((entry) => {
        if (cancelled) return;
        setWord(entry);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      });
    return () => { cancelled = true; };
  }, [lang, lemma]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        {!word && !notFound && <p className="text-secondary">{t.loading}</p>}
        {notFound && (
          <>
            <h3 className="modal-word">{lemma}</h3>
            <p className="text-secondary">{t.metin_not_in_vocab}</p>
          </>
        )}
        {word && (
          <>
            <div className="modal-header">
              <h3 className="modal-word">{word.word}</h3>
              <span className="modal-pos">{t.pos[word.part_of_speech] ?? word.part_of_speech}</span>
            </div>
            <p className="modal-gloss">{word.english_gloss}</p>
            {word.sentences.length > 0 && (
              <SentenceList sentences={word.sentences.slice(0, 2)} />
            )}
          </>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>{t.metin_close}</Button>
        </div>
      </div>
    </div>
  );
}
