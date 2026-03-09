import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useLanguage } from '../context/LanguageContext';
import { useProgress } from '../context/ProgressContext';
import { loadIndex } from '../lib/dataLoader';
import { buildSession } from '../lib/scheduler';
import { getLocale } from '../lib/locale';
import type { UILocale } from '../lib/locale';
import type { WordIndex, WordIndexEntry } from '../types/word';
import type { SM2Card } from '../types/progress';

const PAGE_SIZE = 10;

function WordList({ words, cards, lang, t }: { words: WordIndexEntry[]; cards: Record<string, SM2Card>; lang: string; t: UILocale }) {
  const [search, setSearch] = useState('');
  const [selectedPos, setSelectedPos] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const allPos = [...new Set(words.map((w) => w.part_of_speech))].sort((a, b) =>
    (t.pos[a] ?? a).localeCompare(t.pos[b] ?? b, lang)
  );

  const sorted = [...words].sort((a, b) => a.word.localeCompare(b.word, lang));

  const filtered = sorted.filter((w) => {
    const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase());
    const matchesPos = selectedPos.size === 0 || selectedPos.has(w.part_of_speech);
    return matchesSearch && matchesPos;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function resetPage() { setPage(0); }

  function handleSearch(value: string) {
    setSearch(value);
    resetPage();
  }

  function togglePos(pos: string) {
    setSelectedPos((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos); else next.add(pos);
      return next;
    });
    resetPage();
  }

  return (
    <Card className="words-card">
      <h3 className="card-section-title">{t.word_list_title(words.length)}</h3>
      <input
        className="word-search-input"
        type="text"
        placeholder={t.search_placeholder}
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <div className="pos-filter-pills">
        {allPos.map((pos) => (
          <button
            key={pos}
            className={`pos-pill${selectedPos.has(pos) ? ' pos-pill--active' : ''}`}
            onClick={() => togglePos(pos)}
          >
            {t.pos[pos] ?? pos}
          </button>
        ))}
      </div>
      <ul className="word-index-list">
        {visible.map((w) => {
          const recCard = cards[`${w.word}::recognition`];
          const recallCard = cards[`${w.word}::recall`];
          return (
            <li key={w.word} className="word-index-item">
              <span className="word-index-word">{w.word}</span>
              <span className="word-index-pos">{t.pos[w.part_of_speech] ?? w.part_of_speech}</span>
              <div className="word-index-cards">
                <Badge variant={recCard ? 'success' : 'default'}>T</Badge>
                <Badge variant={recallCard ? 'success' : 'default'}>H</Badge>
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="word-index-empty">{t.no_results}</li>
        )}
      </ul>
      {totalPages > 1 && (
        <div className="word-index-pagination">
          <button
            className="pagination-btn"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            ←
          </button>
          <span className="pagination-info">{safePage + 1} / {totalPages}</span>
          <button
            className="pagination-btn"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            →
          </button>
        </div>
      )}
    </Card>
  );
}

export function HomePage() {
  const { lang } = useLanguage();
  const { getLangProgress } = useProgress();
  const navigate = useNavigate();
  const [index, setIndex] = useState<WordIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = getLocale(lang);

  useEffect(() => {
    loadIndex(lang)
      .then(setIndex)
      .catch((e) => setError(String(e)));
  }, [lang]);

  const lp = getLangProgress(lang);
  const stats = lp?.stats;

  const sessionItems = index ? buildSession(index.words, lp) : [];
  const dueCount = sessionItems.filter((i) => !i.isNew).length;
  const newCount = sessionItems.filter((i) => i.isNew).length;
  const totalWords = index ? index.words.length * 2 : 0; // recognition + recall per word
  const reviewedCards = lp ? Object.keys(lp.cards).length : 0;
  const masteryPct = totalWords > 0 ? (reviewedCards / totalWords) * 100 : 0;

  return (
    <div className="page">
      <PageHeader title={t.home_title} subtitle={`${lang.toUpperCase()} · ${t.home_subtitle}`} />

      {error && <p className="error-text">{error}</p>}

      <div className="home-grid">
        <Card className="stats-card">
          <h3 className="card-section-title">{t.progress_title}</h3>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{stats?.streak_days ?? 0}</span>
              <span className="stat-label">{t.stat_streak}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats?.total_reviews ?? 0}</span>
              <span className="stat-label">{t.stat_reviews}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {stats && stats.total_reviews > 0
                  ? Math.round((stats.total_correct / stats.total_reviews) * 100)
                  : 0}%
              </span>
              <span className="stat-label">{t.stat_accuracy}</span>
            </div>
          </div>
          <div className="mastery-section">
            <div className="mastery-label-row">
              <span>{t.mastery}</span>
              <span>{Math.round(masteryPct)}%</span>
            </div>
            <ProgressBar value={masteryPct} />
          </div>
        </Card>

        <Card className="session-card">
          <h3 className="card-section-title">{t.session_title}</h3>
          {index === null ? (
            <p className="text-secondary">{t.loading}</p>
          ) : sessionItems.length === 0 ? (
            <p className="all-done-text">{t.all_done}</p>
          ) : (
            <>
              <div className="session-badges">
                {dueCount > 0 && (
                  <Badge variant="accent">{t.review_count(dueCount)}</Badge>
                )}
                {newCount > 0 && (
                  <Badge variant="default">{t.new_count(newCount)}</Badge>
                )}
              </div>
              <p className="session-total">{t.cards_waiting(sessionItems.length)}</p>
            </>
          )}

          <div className="mode-buttons">
            <Button
              variant="primary"
              size="lg"
              disabled={!index || sessionItems.length === 0}
              onClick={() => navigate('/study?mode=recognition')}
            >
              {t.btn_recognition}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={!index || sessionItems.length === 0}
              onClick={() => navigate('/study?mode=recall')}
            >
              {t.btn_recall}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={!index || sessionItems.length === 0}
              onClick={() => navigate('/study?mode=mixed')}
            >
              {t.btn_mixed}
            </Button>
          </div>
        </Card>

        {index && (
          <WordList words={index.words} cards={lp?.cards ?? {}} lang={lang} t={t} />
        )}
      </div>
    </div>
  );
}
