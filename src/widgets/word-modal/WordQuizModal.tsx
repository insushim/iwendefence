'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Flame, Sparkles, X, Check, Heart, Zap, Coins, Shield } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import { useWordStore, usePlayerStore, useGameStore } from '@/shared/lib/store';
import { allWords } from '@/shared/constants/words';
import type { Quiz, QuizReward, QuizType, WordData } from '@/shared/types/game';

// ── Reward tiers based on combo ──
function getComboReward(quizCombo: number): {
  label: string;
  gold: number;
  attackBuff: number;
  healAmount: number;
} {
  if (quizCombo >= 5) {
    return { label: '+100 골드 & HP +3 회복', gold: 100, attackBuff: 0, healAmount: 3 };
  }
  if (quizCombo >= 3) {
    return { label: '공격력 +30% 버프', gold: 50, attackBuff: 0.3, healAmount: 0 };
  }
  // Single correct
  return { label: '+50 골드', gold: 50, attackBuff: 0, healAmount: 0 };
}

interface WordQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WordQuizModal({ isOpen, onClose }: WordQuizModalProps) {
  // ── Store state ──
  const wordStats = usePlayerStore((s) => s.wordStats);
  const updateWordStat = usePlayerStore((s) => s.updateWordStat);
  const quizCombo = useGameStore((s) => s.quizCombo);

  // ── Local state ──
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [rewardInfo, setRewardInfo] = useState<ReturnType<typeof getComboReward> | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closingRef = useRef(false);

  // ── Generate quiz when modal opens ──
  useEffect(() => {
    if (!isOpen) {
      // Reset on close
      closingRef.current = false;
      return;
    }

    closingRef.current = false;

    // Ensure words are loaded
    const store = useWordStore.getState();
    if (store.words.length === 0) {
      store.setWords(allWords);
    }

    // Check if game store already has a quiz queued
    const gameQuiz = useGameStore.getState().currentQuiz;
    if (gameQuiz) {
      setQuiz(gameQuiz);
      setTimeLeft(gameQuiz.timeLimit);
      setSelectedOption(null);
      setResult(null);
      setShowReward(false);
      setRewardInfo(null);
      setStartTime(Date.now());
      return;
    }

    // Generate a fresh quiz
    const types: QuizType[] = ['kr2en', 'en2kr'];
    const quizType = types[Math.floor(Math.random() * types.length)];
    const generated = store.generateQuiz(quizType, wordStats);

    if (generated) {
      setQuiz(generated);
      setTimeLeft(generated.timeLimit);
      setSelectedOption(null);
      setResult(null);
      setShowReward(false);
      setRewardInfo(null);
      setStartTime(Date.now());
    }
  }, [isOpen, wordStats]);

  // ── Timer countdown ──
  useEffect(() => {
    if (!isOpen || !quiz || result) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleResult(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quiz, result]);

  // ── Handle result ──
  const handleResult = useCallback(
    (correct: boolean) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (closingRef.current) return;

      setResult(correct ? 'correct' : 'wrong');

      const responseTime = Date.now() - startTime;

      if (quiz) {
        // Update word stats in player store
        updateWordStat(quiz.word.id, correct, responseTime);
      }

      if (correct) {
        // Increment combo first
        useGameStore.getState().incrementCombo();
        const newCombo = useGameStore.getState().quizCombo;
        const reward = getComboReward(newCombo);
        setRewardInfo(reward);
        setShowReward(true);

        // Apply rewards
        useGameStore.getState().addGold(reward.gold);

        if (reward.healAmount > 0) {
          useGameStore.getState().healHp(reward.healAmount);
        }

        if (reward.attackBuff > 0) {
          // Apply attack buff to all towers
          const state = useGameStore.getState();
          for (const tower of state.towers) {
            tower.stats.damage = Math.round(tower.stats.damage * (1 + reward.attackBuff));
          }
        }

        // Add score
        const comboMultiplier = 1 + newCombo * 0.1;
        useGameStore.getState().setCombo(useGameStore.getState().combo);
      } else {
        // Reset quiz combo on wrong answer
        useGameStore.setState({ quizCombo: 0 });
      }

      // Auto close after delay
      setTimeout(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        handleClose();
      }, correct ? 1800 : 1500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quiz, startTime, updateWordStat]
  );

