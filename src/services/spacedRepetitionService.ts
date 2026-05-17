import { Flashcard } from '../types';

/**
 * Spaced Repetition Algorithm (SM-2 simplified)
 * Grades:
 * 0: Forgot/Wrong
 * 1: Hard/Struggled
 * 2: Good/Correct
 * 3: Easy/Perfect
 */
export const calculateNextReview = (
  card: Flashcard,
  grade: 0 | 1 | 2 | 3,
  responseTime: number
): Partial<Flashcard> => {
  let { interval = 0, ease = 2.5, totalAttempts = 0, wrongCount = 0 } = card;

  totalAttempts++;
  if (grade === 0) {
    wrongCount++;
    interval = 1; // Reset to 1 day
  } else {
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }

    // Adjust ease based on grade and response time
    // Bonus for perfect grade + fast response
    const speedBonus = responseTime < 5000 ? 0.1 : 0;
    
    if (grade === 3) {
      ease += 0.1 + speedBonus;
    } else if (grade === 1) {
      ease -= 0.2;
    }
    
    ease = Math.max(1.3, ease);
  }

  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    interval,
    ease,
    nextReviewDate,
    totalAttempts,
    wrongCount,
    lastResponseTime: responseTime
  };
};

export const getDueCards = (cards: Flashcard[]) => {
  const now = Date.now();
  return cards.filter(c => !c.nextReviewDate || c.nextReviewDate <= now);
};

export const getWeakestCards = (cards: Flashcard[], limit = 10) => {
  return [...cards]
    .filter(c => (c.wrongCount || 0) > 0)
    .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
    .slice(0, limit);
};
