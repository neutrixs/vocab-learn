import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProgress } from '../context/ProgressContext';
import { useSettings } from '../context/SettingsContext';
import { loadIndex, loadWord, preloadWords } from '../lib/dataLoader';
import { buildSession } from '../lib/scheduler';
import { getLocale } from '../lib/locale';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { RecognitionCard } from '../components/study/RecognitionCard';
import { RecallCard } from '../components/study/RecallCard';
import type { StudyItem } from '../types/study';
import type { WordEntry } from '../types/word';
import type { ReviewGrade } from '../types/study';

type StudyMode = 'recognition' | 'recall' | 'mixed';

export function StudyPage() {
  const { lang } = useLanguage();
  const { getLangProgress, recordReview } = useProgress();
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const modeParam = (params.get('mode') ?? 'mixed') as StudyMode;
  const wordParam = params.get('word');
  const t = getLocale(lang);

  const [queue, setQueue] = useState<StudyItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<WordEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<{ pass: number; fail: number }>({ pass: 0, fail: 0 });

  // Build session queue on mount
  useEffect(() => {
    async function init() {
      try {
        let items: StudyItem[];

        if (wordParam) {
          // Instant single-word session — no need to load full index
          const lp = getLangProgress(lang);
          const cards = lp?.cards ?? {};
          const modes: StudyMode[] = ['recognition', 'recall'];
          items = modes.map((mode) => {
            const cardKey = `${wordParam}::${mode}`;
            const card = cards[cardKey];
            const isNew = !card;
            return {
              word: wordParam,
              mode,
              cardKey,
              isNew,
              readonly: !isNew, // already-seen cards are preview-only — no SM-2 changes
            };
          });
        } else {
          const index = await loadIndex(lang);
          const lp = getLangProgress(lang);
          items = buildSession(index.words, lp, settings.max_new_words_per_day);
        }

        // Filter by mode
        if (modeParam !== 'mixed') {
          items = items.filter((i) => i.mode === modeParam);
        }

        if (items.length === 0) {
          setDone(true);
          setLoading(false);
          return;
        }

        setQueue(items);
        setLoading(false);
      } catch (e) {
        setError(String(e));
        setLoading(false);
      }
    }
    init();
  }, [lang, modeParam, wordParam, settings.max_new_words_per_day]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load current word entry
  useEffect(() => {
    if (queue.length === 0 || currentIdx >= queue.length) return;
    const item = queue[currentIdx];
    setCurrentEntry(null);
    loadWord(lang, item.word)
      .then(setCurrentEntry)
      .catch((e) => setError(String(e)));

    // Preload next 3
    const nextWords = queue
      .slice(currentIdx + 1, currentIdx + 4)
      .map((i) => i.word);
    preloadWords(lang, nextWords);
  }, [queue, currentIdx, lang]);

  const handleGrade = useCallback(
    (grade: ReviewGrade) => {
      if (!queue[currentIdx]) return;
      const item = queue[currentIdx];

      // Ensure card exists before recording
      const lp = getLangProgress(lang);
      if (!lp?.cards[item.cardKey]) {
        // Card will be auto-created in recordReview via newCard()
      }

      if (!item.readonly) {
        recordReview(lang, item.cardKey, grade);
        setResults((r) => ({
          pass: r.pass + (grade === 'pass' ? 1 : 0),
          fail: r.fail + (grade === 'fail' ? 1 : 0),
        }));

        if (grade === 'fail') {
          const insertAt = Math.min(currentIdx + 4, queue.length);
          setQueue((q) => {
            const next = [...q];
            next.splice(insertAt, 0, item);
            return next;
          });
        }
      }

      const nextIdx = currentIdx + 1;
      const willRequeue = !item.readonly && grade === 'fail';
      if (nextIdx >= queue.length && !willRequeue) {
        setDone(true);
      } else {
        setCurrentIdx(nextIdx);
      }
    },
    [queue, currentIdx, lang, recordReview, getLangProgress]
  );

  if (loading) {
    return (
      <div className="page page-centered">
        <p className="text-secondary">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page page-centered">
        <p className="error-text">{error}</p>
        <Button onClick={() => navigate('/')}>{t.btn_home}</Button>
      </div>
    );
  }

  if (done) {
    const total = results.pass + results.fail;
    const pct = total > 0 ? Math.round((results.pass / total) * 100) : 0;
    return (
      <div className="page page-centered">
        <div className="session-complete">
          <h2 className="session-complete-title">{t.session_complete}</h2>
          <div className="session-complete-stats">
            <div className="stat-item">
              <span className="stat-value stat-success">{results.pass}</span>
              <span className="stat-label">{t.stat_correct}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-error">{results.fail}</span>
              <span className="stat-label">{t.stat_wrong}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{pct}%</span>
              <span className="stat-label">{t.stat_accuracy}</span>
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            {t.btn_home}
          </Button>
        </div>
      </div>
    );
  }

  const progress = queue.length > 0 ? (currentIdx / queue.length) * 100 : 0;
  const item = queue[currentIdx];

  return (
    <div className="page study-page">
      <div className="study-progress-bar">
        <ProgressBar value={progress} />
        <span className="study-progress-text">
          {currentIdx + 1} / {queue.length}
        </span>
      </div>

      {currentEntry ? (
        item.mode === 'recognition' ? (
          <RecognitionCard key={`${item.cardKey}@${currentIdx}`} entry={currentEntry} lang={lang} onGrade={handleGrade} />
        ) : (
          <RecallCard key={`${item.cardKey}@${currentIdx}`} entry={currentEntry} lang={lang} onGrade={handleGrade} />
        )
      ) : (
        <div className="page-centered">
          <p className="text-secondary">{t.loading}</p>
        </div>
      )}
    </div>
  );
}