  // ── Handle option click ──
  const handleOptionClick = useCallback(
    (option: string) => {
      if (result || !quiz) return;
      setSelectedOption(option);

      const isEnglishAnswer = quiz.type === 'kr2en';
      const correctAnswer = isEnglishAnswer ? quiz.word.english : quiz.word.korean;
      const correct = option === correctAnswer;

      handleResult(correct);
    },
    [result, quiz, handleResult]
  );

  // ── Handle close / dismiss ──
  const handleClose = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Clear quiz from game store
    const gameState = useGameStore.getState();
    if (gameState.currentQuiz) {
      useGameStore.setState({ currentQuiz: null });
    }

    // Resume game if paused
    if (gameState.isPaused) {
      gameState.togglePause();
    }

    setQuiz(null);
    setResult(null);
    setSelectedOption(null);
    setShowReward(false);
    setRewardInfo(null);
    onClose();
  }, [onClose]);

  // ── Derived values ──
  const isEnglishAnswer = quiz?.type === 'kr2en';
  const correctAnswer = quiz ? (isEnglishAnswer ? quiz.word.english : quiz.word.korean) : '';
  const timerPercent = quiz ? (timeLeft / quiz.timeLimit) * 100 : 100;
  const timerColor =
    timerPercent > 60 ? 'bg-emerald-500' : timerPercent > 30 ? 'bg-amber-500' : 'bg-red-500';

  if (!quiz) return null;

  return (
    <Modal isOpen={isOpen} closeOnBackdrop={false} closeOnEscape={false}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 rounded-3xl w-[340px] overflow-hidden border border-slate-700 select-none relative"
      >
        {/* ── Header ── */}
        <div className="relative px-4 pt-4 pb-3">
          {/* Timer Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-700 mb-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${timerColor}`}
              initial={{ width: '100%' }}
              animate={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Timer */}
            <div className="flex items-center gap-1.5">
              <Timer
                className={`w-4 h-4 ${timeLeft <= 3 ? 'text-red-400' : 'text-slate-400'}`}
              />
              <span
                className={`text-sm font-bold tabular-nums ${
                  timeLeft <= 3 ? 'text-red-400' : 'text-white'
                }`}
              >
                {timeLeft}s
              </span>
              {timeLeft <= 3 && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-red-400 text-xs"
                >
                  !
                </motion.span>
              )}
            </div>

            {/* Combo display */}
            {quizCombo > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-bold text-orange-300">
                  {quizCombo} COMBO
                </span>
              </motion.div>
            )}

            {/* Quiz type label */}
            <span className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded-full bg-slate-700/50">
              {quiz.type === 'kr2en' ? '한 → 영' : '영 → 한'}
            </span>
          </div>
        </div>

        {/* ── Question ── */}
        <div className="px-4 py-8 text-center bg-gradient-to-b from-slate-900/80 to-slate-900/40">
          {quiz.type === 'kr2en' ? (
            <>
              <p className="text-sm text-slate-500 mb-3">이 뜻에 맞는 영단어는?</p>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-black text-white tracking-wide"
              >
                {quiz.word.korean}
              </motion.p>
              {quiz.word.partOfSpeech && (
                <p className="text-xs text-slate-600 mt-2 italic">
                  ({quiz.word.partOfSpeech})
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-3">이 단어의 뜻은?</p>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-black text-white tracking-wide"
              >
                {quiz.word.english}
              </motion.p>
              {quiz.word.phonetic && (
                <p className="text-xs text-indigo-400/70 mt-2">{quiz.word.phonetic}</p>
              )}
            </>
          )}
        </div>

        {/* ── Answer Buttons (2x2 grid) ── */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2.5">
            {quiz.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === correctAnswer;
              const showCorrect = result && isCorrect;
              const showWrong = result && isSelected && !isCorrect;

              return (
                <motion.button
                  key={`${option}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  whileTap={!result ? { scale: 0.93 } : {}}
                  onClick={() => handleOptionClick(option)}
                  disabled={result !== null}
                  className={`
                    relative py-3.5 px-3 rounded-xl text-sm font-semibold
                    transition-all duration-200 text-center leading-snug
                    min-h-[52px] flex items-center justify-center
                    ${
                      showCorrect
                        ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-lg shadow-emerald-500/40'
                        : showWrong
                          ? 'bg-red-600/90 text-white border-2 border-red-400 shadow-lg shadow-red-500/30'
                          : result && !isSelected
                            ? 'bg-slate-700/30 text-slate-500 border-2 border-transparent'
                            : 'bg-slate-700/60 text-slate-200 border-2 border-slate-600/50 hover:bg-slate-600/80 hover:border-indigo-500/50 active:bg-indigo-700/50'
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {showCorrect && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mr-1.5"
                    >
                      <Check className="w-4 h-4 inline" />
                    </motion.span>
                  )}
                  {showWrong && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mr-1.5"
                    >
                      <X className="w-4 h-4 inline" />
                    </motion.span>
                  )}
                  {option}

                  {/* Correct answer glow animation */}
                  {showCorrect && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-xl bg-emerald-400/20"
                    />
                  )}

                  {/* Wrong answer shake */}
                  {showWrong && (
                    <motion.div
                      animate={{ x: [0, -4, 4, -4, 4, 0] }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Result Overlay ── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-4"
            >
              {result === 'correct' ? (
                <div className="text-center py-4 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 relative overflow-hidden">
                  {/* Sparkle particles */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="inline-flex items-center gap-2 mb-2"
                  >
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="font-black text-lg text-emerald-300">정답!</span>
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </motion.div>

                  {/* Reward display */}
                  {showReward && rewardInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-1.5 mt-1"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-300">
                          +{rewardInfo.gold} 골드
                        </span>
                      </div>

                      {rewardInfo.attackBuff > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center justify-center gap-1.5"
                        >
                          <Zap className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-bold text-red-300">
                            공격력 +{Math.round(rewardInfo.attackBuff * 100)}%
                          </span>
                        </motion.div>
                      )}

                      {rewardInfo.healAmount > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                          className="flex items-center justify-center gap-1.5"
                        >
                          <Heart className="w-4 h-4 text-pink-400" />
                          <span className="text-sm font-bold text-pink-300">
                            HP +{rewardInfo.healAmount} 회복
                          </span>
                        </motion.div>
                      )}

                      {/* Combo milestone indicator */}
                      {quizCombo >= 3 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="pt-1"
                        >
                          <span className="text-xs text-orange-400/80 font-medium">
                            {quizCombo >= 5
                              ? '5 COMBO 보너스!'
                              : '3 COMBO 보너스!'}
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Floating particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{
                        opacity: 0.8,
                        y: 0,
                        x: (Math.random() - 0.5) * 40,
                        scale: 0.5 + Math.random() * 0.5,
                      }}
                      animate={{
                        opacity: 0,
                        y: -40 - Math.random() * 30,
                        scale: 0,
                      }}
                      transition={{
                        duration: 1 + Math.random() * 0.5,
                        delay: Math.random() * 0.3,
                      }}
                      className="absolute text-amber-400 pointer-events-none"
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        bottom: '20%',
                        fontSize: '10px',
                      }}
                    >
                      *
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 rounded-2xl bg-gradient-to-r from-red-600/15 via-red-500/15 to-red-600/15 border border-red-500/25">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <p className="font-bold text-red-300 text-lg mb-1">아쉬워요!</p>
                  </motion.div>
                  <p className="text-sm text-slate-400 mb-2">
                    정답:{' '}
                    <span className="font-bold text-white text-base">{correctAnswer}</span>
                  </p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-indigo-400/80 font-medium"
                  >
                    다시 도전!
                  </motion.p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Skip / Dismiss button ── */}
        {!result && (
          <div className="px-4 pb-3">
            <button
              onClick={handleClose}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors font-medium"
            >
              건너뛰기
            </button>
          </div>
        )}

        {/* ── Next reward preview ── */}
        {!result && quizCombo > 0 && quizCombo < 5 && (
          <div className="px-4 pb-3">
            <div className="text-center text-[10px] text-slate-600">
              {quizCombo < 3 ? (
                <span>
                  {3 - quizCombo}문제 더 맞히면{' '}
                  <span className="text-red-400/70">공격력 +30%</span>
                </span>
              ) : (
                <span>
                  {5 - quizCombo}문제 더 맞히면{' '}
                  <span className="text-pink-400/70">HP 회복 + 100골드</span>
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </Modal>
  );
}
