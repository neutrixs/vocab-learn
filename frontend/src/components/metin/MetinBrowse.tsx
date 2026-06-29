import { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getLocale } from '../../lib/locale';
import type { TextIndexEntry, TopicsConfig } from '../../types/text';

interface MetinBrowseProps {
  topics: TopicsConfig | null;
  texts: TextIndexEntry[];
  lang: string;
  isTextRead: (lang: string, id: string) => boolean;
  onOpen: (id: string) => void;
}

function label(obj: { label_tr: string; label_en: string }, lang: string): string {
  return lang === 'tr' ? obj.label_tr : obj.label_en;
}

function byDateDesc(a: TextIndexEntry, b: TextIndexEntry): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

export function MetinBrowse({ topics, texts, lang, isTextRead, onOpen }: MetinBrowseProps) {
  const t = getLocale(lang);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!topics) return null;

  const selected = selectedId ? topics.topics.find((tp) => tp.id === selectedId) ?? null : null;

  // Topic grid (no topic selected).
  if (!selected) {
    const countByTopic = new Map<string, number>();
    for (const x of texts) countByTopic.set(x.topic, (countByTopic.get(x.topic) ?? 0) + 1);

    return (
      <div className="metin-topic-grid">
        {topics.topics.map((topic) => (
          <button
            key={topic.id}
            className="metin-topic-card"
            onClick={() => setSelectedId(topic.id)}
          >
            <span className="metin-topic-card-label">{label(topic, lang)}</span>
            <span className="metin-topic-card-count">
              {t.metin_text_count(countByTopic.get(topic.id) ?? 0)}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Topic detail: each subtopic with its texts (or "none yet").
  return (
    <div className="metin-browse-detail">
      <button className="metin-browse-back" onClick={() => setSelectedId(null)}>
        {t.metin_all_topics}
      </button>
      <h3 className="metin-browse-topic-title">{label(selected, lang)}</h3>

      {selected.subtopics.map((sub) => {
        const rows = texts
          .filter((x) => x.topic === selected.id && x.subtopic === sub.id)
          .sort(byDateDesc);
        return (
          <Card key={sub.id} className="metin-browse-subtopic">
            <h4 className="metin-archive-group-title">{label(sub, lang)}</h4>
            {rows.length === 0 ? (
              <p className="metin-none-yet">{t.metin_none_yet}</p>
            ) : (
              <ul className="metin-archive-items">
                {rows.map((x) => (
                  <li key={x.id}>
                    <button className="metin-browse-row" onClick={() => onOpen(x.id)}>
                      <span className="metin-row-date">{x.date}</span>
                      <span className="metin-browse-row-title">{x.title}</span>
                      {isTextRead(lang, x.id) && (
                        <Badge variant="success">{t.metin_read_badge}</Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
