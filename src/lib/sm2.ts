import type { SM2Card } from '../types/progress';
import type { ReviewGrade } from '../types/study';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function newCard(): SM2Card {
  const t = today();
  return {
    ease_factor: 2.5,
    interval: 1,
    repetitions: 0,
    due: t,
    last_reviewed: null,
    created: t,
  };
}

export function applyReview(card: SM2Card, grade: ReviewGrade): SM2Card {
  const q = grade === 'pass' ? 4 : 1;
  let { ease_factor, interval, repetitions } = card;

  if (grade === 'fail') {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease_factor);
    }
  }

  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  return {
    ...card,
    ease_factor,
    interval,
    repetitions,
    due: addDays(today(), interval),
    last_reviewed: today(),
  };
}

export function isDue(card: SM2Card): boolean {
  return card.due <= today();
}

export function isOverdue(card: SM2Card): boolean {
  return card.due < today();
}
