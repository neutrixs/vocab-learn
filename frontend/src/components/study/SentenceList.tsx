import type { Sentence } from '../../types/word';
import type { ReactElement } from 'react';

interface SentenceListProps {
  sentences: Sentence[];
}

function highlightBrackets(text: string): ReactElement {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          return (
            <mark key={i} className="word-highlight">
              {part.slice(1, -1)}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function SentenceList({ sentences }: SentenceListProps) {
  return (
    <ul className="sentence-list">
      {sentences.map((s) => (
        <li key={s.id} className="sentence-item">
          <p className="sentence-text">{highlightBrackets(s.text)}</p>
          {s.note && <p className="sentence-note">{s.note}</p>}
        </li>
      ))}
    </ul>
  );
}
