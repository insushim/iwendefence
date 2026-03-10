'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Play,
  FastForward,
  BookOpen,
  ArrowLeft,
  Infinity,
  Trophy,
  Swords,
} from 'lucide-react';
import Link from 'next/link';
import { useGameStore, usePlayerStore } from '@/shared/lib/store';
import { useGameLoop } from '@/shared/hooks/useGameLoop';
import { getStage } from '@/shared/constants/stages';
import { TOWER_DEFINITIONS } from '@/shared/constants/towers';
import { TowerType, EnemyType, type GameSpeed, type Tower, type Wave, type WaveEnemy } from '@/shared/types/game';
import GameHUD from '@/widgets/hud/GameHUD';
import WordQuizModal from '@/widgets/word-modal/WordQuizModal';
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';

const towerList = Object.values(TOWER_DEFINITIONS);

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
    enemies.push({ type: normalType, count: normalCount, delay: 800 });
    const bossType = BOSS_ENEMIES[Math.floor(waveIndex / 5) % BOSS_ENEMIES.length];
    enemies.push({ type: bossType, count: 1, delay: 2000 });
  } else if ((waveIndex + 1) % 3 === 0) {
    const normalType = NORMAL_ENEMIES[waveIndex % NORMAL_ENEMIES.length];
    const eliteType = ELITE_ENEMIES[waveIndex % ELITE_ENEMIES.length];
    const normalCount = 5 + Math.floor(waveIndex * 0.5);
    const eliteCount = 1 + Math.floor(waveIndex / 4);
    enemies.push({ type: normalType, count: normalCount, delay: 800 });
    enemies.push({ type: eliteType, count: eliteCount, delay: 1200 });
  } else {
    const type1 = NORMAL_ENEMIES[waveIndex % NORMAL_ENEMIES.length];
    const type2 = NORMAL_ENEMIES[(waveIndex + 1) % NORMAL_ENEMIES.length];
    const count1 = 6 + Math.floor(waveIndex * 0.6);
    const count2 = 2 + Math.floor(waveIndex * 0.3);
    enemies.push({ type: type1, count: count1, delay: 800 });
    if (waveIndex > 1) {
      enemies.push({ type: type2, count: count2, delay: 1000 });
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
    setSpeed,
    togglePause,
    addTower,
    reset,
  } = useGameStore();

  const highScores = usePlayerStore((s) => s.highScores);
  const setHighScore = usePlayerStore((s) => s.setHighScore);
  const endlessHighScore = highScores['endless'] ?? 0;

  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [cellSize, setCellSize] = useState(60);

  const gameLoop = useGameLoop(canvasRef);

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
      const cols = 12;
      const rows = 8;

      // Calculate cell size to fit the grid in available space
      const cs = Math.floor(Math.min(rect.width / cols, rect.height / rows));
      setCellSize(cs);

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
        // Store endless high score using special key
        usePlayerStore.getState().highScores['endless'] = score;
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
    setSelectedTower((prev) => (prev === type ? null : type));
  }, []);

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
      if (selectedTower) {
        const gridValue = mapData.grid[row][col];
        if (gridValue !== 2) return; // Only tower slots

        // Check if there's already a tower here
        const existingTower = towers.find(
          (t) => t.position.row === row && t.position.col === col
        );
        if (existingTower) return;

        const def = TOWER_DEFINITIONS[selectedTower];
        if (gold < def.cost) return;

        const newTower: Tower = {
          id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: selectedTower,
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
    [selectedTower, gold, towers, addTower, gameLoop]
  );

  const handleStartWave = useCallback(() => {
    const result = gameLoop.startNextWave();
    if (result >= 0) {
      currentEndlessWaveRef.current = result + 1;
    }
  }, [gameLoop]);

  const handleQuizAnswer = useCallback(
    (correct: boolean, reward: any) => {
      setShowQuiz(false);
      if (correct) {
        useGameStore.getState().addGold(Math.round(50 * reward.goldMultiplier));
      }
      // Resume the game
      if (useGameStore.getState().isPaused) {
        togglePause();
      }
    },
    [togglePause]
  );

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
      const cols = 12;
      const rows = 8;
      const cs = Math.floor(Math.min(rect.width / cols, rect.height / rows));
      setCellSize(cs);
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

      {/* Endless Mode Banner */}
      <div className="relative z-10 flex items-center justify-center gap-3 py-1 bg-gradient-to-r from-red-600/20 via-orange-600/20 to-red-600/20 border-b border-red-500/20">
        <Infinity className="w-4 h-4 text-red-400" />
        <span className="text-xs font-bold text-red-300">무한 모드</span>
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <Trophy className="w-3 h-3" />
          <span className="font-bold tabular-nums">{endlessHighScore.toLocaleString()}</span>
        </div>
      </div>

      {/* Game Canvas Area */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center bg-[#1a2435]">
        <canvas
          ref={canvasRef}
          className="block cursor-pointer touch-none"
          onClick={handleCanvasTap}
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Wave start button overlay */}
        {!isGameOver && (
          <div className="absolute bottom-3 right-3 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleStartWave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-lg shadow-orange-500/30"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>다음 웨이브</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 safe-area-pb">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800/50">
          <Link href="/">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center active:bg-slate-700">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </div>
          </Link>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePause}
            className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center active:bg-slate-700"
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-emerald-400" />
            ) : (
              <Pause className="w-4 h-4 text-slate-400" />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSpeedToggle}
            className="h-9 px-3 rounded-xl bg-slate-800 flex items-center gap-1.5 text-sm active:bg-slate-700"
          >
            <FastForward className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold tabular-nums">x{speed}</span>
          </motion.button>

          <div className="flex-1" />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (!isPaused) togglePause();
              setShowQuiz(true);
            }}
            className="h-9 px-3 rounded-xl bg-indigo-600 flex items-center gap-1.5 text-sm text-white font-medium active:bg-indigo-500"
          >
            <BookOpen className="w-4 h-4" />
            <span>퀴즈</span>
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
                        ? 'bg-red-600/30 border-2 border-red-500 shadow-lg shadow-red-500/20'
                        : canAfford
                          ? 'bg-slate-800/80 border-2 border-transparent hover:border-slate-600 active:bg-slate-700'
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

      {/* Word Quiz Modal */}
      <WordQuizModal
        isOpen={showQuiz}
        quiz={useGameStore.getState().currentQuiz}
        combo={combo}
        onAnswer={handleQuizAnswer}
        onClose={() => {
          setShowQuiz(false);
          if (useGameStore.getState().isPaused) {
            togglePause();
          }
        }}
      />

      {/* Game Over Modal */}
      <Modal isOpen={showGameOver} closeOnBackdrop={false} closeOnEscape={false}>
        <div className="bg-slate-800 rounded-3xl p-6 w-80 text-center border border-slate-700">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-5xl mb-4"
          >
            {String.fromCodePoint(0x1F480)}
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-1">게임 오버</h2>
          <p className="text-slate-400 text-sm mb-4">무한 모드</p>

          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>최종 점수</span>
              <span className="text-white font-bold">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>도달 웨이브</span>
              <span className="text-white font-bold">{wave}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>최고 기록</span>
              <span className="text-amber-400 font-bold">
                {Math.max(score, endlessHighScore).toLocaleString()}
              </span>
            </div>
            {score > endlessHighScore && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-2 px-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-sm"
              >
                NEW RECORD!
              </motion.div>
            )}
          </div>

          <div className="flex gap-3">
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
