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
import type { WordIndex, WordIndexEntry } from '../types/word';
import type { SM2Card } from '../types/progress';

const PAGE_SIZE = 10;

const POS_LABELS: Record<string, string> = {
  verb: 'Fiil',
  noun: 'İsim',
  adjective: 'Sıfat',
  adverb: 'Zarf',
};

function WordList({ words, cards, lang }: { words: WordIndexEntry[]; cards: Record<string, SM2Card>; lang: string }) {
  const [search, setSearch] = useState('');
  const [selectedPos, setSelectedPos] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const allPos = [...new Set(words.map((w) => w.part_of_speech))].sort((a, b) =>
    (POS_LABELS[a] ?? a).localeCompare(POS_LABELS[b] ?? b, lang)
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
      <h3 className="card-section-title">Sözcük Listesi ({words.length})</h3>
      <input
        className="word-search-input"
        type="text"
        placeholder="Ara…"
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
            {POS_LABELS[pos] ?? pos}
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
              <span className="word-index-pos">{w.part_of_speech}</span>
              <div className="word-index-cards">
                <Badge variant={recCard ? 'success' : 'default'}>T</Badge>
                <Badge variant={recallCard ? 'success' : 'default'}>H</Badge>
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="word-index-empty">Sonuç bulunamadı.</li>
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
      <PageHeader title="Sözcük Öğren" subtitle={`${lang.toUpperCase()} · Türkçe`} />

      {error && <p className="error-text">{error}</p>}

      <div className="home-grid">
        <Card className="stats-card">
          <h3 className="card-section-title">İlerleme</h3>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{stats?.streak_days ?? 0}</span>
              <span className="stat-label">Gün serisi</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats?.total_reviews ?? 0}</span>
              <span className="stat-label">Toplam tekrar</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {stats && stats.total_reviews > 0
                  ? Math.round((stats.total_correct / stats.total_reviews) * 100)
                  : 0}%
              </span>
              <span className="stat-label">Doğruluk</span>
            </div>
          </div>
          <div className="mastery-section">
            <div className="mastery-label-row">
              <span>Ustalık</span>
              <span>{Math.round(masteryPct)}%</span>
            </div>
            <ProgressBar value={masteryPct} />
          </div>
        </Card>

        <Card className="session-card">
          <h3 className="card-section-title">Bugünkü Oturum</h3>
          {index === null ? (
            <p className="text-secondary">Yükleniyor…</p>
          ) : sessionItems.length === 0 ? (
            <p className="all-done-text">Harika! Bugün tüm kartları tamamladınız. 🎉</p>
          ) : (
            <>
              <div className="session-badges">
                {dueCount > 0 && (
                  <Badge variant="accent">{dueCount} tekrar</Badge>
                )}
                {newCount > 0 && (
                  <Badge variant="default">{newCount} yeni</Badge>
                )}
              </div>
              <p className="session-total">{sessionItems.length} kart bekliyor</p>
            </>
          )}

          <div className="mode-buttons">
            <Button
              variant="primary"
              size="lg"
              disabled={!index || sessionItems.length === 0}
              onClick={() => navigate('/study?mode=recognition')}
            >
              Kelime Tanıma
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={!index || sessionItems.length === 0}
              onClick={() => navigate('/study?mode=recall')}
            >
              Aktif Hatırlama
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={!index || sessionItems.length === 0}
              onClick={() => navigate('/study?mode=mixed')}
            >
              Karma Çalışma
            </Button>
          </div>
        </Card>

        {index && (
          <WordList words={index.words} cards={lp?.cards ?? {}} lang={lang} />
        )}
      </div>
    </div>
  );
}
