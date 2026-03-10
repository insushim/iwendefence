'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Play,
  FastForward,
  Zap,
  Merge,
  BookOpen,
  ArrowLeft,
  Heart,
  Coins,
  Diamond,
  Waves,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGameStore } from '@/shared/lib/store';
import { TOWER_DEFINITIONS } from '@/shared/constants/towers';
import { TowerType, type GameSpeed } from '@/shared/types/game';
import GameHUD from '@/widgets/hud/GameHUD';
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';

const towerList = Object.values(TOWER_DEFINITIONS);

function PlayPageContent() {
  const searchParams = useSearchParams();
  const worldId = searchParams.get('world') || '1';
  const stageId = searchParams.get('stage') || '1';

  const {
    gold,
    diamonds,
    hp,
    maxHp,
    wave,
    towers,
    score,
    speed,
    isPaused,
    isGameOver,
    combo,
    setSpeed,
    togglePause,
    addTower,
    reset,
  } = useGameStore();

  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  // Watch for game over
  React.useEffect(() => {
    if (isGameOver) setShowGameOver(true);
  }, [isGameOver]);

  const handleSpeedToggle = useCallback(() => {
    const speeds: GameSpeed[] = [1, 2, 3];
    const idx = speeds.indexOf(speed);
    setSpeed(speeds[(idx + 1) % speeds.length]);
  }, [speed, setSpeed]);

  const handleTowerSelect = useCallback((type: TowerType) => {
    setSelectedTower((prev) => (prev === type ? null : type));
  }, []);

  const handleGridTap = useCallback(
    (row: number, col: number) => {
      if (!selectedTower) return;
      const def = TOWER_DEFINITIONS[selectedTower];
      if (gold < def.cost) return;

      addTower({
        id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: selectedTower,
        grade: 1,
        position: { row, col },
        stats: { ...def.baseStats },
        level: 1,
        mergeCount: 0,
        targetingMode: 'first',
      });
      useGameStore.getState().addGold(-def.cost);
      setSelectedTower(null);
    },
    [selectedTower, gold, addTower]
  );

  return (
    <div className="h-dvh flex flex-col bg-[#0F172A] relative overflow-hidden game-area">
      {/* HUD */}
      <GameHUD
        hp={hp}
        maxHp={maxHp}
        gold={gold}
        diamonds={diamonds}
        wave={wave}
        score={score}
        combo={combo}
      />

      {/* Game Canvas Area */}
      <div className="flex-1 relative">
        {/* Grid Placeholder - 8x12 game grid */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="grid grid-cols-8 gap-0.5 w-full max-w-md aspect-[2/3]">
            {Array.from({ length: 96 }, (_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              const placedTower = towers.find(
                (t) => t.position.row === row && t.position.col === col
              );

              return (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleGridTap(row, col)}
                  className={`
                    aspect-square rounded-sm flex items-center justify-center text-xs
                    transition-colors cursor-pointer select-none
                    ${
                      placedTower
                        ? 'bg-slate-700/80 border border-slate-600/50'
                        : selectedTower
                          ? 'bg-slate-800/60 border border-indigo-500/30 hover:bg-indigo-500/20'
                          : 'bg-slate-800/40 border border-slate-700/20'
                    }
                  `}
                >
                  {placedTower ? (
                    <span className="text-sm">
                      {TOWER_DEFINITIONS[placedTower.type].icon}
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Stage Info Overlay */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <div className="px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-xs text-slate-400">
            World {worldId} - Stage {stageId}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 safe-area-pb">
        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800/50">
          {/* Back */}
          <Link href="/adventure">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </div>
          </Link>

          {/* Pause */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePause}
            className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center"
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-emerald-400" />
            ) : (
              <Pause className="w-4 h-4 text-slate-400" />
            )}
          </motion.button>

          {/* Speed */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSpeedToggle}
            className="h-9 px-3 rounded-xl bg-slate-800 flex items-center gap-1.5 text-sm"
          >
            <FastForward className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold tabular-nums">x{speed}</span>
          </motion.button>

          <div className="flex-1" />

          {/* Quiz */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowQuiz(true)}
            className="h-9 px-3 rounded-xl bg-indigo-600 flex items-center gap-1.5 text-sm text-white font-medium"
          >
            <BookOpen className="w-4 h-4" />
            <span>퀴즈</span>
          </motion.button>

          {/* Merge */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="h-9 px-3 rounded-xl bg-purple-600 flex items-center gap-1.5 text-sm text-white font-medium"
          >
            <Merge className="w-4 h-4" />
            <span>합성</span>
          </motion.button>

          {/* Hero Skill */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center"
          >
            <Zap className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        {/* Tower Selection Bar */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-3 py-2 min-w-max">
            {towerList.map((tower) => {
              const isSelected = selectedTower === tower.type;
              const canAfford = gold >= tower.cost;

              return (
                <motion.button
                  key={tower.type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTowerSelect(tower.type)}
                  className={`
                    flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[60px]
                    transition-all select-none
                    ${
                      isSelected
                        ? 'bg-indigo-600/30 border-2 border-indigo-500 shadow-lg shadow-indigo-500/20'
                        : canAfford
                          ? 'bg-slate-800/80 border-2 border-transparent hover:border-slate-600'
                          : 'bg-slate-800/40 border-2 border-transparent opacity-40'
                    }
                  `}
                >
                  <span className="text-xl leading-none">{tower.icon}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">
                    {tower.nameKr}
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      canAfford ? 'text-amber-400' : 'text-slate-600'
                    }`}
                  >
                    {tower.cost}G
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <Modal isOpen={showGameOver} closeOnBackdrop={false} closeOnEscape={false}>
        <div className="bg-slate-800 rounded-3xl p-6 w-80 text-center border border-slate-700">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-5xl mb-4"
          >
            {hp <= 0 ? '💀' : '🎉'}
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-2">
            {hp <= 0 ? '게임 오버' : '스테이지 클리어!'}
          </h2>
          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>점수</span>
              <span className="text-white font-bold">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>웨이브</span>
              <span className="text-white font-bold">{wave}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>타워</span>
              <span className="text-white font-bold">{towers.length}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/adventure" className="flex-1">
              <Button variant="ghost" fullWidth>
                나가기
              </Button>
            </Link>
            <Button
              variant="primary"
              fullWidth
              className="flex-1"
              onClick={() => {
                reset();
                setShowGameOver(false);
              }}
            >
              재도전
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh flex items-center justify-center bg-[#0F172A]">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PlayPageContent />
    </Suspense>
  );
}
