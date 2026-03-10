'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Flame, Sparkles, X, Check, Volume2 } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import type { Quiz, QuizReward } from '@/shared/types/game';

interface WordQuizModalProps {
  isOpen: boolean;
  quiz: Quiz | null;
  combo: number;
  onAnswer: (correct: boolean, reward: QuizReward) => void;
  onClose: () => void;
}

export default function WordQuizModal({
  isOpen,
  quiz,
  combo,
  onAnswer,
  onClose,
}: WordQuizModalProps) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [showReward, setShowReward] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when quiz changes
  useEffect(() => {
    if (quiz && isOpen) {
      setTimeLeft(quiz.timeLimit);
      setSelectedOption(null);
      setSpellingInput('');
      setResult(null);
      setShowReward(false);

      if (quiz.type === 'spelling' && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    }
  }, [quiz, isOpen]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || !quiz || result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - wrong answer
          handleResult(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, quiz, result]);

  const handleResult = useCallback(
    (correct: boolean) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setResult(correct ? 'correct' : 'wrong');

      if (correct) {
        setShowReward(true);
      }

      // Auto close after delay
      setTimeout(() => {
        if (quiz) {
          onAnswer(correct, quiz.reward);
        }
      }, correct ? 1500 : 1000);
    },
    [quiz, onAnswer]
  );

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

  const handleSpellingSubmit = useCallback(() => {
    if (result || !quiz) return;

    const correct =
      spellingInput.trim().toLowerCase() === quiz.word.english.toLowerCase();
    handleResult(correct);
  }, [result, quiz, spellingInput, handleResult]);

  if (!quiz) return null;

  const isEnglishAnswer = quiz.type === 'kr2en' || quiz.type === 'spelling';
  const correctAnswer = isEnglishAnswer ? quiz.word.english : quiz.word.korean;
  const timerPercent = (timeLeft / quiz.timeLimit) * 100;
  const timerColor =
    timerPercent > 60 ? 'bg-emerald-500' : timerPercent > 30 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Modal isOpen={isOpen} closeOnBackdrop={false} closeOnEscape={false}>
      <div className="bg-slate-800 rounded-3xl w-[340px] overflow-hidden border border-slate-700 select-none">
        {/* Header */}
        <div className="relative px-4 pt-4 pb-3">
          {/* Timer Bar */}
          <div className="w-full h-2 rounded-full bg-slate-700 mb-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${timerColor}`}
              animate={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Timer */}
            <div className="flex items-center gap-1.5">
              <Timer
                className={`w-4 h-4 ${timeLeft <= 3 ? 'text-red-400 animate-timer-pulse' : 'text-slate-400'}`}
              />
              <span
                className={`text-sm font-bold tabular-nums ${
                  timeLeft <= 3 ? 'text-red-400' : 'text-white'
                }`}
              >
                {timeLeft}s
              </span>
            </div>

            {/* Combo */}
            {combo > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-bold text-orange-300">{combo}</span>
              </div>
            )}

            {/* Quiz type label */}
            <span className="text-xs text-slate-500 font-medium">
              {quiz.type === 'kr2en'
                ? '한→영'
                : quiz.type === 'en2kr'
                  ? '영→한'
                  : quiz.type === 'spelling'
                    ? '스펠링'
                    : quiz.type === 'listening'
                      ? '듣기'
                      : quiz.type === 'sentence'
                        ? '문장'
                        : '퀴즈'}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="px-4 py-6 text-center bg-slate-900/50">
          {quiz.type === 'kr2en' ? (
            <>
              <p className="text-sm text-slate-500 mb-2">이 뜻에 맞는 영단어는?</p>
              <p className="text-2xl font-bold text-white">{quiz.word.korean}</p>
            </>
          ) : quiz.type === 'en2kr' ? (
            <>
              <p className="text-sm text-slate-500 mb-2">이 단어의 뜻은?</p>
              <p className="text-2xl font-bold text-white">{quiz.word.english}</p>
              <p className="text-xs text-slate-500 mt-1">{quiz.word.phonetic}</p>
            </>
          ) : quiz.type === 'spelling' ? (
            <>
              <p className="text-sm text-slate-500 mb-2">스펠링을 입력하세요</p>
              <p className="text-2xl font-bold text-white">{quiz.word.korean}</p>
            </>
          ) : quiz.type === 'listening' ? (
            <>
              <p className="text-sm text-slate-500 mb-2">들은 단어를 고르세요</p>
              <button className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto hover:bg-indigo-500 transition-colors">
                <Volume2 className="w-8 h-8 text-white" />
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-2">다음 문장을 완성하세요</p>
              <p className="text-lg font-medium text-white">
                {quiz.word.exampleSentence?.replace(
                  quiz.word.english,
                  '______'
                ) || `I like ______.`}
              </p>
            </>
          )}
        </div>

        {/* Answer Area */}
        <div className="p-4">
          {quiz.type === 'spelling' ? (
            /* Spelling Input */
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={spellingInput}
                onChange={(e) => setSpellingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSpellingSubmit()}
                disabled={result !== null}
                placeholder="영어 단어를 입력하세요"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white text-center text-lg font-medium placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                autoComplete="off"
                autoCapitalize="off"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSpellingSubmit}
                disabled={result !== null || !spellingInput.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
              >
                확인
              </motion.button>
            </div>
          ) : (
            /* Multiple Choice */
            <div className="grid grid-cols-2 gap-2">
              {quiz.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === correctAnswer;
                const showCorrect = result && isCorrect;
                const showWrong = result && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={idx}
                    whileTap={!result ? { scale: 0.95 } : {}}
                    onClick={() => handleOptionClick(option)}
                    disabled={result !== null}
                    className={`
                      py-3 px-3 rounded-xl text-sm font-medium
                      transition-all duration-200 text-left
                      ${
                        showCorrect
                          ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-lg shadow-emerald-500/30'
                          : showWrong
                            ? 'bg-red-600 text-white border-2 border-red-400 animate-shake'
                            : isSelected
                              ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                              : 'bg-slate-700/50 text-slate-300 border-2 border-transparent hover:bg-slate-700 hover:border-slate-600'
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {showCorrect && <Check className="w-4 h-4" />}
                      {showWrong && <X className="w-4 h-4" />}
                      {option}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Result Overlay */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-4"
            >
              {result === 'correct' ? (
                <div className="text-center py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-emerald-300">정답!</span>
                  </motion.div>
                  {showReward && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-emerald-400/80 mt-1"
                    >
                      +{Math.round(50 * quiz.reward.goldMultiplier)} 골드
                    </motion.p>
                  )}
                </div>
              ) : (
                <div className="text-center py-3 rounded-xl bg-red-600/20 border border-red-500/30">
                  <p className="font-bold text-red-300">틀렸어요!</p>
                  <p className="text-xs text-red-400/80 mt-1">
                    정답: <span className="font-bold text-white">{correctAnswer}</span>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
