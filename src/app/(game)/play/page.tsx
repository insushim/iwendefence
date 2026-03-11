'use client';

import React, { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Play,
  FastForward,
  BookOpen,
  ArrowLeft,
  Swords,
  Heart,
} from 'lucide-react';

import { useSearchParams } from 'next/navigation';
import { useGameStore, usePlayerStore } from '@/shared/lib/store';
import { useGameLoop } from '@/shared/hooks/useGameLoop';
import { useQuizTrigger } from '@/shared/hooks/useQuizTrigger';
import { getStage } from '@/shared/constants/stages';
import { TOWER_DEFINITIONS } from '@/shared/constants/towers';
import type { PlacementInfo } from '@/shared/lib/renderer';
import { TowerType, type GameSpeed, type Tower, type WorldId, type StageId } from '@/shared/types/game';
import GameHUD from '@/widgets/hud/GameHUD';
import WordQuizModal from '@/widgets/word-modal/WordQuizModal';
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';

// ── Random Tower System ───────────────────────────────────────
const LEGENDARY_TYPES = new Set([TowerType.METEOR, TowerType.VOID, TowerType.PHOENIX, TowerType.CHRONO, TowerType.DIVINE]);
const BASIC_TYPES = [TowerType.ARCHER, TowerType.ICE, TowerType.POISON, TowerType.BARRICADE];
const ADVANCED_TYPES = [TowerType.MAGIC, TowerType.CANNON, TowerType.LIGHTNING, TowerType.SNIPER, TowerType.FLAME, TowerType.HEALER, TowerType.GOLDMINE, TowerType.WORD];
const LEGENDARY_LIST = [TowerType.METEOR, TowerType.VOID, TowerType.PHOENIX, TowerType.CHRONO, TowerType.DIVINE];
const RANDOM_TOWER_COST = 150;

function rollRandomTower(): TowerType {
  const roll = Math.random();
  if (roll < 0.70) {
    return BASIC_TYPES[Math.floor(Math.random() * BASIC_TYPES.length)];
  } else if (roll < 0.95) {
    return ADVANCED_TYPES[Math.floor(Math.random() * ADVANCED_TYPES.length)];
  } else {
    return LEGENDARY_LIST[Math.floor(Math.random() * LEGENDARY_LIST.length)];
  }
}

const towerList = Object.values(TOWER_DEFINITIONS).filter(t => !LEGENDARY_TYPES.has(t.type));

