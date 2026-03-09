import { useState } from 'react';
import type { WordEntry, RecallPrompt } from '../../types/word';
import type { ReviewGrade } from '../../types/study';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AnswerInput } from './AnswerInput';
import { useKeyboard } from '../../lib/keyboard';
import { getLocale } from '../../lib/locale';

interface RecallCardProps {
  entry: WordEntry;
  lang: string;
  onGrade: (grade: ReviewGrade) => void;
}

function pickPrompt(entry: WordEntry): RecallPrompt {
  return entry.recall_prompts[Math.floor(Math.random() * entry.recall_prompts.length)];
}

type Phase = 'input' | 'result';

export function RecallCard({ entry, lang, onGrade }: RecallCardProps) {
  const [prompt] = useState<RecallPrompt>(() => pickPrompt(entry));
  const [phase, setPhase] = useState<Phase>('input');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const t = getLocale(lang);

  function checkAnswer(value: string) {
    const normalised = value.toLowerCase().trim();
    const isCorrect = prompt.accepted_forms.some((f) => f.toLowerCase() === normalised);
    setUserAnswer(value);
    setCorrect(isCorrect);
    setPhase('result');
  }

  function reveal() {
    setUserAnswer('');
    setCorrect(false);
    setPhase('result');
  }

  useKeyboard(
    {
      Enter: (e) => {
        if (phase === 'result') {
          e.preventDefault();
          onGrade(correct ? 'pass' : 'fail');
        }
      },
      ' ': (e) => {
        if (phase === 'result') {
          e.preventDefault();
          onGrade(correct ? 'pass' : 'fail');
        }
      },
    },
    phase === 'result'
  );

  return (
    <Card className="study-card">
      <div className="study-card-header">
        <Badge variant="default">{t.pos[entry.part_of_speech] ?? entry.part_of_speech}</Badge>
        <Badge variant="accent">{t.mode_recall}</Badge>
      </div>

      <p className="recall-prompt">{prompt.prompt}</p>

      {phase === 'input' && (
        <AnswerInput onSubmit={checkAnswer} onReveal={reveal} lang={lang} />
      )}

      {phase === 'result' && (
        <div className="result-section">
          {userAnswer && (
            <p className={`user-answer ${correct ? 'answer-correct' : 'answer-wrong'}`}>
              {userAnswer}
            </p>
          )}
          <div className="accepted-forms">
            <span className="accepted-label">{t.correct_answer_label}</span>
            {prompt.accepted_forms.join(' / ')}
          </div>
          <p className="gloss-text">{entry.english_gloss}</p>
          <div className="study-card-actions">
            {correct ? (
              <Button variant="primary" size="lg" onClick={() => onGrade('pass')}>
                {t.correct_btn}
              </Button>
            ) : (
              <Button variant="danger" size="lg" onClick={() => onGrade('fail')}>
                {t.wrong_btn}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
