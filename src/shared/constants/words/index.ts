// ============================================================
// WordGuard - Word Data Index
// ============================================================

import { WordData } from '@/shared/types/game';
import { grade3Words } from './grade3';
import { grade4Words } from './grade4';
import { grade5Words } from './grade5';
import { grade6Words } from './grade6';

export const allWords: WordData[] = [
  ...grade3Words,
  ...grade4Words,
  ...grade5Words,
  ...grade6Words,
];

export { grade3Words, grade4Words, grade5Words, grade6Words };

/** Get words by grade */
export function getWordsByGrade(grade: 3 | 4 | 5 | 6): WordData[] {
  switch (grade) {
    case 3: return grade3Words;
    case 4: return grade4Words;
    case 5: return grade5Words;
    case 6: return grade6Words;
  }
}

/** Get words by category across all grades */
export function getWordsByCategory(category: string): WordData[] {
  return allWords.filter((w) => w.category === category);
}

/** Get all unique categories */
export function getAllCategories(): string[] {
  return [...new Set(allWords.map((w) => w.category))];
}

/** Total word count */
export const TOTAL_WORDS = allWords.length;
