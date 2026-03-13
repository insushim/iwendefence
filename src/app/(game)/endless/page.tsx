'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Pause,
  Play,
  FastForward,
  BookOpen,
  ArrowLeft,
  Infinity as InfinityIcon,
  Trophy,
  Swords,
} from 'lucide-react';

import { useGameStore, usePlayerStore } from '@/shared/lib/store';
import { useGameLoop } from '@/shared/hooks/useGameLoop';
import { useQuizTrigger } from '@/shared/hooks/useQuizTrigger';
import { getStage } from '@/shared/constants/stages';
import { TOWER_DEFINITIONS } from '@/shared/constants/towers';
import { TowerType, EnemyType, type GameSpeed, type Tower, type Wave, type WaveEnemy } from '@/shared/types/game';
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

// All enemy types for procedural wave generation
const NORMAL_ENEMIES: EnemyType[] = [
  EnemyType.SLIME, EnemyType.GOBLIN, EnemyType.SKELETON, EnemyType.BAT, EnemyType.WOLF,
];
const ELITE_ENEMIES: EnemyType[] = [
  EnemyType.KNIGHT, EnemyType.GOLEM, EnemyType.THIEF, EnemyType.SHADOW, EnemyType.NINJA,
  EnemyType.WIZARD, EnemyType.DARK_MAGE, EnemyType.HARPY, EnemyType.DRAGON_WHELP,
  EnemyType.SHIELD_BEARER, EnemyType.ARMORED_ORC, EnemyType.WIND_SPRITE,
];
const BOSS_ENEMIES: EnemyType[] = [
  EnemyType.DRAGON, EnemyType.LICH_KING, EnemyType.DEMON_LORD, EnemyType.HYDRA, EnemyType.WORD_DESTROYER,
];

function generateEndlessWave(waveIndex: number): Wave {
  const isBoss = (waveIndex + 1) % 5 === 0;
  const enemies: WaveEnemy[] = [];

  if (isBoss) {
    const normalType = NORMAL_ENEMIES[waveIndex % NORMAL_ENEMIES.length];
    const normalCount = 5 + Math.floor(waveIndex * 0.8);
    enemies.push({ type: normalType, count: normalCount, delay: 0.8 });
    const bossType = BOSS_ENEMIES[Math.floor(waveIndex / 5) % BOSS_ENEMIES.length];
    enemies.push({ type: bossType, count: 1, delay: 2.0 });
  } else if ((waveIndex + 1) % 3 === 0) {
    const normalType = NORMAL_ENEMIES[waveIndex % NORMAL_ENEMIES.length];
    const eliteType = ELITE_ENEMIES[waveIndex % ELITE_ENEMIES.length];
    const normalCount = 5 + Math.floor(waveIndex * 0.5);
    const eliteCount = 1 + Math.floor(waveIndex / 4);
    enemies.push({ type: normalType, count: normalCount, delay: 0.8 });
    enemies.push({ type: eliteType, count: eliteCount, delay: 1.2 });
  } else {
    const type1 = NORMAL_ENEMIES[waveIndex % NORMAL_ENEMIES.length];
    const type2 = NORMAL_ENEMIES[(waveIndex + 1) % NORMAL_ENEMIES.length];
    const count1 = 6 + Math.floor(waveIndex * 0.6);
    const count2 = 2 + Math.floor(waveIndex * 0.3);
    enemies.push({ type: type1, count: count1, delay: 0.8 });
    if (waveIndex > 1) {
      enemies.push({ type: type2, count: count2, delay: 1.0 });
    }
  }

  return { enemies, bossWave: isBoss };
}