function PlayPageContent() {
  const searchParams = useSearchParams();
  const worldId = (parseInt(searchParams.get('world') || '1', 10) || 1) as WorldId;
  const stageId = (parseInt(searchParams.get('stage') || '1', 10) || 1) as StageId;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const waveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageLoadedRef = useRef(false);

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
    quizCombo,
    setSpeed,
    togglePause,
    addTower,
    reset,
  } = useGameStore();

  const setHighScore = usePlayerStore((s) => s.setHighScore);
  const unlockStage = usePlayerStore((s) => s.unlockStage);

  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [isRandomTower, setIsRandomTower] = useState(false);
  const [randomTowerNotif, setRandomTowerNotif] = useState<{ name: string; icon: string; isLegendary: boolean } | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showStageClear, setShowStageClear] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [cellSize, setCellSize] = useState(60);
  const [totalWaves, setTotalWaves] = useState(0);

  // ── New: Quiz placement system (replacing ads) ──
  const [showWaveBonus, setShowWaveBonus] = useState(false);
  const [showReviveQuiz, setShowReviveQuiz] = useState(false);
  const [reviveUsed, setReviveUsed] = useState(false);
  const [waveBonusGold, setWaveBonusGold] = useState(0);
  const [quizContext, setQuizContext] = useState<string | null>(null);
  const [showBossWarning, setShowBossWarning] = useState(false);
  const [bossWarningType, setBossWarningType] = useState<string>('');

  const gameLoop = useGameLoop(canvasRef);

  // ── Quiz auto-trigger system ──
  const { triggerQuiz } = useQuizTrigger({
    showQuiz,
    setShowQuiz,
    isTerminal: isGameOver || showGameOver || showStageClear,
  });

  // Load stage on mount
  useEffect(() => {
    if (stageLoadedRef.current) return;
    stageLoadedRef.current = true;

    // Reset game state
    reset();

    const stage = getStage(worldId, stageId);
    setTotalWaves(stage.waves.length);

    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const cols = 16;
      const rows = 10;

      const cs = Math.floor(Math.min(rect.width / cols, rect.height / rows));
      setCellSize(cs);

      canvas.width = cols * cs;
      canvas.height = rows * cs;
      canvas.style.width = `${cols * cs}px`;
      canvas.style.height = `${rows * cs}px`;

      return cs;
    };

    const cs = updateCanvasSize();
    if (!cs) return;

    gameLoop.loadStage(stage.mapData, stage.waves, cs);

    const engine = gameLoop.getEngine();
    if (engine && canvasRef.current) {
      engine.setCanvas(canvasRef.current, cs);
    }

    gameLoop.start();

    // Auto-start first wave after 3 seconds
    waveTimerRef.current = setTimeout(() => {
      gameLoop.startNextWave();
    }, 3000);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      const newCs = updateCanvasSize();
      if (newCs) {
        const eng = gameLoop.getEngine();
        if (eng && canvasRef.current) {
          eng.setCanvas(canvasRef.current, newCs);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync towers to engine
  useEffect(() => {
    gameLoop.syncTowers(towers);
  }, [towers, gameLoop]);

  // Watch for wave completion -> auto-start next wave (for stage mode)
  useEffect(() => {
    const engine = gameLoop.getEngine();
    if (!engine || isGameOver) return;

    const checkInterval = setInterval(() => {
      if (engine.isAllWavesDone() && !engine.getIsGameOver()) {
        // All waves cleared!
        clearInterval(checkInterval);
        setShowStageClear(true);

        // Save progress
        setHighScore(worldId, stageId, score);
        // Unlock next stage
        const nextStageId = stageId < 10 ? ((stageId + 1) as StageId) : stageId;
        const nextWorldId = stageId >= 10 && worldId < 10 ? ((worldId + 1) as WorldId) : worldId;
        if (stageId < 10) {
          unlockStage(worldId, nextStageId);
        } else if (worldId < 10) {
          unlockStage(nextWorldId, 1 as StageId);
        }
        return;
      }

      if (!engine.isWaveActive() && engine.getCurrentWave() >= 0 && !engine.getIsGameOver() && !engine.isAllWavesDone()) {
        // Wave ended, start next after delay
        if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
        waveTimerRef.current = setTimeout(() => {
          gameLoop.startNextWave();
        }, 5000);
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [wave, gameLoop, isGameOver, worldId, stageId, score, setHighScore, unlockStage]);

  // Game over handling - offer revive quiz first (like "watch ad to continue")
  useEffect(() => {
    if (isGameOver && !showStageClear) {
      if (!reviveUsed) {
        setShowReviveQuiz(true);
      } else {
        setShowGameOver(true);
      }
    }
  }, [isGameOver, showStageClear, reviveUsed]);

  // Wave complete bonus quiz (like "watch ad for double gold")
  useEffect(() => {
    if (wave > 0 && wave % 2 === 0 && !isGameOver && !showStageClear) {
      // 40% chance to offer bonus quiz after every 2nd wave
      if (Math.random() < 0.4) {
        const bonusGold = 30 + wave * 5;
        setWaveBonusGold(bonusGold);
        setShowWaveBonus(true);

        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => setShowWaveBonus(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [wave, isGameOver, showStageClear]);

  // Handle revive quiz result
  const handleReviveQuiz = useCallback(() => {
    setShowReviveQuiz(false);
    setQuizContext('revive');
    setShowQuiz(true);
  }, []);

  const handleReviveSkip = useCallback(() => {
    setShowReviveQuiz(false);
    setShowGameOver(true);
  }, []);

  // Handle wave bonus quiz
  const handleWaveBonusQuiz = useCallback(() => {
    setShowWaveBonus(false);
    setQuizContext('wave_bonus');
    setShowQuiz(true);
  }, []);

  // Sync pause state to engine
  useEffect(() => {
    if (isPaused) {
      gameLoop.pause();
    } else {
      gameLoop.resume();
    }
  }, [isPaused, gameLoop]);

  // Sync speed to engine
  useEffect(() => {
    gameLoop.setSpeed(speed);
  }, [speed, gameLoop]);

  const handleSpeedToggle = useCallback(() => {
    const speeds: GameSpeed[] = [1, 2, 3];
    const idx = speeds.indexOf(speed);
    setSpeed(speeds[(idx + 1) % speeds.length]);
  }, [speed, setSpeed]);

  const handleTowerSelect = useCallback((type: TowerType) => {
    setIsRandomTower(false);
    setSelectedTower((prev) => (prev === type ? null : type));
  }, []);

  const handleRandomTowerSelect = useCallback(() => {
    if (isRandomTower) {
      setIsRandomTower(false);
      setSelectedTower(null);
    } else {
      setIsRandomTower(true);
      setSelectedTower(TowerType.ARCHER); // placeholder - will be replaced on placement
    }
  }, [isRandomTower]);

  const handleCanvasTap = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const engine = gameLoop.getEngine();
      if (!canvas || !engine) return;

      const mapData = engine.getMapData();
      if (!mapData) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;
      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      const cs = engine.getCellSize();
      const col = Math.floor(canvasX / cs);
      const row = Math.floor(canvasY / cs);

      if (row < 0 || row >= mapData.grid.length || col < 0 || col >= mapData.grid[0].length) return;

      if (selectedTower || isRandomTower) {
        const gridValue = mapData.grid[row][col];
        if (gridValue !== 2) return;

        const existingTower = towers.find(
          (t) => t.position.row === row && t.position.col === col
        );
        if (existingTower) return;

        if (isRandomTower) {
          // Random tower placement
          if (gold < RANDOM_TOWER_COST) return;

          const rolledType = rollRandomTower();
          const rolledDef = TOWER_DEFINITIONS[rolledType];

          const newTower: Tower = {
            id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: rolledType,
            grade: 1,
            position: { row, col },
            stats: { ...rolledDef.baseStats },
            level: 1,
            mergeCount: 0,
            targetingMode: 'first',
          };

          addTower(newTower);
          useGameStore.getState().addGold(-RANDOM_TOWER_COST);
          setSelectedTower(null);
          setIsRandomTower(false);
          gameLoop.placementInfoRef.current = null;

          // Show notification
          setRandomTowerNotif({
            name: rolledDef.nameKr,
            icon: rolledDef.icon,
            isLegendary: LEGENDARY_TYPES.has(rolledType),
          });
          setTimeout(() => setRandomTowerNotif(null), 2500);
          return;
        }

        const def = TOWER_DEFINITIONS[selectedTower!];
        if (gold < def.cost) return;

        const newTower: Tower = {
          id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: selectedTower!,
          grade: 1,
          position: { row, col },
          stats: { ...def.baseStats },
          level: 1,
          mergeCount: 0,
          targetingMode: 'first',
        };

        addTower(newTower);
        useGameStore.getState().addGold(-def.cost);
        setSelectedTower(null);
        gameLoop.placementInfoRef.current = null;
        return;
      }

      const tappedTower = towers.find(
        (t) => t.position.row === row && t.position.col === col
      );
      if (tappedTower) {
        gameLoop.selectedTowerId.current = tappedTower.id;
      } else {
        gameLoop.selectedTowerId.current = null;
      }
    },
    [selectedTower, isRandomTower, gold, towers, addTower, gameLoop]
  );

  // ── Placement preview: update placementInfo on hover ──
  const updatePlacementInfo = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const engine = gameLoop.getEngine();
      if (!canvas || !engine || (!selectedTower && !isRandomTower)) {
        gameLoop.placementInfoRef.current = null;
        return;
      }

      const mapData = engine.getMapData();
      if (!mapData) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      const cs = engine.getCellSize();
      const col = Math.floor(canvasX / cs);
      const row = Math.floor(canvasY / cs);

      if (row < 0 || row >= mapData.grid.length || col < 0 || col >= mapData.grid[0].length) {
        gameLoop.placementInfoRef.current = null;
        return;
      }

      const previewType = isRandomTower ? TowerType.ARCHER : selectedTower!;
      const cost = isRandomTower ? RANDOM_TOWER_COST : TOWER_DEFINITIONS[previewType].cost;
      const range = isRandomTower ? 2.5 : TOWER_DEFINITIONS[previewType].baseStats.range;
      const gridValue = mapData.grid[row][col];
      const existingTower = towers.find(
        (t) => t.position.row === row && t.position.col === col
      );
      const canPlace = gridValue === 2 && !existingTower && gold >= cost;

      gameLoop.placementInfoRef.current = {
        towerType: previewType,
        row,
        col,
        range,
        canPlace,
      };
    },
    [selectedTower, isRandomTower, towers, gold, gameLoop]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      updatePlacementInfo(e.clientX, e.clientY);
    },
    [updatePlacementInfo]
  );

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 0) return;
      updatePlacementInfo(e.touches[0].clientX, e.touches[0].clientY);
    },
    [updatePlacementInfo]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    gameLoop.placementInfoRef.current = null;
  }, [gameLoop]);

  // Clear placement info when selectedTower changes or is deselected
  useEffect(() => {
    if (!selectedTower && !isRandomTower) {
      gameLoop.placementInfoRef.current = null;
    }
  }, [selectedTower, isRandomTower, gameLoop]);

  const handleStartWave = useCallback(() => {
    gameLoop.startNextWave();
  }, [gameLoop]);

  const handleManualQuiz = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuiz(true);
  }, [isPaused, togglePause]);

  const handleRetry = useCallback(() => {
    reset();
    setShowGameOver(false);
    setShowStageClear(false);
    stageLoadedRef.current = false;

    setTimeout(() => {
      const stage = getStage(worldId, stageId);
      setTotalWaves(stage.waves.length);

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const cols = 16;
      const rows = 10;
      const cs = Math.floor(Math.min(rect.width / cols, rect.height / rows));
      setCellSize(cs);
      canvas.width = cols * cs;
      canvas.height = rows * cs;
      canvas.style.width = `${cols * cs}px`;
      canvas.style.height = `${rows * cs}px`;

      gameLoop.loadStage(stage.mapData, stage.waves, cs);
      const engine = gameLoop.getEngine();
      if (engine) {
        engine.setCanvas(canvas, cs);
      }
      gameLoop.start();
      stageLoadedRef.current = true;

      waveTimerRef.current = setTimeout(() => {
        gameLoop.startNextWave();
      }, 3000);
    }, 100);
  }, [reset, gameLoop, worldId, stageId]);

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

      {/* Stage Info Banner */}
      <div className="relative z-10 glass-shimmer stage-banner-border">
        <div className="flex items-center justify-center gap-3 py-1.5 px-4"
          style={{
            background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(147,51,234,0.12), rgba(6,182,212,0.08))',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-bold text-indigo-200 tracking-wide text-glow">
              W{worldId}-{stageId}
            </span>
          </div>

          {/* Wave progress mini bar */}
          <div className="flex items-center gap-2">
            <div className="relative w-20 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full wave-progress-bar"
                style={{ width: totalWaves > 0 ? `${(wave / totalWaves) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-300 tabular-nums">
              {wave}<span className="text-slate-500">/{totalWaves}</span>
            </span>
          </div>

          {/* Quiz combo indicator */}
          {quizCombo > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border animate-pulse-glow"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
                borderColor: 'rgba(245,158,11,0.35)',
              }}
            >
              <span className="text-[10px] font-black text-orange-300 text-glow-gold">{quizCombo} COMBO</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Canvas Area */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center bg-[#0d1520]">
        {/* Canvas wrapper with glow border + vignette */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="block cursor-pointer touch-none rounded"
            onClick={handleCanvasTap}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onTouchMove={handleCanvasTouchMove}
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="canvas-vignette rounded" />
          <div className="canvas-glow-border" />
        </div>

        {/* Wave start button overlay */}
        {!isGameOver && !showStageClear && (
          <div className="absolute bottom-4 right-4 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleStartWave}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-xs font-bold animate-wave-btn-pulse glass-shimmer overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.85), rgba(147,51,234,0.85))',
                border: '1px solid rgba(165,180,252,0.3)',
              }}
            >
              <Swords className="w-4 h-4" />
              <span className="tracking-wide">NEXT WAVE</span>
              {/* Shine overlay */}
              <div className="absolute inset-0 btn-shine-overlay opacity-60 pointer-events-none" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="glass-dark safe-area-pb">
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(71,85,105,0.15)' }}>
          <a href="/adventure">
            <div className="w-9 h-9 rounded-xl ctrl-btn-glass flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </div>
          </a>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePause}
            className={`w-9 h-9 rounded-xl ctrl-btn-glass flex items-center justify-center ${
              isPaused ? 'border-emerald-500/30' : ''
            }`}
            style={isPaused ? {
              boxShadow: '0 0 12px rgba(16,185,129,0.2)',
              borderColor: 'rgba(16,185,129,0.3)',
            } : undefined}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-emerald-400" style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' }} />
            ) : (
              <Pause className="w-4 h-4 text-slate-400" />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSpeedToggle}
            className="speed-badge h-9 px-3 rounded-xl ctrl-btn-glass flex items-center gap-1.5 text-sm"
            data-fast={speed > 1 ? 'true' : 'false'}
          >
            <FastForward className="w-4 h-4 text-amber-400" style={speed > 1 ? { filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' } : undefined} />
            <span className={`font-bold tabular-nums ${speed > 1 ? 'text-amber-300 text-glow-gold' : 'text-amber-400'}`}>x{speed}</span>
            {speed === 3 && (
              <span className="ml-0.5 px-1 py-px text-[8px] font-black rounded bg-amber-500/20 text-amber-300 uppercase tracking-wider">MAX</span>
            )}
          </motion.button>

          <div className="flex-1" />

          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.03 }}
            onClick={handleManualQuiz}
            className="relative h-9 px-4 rounded-xl flex items-center gap-1.5 text-sm text-white font-bold btn-glow overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(79,70,229,0.9))',
              border: '1px solid rgba(165,180,252,0.2)',
              boxShadow: '0 0 12px rgba(99,102,241,0.2)',
            }}
          >
            <BookOpen className="w-4 h-4" style={{ filter: 'drop-shadow(0 0 4px rgba(165,180,252,0.6))' }} />
            <span className="tracking-wide">QUIZ</span>
            <div className="absolute inset-0 btn-shine-overlay opacity-40 pointer-events-none" />
          </motion.button>
        </div>

        {/* Tower Selection Bar */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 px-3 py-2 min-w-max">
            {/* Random Tower Button */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleRandomTowerSelect}
              className={`
                flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[62px]
                transition-all select-none relative overflow-hidden
                ${
                  isRandomTower
                    ? 'animate-rainbow-border border-2 shadow-lg'
                    : gold >= RANDOM_TOWER_COST
                      ? 'border-2 border-purple-500/40 hover:border-amber-400/60'
                      : 'border-2 border-transparent opacity-35'
                }
              `}
              style={
                isRandomTower
                  ? {
                      background: 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(245,158,11,0.25))',
                      boxShadow: '0 0 16px rgba(245,158,11,0.2), 0 0 32px rgba(147,51,234,0.1)',
                    }
                  : gold >= RANDOM_TOWER_COST
                    ? {
                        background: 'linear-gradient(180deg, rgba(88,28,135,0.35), rgba(120,53,15,0.3))',
                      }
                    : { background: 'rgba(30,41,59,0.3)' }
              }
            >
              <span className={`text-xl leading-none font-black ${isRandomTower || gold >= RANDOM_TOWER_COST ? 'animate-mystery' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6, #06b6d4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: gold >= RANDOM_TOWER_COST ? 'transparent' : undefined,
                }}
              >?</span>
              <span className="text-[10px] text-amber-200/90 font-bold truncate w-full text-center tracking-wide">
                Random
              </span>
              <span
                className={`text-[10px] font-bold tabular-nums px-1.5 py-px rounded-full ${
                  gold >= RANDOM_TOWER_COST ? 'text-amber-300 bg-amber-500/15' : 'text-slate-600'
                }`}
              >
                {RANDOM_TOWER_COST}G
              </span>
              {/* Shimmer overlay for random button */}
              {gold >= RANDOM_TOWER_COST && (
                <div className="absolute inset-0 btn-shine-overlay opacity-30 pointer-events-none rounded-xl" />
              )}
            </motion.button>

            {/* Separator */}
            <div className="tower-separator" />

            {towerList.map((tower) => {
              const isSelected = selectedTower === tower.type && !isRandomTower;
              const canAfford = gold >= tower.cost;

              return (
                <motion.button
                  key={tower.type}
                  whileTap={{ scale: 0.93 }}
                  animate={isSelected ? { y: -2 } : { y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => handleTowerSelect(tower.type)}
                  className={`
                    flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[62px]
                    transition-colors select-none relative overflow-hidden
                    ${
                      isSelected
                        ? 'border-2 border-indigo-400 animate-tower-selected'
                        : canAfford
                          ? 'border border-slate-600/30 hover:border-slate-500/50'
                          : 'border border-transparent opacity-35'
                    }
                  `}
                  style={
                    isSelected
                      ? {
                          background: 'linear-gradient(180deg, rgba(99,102,241,0.25), rgba(79,70,229,0.15))',
                        }
                      : canAfford
                        ? {
                            background: 'rgba(30,41,59,0.5)',
                            backdropFilter: 'blur(4px)',
                          }
                        : { background: 'rgba(30,41,59,0.25)' }
                  }
                >
                  <span className="text-xl leading-none" style={isSelected ? { filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.5))' } : undefined}>
                    {tower.icon}
                  </span>
                  <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {tower.nameKr}
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums px-1.5 py-px rounded-full ${
                      isSelected
                        ? 'text-amber-300 bg-amber-500/15'
                        : canAfford
                          ? 'text-amber-400/80'
                          : 'text-slate-600'
                    }`}
                  >
                    {tower.cost}G
                  </span>
                  {/* Selected shine overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 btn-shine-overlay opacity-40 pointer-events-none rounded-xl" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Random Tower Notification */}
      <AnimatePresence>
        {randomTowerNotif && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className={`
              relative flex items-center gap-3 px-6 py-3.5 rounded-2xl overflow-hidden
              ${randomTowerNotif.isLegendary
                ? 'animate-legendary-burst'
                : 'glass'
              }
            `}
              style={randomTowerNotif.isLegendary ? {
                background: 'linear-gradient(135deg, rgba(180,83,9,0.9), rgba(234,179,8,0.85), rgba(180,83,9,0.9))',
                border: '2px solid rgba(253,224,71,0.5)',
              } : {
                border: '1px solid rgba(148,163,184,0.2)',
              }}
            >
              {/* Background shimmer */}
              {randomTowerNotif.isLegendary && (
                <motion.div
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/20 to-transparent pointer-events-none"
                />
              )}
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="text-3xl relative z-10"
                style={randomTowerNotif.isLegendary ? { filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.6))' } : undefined}
              >
                {randomTowerNotif.icon}
              </motion.span>
              <div className="text-center relative z-10">
                <motion.p
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className={`text-[10px] font-bold tracking-widest uppercase ${
                    randomTowerNotif.isLegendary ? 'text-yellow-100 text-glow-gold' : 'text-slate-300'
                  }`}
                >
                  {randomTowerNotif.isLegendary ? 'LEGENDARY!' : 'Got Tower!'}
                </motion.p>
                <motion.p
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className={`text-base font-black ${
                    randomTowerNotif.isLegendary ? 'text-white text-glow-gold' : 'text-white text-glow'
                  }`}
                >
                  {randomTowerNotif.name}
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word Quiz Modal */}
      <WordQuizModal
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
      />

      {/* Stage Clear Modal */}
      <Modal isOpen={showStageClear} closeOnBackdrop={false} closeOnEscape={false}>
        <div className="glass-dark rounded-3xl p-6 w-80 text-center relative overflow-hidden"
          style={{
            border: '1.5px solid rgba(245,158,11,0.2)',
            boxShadow: '0 0 40px rgba(245,158,11,0.08), 0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Background radial glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 20%, rgba(245,158,11,0.08) 0%, transparent 60%)',
          }} />

          {/* Star rating row */}
          <div className="relative z-10 flex items-center justify-center gap-2 mb-3">
            {[0, 1, 2].map((i) => {
              const starCount = hp >= maxHp * 0.8 ? 3 : hp >= maxHp * 0.4 ? 2 : 1;
              const isFilled = i < starCount;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 + i * 0.15 }}
                  className={`text-3xl ${isFilled ? 'animate-star-sparkle' : 'opacity-20'}`}
                >
                  {String.fromCodePoint(0x2B50)}
                </motion.div>
              );
            })}
          </div>

          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 text-2xl font-black mb-1"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.3))',
            }}
          >
            STAGE CLEAR!
          </motion.h2>
          <p className="relative z-10 text-slate-400 text-xs mb-4 tracking-wide">
            W{worldId}-{stageId}
          </p>

          <div className="relative z-10 space-y-1.5 mb-5 text-sm">
            {[
              { label: '점수', value: score.toLocaleString(), color: 'text-white' },
              { label: '웨이브', value: `${wave}/${totalWaves}`, color: 'text-white' },
              { label: '남은 HP', value: `${hp}/${maxHp}`, color: 'text-emerald-400' },
              { label: '타워 수', value: `${towers.length}`, color: 'text-white' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="stat-row-premium flex justify-between text-slate-400 rounded-xl px-4 py-2"
                style={{
                  background: 'rgba(15,23,42,0.4)',
                  border: '1px solid rgba(71,85,105,0.1)',
                }}
              >
                <span>{stat.label}</span>
                <span className={`${stat.color} font-bold`}>{stat.value}</span>
              </motion.div>
            ))}
          </div>

          <div className="relative z-10 flex gap-3">
            <a href="/adventure" className="flex-1">
              <Button variant="ghost" fullWidth>
                나가기
              </Button>
            </a>
            {stageId < 10 ? (
              <a
                href={`/play?world=${worldId}&stage=${stageId + 1}`}
                className="flex-1"
              >
                <Button variant="primary" fullWidth>
                  다음 스테이지
                </Button>
              </a>
            ) : worldId < 10 ? (
              <a
                href={`/play?world=${worldId + 1}&stage=1`}
                className="flex-1"
              >
                <Button variant="primary" fullWidth>
                  다음 월드
                </Button>
              </a>
            ) : (
              <Button
                variant="primary"
                fullWidth
                className="flex-1"
                onClick={handleRetry}
              >
                재도전
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Revive Quiz Offer Modal (= "Watch ad to continue" replacement) */}
      <Modal isOpen={showReviveQuiz} closeOnBackdrop={false} closeOnEscape={false}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-dark rounded-3xl p-6 w-80 text-center relative overflow-hidden"
          style={{
            border: '1.5px solid rgba(239,68,68,0.2)',
            boxShadow: '0 0 40px rgba(239,68,68,0.06), 0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Animated background pulse */}
          <motion.div
            animate={{ opacity: [0.03, 0.12, 0.03] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(239,68,68,0.15) 0%, transparent 70%)' }}
          />

          <div className="relative z-10">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-5xl mb-3"
              style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }}
            >
              {String.fromCodePoint(0x1F4D6)}
            </motion.div>

            <h2 className="text-xl font-black mb-2"
              style={{
                background: 'linear-gradient(135deg, #fca5a5, #f87171, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              REVIVE CHANCE!
            </h2>
            <p className="text-sm text-slate-400 mb-1">
              영단어 퀴즈를 맞히면 HP 50%로 부활합니다
            </p>
            <p className="text-xs text-red-400/50 mb-4 tracking-wide">
              (게임당 1회 사용 가능)
            </p>

            {/* Reward Preview */}
            <div className="rounded-xl p-3 mb-4 space-y-1.5"
              style={{
                background: 'rgba(15,23,42,0.4)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Heart className="w-4 h-4 text-red-400 animate-heartbeat" fill="currentColor" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.4))' }} />
                <span className="text-sm font-bold text-emerald-300">
                  HP {Math.ceil(maxHp * 0.5)} 회복
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-slate-500">+ 3초 무적</span>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleReviveSkip}
                className="flex-1 py-3 rounded-xl text-slate-400 text-sm font-medium ctrl-btn-glass"
              >
                포기하기
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={handleReviveQuiz}
                className="relative flex-1 py-3 rounded-xl text-white text-sm font-bold overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.85), rgba(6,182,212,0.85))',
                  border: '1px solid rgba(52,211,153,0.3)',
                  boxShadow: '0 0 16px rgba(16,185,129,0.2)',
                }}
              >
                퀴즈 도전!
                <div className="absolute inset-0 btn-shine-overlay opacity-50 pointer-events-none" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </Modal>

      {/* Wave Bonus Quiz Banner (= "Watch ad for bonus" replacement) */}
      <AnimatePresence>
        {showWaveBonus && !isPaused && !showQuiz && (
          <motion.div
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={handleWaveBonusQuiz}
              className="relative flex items-center gap-3 px-5 py-3 rounded-2xl glass-shimmer overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(180,83,9,0.8), rgba(194,65,12,0.75))',
                border: '1.5px solid rgba(253,224,71,0.25)',
                boxShadow: '0 0 20px rgba(245,158,11,0.15), 0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              <span className="text-lg" style={{ filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.4))' }}>{String.fromCodePoint(0x1F4D6)}</span>
              <div className="text-left">
                <p className="text-xs font-bold text-white tracking-wide">퀴즈 풀고 골드 2배!</p>
                <p className="text-[10px] text-amber-200/80 font-medium">+{waveBonusGold}G 보너스</p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-xs font-black px-2 py-0.5 rounded-full text-glow-gold"
                style={{
                  background: 'rgba(253,224,71,0.15)',
                  color: '#fde047',
                }}
              >
                GO
              </motion.div>
              <div className="absolute inset-0 btn-shine-overlay opacity-40 pointer-events-none" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boss Warning Overlay */}
      <AnimatePresence>
        {showBossWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.05) 0%, transparent 70%)' }}
          >
            <motion.div
              initial={{ scale: 2.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center"
            >
              <motion.p
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
                className="text-4xl font-black tracking-wider text-glow-danger"
                style={{
                  background: 'linear-gradient(135deg, #fca5a5, #ef4444, #dc2626)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.4))',
                }}
              >
                BOSS INCOMING!
              </motion.p>
              <p className="text-sm text-red-300/70 mt-1.5 tracking-wide">{bossWarningType}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <Modal isOpen={showGameOver} closeOnBackdrop={false} closeOnEscape={false}>
        <div className="glass-dark rounded-3xl p-6 w-80 text-center relative overflow-hidden"
          style={{
            border: '1.5px solid rgba(239,68,68,0.15)',
            boxShadow: '0 0 40px rgba(239,68,68,0.06), 0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Background dark red vignette */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 20%, rgba(239,68,68,0.06) 0%, transparent 60%)',
          }} />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="relative z-10 text-5xl mb-3"
            style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.3))' }}
          >
            {String.fromCodePoint(0x1F480)}
          </motion.div>

          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 text-2xl font-black mb-1 text-glow-danger"
            style={{
              background: 'linear-gradient(135deg, #fca5a5, #ef4444, #dc2626)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            GAME OVER
          </motion.h2>
          <p className="relative z-10 text-slate-500 text-xs mb-4 tracking-wide">
            W{worldId}-{stageId}
          </p>

          <div className="relative z-10 space-y-1.5 mb-5 text-sm">
            {[
              { label: '점수', value: score.toLocaleString() },
              { label: '웨이브', value: `${wave}/${totalWaves}` },
              { label: '타워 수', value: `${towers.length}` },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="stat-row-premium flex justify-between text-slate-400 rounded-xl px-4 py-2"
                style={{
                  background: 'rgba(15,23,42,0.4)',
                  border: '1px solid rgba(71,85,105,0.1)',
                }}
              >
                <span>{stat.label}</span>
                <span className="text-white font-bold">{stat.value}</span>
              </motion.div>
            ))}
          </div>

          <div className="relative z-10 flex gap-3">
            <a href="/adventure" className="flex-1">
              <Button variant="ghost" fullWidth>
                나가기
              </Button>
            </a>
            <Button
              variant="danger"
              fullWidth
              className="flex-1"
              onClick={handleRetry}
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
