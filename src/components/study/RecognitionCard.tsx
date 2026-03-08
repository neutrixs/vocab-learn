import { useState } from 'react';
import type { WordEntry } from '../../types/word';
import type { ReviewGrade } from '../../types/study';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SentenceList } from './SentenceList';
import { useKeyboard } from '../../lib/keyboard';

interface RecognitionCardProps {
  entry: WordEntry;
  onGrade: (grade: ReviewGrade) => void;
}

export function RecognitionCard({ entry, onGrade }: RecognitionCardProps) {
  const [revealed, setRevealed] = useState(false);

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
        <Badge variant="default">{entry.part_of_speech}</Badge>
        <Badge variant="accent">Tanıma</Badge>
      </div>

      <h2 className="word-display">{entry.word}</h2>

      <SentenceList sentences={entry.sentences} />

      {!revealed ? (
        <div className="study-card-actions">
          <Button variant="primary" size="lg" onClick={() => onGrade('pass')}>
            Biliyorum ✓ (Enter)
          </Button>
          <Button variant="ghost" size="lg" onClick={reveal}>
            Göster (Space)
          </Button>
        </div>
      ) : (
        <div className="reveal-section">
          <p className="gloss-text">{entry.english_gloss}</p>
          <div className="study-card-actions">
            <Button variant="danger" size="lg" onClick={() => onGrade('fail')}>
              Bilmiyordum (Enter / Space)
            </Button>
          </div>
          <p className="keyboard-hint">Enter veya Space → devam</p>
        </div>
      )}
    </Card>
  );
}
