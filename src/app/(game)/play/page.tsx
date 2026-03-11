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
import { TowerType, type GameSpeed, type Tower, type WorldId, type StageId } from '@/shared/types/game';
import GameHUD from '@/widgets/hud/GameHUD';
import WordQuizModal from '@/widgets/word-modal/WordQuizModal';
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';

const towerList = Object.values(TOWER_DEFINITIONS);

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
      const cols = 12;
      const rows = 8;

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

      if (row < 0 || row >= mapData.grid.length || col < 0 || col >= mapData.grid[0].length) return;

      if (selectedTower) {
        const gridValue = mapData.grid[row][col];
        if (gridValue !== 2) return;

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
      const cols = 12;
      const rows = 8;
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
      <div className="relative z-10 flex items-center justify-center gap-3 py-1 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-indigo-600/20 border-b border-indigo-500/20">
        <span className="text-xs font-bold text-indigo-300">
          월드 {worldId} - 스테이지 {stageId}
        </span>
        <div className="text-xs text-slate-400">
          웨이브 {wave}/{totalWaves}
        </div>
        {/* Quiz combo indicator */}
        {quizCombo > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
            <span className="text-[10px] font-bold text-orange-300">{quizCombo} COMBO</span>
          </div>
        )}
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
        {!isGameOver && !showStageClear && (
          <div className="absolute bottom-3 right-3 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleStartWave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30"
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
          <a href="/adventure">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center active:bg-slate-700">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </div>
          </a>

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
            onClick={handleManualQuiz}
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
                        ? 'bg-indigo-600/30 border-2 border-indigo-500 shadow-lg shadow-indigo-500/20'
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
        onClose={() => setShowQuiz(false)}
      />

      {/* Stage Clear Modal */}
      <Modal isOpen={showStageClear} closeOnBackdrop={false} closeOnEscape={false}>
        <div className="bg-slate-800 rounded-3xl p-6 w-80 text-center border border-slate-700">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-5xl mb-4"
          >
            {String.fromCodePoint(0x1F389)}
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-2">스테이지 클리어!</h2>
          <p className="text-slate-400 text-sm mb-4">
            월드 {worldId} - 스테이지 {stageId}
          </p>

          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>점수</span>
              <span className="text-white font-bold">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>웨이브</span>
              <span className="text-white font-bold">{wave}/{totalWaves}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>남은 HP</span>
              <span className="text-emerald-400 font-bold">{hp}/{maxHp}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>타워 수</span>
              <span className="text-white font-bold">{towers.length}</span>
            </div>
          </div>

          <div className="flex gap-3">
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
          className="bg-slate-800 rounded-3xl p-6 w-80 text-center border border-red-500/30 relative overflow-hidden"
        >
          {/* Animated background pulse */}
          <motion.div
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent"
          />

          <div className="relative z-10">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-5xl mb-3"
            >
              {String.fromCodePoint(0x1F4D6)}
            </motion.div>

            <h2 className="text-xl font-black text-white mb-2">부활 기회!</h2>
            <p className="text-sm text-slate-400 mb-1">
              영단어 퀴즈를 맞히면 HP 50%로 부활합니다
            </p>
            <p className="text-xs text-red-400/60 mb-4">
              (게임당 1회 사용 가능)
            </p>

            {/* Reward Preview */}
            <div className="bg-slate-900/60 rounded-xl p-3 mb-4 space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <Heart className="w-4 h-4 text-red-400" fill="currentColor" />
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
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-400 text-sm font-medium"
              >
                포기하기
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleReviveQuiz}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30"
              >
                퀴즈 도전!
              </motion.button>
            </div>
          </div>
        </motion.div>
      </Modal>

      {/* Wave Bonus Quiz Banner (= "Watch ad for bonus" replacement) */}
      <AnimatePresence>
        {showWaveBonus && !isPaused && !showQuiz && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleWaveBonusQuiz}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600/90 to-orange-600/90 backdrop-blur-sm border border-amber-400/30 shadow-lg shadow-amber-500/20"
            >
              <span className="text-lg">{String.fromCodePoint(0x1F4D6)}</span>
              <div className="text-left">
                <p className="text-xs font-bold text-white">퀴즈 풀고 골드 2배!</p>
                <p className="text-[10px] text-amber-200">+{waveBonusGold}G 보너스</p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-amber-300 text-xs font-bold"
              >
                GO
              </motion.div>
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
          >
            <motion.div
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center"
            >
              <motion.p
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-3xl font-black text-red-500 drop-shadow-lg"
                style={{ textShadow: '0 0 20px rgba(255,0,0,0.5)' }}
              >
                BOSS INCOMING!
              </motion.p>
              <p className="text-sm text-red-300 mt-1">{bossWarningType}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <h2 className="text-2xl font-black text-white mb-2">게임 오버</h2>
          <p className="text-slate-400 text-sm mb-4">
            월드 {worldId} - 스테이지 {stageId}
          </p>

          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>점수</span>
              <span className="text-white font-bold">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>웨이브</span>
              <span className="text-white font-bold">{wave}/{totalWaves}</span>
            </div>
            <div className="flex justify-between text-slate-400 bg-slate-900/50 rounded-xl px-4 py-2">
              <span>타워 수</span>
              <span className="text-white font-bold">{towers.length}</span>
            </div>
          </div>

          <div className="flex gap-3">
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
