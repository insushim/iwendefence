'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore, useWordStore, usePlayerStore, useSettingsStore } from '@/shared/lib/store';
import { allWords, getWordsByGrade } from '@/shared/constants/words';
import type { Quiz, QuizType, WordGrade } from '@/shared/types/game';

interface QuizTriggerOptions {
  /** Whether the quiz modal is currently open */
  showQuiz: boolean;
  /** Setter for showing/hiding quiz */
  setShowQuiz: (show: boolean) => void;
  /** Whether the game is in a terminal state (game over or stage clear) */
  isTerminal: boolean;
}

/**
 * Hook that manages automatic quiz triggering during gameplay.
 *
 * Triggers:
 * 1. Timer-based: Every 30 seconds of active gameplay
 * 2. Boss wave: Before every boss wave (wave 5, 10, 15...)
 * 3. Crisis: When HP drops below 30% of maxHp (once per crisis)
 *
 * Returns: the generated Quiz object (or null) and a manual trigger function.
 */
export function useQuizTrigger({ showQuiz, setShowQuiz, isTerminal }: QuizTriggerOptions) {
  const hp = useGameStore((s) => s.hp);
  const maxHp = useGameStore((s) => s.maxHp);
  const wave = useGameStore((s) => s.wave);
  const isPaused = useGameStore((s) => s.isPaused);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const togglePause = useGameStore((s) => s.togglePause);

  const wordStats = usePlayerStore((s) => s.wordStats);
  const grade = useSettingsStore((s) => s.grade);

  // Refs to track trigger state
  const lastQuizTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBossWaveQuizRef = useRef<number>(0);
  const crisisTriggeredRef = useRef<boolean>(false);
  const quizRef = useRef<Quiz | null>(null);
  const elapsedSecondsRef = useRef<number>(0);

  // Initialize word store on mount
  useEffect(() => {
    const store = useWordStore.getState();
    if (store.words.length === 0) {
      // Load words based on grade setting
      if (grade === 'mixed') {
        store.setWords(allWords);
      } else {
        const gradeWords = getWordsByGrade(grade as 3 | 4 | 5 | 6);
        store.setWords(gradeWords.length > 0 ? gradeWords : allWords);
      }
    }
  }, [grade]);

  /** Generate a quiz using the word store */
  const generateQuiz = useCallback((): Quiz | null => {
    const store = useWordStore.getState();
    // Ensure words are loaded
    if (store.words.length === 0) {
      store.setWords(allWords);
    }

    // Randomly pick kr2en or en2kr for variety
    const types: QuizType[] = ['kr2en', 'en2kr'];
    const quizType = types[Math.floor(Math.random() * types.length)];

    const quiz = store.generateQuiz(quizType, wordStats);
    return quiz;
  }, [wordStats]);

  /** Trigger a quiz: generate it, pause game, show modal */
  const triggerQuiz = useCallback(() => {
    if (showQuiz || isGameOver || isTerminal) return;

    const quiz = generateQuiz();
    if (!quiz) return;

    quizRef.current = quiz;
    useGameStore.getState().startQuiz(quiz);
    lastQuizTimeRef.current = Date.now();
    elapsedSecondsRef.current = 0;
    setShowQuiz(true);
  }, [showQuiz, isGameOver, isTerminal, generateQuiz, setShowQuiz]);

  // ── Timer-based trigger: every 30 seconds of active gameplay ──
  useEffect(() => {
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Don't run timer if game is paused, over, terminal, or quiz is showing
    if (isPaused || isGameOver || isTerminal || showQuiz) return;

    timerIntervalRef.current = setInterval(() => {
      elapsedSecondsRef.current += 1;

      if (elapsedSecondsRef.current >= 30) {
        // Cooldown: don't trigger if quiz was shown less than 10 seconds ago
        const timeSinceLastQuiz = Date.now() - lastQuizTimeRef.current;
        if (timeSinceLastQuiz < 10000) return;

        triggerQuiz();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPaused, isGameOver, isTerminal, showQuiz, triggerQuiz]);

  // ── Boss wave trigger: before every 5th wave ──
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;

    // Wave numbers are 1-indexed in the store. Check if the NEXT wave is a boss wave.
    // Wave 4 -> next is 5 (boss), wave 9 -> next is 10 (boss), etc.
    // Actually, the wave in store is the current wave number. Boss waves are 5,10,15...
    // We trigger WHEN wave changes to a boss wave number.
    const isBossWave = wave > 0 && wave % 5 === 0;

    if (isBossWave && lastBossWaveQuizRef.current !== wave) {
      lastBossWaveQuizRef.current = wave;
      // Small delay to let the wave transition be visible
      const timer = setTimeout(() => {
        triggerQuiz();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [wave, isGameOver, isTerminal, showQuiz, triggerQuiz]);

  // ── Crisis trigger: HP below 30% ──
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;

    const hpPercent = hp / maxHp;

    if (hpPercent < 0.3 && hpPercent > 0 && !crisisTriggeredRef.current) {
      crisisTriggeredRef.current = true;
      triggerQuiz();
    }

    // Reset crisis flag when HP recovers above 50%
    if (hpPercent >= 0.5) {
      crisisTriggeredRef.current = false;
    }
  }, [hp, maxHp, isGameOver, isTerminal, showQuiz, triggerQuiz]);

  // Reset refs when game resets (wave goes back to 0)
  useEffect(() => {
    if (wave === 0) {
      lastQuizTimeRef.current = Date.now();
      lastBossWaveQuizRef.current = 0;
      crisisTriggeredRef.current = false;
      elapsedSecondsRef.current = 0;
      quizRef.current = null;
    }
  }, [wave]);

  return {
    quiz: quizRef.current,
    triggerQuiz,
    generateQuiz,
  };
}
