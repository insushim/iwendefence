// ============================================================
// WordGuard - Word Data Index
// ============================================================

import { WordData } from '@/shared/types/game';
import { grade3Words } from './grade3';
import { grade4Words } from './grade4';
import { grade5Words } from './grade5';
import { grade6Words } from './grade6';
import { extraGrade3Words } from './extraGrade3';
import { extraGrade4Words } from './extraGrade4';
import { extraGrade5Words } from './extraGrade5';
import { extraGrade6Words } from './extraGrade6';

// Deduplicate by english word (existing words take priority)
function mergeAndDedup(existing: WordData[], extra: WordData[]): WordData[] {
  const seen = new Set(existing.map((w) => w.english.toLowerCase()));
  const unique = extra.filter((w) => !seen.has(w.english.toLowerCase()));
  return [...existing, ...unique];
}

const allGrade3 = mergeAndDedup(grade3Words, extraGrade3Words);
const allGrade4 = mergeAndDedup(grade4Words, extraGrade4Words);
const allGrade5 = mergeAndDedup(grade5Words, extraGrade5Words);
const allGrade6 = mergeAndDedup(grade6Words, extraGrade6Words);

export const allWords: WordData[] = [
  ...allGrade3,
  ...allGrade4,
  ...allGrade5,
  ...allGrade6,
];

export { grade3Words, grade4Words, grade5Words, grade6Words };

/** Get words by grade (includes extra words) */
export function getWordsByGrade(grade: 3 | 4 | 5 | 6): WordData[] {
  switch (grade) {
    case 3: return allGrade3;
    case 4: return allGrade4;
    case 5: return allGrade5;
    case 6: return allGrade6;
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
