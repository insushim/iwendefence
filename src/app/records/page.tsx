'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  Target,
  Clock,
  BookOpen,
  Star,
  Swords,
  Zap,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { usePlayerStore } from '@/shared/lib/store';
import ProgressBar from '@/shared/ui/ProgressBar';

const WORLD_NAMES = [
  '초원의 마을',
  '해변 왕국',
  '사막 요새',
  '눈의 성',
  '용암 동굴',
  '유령 숲',
  '하늘 섬',
  '기계 도시',
  '마왕 성',
  '카오스 차원',
];

export default function RecordsPage() {
  const { highScores, wordStats, unlockedStages } = usePlayerStore();

  // Compute stats
  const totalStagesCleared = Object.keys(highScores).filter(
    (k) => k !== 'endless' && highScores[k] > 0
  ).length;
  const endlessHighScore = highScores['endless'] ?? 0;
  const totalWordsLearned = wordStats.filter((ws) => ws.mastery >= 1).length;
  const totalAttempts = wordStats.reduce((sum, ws) => sum + ws.totalAttempts, 0);
  const totalCorrect = wordStats.reduce((sum, ws) => sum + ws.correctCount, 0);
  const accuracyRate =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const avgResponseTime =
    wordStats.length > 0
      ? Math.round(
          wordStats.reduce((sum, ws) => sum + ws.averageResponseTime, 0) /
            wordStats.length
        )
      : 0;
  const masteredWords = wordStats.filter((ws) => ws.mastery >= 5).length;
  const bestCombo = wordStats.reduce((max, ws) => Math.max(max, ws.streak), 0);

  // Stage scores
  const stageScores: { worldId: number; stageId: number; score: number }[] = [];
  for (const [key, score] of Object.entries(highScores)) {
    if (key === 'endless') continue;
    const [w, s] = key.split('-').map(Number);
    if (w && s && score > 0) {
      stageScores.push({ worldId: w, stageId: s, score });
    }
  }
  stageScores.sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-dvh bg-[#0F172A]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </motion.div>
          </Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            기록실
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">
        {/* Highlight Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-600/20 to-yellow-600/20 rounded-2xl p-4 border border-amber-500/20"
          >
            <Trophy className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-2xl font-black text-white">
              {endlessHighScore.toLocaleString()}
            </p>
            <p className="text-xs text-amber-300/60 mt-0.5">무한 모드 최고</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl p-4 border border-indigo-500/20"
          >
            <Star className="w-6 h-6 text-indigo-400 mb-2" />
            <p className="text-2xl font-black text-white">{totalStagesCleared}</p>
            <p className="text-xs text-indigo-300/60 mt-0.5">클리어 스테이지</p>
          </motion.div>
        </div>

        {/* Learning Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-3"
        >
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            학습 통계
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">학습한 단어</p>
              <p className="text-lg font-bold text-white">{totalWordsLearned}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">마스터 단어</p>
              <p className="text-lg font-bold text-purple-400">{masteredWords}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">정답률</p>
              <p className="text-lg font-bold text-emerald-400">{accuracyRate}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">평균 응답시간</p>
              <p className="text-lg font-bold text-cyan-400">
                {avgResponseTime > 0 ? `${(avgResponseTime / 1000).toFixed(1)}s` : '-'}
              </p>
            </div>
          </div>

          <ProgressBar
            value={accuracyRate}
            max={100}
            color={
              accuracyRate >= 80
                ? 'bg-emerald-500'
                : accuracyRate >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }
            label="정답률"
            showLabel={false}
          />
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-3"
        >
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <Award className="w-4 h-4 text-amber-400" />
            도전 기록
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-900/50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-slate-300">최고 콤보</span>
              </div>
              <span className="font-bold text-white">{bestCombo}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-400" />
                <span className="text-sm text-slate-300">총 퀴즈 시도</span>
              </div>
              <span className="font-bold text-white">{totalAttempts}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-slate-300">해금 스테이지</span>
              </div>
              <span className="font-bold text-white">{unlockedStages.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Stage High Scores */}
        {stageScores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-3"
          >
            <h3 className="font-bold text-white text-sm">스테이지 최고 점수</h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {stageScores.slice(0, 20).map((entry, idx) => (
                <div
                  key={`${entry.worldId}-${entry.stageId}`}
                  className="flex items-center justify-between bg-slate-900/30 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-5 text-right tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-300">
                      {WORLD_NAMES[entry.worldId - 1]} {entry.stageId}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-amber-400 tabular-nums">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
