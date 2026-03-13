'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Lock, Star, ChevronRight, Sparkles } from 'lucide-react';

import { usePlayerStore } from '@/shared/lib/store';

const WORLDS = [
  { id: 1, name: '초원의 마을', emoji: '🌿', color: 'from-green-600 to-emerald-700', accent: '#10B981' },
  { id: 2, name: '해변 왕국', emoji: '🏖️', color: 'from-cyan-600 to-blue-700', accent: '#06B6D4' },
  { id: 3, name: '사막 요새', emoji: '🏜️', color: 'from-amber-600 to-orange-700', accent: '#F59E0B' },
  { id: 4, name: '눈의 성', emoji: '❄️', color: 'from-sky-500 to-blue-600', accent: '#38BDF8' },
  { id: 5, name: '용암 동굴', emoji: '🌋', color: 'from-red-600 to-orange-700', accent: '#EF4444' },
  { id: 6, name: '유령 숲', emoji: '👻', color: 'from-purple-700 to-violet-800', accent: '#A855F7' },
  { id: 7, name: '하늘 섬', emoji: '☁️', color: 'from-sky-400 to-indigo-500', accent: '#818CF8' },
  { id: 8, name: '기계 도시', emoji: '⚙️', color: 'from-slate-500 to-zinc-700', accent: '#64748B' },
  { id: 9, name: '마왕 성', emoji: '🏰', color: 'from-rose-700 to-red-900', accent: '#F43F5E' },
  { id: 10, name: '카오스 차원', emoji: '🌀', color: 'from-fuchsia-600 to-purple-800', accent: '#D946EF' },
];

export default function AdventurePage() {
  const [expandedWorld, setExpandedWorld] = useState<number | null>(null);
  const unlockedStages = usePlayerStore((s) => s.unlockedStages);
  const highScores = usePlayerStore((s) => s.highScores);

  const isStageUnlocked = (worldId: number, stageId: number) => {
    return unlockedStages.some(
      (s) => s.worldId === worldId && s.stageId === stageId
    );
  };

  const getWorldProgress = (worldId: number) => {
    let cleared = 0;
    for (let s = 1; s <= 10; s++) {
      const key = `${worldId}-${s}`;
      if (highScores[key] && highScores[key] > 0) cleared++;
    }
    return cleared;
  };

  return (
    <div className="min-h-dvh bg-[#0F172A] relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800/50">
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
          <div>
            <h1 className="text-lg font-bold text-white">모험 모드</h1>
            <p className="text-xs text-slate-500">월드를 선택하세요</p>
          </div>
        </div>
      </div>

      {/* World List */}
      <div className="relative z-10 max-w-lg mx-auto px-4 py-4 space-y-3 pb-8">
        {WORLDS.map((world, index) => {
          const progress = getWorldProgress(world.id);
          const isExpanded = expandedWorld === world.id;
          const isWorldUnlocked =
            world.id === 1 || isStageUnlocked(world.id, 1);

          return (
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* World Card */}
              <motion.div
                layout
                onClick={() => {
                  if (isWorldUnlocked) {
                    setExpandedWorld(isExpanded ? null : world.id);
                  }
                }}
                className={`
                  rounded-2xl overflow-hidden cursor-pointer select-none
                  border transition-colors
                  ${
                    isWorldUnlocked
                      ? `border-slate-700/50 bg-slate-800/50 hover:border-slate-600/50`
                      : 'border-slate-800/30 bg-slate-900/30 opacity-50'
                  }
                `}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* World Icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${world.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}
                  >
                    {isWorldUnlocked ? world.emoji : <Lock className="w-6 h-6 text-white/50" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        WORLD {world.id}
                      </span>
                      {progress === 10 && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <h3 className="font-bold text-white text-base">
                      {world.name}
                    </h3>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(progress / 10) * 100}%`,
                            backgroundColor: world.accent,
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {progress}/10
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  {isWorldUnlocked && (
                    <ChevronRight
                      className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                </div>

                {/* Expanded Stages */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 grid grid-cols-5 gap-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(
                          (stageId) => {
                            const unlocked = isStageUnlocked(world.id, stageId);
                            const scoreKey = `${world.id}-${stageId}`;
                            const hasScore = highScores[scoreKey] > 0;
                            const isBoss = stageId === 5 || stageId === 10;

                            return (
                              <motion.div
                                key={stageId}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  delay: (stageId - 1) * 0.03,
                                  type: 'spring',
                                  stiffness: 300,
                                }}
                              >
                                {unlocked ? (
                                  <a
                                    href={`/play?world=${world.id}&stage=${stageId}`}
                                  >
                                    <div
                                      className={`
                                        relative aspect-square rounded-xl flex flex-col items-center justify-center
                                        transition-all cursor-pointer
                                        ${
                                          hasScore
                                            ? 'bg-gradient-to-br text-white shadow-md'
                                            : 'bg-slate-700/50 text-white hover:bg-slate-700'
                                        }
                                        ${isBoss ? 'ring-2 ring-amber-400/50' : ''}
                                      `}
                                      style={
                                        hasScore
                                          ? {
                                              background: `linear-gradient(135deg, ${world.accent}cc, ${world.accent}88)`,
                                            }
                                          : undefined
                                      }
                                    >
                                      <span className="text-sm font-bold">
                                        {stageId}
                                      </span>
                                      {hasScore && (
                                        <Star className="w-3 h-3 text-amber-300 mt-0.5" />
                                      )}
                                      {isBoss && (
                                        <span className="absolute -top-1 -right-1 text-[10px]">
                                          👑
                                        </span>
                                      )}
                                    </div>
                                  </a>
                                ) : (
                                  <div className="aspect-square rounded-xl bg-slate-800/30 flex items-center justify-center">
                                    <Lock className="w-4 h-4 text-slate-600" />
                                  </div>
                                )}
                              </motion.div>
                            );
                          }
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
