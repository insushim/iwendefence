// ============================================================
// WordGuard - useGameLoop React Hook
// ============================================================

import { useRef, useEffect, useCallback } from 'react';

import { useGameStore } from '../lib/store';
import { GameEngine } from '../lib/gameEngine';
import type { GameEngineCallbacks } from '../lib/gameEngine';
import { renderGame, type PlacementInfo } from '../lib/renderer';
import { SoundEngine } from '../lib/soundEngine';
import type { SFXType } from '../lib/soundEngine';
import type {
  GameSpeed,
  MapData,
  Wave,
  Tower,
  Enemy,
  WorldId,
  EnemyType,
} from '../types/game';

// ── Return type ─────────────────────────────────────────────

export interface UseGameLoopReturn {
  /** Start the game loop */
  start: () => void;
  /** Stop the game loop entirely */
  stop: () => void;
  /** Pause the game */
  pause: () => void;
  /** Resume from pause */
  resume: () => void;
  /** Set game speed (1x, 2x, 3x) */
  setSpeed: (speed: GameSpeed) => void;
  /** Trigger the next wave */
  startNextWave: () => number;
  /** Load a stage */
  loadStage: (mapData: MapData, waves: Wave[], cellSize: number) => void;
  /** Sync towers from the store into the engine */
  syncTowers: (towers: Tower[]) => void;
  /** Set global damage/speed/gold bonuses */
  setGlobalBonuses: (damage: number, speed: number, gold: number) => void;
  /** Start BGM for a world */
  startBGM: (worldId: WorldId) => void;
  /** Stop BGM */
  stopBGM: () => void;
  /** Play a sound effect */
  playSFX: (type: SFXType) => void;
  /** Get the engine instance (for advanced usage) */
  getEngine: () => GameEngine | null;
  /** Currently selected tower id */
  selectedTowerId: React.MutableRefObject<string | null>;
  /** Placement preview info (set by page for hover preview) */
  placementInfoRef: React.MutableRefObject<PlacementInfo | null>;
}

interface UseGameLoopOptions {
  onBossWarning?: (bossType: EnemyType, waveIndex: number) => void;
  renderWorld?: boolean;
}

// ── Hook ────────────────────────────────────────────────────

