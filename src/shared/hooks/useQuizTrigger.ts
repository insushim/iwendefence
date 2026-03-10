'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore, useWordStore, usePlayerStore, useSettingsStore } from '@/shared/lib/store';
import { allWords, getWordsByGrade } from '@/shared/constants/words';
import type { Quiz, QuizType, QuizContext, WordGrade } from '@/shared/types/game';

export type { QuizContext };

// ============================================================
// Options
// ============================================================

interface QuizTriggerOptions {
  /** Whether the quiz modal is currently open */
  showQuiz: boolean;
  /** Setter for showing/hiding quiz */
  setShowQuiz: (show: boolean) => void;
  /** Whether the game is in a terminal state (game over or stage clear) */
  isTerminal: boolean;
}

// ============================================================
// Return type
// ============================================================

interface QuizTriggerReturn {
  // Current quiz state
  quiz: Quiz | null;
  quizContext: QuizContext;

  // Manual trigger (backward compat)
  triggerQuiz: () => void;

  // Context-specific triggers
  triggerWaveBonus: () => void;
  triggerBossQuiz: () => void;
  triggerReviveQuiz: () => void;
  triggerFreeTowerQuiz: () => void;
  triggerCrisisQuiz: () => void;
  triggerTreasureQuiz: () => void;
  triggerSpeedQuiz: () => void;
  triggerStreakBonus: () => void;
  triggerQuickQuiz: () => void;

  // State
  canRevive: boolean;
  reviveUsed: boolean;
  speedUnlocked: boolean;
}

// ============================================================
// Constants
// ============================================================

/** Minimum seconds between any two quiz triggers (anti-spam) */
const GLOBAL_COOLDOWN_MS = 8_000;

/** Wave bonus quiz chance (40%) */
const WAVE_BONUS_CHANCE = 0.4;

/** HP threshold for crisis trigger */
const CRISIS_HP_THRESHOLD = 0.25;

/** HP threshold to reset crisis cooldown */
const CRISIS_RESET_THRESHOLD = 0.6;

/** Treasure chest appears every N waves */
const TREASURE_WAVE_INTERVAL = 3;

/** Free tower offered every N waves */
const FREE_TOWER_WAVE_INTERVAL = 3;

/** Streak bonus triggers every N quiz combos */
const STREAK_BONUS_INTERVAL = 5;

// ============================================================
// Quiz difficulty helpers
// ============================================================