export default function EndlessPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const waveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageLoadedRef = useRef(false);
  const currentEndlessWaveRef = useRef(0);

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

  const highScores = usePlayerStore((s) => s.highScores);
  const endlessHighScore = highScores['endless'] ?? 0;

  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [isRandomTower, setIsRandomTower] = useState(false);
  const [randomTowerNotif, setRandomTowerNotif] = useState<{ name: string; icon: string; isLegendary: boolean } | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const gameLoop = useGameLoop(canvasRef);

  // ── Quiz auto-trigger system ──
  useQuizTrigger({
    showQuiz,
    setShowQuiz,
    isTerminal: isGameOver || showGameOver,
  });

  // Load stage on mount
  useEffect(() => {
    if (stageLoadedRef.current) return;
    stageLoadedRef.current = true;

    // Reset game state
    reset();

    // Use world 1 stage 1 map for endless mode
    const stage = getStage(1, 1);

    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const cols = 16;
      const rows = 10;

      // Calculate cell size to fit the grid in available space
      const cs = Math.floor(Math.min(rect.width / cols, rect.height / rows));

      canvas.width = cols * cs;
      canvas.height = rows * cs;
      canvas.style.width = `${cols * cs}px`;
      canvas.style.height = `${rows * cs}px`;

      return cs;
    };

    // Initial sizing
    const cs = updateCanvasSize();
    if (!cs) return;

    // Generate initial waves for the engine (we'll feed more as needed)
    const initialWaves: Wave[] = [];
    for (let i = 0; i < 100; i++) {
      initialWaves.push(generateEndlessWave(i));
    }

    gameLoop.loadStage(stage.mapData, initialWaves, cs);

    // Set canvas on engine after loadStage
    const engine = gameLoop.getEngine();
    if (engine && canvasRef.current) {
      engine.setCanvas(canvasRef.current, cs);
    }

    gameLoop.start();

    // Auto-start first wave after 3 seconds
    waveTimerRef.current = setTimeout(() => {
      gameLoop.startNextWave();
      currentEndlessWaveRef.current = 1;
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

  // Watch for wave completion -> auto-start next wave
  useEffect(() => {
    const engine = gameLoop.getEngine();
    if (!engine || isGameOver) return;

    const checkInterval = setInterval(() => {
      if (!engine.isWaveActive() && engine.getCurrentWave() >= 0 && !engine.getIsGameOver()) {
        // Wave ended, start next after delay
        if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
        waveTimerRef.current = setTimeout(() => {
          const result = gameLoop.startNextWave();
          if (result >= 0) {
            currentEndlessWaveRef.current = result + 1;
          }
        }, 3000);
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [wave, gameLoop, isGameOver]);

  // Game over handling
  useEffect(() => {
    if (isGameOver) {
      setShowGameOver(true);
      // Save high score
      if (score > endlessHighScore) {
        usePlayerStore.setState((state) => ({
          ...state,
          highScores: {
            ...state.highScores,
            endless: score,
          },
        }));
      }
    }
  }, [isGameOver, score, endlessHighScore]);

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
      setSelectedTower(TowerType.ARCHER); // placeholder
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

      // Check bounds
      if (row < 0 || row >= mapData.grid.length || col < 0 || col >= mapData.grid[0].length) return;

      // If we have a selected tower, try to place it
      if (selectedTower || isRandomTower) {
        const gridValue = mapData.grid[row][col];
        if (gridValue !== 2) return; // Only tower slots

        // Check if there's already a tower here
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
        return;
      }

      // If no tower selected, check if user tapped an existing tower
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

  const handleStartWave = useCallback(() => {
    const result = gameLoop.startNextWave();
    if (result >= 0) {
      currentEndlessWaveRef.current = result + 1;
    }
  }, [gameLoop]);

  const handleManualQuiz = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuiz(true);
  }, [isPaused, togglePause]);

  const handleRetry = useCallback(() => {
    reset();
    setShowGameOver(false);
    stageLoadedRef.current = false;

    // Re-initialize
    setTimeout(() => {
      const stage = getStage(1, 1);
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const cols = 16;
      const rows = 10;
      const cs = Math.floor(Math.min(rect.width / cols, rect.height / rows));
      canvas.width = cols * cs;
      canvas.height = rows * cs;
      canvas.style.width = `${cols * cs}px`;
      canvas.style.height = `${rows * cs}px`;

      const initialWaves: Wave[] = [];
      for (let i = 0; i < 100; i++) {
        initialWaves.push(generateEndlessWave(i));
      }

      gameLoop.loadStage(stage.mapData, initialWaves, cs);
      const engine = gameLoop.getEngine();
      if (engine) {
        engine.setCanvas(canvas, cs);
      }
      gameLoop.start();
      stageLoadedRef.current = true;

      waveTimerRef.current = setTimeout(() => {
        gameLoop.startNextWave();
        currentEndlessWaveRef.current = 1;
      }, 3000);
    }, 100);
  }, [reset, gameLoop]);

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

      {/* Endless Mode Banner - Glassmorphism with animated infinity */}
      <div className="relative z-10 glass-dark glass-shimmer">
        <div className="flex items-center justify-center gap-3 py-1.5 relative">
          {/* Animated gradient underline */}
          <div className="absolute bottom-0 left-0 right-0 h-px animate-border-glow opacity-40" />

          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          >
            <InfinityIcon className="w-4 h-4 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.6)]" />
          </motion.div>
          <span className="text-xs font-black text-red-300 text-glow-danger tracking-wider uppercase">무한 모드</span>

          {/* Wave counter badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass border border-red-500/20">
            <Swords className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-bold text-red-300 tabular-nums">WAVE {wave}</span>
          </div>

          {/* High score */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full glass border border-amber-500/20">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 tabular-nums text-glow-gold">{endlessHighScore.toLocaleString()}</span>
          </div>

          {/* Quiz combo indicator */}
          {quizCombo > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40 shadow-[0_0_12px_rgba(251,146,60,0.3)]"
            >
              <span className="text-[10px] font-black text-orange-300 tracking-wide">{quizCombo} COMBO</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Game Canvas Area - with vignette/border glow */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center bg-[#1a2435]">
        {/* Vignette overlay */}
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 120px rgba(0,0,0,0.3)',
        }} />
        {/* Subtle top/bottom border glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent pointer-events-none z-[1]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent pointer-events-none z-[1]" />

        <canvas
          ref={canvasRef}
          className="block cursor-pointer touch-none relative z-0"
          onClick={handleCanvasTap}
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Wave start button overlay - Pulsing glow, glass effect */}
        {!isGameOver && (
          <div className="absolute bottom-3 right-3 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleStartWave}
              className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass text-white text-xs font-black shadow-[0_0_20px_rgba(249,115,22,0.4),0_0_40px_rgba(249,115,22,0.15)] border-orange-500/40 overflow-hidden btn-glow"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.7), rgba(239,68,68,0.7))',
                borderColor: 'rgba(249,115,22,0.4)',
              }}
            >
              {/* Pulsing glow ring */}
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-xl"
                style={{ boxShadow: '0 0 20px rgba(249,115,22,0.5), inset 0 0 10px rgba(255,255,255,0.1)' }}
              />
              <Swords className="w-3.5 h-3.5 relative z-10 drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
              <span className="relative z-10 tracking-wide">다음 웨이브</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Control Bar - Glassmorphism */}
      <div className="glass-dark border-t border-slate-600/30 safe-area-pb">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/30">
          <Link href="/">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center active:bg-slate-700/50 btn-glow border-slate-600/30"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </motion.div>
          </Link>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePause}
            className={`w-9 h-9 rounded-xl glass flex items-center justify-center active:bg-slate-700/50 btn-glow transition-all ${
              isPaused ? 'border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'border-slate-600/30'
            }`}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
            ) : (
              <Pause className="w-4 h-4 text-slate-400" />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSpeedToggle}
            className="h-9 px-3 rounded-xl glass flex items-center gap-1.5 text-sm active:bg-slate-700/50 btn-glow border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]"
          >
            <FastForward className="w-4 h-4 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
            <span className="text-amber-400 font-black tabular-nums text-glow-gold">x{speed}</span>
          </motion.button>

          <div className="flex-1" />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleManualQuiz}
            className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-sm text-white font-bold active:opacity-80 btn-glow overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(139,92,246,0.8))',
              boxShadow: '0 0 16px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              border: '1px solid rgba(99,102,241,0.4)',
            }}
          >
            <BookOpen className="w-4 h-4 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
            <span className="text-glow tracking-wide">퀴즈</span>
          </motion.button>
        </div>

        {/* Tower Selection Bar - Glass cards */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-3 py-2 min-w-max">
            {/* Random Tower Button - Rainbow border */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRandomTowerSelect}
              className={`
                flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[64px]
                transition-all select-none relative overflow-hidden
                ${
                  isRandomTower
                    ? 'border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4),0_0_40px_rgba(168,85,247,0.2)]'
                    : gold >= RANDOM_TOWER_COST
                      ? 'border-2 border-purple-500/40 hover:border-amber-400/60'
                      : 'border-2 border-transparent opacity-40'
                }
              `}
              style={{
                background: isRandomTower
                  ? 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.4))'
                  : gold >= RANDOM_TOWER_COST
                    ? 'linear-gradient(135deg, rgba(88,28,135,0.5), rgba(120,53,15,0.5))'
                    : 'rgba(30,41,59,0.4)',
              }}
            >
              {/* Rainbow animated border for random tower */}
              {gold >= RANDOM_TOWER_COST && (
                <div className="absolute inset-0 rounded-xl animate-border-glow opacity-20" style={{ padding: '1px' }} />
              )}
              <motion.span
                animate={isRandomTower ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-xl leading-none relative z-10 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              >?</motion.span>
              <span className="text-[10px] text-amber-300 font-bold truncate w-full text-center relative z-10">
                Random
              </span>
              <span
                className={`text-[10px] font-bold tabular-nums relative z-10 ${
                  gold >= RANDOM_TOWER_COST ? 'text-amber-400 text-glow-gold' : 'text-slate-600'
                }`}
              >
                {RANDOM_TOWER_COST}G
              </span>
            </motion.button>

            {/* Separator */}
            <div className="w-px self-stretch my-1 bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />

            {towerList.map((tower) => {
              const isSelected = selectedTower === tower.type && !isRandomTower;
              const canAfford = gold >= tower.cost;

              return (
                <motion.button
                  key={tower.type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTowerSelect(tower.type)}
                  className={`
                    flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[64px]
                    transition-all select-none relative overflow-hidden
                    ${
                      isSelected
                        ? 'border-2 border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.4),0_0_32px_rgba(239,68,68,0.15)]'
                        : canAfford
                          ? 'glass border-slate-600/20 hover:border-slate-500/40 active:bg-slate-700/50'
                          : 'border-2 border-transparent opacity-40'
                    }
                  `}
                  style={isSelected ? {
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(249,115,22,0.2))',
                  } : !canAfford ? {
                    background: 'rgba(30,41,59,0.4)',
                  } : undefined}
                >
                  {/* Selection glow ring */}
                  {isSelected && (
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-xl"
                      style={{ boxShadow: 'inset 0 0 12px rgba(239,68,68,0.3)' }}
                    />
                  )}
                  <span className={`text-xl leading-none relative z-10 ${isSelected ? 'drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]' : ''}`}>{tower.icon}</span>
                  <span className={`text-[10px] font-medium truncate w-full text-center relative z-10 ${isSelected ? 'text-red-300' : 'text-slate-400'}`}>
                    {tower.nameKr}
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums relative z-10 ${
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

      {/* Random Tower Notification - Dramatic entrance */}
      <AnimatePresence>
        {randomTowerNotif && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            {/* Golden burst for legendary */}
            {randomTowerNotif.isLegendary && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(245,158,11,0.6) 0%, rgba(245,158,11,0) 70%)',
                }}
              />
            )}
            <div className={`
              flex items-center gap-3 px-6 py-4 rounded-2xl relative overflow-hidden
              ${randomTowerNotif.isLegendary
                ? 'glass border-2 border-yellow-400/60 shadow-[0_0_30px_rgba(245,158,11,0.5),0_0_60px_rgba(245,158,11,0.2)]'
                : 'glass border border-slate-400/30 shadow-[0_0_20px_rgba(148,163,184,0.2)]'
              }
            `}
            style={randomTowerNotif.isLegendary ? {
              background: 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(234,179,8,0.3), rgba(245,158,11,0.4))',
            } : undefined}
            >
              {/* Shimmer effect */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute top-0 left-0 w-1/3 h-full pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
              />
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                className={`text-3xl ${randomTowerNotif.isLegendary ? 'drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''}`}
              >{randomTowerNotif.icon}</motion.span>
              <div className="text-center relative z-10">
                <p className={`text-xs font-black tracking-widest ${randomTowerNotif.isLegendary ? 'text-yellow-200 text-glow-gold' : 'text-slate-300'}`}>
                  {randomTowerNotif.isLegendary ? 'LEGENDARY!' : 'Got Tower!'}
                </p>
                <p className={`text-base font-black ${randomTowerNotif.isLegendary ? 'text-white text-glow-gold' : 'text-white'}`}>
                  {randomTowerNotif.name}
                </p>
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

      {/* Game Over Modal - Premium glassmorphism */}
      <Modal isOpen={showGameOver} closeOnBackdrop={false} closeOnEscape={false}>
        <div className="glass-dark rounded-3xl p-6 w-80 text-center relative overflow-hidden" style={{
          boxShadow: '0 0 40px rgba(239,68,68,0.15), 0 25px 50px rgba(0,0,0,0.5)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          {/* Background ambient glow */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{
            background: 'radial-gradient(ellipse at top, rgba(239,68,68,0.08) 0%, transparent 60%)',
          }} />

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="text-5xl mb-4 relative z-10"
          >
            {String.fromCodePoint(0x1F480)}
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-1 relative z-10 text-glow-danger">게임 오버</h2>
          <p className="text-slate-400 text-sm mb-4 relative z-10 tracking-wide">무한 모드</p>

          <div className="space-y-2 mb-6 text-sm relative z-10">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex justify-between text-slate-400 glass rounded-xl px-4 py-2.5 border-slate-600/20"
            >
              <span>최종 점수</span>
              <span className="text-white font-black tabular-nums animate-shimmer"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #f1f5f9, #e2e8f0, #f8fafc, #e2e8f0, #f1f5f9)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >{score.toLocaleString()}</span>
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-between text-slate-400 glass rounded-xl px-4 py-2.5 border-slate-600/20"
            >
              <span>도달 웨이브</span>
              <span className="text-white font-black tabular-nums">{wave}</span>
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-between text-slate-400 glass rounded-xl px-4 py-2.5 border-amber-500/20"
            >
              <span>최고 기록</span>
              <span className="text-amber-400 font-black tabular-nums text-glow-gold">
                {Math.max(score, endlessHighScore).toLocaleString()}
              </span>
            </motion.div>
            {score > endlessHighScore && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
                className="py-3 px-4 rounded-xl relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(234,179,8,0.15))',
                  border: '1px solid rgba(245,158,11,0.4)',
                  boxShadow: '0 0 20px rgba(245,158,11,0.2), inset 0 0 20px rgba(245,158,11,0.1)',
                }}
              >
                {/* Shimmer across NEW RECORD */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                  className="absolute top-0 left-0 w-1/3 h-full pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                />
                <span className="text-amber-300 font-black text-sm tracking-widest text-glow-gold relative z-10">NEW RECORD!</span>
              </motion.div>
            )}
          </div>

          <div className="flex gap-3 relative z-10">
            <Link href="/" className="flex-1">
              <Button variant="ghost" fullWidth>
                나가기
              </Button>
            </Link>
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