export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: UseGameLoopOptions
): UseGameLoopReturn {
  const engineRef = useRef<GameEngine | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  const selectedTowerId = useRef<string | null>(null);
  const placementInfoRef = useRef<PlacementInfo | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const optionsRef = useRef<UseGameLoopOptions | undefined>(options);

  // Zustand store actions
  const addGold = useGameStore((s) => s.addGold);
  const takeDamage = useGameStore((s) => s.takeDamage);
  const healHp = useGameStore((s) => s.healHp);
  const removeEnemy = useGameStore((s) => s.removeEnemy);
  const nextWave = useGameStore((s) => s.nextWave);
  const setGameOver = useGameStore((s) => s.setGameOver);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // ── Initialize engine ─────────────────────────────────────

  useEffect(() => {
    const callbacks: GameEngineCallbacks = {
      onGoldEarned: (amount: number) => {
        addGold(amount);
      },
      onHpLost: (amount: number) => {
        if (amount > 0) {
          takeDamage(amount);
          soundRef.current?.playSFX('baseDamage');
        } else {
          // Negative means heal
          healHp(-amount);
        }
      },
      onEnemyKilled: (enemy: Enemy) => {
        removeEnemy(enemy.id);
        soundRef.current?.playSFX('enemyDeath');
      },
      onWaveComplete: () => {
        soundRef.current?.playSFX('waveClear');
      },
      onAllWavesComplete: () => {
        soundRef.current?.playSFX('waveClear');
      },
      onGameOver: () => {
        setGameOver();
        soundRef.current?.stopBGM();
      },
      onScoreAdd: () => {
        // Score is tracked in engine; store sync happens via getScore()
      },
      onBossWarning: (bossType, waveIndex) => {
        optionsRef.current?.onBossWarning?.(bossType, waveIndex);
      },
    };

    const engine = new GameEngine(callbacks);
    engineRef.current = engine;

    // Sound engine
    const sound = SoundEngine.getInstance();
    soundRef.current = sound;

    return () => {
      engine.stop();
      sound.stopBGM();
    };
  }, [addGold, healHp, nextWave, removeEnemy, setGameOver, takeDamage]);

  // ── Bind canvas + renderer + touch events ─────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    // Determine cell size from canvas dimensions (8 cols, 12 rows default)
    const cellSize = Math.min(canvas.width / 8, canvas.height / 12);
    engine.setCanvas(canvas, cellSize);

    // Set up render callback
    engine.setRenderCallback((ctx: CanvasRenderingContext2D, eng: GameEngine) => {
      renderGame(ctx, eng, selectedTowerId.current, placementInfoRef.current, optionsRef.current?.renderWorld ?? true);
    });

    // ── Touch / Click handlers ────────────────────────────
    const getCanvasPos = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Resume audio context on first user interaction
      soundRef.current?.resumeContext();

      const pos = getCanvasPos(e.clientX, e.clientY);
      touchStartRef.current = pos;

      // Check if a tower was tapped
      const eng = engineRef.current;
      if (!eng) return;

      const cs = eng.getCellSize();
      const towers = eng.getTowers();
      let tapped = false;

      for (const tower of towers) {
        const tx = tower.position.col * cs + cs / 2;
        const ty = tower.position.row * cs + cs / 2;
        const dist = Math.sqrt((pos.x - tx) ** 2 + (pos.y - ty) ** 2);
        if (dist < cs * 0.5) {
          selectedTowerId.current = tower.id;
          tapped = true;
          break;
        }
      }

      if (!tapped) {
        selectedTowerId.current = null;
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    // Prevent default touch behavior to avoid scrolling while playing
    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
    };
  }, [canvasRef]);

  // ── Sync store state into engine each frame ───────────────

  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      const engine = engineRef.current;
      if (!engine) return;

      engine.setTowers(state.towers);
      engine.setGameState(state.gold, state.hp, state.maxHp, state.score);
    });

    return unsub;
  }, []);

  // ── Exposed control functions ─────────────────────────────

  const start = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const setSpeed = useCallback((speed: GameSpeed) => {
    engineRef.current?.setSpeed(speed);
  }, []);

  const startNextWave = useCallback((): number => {
    const engine = engineRef.current;
    if (!engine) return -1;

    const waveIdx = engine.startNextWave();
    if (waveIdx >= 0) {
      soundRef.current?.playSFX('waveStart');
      nextWave();
    }
    return waveIdx;
  }, [nextWave]);

  const loadStage = useCallback((mapData: MapData, waves: Wave[], cellSize: number) => {
    engineRef.current?.loadStage(mapData, waves, cellSize);
  }, []);

  const syncTowers = useCallback((towers: Tower[]) => {
    engineRef.current?.setTowers(towers);
  }, []);

  const setGlobalBonuses = useCallback((damage: number, speed: number, gold: number) => {
    engineRef.current?.setGlobalBonuses(damage, speed, gold);
  }, []);

  const startBGM = useCallback((worldId: WorldId) => {
    soundRef.current?.generateBGM(worldId);
  }, []);

  const stopBGM = useCallback(() => {
    soundRef.current?.stopBGM();
  }, []);

  const playSFX = useCallback((type: SFXType) => {
    soundRef.current?.playSFX(type);
  }, []);

  const getEngine = useCallback((): GameEngine | null => {
    return engineRef.current;
  }, []);

  return {
    start,
    stop,
    pause,
    resume,
    setSpeed,
    startNextWave,
    loadStage,
    syncTowers,
    setGlobalBonuses,
    startBGM,
    stopBGM,
    playSFX,
    getEngine,
    selectedTowerId,
    placementInfoRef,
  };
}
