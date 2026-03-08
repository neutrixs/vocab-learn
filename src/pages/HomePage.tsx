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
import type { WordIndex } from '../types/word';

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
          <Card className="words-card">
            <h3 className="card-section-title">Sözcük Listesi ({index.words.length})</h3>
            <ul className="word-index-list">
              {index.words.map((w) => {
                const recKey = `${w.word}::recognition`;
                const recCard = lp?.cards[recKey];
                const recallKey = `${w.word}::recall`;
                const recallCard = lp?.cards[recallKey];
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
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
