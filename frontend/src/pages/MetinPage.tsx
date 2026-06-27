import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MetinReader } from '../components/metin/MetinReader';
import { useLanguage } from '../context/LanguageContext';
import { useProgress } from '../context/ProgressContext';
import { loadTextsIndex, loadTopics } from '../lib/dataLoader';
import { getLocale } from '../lib/locale';
import type { TextIndexEntry, TextsIndex, Topic, TopicsConfig } from '../types/text';

function topicLabel(topics: TopicsConfig | null, topicId: string, lang: string): string {
  const topic = topics?.topics.find((t) => t.id === topicId);
  if (!topic) return topicId;
  return lang === 'tr' ? topic.label_tr : topic.label_en;
}

function subtopicLabel(topics: TopicsConfig | null, topicId: string, subtopicId: string, lang: string): string {
  const topic = topics?.topics.find((t) => t.id === topicId);
  const sub = topic?.subtopics.find((s) => s.id === subtopicId);
  if (!sub) return subtopicId;
  return lang === 'tr' ? sub.label_tr : sub.label_en;
}

export function MetinPage() {
  const { lang } = useLanguage();
  const { isTextRead } = useProgress();
  const t = getLocale(lang);
  const [index, setIndex] = useState<TextsIndex | null>(null);
  const [topics, setTopics] = useState<TopicsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([loadTextsIndex(lang), loadTopics(lang)])
      .then(([idx, tops]) => {
        if (cancelled) return;
        setIndex(idx);
        setTopics(tops);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [lang]);

  const sorted = useMemo(() => {
    if (!index) return [];
    return [...index.texts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [index]);

  const today = sorted[0] ?? null;
  const archive = sorted.slice(1);

  if (openId) {
    return (
      <MetinReader
        textId={openId}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="page">
      <PageHeader title={t.metin_title} subtitle={t.metin_subtitle} />

      {loading && <p className="text-secondary">{t.loading}</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && !today && (
        <Card>
          <p className="text-secondary">{t.metin_empty}</p>
        </Card>
      )}

      {today && (
        <Card className="metin-today-card">
          <h3 className="card-section-title">{t.metin_today}</h3>
          <TextRow
            entry={today}
            topics={topics}
            lang={lang}
            isRead={isTextRead(lang, today.id)}
            onOpen={() => setOpenId(today.id)}
            large
            readBadge={t.metin_read_badge}
            openLabel={t.metin_open}
          />
        </Card>
      )}

      {archive.length > 0 && (
        <Card className="metin-archive-card">
          <h3 className="card-section-title">{t.metin_archive}</h3>
          <ArchiveGrouped
            entries={archive}
            topics={topics}
            lang={lang}
            isTextRead={isTextRead}
            onOpen={(id) => setOpenId(id)}
            readBadge={t.metin_read_badge}
          />
        </Card>
      )}
    </div>
  );
}

function TextRow({
  entry,
  topics,
  lang,
  isRead,
  onOpen,
  large,
  readBadge,
  openLabel,
}: {
  entry: TextIndexEntry;
  topics: TopicsConfig | null;
  lang: string;
  isRead: boolean;
  onOpen: () => void;
  large?: boolean;
  readBadge: string;
  openLabel: string;
}) {
  return (
    <div className={`metin-row${large ? ' metin-row--large' : ''}`}>
      <div className="metin-row-meta">
        <span className="metin-row-date">{entry.date}</span>
        <span className="metin-row-sep">·</span>
        <span className="metin-row-topic">{topicLabel(topics, entry.topic, lang)}</span>
        <span className="metin-row-sep">·</span>
        <span className="metin-row-subtopic">{subtopicLabel(topics, entry.topic, entry.subtopic, lang)}</span>
        {isRead && <Badge variant="success">{readBadge}</Badge>}
      </div>
      <h4 className="metin-row-title">{entry.title}</h4>
      {large && (
        <div className="metin-row-actions">
          <Button onClick={onOpen}>{openLabel}</Button>
        </div>
      )}
      {!large && (
        <button className="metin-row-open" onClick={onOpen} aria-label={openLabel}>
          →
        </button>
      )}
    </div>
  );
}

function ArchiveGrouped({
  entries,
  topics,
  lang,
  isTextRead,
  onOpen,
  readBadge,
}: {
  entries: TextIndexEntry[];
  topics: TopicsConfig | null;
  lang: string;
  isTextRead: (lang: string, id: string) => boolean;
  onOpen: (id: string) => void;
  readBadge: string;
}) {
  // Order topics by their order in topics config; fall back to alphabetical for unknown.
  const order = new Map<string, number>();
  topics?.topics.forEach((t: Topic, i: number) => order.set(t.id, i));

  const groups = new Map<string, TextIndexEntry[]>();
  for (const e of entries) {
    if (!groups.has(e.topic)) groups.set(e.topic, []);
    groups.get(e.topic)!.push(e);
  }
  const groupKeys = [...groups.keys()].sort((a, b) => {
    const ai = order.get(a) ?? 1000;
    const bi = order.get(b) ?? 1000;
    return ai - bi;
  });

  return (
    <div className="metin-archive-list">
      {groupKeys.map((tid) => (
        <div key={tid} className="metin-archive-group">
          <h5 className="metin-archive-group-title">{topicLabel(topics, tid, lang)}</h5>
          <ul className="metin-archive-items">
            {groups.get(tid)!.map((entry) => (
              <li key={entry.id}>
                <TextRow
                  entry={entry}
                  topics={topics}
                  lang={lang}
                  isRead={isTextRead(lang, entry.id)}
                  onOpen={() => onOpen(entry.id)}
                  readBadge={readBadge}
                  openLabel="→"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