/** Pick quiz type based on desired difficulty tier (1-3) */
function pickQuizType(difficulty: 1 | 2 | 3): QuizType {
  const tiers: Record<1 | 2 | 3, QuizType[]> = {
    1: ['kr2en', 'en2kr'],
    2: ['kr2en', 'en2kr', 'listening', 'spelling'],
    3: ['spelling', 'sentence', 'combo'],
  };
  const pool = tiers[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Quick quiz uses simpler types with shorter time */
function generateQuickQuiz(
  generateFn: (type: QuizType, wordStats: any[]) => Quiz | null,
  wordStats: any[],
): Quiz | null {
  const types: QuizType[] = ['kr2en', 'en2kr'];
  const type = types[Math.floor(Math.random() * types.length)];
  const quiz = generateFn(type, wordStats);
  if (!quiz) return null;

  // Quick quiz: 5 second limit, only 2 options
  return {
    ...quiz,
    timeLimit: 5,
    options: quiz.options.slice(0, 2).sort(() => Math.random() - 0.5),
  };
}

// ============================================================
// Hook
// ============================================================

/**
 * Manages all quiz trigger points during gameplay.
 *
 * Replaces the ad-placement model found in top tower defense games with
 * English word quizzes. Each trigger point maps to a common ad pattern:
 *
 * 1. Wave Complete Bonus  (BTD6 "watch ad for bonus cash")
 * 2. Boss Wave Pre-Quiz   (Kingdom Rush "watch ad for power-up")
 * 3. Death/Revive Quiz    ("watch ad to continue")
 * 4. Free Tower Quiz      ("watch ad for free tower/spin")
 * 5. Crisis Emergency Quiz ("watch ad for emergency heal")
 * 6. Treasure Chest Quiz  ("watch ad to open chest")
 * 7. Double Speed Quiz    ("watch ad for fast forward")
 * 8. Streak Bonus Quiz    ("watch ad for daily bonus multiplier")
 * 9. Wave Start Quick Quiz (interstitial ad between levels)
 */
export function useQuizTrigger({ showQuiz, setShowQuiz, isTerminal }: QuizTriggerOptions): QuizTriggerReturn {
  // ── Store subscriptions ──────────────────────────────────
  const hp = useGameStore((s) => s.hp);
  const maxHp = useGameStore((s) => s.maxHp);
  const wave = useGameStore((s) => s.wave);
  const isPaused = useGameStore((s) => s.isPaused);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const quizCombo = useGameStore((s) => s.quizCombo);
  const speed = useGameStore((s) => s.speed);

  const wordStats = usePlayerStore((s) => s.wordStats);
  const grade = useSettingsStore((s) => s.grade);

  // ── Refs for tracking state (perf: no re-renders) ────────
  const quizRef = useRef<Quiz | null>(null);
  const quizContextRef = useRef<QuizContext>(null);
  const lastQuizTimeRef = useRef<number>(Date.now());

  // Timer-based (wave start quick quiz)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef<number>(0);

  // Boss wave tracking
  const lastBossWaveQuizRef = useRef<number>(0);

  // Wave bonus tracking
  const lastWaveBonusRef = useRef<number>(0);

  // Crisis tracking
  const crisisTriggeredRef = useRef<boolean>(false);

  // Revive tracking (once per game)
  const reviveUsedRef = useRef<boolean>(false);

  // Free tower tracking
  const lastFreeTowerWaveRef = useRef<number>(0);

  // Treasure chest tracking
  const lastTreasureWaveRef = useRef<number>(0);
  const treasureCounterRef = useRef<number>(0);

  // Speed unlock (once per session)
  const speedUnlockedRef = useRef<boolean>(false);

  // Streak bonus tracking
  const lastStreakBonusCombosRef = useRef<number>(0);

  // Quick quiz tracking (between waves)
  const lastQuickQuizWaveRef = useRef<number>(0);

  // ── Initialize word store on mount ───────────────────────
  useEffect(() => {
    const store = useWordStore.getState();
    if (store.words.length === 0) {
      if (grade === 'mixed') {
        store.setWords(allWords);
      } else {
        const gradeWords = getWordsByGrade(grade as 3 | 4 | 5 | 6);
        store.setWords(gradeWords.length > 0 ? gradeWords : allWords);
      }
    }
  }, [grade]);

  // ── Core quiz generation ─────────────────────────────────

  const generateQuiz = useCallback(
    (quizType?: QuizType): Quiz | null => {
      const store = useWordStore.getState();
      if (store.words.length === 0) {
        store.setWords(allWords);
      }

      const type = quizType ?? pickQuizType(1);
      return store.generateQuiz(type, wordStats);
    },
    [wordStats],
  );

  // ── Global cooldown check ────────────────────────────────

  const canTrigger = useCallback((): boolean => {
    if (showQuiz || isTerminal) return false;
    const elapsed = Date.now() - lastQuizTimeRef.current;
    return elapsed >= GLOBAL_COOLDOWN_MS;
  }, [showQuiz, isTerminal]);

  // ── Internal: fire a quiz with context ───────────────────

  const fireQuiz = useCallback(
    (quiz: Quiz, context: QuizContext): boolean => {
      if (showQuiz || isTerminal) return false;

      quizRef.current = quiz;
      quizContextRef.current = context;
      useGameStore.getState().startQuiz(quiz);
      lastQuizTimeRef.current = Date.now();
      elapsedSecondsRef.current = 0;
      setShowQuiz(true);
      return true;
    },
    [showQuiz, isTerminal, setShowQuiz],
  );

  // ============================================================
  // Trigger functions
  // ============================================================

  // 0. Manual trigger (backward compat)
  const triggerQuiz = useCallback(() => {
    if (showQuiz || isGameOver || isTerminal) return;

    const quiz = generateQuiz();
    if (!quiz) return;

    fireQuiz(quiz, { type: 'manual' });
  }, [showQuiz, isGameOver, isTerminal, generateQuiz, fireQuiz]);

  // 1. Wave Complete Bonus Quiz
  const triggerWaveBonus = useCallback(() => {
    if (!canTrigger()) return;

    const gameState = useGameStore.getState();
    const currentWave = gameState.wave;
    if (lastWaveBonusRef.current >= currentWave) return;

    // 40% chance
    if (Math.random() > WAVE_BONUS_CHANCE) {
      lastWaveBonusRef.current = currentWave;
      return;
    }

    const quiz = generateQuiz(pickQuizType(1));
    if (!quiz) return;

    // Bonus gold = base wave reward doubled
    const bonusGold = 30 + currentWave * 10;

    // Override reward for wave bonus
    quiz.reward = {
      ...quiz.reward,
      goldMultiplier: 2.0,
    };

    lastWaveBonusRef.current = currentWave;
    fireQuiz(quiz, { type: 'wave_bonus', waveIndex: currentWave, bonusGold });
  }, [canTrigger, generateQuiz, fireQuiz]);

  // 2. Boss Wave Pre-Quiz
  const triggerBossQuiz = useCallback(() => {
    if (!canTrigger()) return;

    const gameState = useGameStore.getState();
    const currentWave = gameState.wave;
    if (lastBossWaveQuizRef.current >= currentWave) return;

    const quiz = generateQuiz(pickQuizType(2));
    if (!quiz) return;

    // Generous reward: 30% damage boost + 100 gold
    quiz.reward = {
      goldMultiplier: 2.0,
      attackBoost: 0.3,
      ultimateCharge: 0.1,
      invincible: 0,
      speedBoost: 0,
    };

    lastBossWaveQuizRef.current = currentWave;
    fireQuiz(quiz, { type: 'boss', waveIndex: currentWave });
  }, [canTrigger, generateQuiz, fireQuiz]);

  // 3. Death/Revive Quiz
  const triggerReviveQuiz = useCallback(() => {
    if (reviveUsedRef.current) return;
    if (showQuiz || isTerminal) return;

    const quiz = generateQuiz(pickQuizType(2));
    if (!quiz) return;

    // Revive reward: 50% HP restore
    quiz.reward = {
      goldMultiplier: 0,
      attackBoost: 0,
      ultimateCharge: 0,
      invincible: 3,
      speedBoost: 0,
    };

    // Don't mark reviveUsed yet - only on success (handled by consumer)
    fireQuiz(quiz, { type: 'revive' });
  }, [showQuiz, isTerminal, generateQuiz, fireQuiz]);

  // 4. Free Tower Quiz
  const triggerFreeTowerQuiz = useCallback(() => {
    if (!canTrigger()) return;

    const gameState = useGameStore.getState();
    const currentWave = gameState.wave;
    if (lastFreeTowerWaveRef.current >= currentWave) return;

    // Harder quiz = better tower chance
    const difficulty: 1 | 2 | 3 = currentWave >= 15 ? 3 : currentWave >= 8 ? 2 : 1;
    const quiz = generateQuiz(pickQuizType(difficulty));
    if (!quiz) return;

    quiz.reward = {
      goldMultiplier: 1.0,
      attackBoost: 0,
      ultimateCharge: 0,
      invincible: 0,
      speedBoost: 0,
    };

    lastFreeTowerWaveRef.current = currentWave;
    fireQuiz(quiz, { type: 'free_tower' });
  }, [canTrigger, generateQuiz, fireQuiz]);

  // 5. Crisis Emergency Quiz
  const triggerCrisisQuiz = useCallback(() => {
    if (!canTrigger()) return;
    if (crisisTriggeredRef.current) return;

    const gameState = useGameStore.getState();

    const quiz = generateQuiz(pickQuizType(1));
    if (!quiz) return;

    // Reward: heal 5 HP + 3s invincibility
    quiz.reward = {
      goldMultiplier: 0.5,
      attackBoost: 0,
      ultimateCharge: 0,
      invincible: 3,
      speedBoost: 0,
    };

    crisisTriggeredRef.current = true;
    fireQuiz(quiz, { type: 'crisis', currentHp: gameState.hp });
  }, [canTrigger, generateQuiz, fireQuiz]);

  // 6. Treasure Chest Quiz
  const triggerTreasureQuiz = useCallback(() => {
    if (!canTrigger()) return;

    treasureCounterRef.current += 1;
    const chestId = `chest_${Date.now()}_${treasureCounterRef.current}`;

    // Random difficulty for treasure
    const difficulty: 1 | 2 | 3 = Math.random() < 0.3 ? 2 : 1;
    const quiz = generateQuiz(pickQuizType(difficulty));
    if (!quiz) return;

    // Treasure rewards are randomized by the consumer based on chestId
    quiz.reward = {
      goldMultiplier: 1.5 + Math.random() * 1.5,
      attackBoost: Math.random() < 0.3 ? 0.15 : 0,
      ultimateCharge: Math.random() < 0.2 ? 0.1 : 0,
      invincible: Math.random() < 0.15 ? 2 : 0,
      speedBoost: Math.random() < 0.2 ? 0.15 : 0,
    };

    fireQuiz(quiz, { type: 'treasure', chestId });
  }, [canTrigger, generateQuiz, fireQuiz]);

  // 7. Double Speed Quiz
  const triggerSpeedQuiz = useCallback(() => {
    if (speedUnlockedRef.current) return;
    if (showQuiz || isTerminal) return;

    const quiz = generateQuiz(pickQuizType(1));
    if (!quiz) return;

    quiz.reward = {
      goldMultiplier: 0.5,
      attackBoost: 0,
      ultimateCharge: 0,
      invincible: 0,
      speedBoost: 0.3,
    };

    fireQuiz(quiz, { type: 'speed_unlock' });
  }, [showQuiz, isTerminal, generateQuiz, fireQuiz]);

  // 8. Streak Bonus Quiz
  const triggerStreakBonus = useCallback(() => {
    if (!canTrigger()) return;

    const gameState = useGameStore.getState();
    const currentCombo = gameState.quizCombo;
    if (currentCombo < STREAK_BONUS_INTERVAL) return;
    if (lastStreakBonusCombosRef.current >= currentCombo) return;

    // Streak bonus uses harder quiz type
    const quiz = generateQuiz(pickQuizType(2));
    if (!quiz) return;

    // Massive reward for streak
    quiz.reward = {
      goldMultiplier: 3.0,
      attackBoost: 0.2,
      ultimateCharge: 0.15,
      invincible: 0,
      speedBoost: 0.1,
    };
    // Shorter time limit for rapid fire feel
    quiz.timeLimit = 8;

    lastStreakBonusCombosRef.current = currentCombo;
    fireQuiz(quiz, { type: 'streak_bonus', comboCount: currentCombo });
  }, [canTrigger, generateQuiz, fireQuiz]);

  // 9. Wave Start Quick Quiz
  const triggerQuickQuiz = useCallback(() => {
    if (!canTrigger()) return;

    const gameState = useGameStore.getState();
    const currentWave = gameState.wave;
    if (lastQuickQuizWaveRef.current >= currentWave) return;

    const store = useWordStore.getState();
    const quiz = generateQuickQuiz(store.generateQuiz, wordStats);
    if (!quiz) return;

    // Small gold bonus
    quiz.reward = {
      goldMultiplier: 0.5,
      attackBoost: 0,
      ultimateCharge: 0,
      invincible: 0,
      speedBoost: 0,
    };

    lastQuickQuizWaveRef.current = currentWave;
    fireQuiz(quiz, { type: 'quick', waveIndex: currentWave });
  }, [canTrigger, wordStats, fireQuiz]);

  // ============================================================
  // Automatic trigger effects
  // ============================================================

  // ── Boss wave: auto-trigger before every 5th wave ────────
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;

    const isBossWave = wave > 0 && wave % 5 === 0;
    if (isBossWave && lastBossWaveQuizRef.current !== wave) {
      const timer = setTimeout(() => {
        triggerBossQuiz();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [wave, isGameOver, isTerminal, showQuiz, triggerBossQuiz]);

  // ── Wave complete: offer bonus quiz (40% chance) ─────────
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;
    if (wave <= 0) return;

    // Skip if this is a boss wave (boss quiz takes priority)
    if (wave % 5 === 0) return;

    if (lastWaveBonusRef.current < wave) {
      // Small delay after wave clear
      const timer = setTimeout(() => {
        triggerWaveBonus();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [wave, isGameOver, isTerminal, showQuiz, triggerWaveBonus]);

  // ── Free tower: offer every 3 waves ──────────────────────
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;
    if (wave <= 0 || wave % FREE_TOWER_WAVE_INTERVAL !== 0) return;
    // Don't overlap with boss wave trigger
    if (wave % 5 === 0) return;

    if (lastFreeTowerWaveRef.current < wave) {
      // Delayed so it doesn't overlap with wave bonus
      const timer = setTimeout(() => {
        triggerFreeTowerQuiz();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wave, isGameOver, isTerminal, showQuiz, triggerFreeTowerQuiz]);

  // ── Treasure chest: 1 per 3 waves ───────────────────────
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;
    if (wave <= 0 || wave % TREASURE_WAVE_INTERVAL !== 0) return;
    // Offset from free tower to prevent collision
    if (wave % FREE_TOWER_WAVE_INTERVAL === 0 && wave % 5 !== 0) return;

    if (lastTreasureWaveRef.current < wave) {
      lastTreasureWaveRef.current = wave;
      const timer = setTimeout(() => {
        triggerTreasureQuiz();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [wave, isGameOver, isTerminal, showQuiz, triggerTreasureQuiz]);

  // ── Crisis: HP drops below 25% ──────────────────────────
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;

    const hpPercent = maxHp > 0 ? hp / maxHp : 1;

    if (hpPercent < CRISIS_HP_THRESHOLD && hpPercent > 0 && !crisisTriggeredRef.current) {
      triggerCrisisQuiz();
    }

    // Reset crisis flag when HP recovers above 60%
    if (hpPercent >= CRISIS_RESET_THRESHOLD) {
      crisisTriggeredRef.current = false;
    }
  }, [hp, maxHp, isGameOver, isTerminal, showQuiz, triggerCrisisQuiz]);

  // ── Revive: auto-offer on game over ──────────────────────
  useEffect(() => {
    if (!isGameOver || isTerminal || showQuiz) return;
    if (reviveUsedRef.current) return;

    // Short delay so the game over state is visible briefly
    const timer = setTimeout(() => {
      triggerReviveQuiz();
    }, 800);
    return () => clearTimeout(timer);
  }, [isGameOver, isTerminal, showQuiz, triggerReviveQuiz]);

  // ── Speed unlock: first time going to 3x ─────────────────
  useEffect(() => {
    if (speedUnlockedRef.current) return;
    if (isGameOver || isTerminal || showQuiz) return;

    if (speed === 3) {
      // Revert speed to 2x temporarily, then offer quiz
      useGameStore.getState().setSpeed(2);
      const timer = setTimeout(() => {
        triggerSpeedQuiz();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [speed, isGameOver, isTerminal, showQuiz, triggerSpeedQuiz]);

  // ── Streak bonus: every 5 quiz combo ──────────────────────
  useEffect(() => {
    if (isGameOver || isTerminal || showQuiz) return;
    if (quizCombo <= 0) return;

    if (
      quizCombo % STREAK_BONUS_INTERVAL === 0 &&
      quizCombo > lastStreakBonusCombosRef.current
    ) {
      const timer = setTimeout(() => {
        triggerStreakBonus();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [quizCombo, isGameOver, isTerminal, showQuiz, triggerStreakBonus]);

  // ── Wave start quick quiz (between waves countdown) ──────
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

      // Every 30 seconds of active gameplay, offer a quick quiz
      if (elapsedSecondsRef.current >= 30) {
        const timeSinceLastQuiz = Date.now() - lastQuizTimeRef.current;
        if (timeSinceLastQuiz < GLOBAL_COOLDOWN_MS) return;

        triggerQuickQuiz();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPaused, isGameOver, isTerminal, showQuiz, triggerQuickQuiz]);

  // ── Reset all refs when game resets (wave goes to 0) ─────
  useEffect(() => {
    if (wave === 0) {
      lastQuizTimeRef.current = Date.now();
      lastBossWaveQuizRef.current = 0;
      lastWaveBonusRef.current = 0;
      crisisTriggeredRef.current = false;
      reviveUsedRef.current = false;
      lastFreeTowerWaveRef.current = 0;
      lastTreasureWaveRef.current = 0;
      treasureCounterRef.current = 0;
      speedUnlockedRef.current = false;
      lastStreakBonusCombosRef.current = 0;
      lastQuickQuizWaveRef.current = 0;
      elapsedSecondsRef.current = 0;
      quizRef.current = null;
      quizContextRef.current = null;
    }
  }, [wave]);

  // ============================================================
  // Return
  // ============================================================

  return {
    // Current quiz state
    quiz: quizRef.current,
    quizContext: quizContextRef.current,

    // Manual trigger (backward compat)
    triggerQuiz,

    // Context-specific triggers
    triggerWaveBonus,
    triggerBossQuiz,
    triggerReviveQuiz,
    triggerFreeTowerQuiz,
    triggerCrisisQuiz,
    triggerTreasureQuiz,
    triggerSpeedQuiz,
    triggerStreakBonus,
    triggerQuickQuiz,

    // State
    canRevive: !reviveUsedRef.current && isGameOver,
    reviveUsed: reviveUsedRef.current,
    speedUnlocked: speedUnlockedRef.current,
  };
}
