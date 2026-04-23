import type { SM2Card } from '../types/progress';
import type { ReviewGrade } from '../types/study';

function now(): string {
  return new Date().toISOString();
}

export function parseDate(s: string): Date {
  if (!s.includes('T')) return new Date(s + 'T00:00:00Z');
  return new Date(s);
}

function addHours(hours: number): string {
  const d = new Date();
  d.setTime(d.getTime() + hours * 3600_000);
  return d.toISOString();
}

export function newCard(): SM2Card {
  const t = now();
  return {
    ease_factor: 2.5,
    interval: 0,
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
    interval = 0;
  } else {
    repetitions += 1;
    // Use elapsed time as effective interval when overdue
    let effectiveInterval = interval;
    if (card.last_reviewed && interval > 0) {
      const elapsedHours = (Date.now() - parseDate(card.last_reviewed).getTime()) / 3_600_000;
      if (elapsedHours > interval) {
        effectiveInterval = elapsedHours;
      }
    }

    if (repetitions === 1) {
      interval = 4;
    } else if (repetitions === 2) {
      interval = 8;
    } else if (repetitions === 3) {
      interval = 24;
    } else {
      interval = Math.round(effectiveInterval * ease_factor);
    }

    // If overdue, ensure next interval reflects the actual gap
    if (effectiveInterval > interval) {
      interval = Math.round(effectiveInterval * ease_factor);
    }
  }

  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  return {
    ...card,
    ease_factor,
    interval,
    repetitions,
    due: addHours(interval),
    last_reviewed: now(),
  };
}

export function isDue(card: SM2Card): boolean {
  return parseDate(card.due) <= new Date();
}

export function isOverdue(card: SM2Card): boolean {
  return parseDate(card.due) < new Date();
}
