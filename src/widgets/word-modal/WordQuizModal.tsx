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
    return { label: '+40 골드 & HP +1 회복', gold: 40, attackBuff: 0, healAmount: 1 };
  }
  if (quizCombo >= 3) {
    return { label: '공격력 +15% 버프', gold: 25, attackBuff: 0.15, healAmount: 0 };
  }
  // Single correct
  return { label: '+15 골드', gold: 15, attackBuff: 0, healAmount: 0 };
}

/** Read word aloud using Web Speech API */
function speakWord(word: string, lang: 'en' | 'ko' = 'en') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = lang === 'en' ? 'en-US' : 'ko-KR';
  utterance.rate = 0.85;
  utterance.volume = 0.8;
  window.speechSynthesis.speak(utterance);
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

      // Read the word aloud
      if (quiz) {
        speakWord(quiz.word.english, 'en');
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

      // Close immediately (minimal delay for visual flash)
      closingRef.current = true;
      setTimeout(() => {
        handleClose();
      }, 250);
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
        className="quiz-modal-container rounded-[20px] w-[340px] overflow-hidden select-none relative"
      >
        {/* ── Header ── */}
        <div className="relative px-4 pt-4 pb-3">
          {/* Timer Bar - glass track, thicker */}
          <div
            className={`quiz-timer-bar-track w-full h-[5px] rounded-full mb-3 overflow-hidden`}
            data-low={timeLeft <= 3 ? 'true' : 'false'}
          >
            <motion.div
              className={`h-full rounded-full ${timerColor}`}
              initial={{ width: '100%' }}
              animate={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
              style={{
                boxShadow:
                  timerPercent > 60
                    ? '0 0 8px rgba(16,185,129,0.4)'
                    : timerPercent > 30
                      ? '0 0 8px rgba(245,158,11,0.4)'
                      : '0 0 12px rgba(239,68,68,0.5)',
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Timer */}
            <div className="flex items-center gap-1.5">
              <Timer
                className={`w-4 h-4 ${timeLeft <= 3 ? 'text-red-400 text-glow-danger' : 'text-slate-400'}`}
              />
              <span
                className={`text-sm font-bold tabular-nums ${
                  timeLeft <= 3 ? 'text-red-400 text-glow-danger' : 'text-white/90'
                }`}
              >
                {timeLeft}s
              </span>
              {timeLeft <= 3 && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-red-400 text-xs font-black text-glow-danger"
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-orange-500/30"
                style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(245,158,11,0.1) 100%)',
                  boxShadow: '0 0 12px rgba(249,115,22,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-bold text-orange-300 text-glow-gold">
                  {quizCombo} COMBO
                </span>
              </motion.div>
            )}

            {/* Quiz type label */}
            <span
              className="text-xs text-slate-400 font-medium px-2.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(71, 85, 105, 0.2)',
              }}
            >
              {quiz.type === 'kr2en' ? '한 → 영' : '영 → 한'}
            </span>
          </div>
        </div>

        {/* ── Question ── */}
        <div
          className="px-4 py-9 text-center relative"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(30,41,59,0.2) 50%, rgba(15,23,42,0.5) 100%)',
          }}
        >
          {/* Subtle radial glow behind the word */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, transparent 65%)',
            }}
          />

          {quiz.type === 'kr2en' ? (
            <>
              <p className="text-sm text-slate-500 mb-3 relative z-10">이 뜻에 맞는 영단어는?</p>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[34px] font-black text-white tracking-wide relative z-10 quiz-word-underline text-glow"
              >
                {quiz.word.korean}
              </motion.p>
              {quiz.word.partOfSpeech && (
                <p className="text-xs text-slate-500 mt-3 italic relative z-10">
                  ({quiz.word.partOfSpeech})
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-3 relative z-10">이 단어의 뜻은?</p>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[34px] font-black text-white tracking-wide relative z-10 quiz-word-underline text-glow"
              >
                {quiz.word.english}
              </motion.p>
              {quiz.word.phonetic && (
                <p className="text-xs text-indigo-400/60 mt-3 relative z-10">{quiz.word.phonetic}</p>
              )}
            </>
          )}
        </div>

        {/* ── Answer Buttons (2x2 grid) ── */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
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
                    relative py-3.5 px-3 rounded-2xl text-sm font-semibold
                    text-center leading-snug
                    min-h-[56px] flex items-center justify-center
                    disabled:cursor-not-allowed
                    ${
                      showCorrect
                        ? 'quiz-answer-glass quiz-answer-correct text-white'
                        : showWrong
                          ? 'quiz-answer-glass quiz-answer-wrong text-white'
                          : result && !isSelected
                            ? 'quiz-answer-glass quiz-answer-faded text-slate-600'
                            : 'quiz-answer-glass text-slate-200'
                    }
                  `}
                >
                  {/* Inner content wrapper for z-index over shine */}
                  <span className="relative z-10 flex items-center justify-center">
                    {showCorrect && (
                      <motion.span
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
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
                  </span>

                  {/* Correct answer glow + sparkle burst */}
                  {showCorrect && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: 'radial-gradient(circle at center, rgba(52,211,153,0.25) 0%, transparent 70%)',
                        }}
                      />
                      {/* Sparkle particles on correct */}
                      {[...Array(4)].map((_, si) => (
                        <motion.div
                          key={`spark-${si}`}
                          initial={{ opacity: 1, scale: 1 }}
                          animate={{
                            opacity: 0,
                            scale: 0,
                            x: [0, (si % 2 === 0 ? 1 : -1) * (12 + si * 6)],
                            y: [0, -(10 + si * 5)],
                          }}
                          transition={{ duration: 0.6, delay: si * 0.08 }}
                          className="absolute pointer-events-none"
                          style={{
                            left: '50%',
                            top: '50%',
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: si % 2 === 0 ? '#34d399' : '#fbbf24',
                            boxShadow: si % 2 === 0
                              ? '0 0 6px rgba(52,211,153,0.8)'
                              : '0 0 6px rgba(251,191,36,0.8)',
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* Wrong answer shake + crack overlay */}
                  {showWrong && (
                    <>
                      <motion.div
                        animate={{ x: [0, -5, 5, -5, 5, -2, 2, 0] }}
                        transition={{ duration: 0.45 }}
                        className="absolute inset-0"
                      />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.15, 0] }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(239,68,68,0.08) 8px, rgba(239,68,68,0.08) 10px)',
                        }}
                      />
                    </>
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
                <div
                  className="text-center py-5 rounded-2xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(52,211,153,0.08) 50%, rgba(16,185,129,0.12) 100%)',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    boxShadow: '0 0 24px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Gold shimmer background */}
                  <div className="absolute inset-0 quiz-gold-shimmer-bg pointer-events-none" />

                  {/* Sparkle header */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="inline-flex items-center gap-2.5 mb-2.5 relative z-10"
                  >
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-5 h-5 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' }} />
                    </motion.div>
                    <span className="font-black text-xl text-emerald-300 text-glow">정답!</span>
                    <motion.div
                      animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    >
                      <Sparkles className="w-5 h-5 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' }} />
                    </motion.div>
                  </motion.div>

                  {/* Reward display */}
                  {showReward && rewardInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-2 mt-1 relative z-10"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Coins className="w-4 h-4 text-amber-400 quiz-icon-gold" />
                        <span className="text-sm font-bold text-amber-300 text-glow-gold">
                          +{rewardInfo.gold} 골드
                        </span>
                      </div>

                      {rewardInfo.attackBuff > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4 text-red-400 quiz-icon-zap" />
                          <span className="text-sm font-bold text-red-300 text-glow-danger">
                            공격력 +{Math.round(rewardInfo.attackBuff * 100)}%
                          </span>
                        </motion.div>
                      )}

                      {rewardInfo.healAmount > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <Heart className="w-4 h-4 text-pink-400 quiz-icon-heart" />
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
                          <span className="text-xs text-orange-400 font-bold text-glow-gold">
                            {quizCombo >= 5
                              ? '5 COMBO 보너스!'
                              : '3 COMBO 보너스!'}
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Confetti-burst floating particles (more, varied) */}
                  {[...Array(10)].map((_, i) => {
                    const angle = (i / 10) * Math.PI * 2;
                    const dist = 30 + Math.random() * 40;
                    const colors = ['#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#a78bfa', '#fb923c'];
                    return (
                      <motion.div
                        key={i}
                        initial={{
                          opacity: 0.9,
                          x: 0,
                          y: 0,
                          scale: 0.6 + Math.random() * 0.6,
                        }}
                        animate={{
                          opacity: 0,
                          x: Math.cos(angle) * dist,
                          y: Math.sin(angle) * dist - 20,
                          scale: 0,
                          rotate: Math.random() * 360,
                        }}
                        transition={{
                          duration: 0.8 + Math.random() * 0.6,
                          delay: Math.random() * 0.25,
                        }}
                        className="absolute pointer-events-none"
                        style={{
                          left: '50%',
                          top: '30%',
                          width: i % 3 === 0 ? 6 : 4,
                          height: i % 3 === 0 ? 6 : 4,
                          borderRadius: i % 2 === 0 ? '50%' : '1px',
                          background: colors[i % colors.length],
                          boxShadow: `0 0 4px ${colors[i % colors.length]}80`,
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div
                  className="text-center py-5 rounded-2xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(185,28,28,0.06) 50%, rgba(239,68,68,0.08) 100%)',
                    border: '1px solid rgba(248, 113, 113, 0.2)',
                    boxShadow: '0 0 20px rgba(239,68,68,0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  {/* Soft red radial glow */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 60%)',
                    }}
                  />

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    className="relative z-10"
                  >
                    <p className="font-bold text-red-300/90 text-lg mb-1.5">아쉬워요!</p>
                  </motion.div>
                  <p className="text-sm text-slate-400 mb-1 relative z-10">정답:</p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                    className="font-black text-white text-xl mb-2 relative z-10 text-glow"
                  >
                    {correctAnswer}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-indigo-400/70 font-medium relative z-10"
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
              className="quiz-skip-btn w-full py-2 text-xs text-slate-500 hover:text-slate-400 rounded-xl font-medium"
            >
              건너뛰기
            </button>
          </div>
        )}

        {/* ── Next reward preview ── */}
        {!result && quizCombo > 0 && quizCombo < 5 && (
          <div className="px-4 pb-3">
            <div className="text-center text-[10px] text-slate-500">
              {quizCombo < 3 ? (
                <span>
                  {3 - quizCombo}문제 더 맞히면{' '}
                  <span className="text-red-400/70 font-semibold">공격력 +30%</span>
                </span>
              ) : (
                <span>
                  {5 - quizCombo}문제 더 맞히면{' '}
                  <span className="text-pink-400/70 font-semibold">HP 회복 + 100골드</span>
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </Modal>
  );
}
