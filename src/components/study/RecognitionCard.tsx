import { useState } from 'react';
import type { WordEntry } from '../../types/word';
import type { ReviewGrade } from '../../types/study';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SentenceList } from './SentenceList';
import { useKeyboard } from '../../lib/keyboard';
import { getLocale } from '../../lib/locale';

interface RecognitionCardProps {
  entry: WordEntry;
  lang: string;
  onGrade: (grade: ReviewGrade) => void;
}

export function RecognitionCard({ entry, lang, onGrade }: RecognitionCardProps) {
  const [revealed, setRevealed] = useState(false);
  const t = getLocale(lang);

  function reveal() {
    setRevealed(true);
  }

  useKeyboard(
    {
      Enter: (e) => {
        e.preventDefault();
        if (!revealed) {
          onGrade('pass');
        } else {
          onGrade('fail');
        }
      },
      ' ': (e) => {
        e.preventDefault();
        if (!revealed) {
          reveal();
        } else {
          onGrade('fail');
        }
      },
    },
    true
  );

  return (
    <Card className="study-card">
      <div className="study-card-header">
        <Badge variant="default">{t.pos[entry.part_of_speech] ?? entry.part_of_speech}</Badge>
        <Badge variant="accent">{t.mode_recognition}</Badge>
      </div>

      <h2 className="word-display">{entry.word}</h2>

      <SentenceList sentences={entry.sentences} />

      {!revealed ? (
        <div className="study-card-actions">
          <Button variant="primary" size="lg" onClick={() => onGrade('pass')}>
            {t.know_it}
          </Button>
          <Button variant="ghost" size="lg" onClick={reveal}>
            {t.reveal}
          </Button>
        </div>
      ) : (
        <div className="reveal-section">
          <p className="gloss-text">{entry.english_gloss}</p>
          <div className="study-card-actions">
            <Button variant="danger" size="lg" onClick={() => onGrade('fail')}>
              {t.didnt_know}
            </Button>
          </div>
          <p className="keyboard-hint">{t.continue_hint}</p>
        </div>
      )}
    </Card>
  );
}
