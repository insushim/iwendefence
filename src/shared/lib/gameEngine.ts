// ============================================================
// WordGuard - Core Game Loop Engine
// ============================================================

import type {
  Tower,
  TowerType,
  Enemy,
  EnemyType,
  EnemyEffect,
  WorldPosition,
  MapData,
  Wave,
  GameSpeed,
  TreasureChest,
  ChestReward,
  TowerSynergy,
  SynergyBonus,
} from '../types/game';

import {
  getPositionOnPath,
  getPathTotalLength,
  getDistanceBetweenPoints,
  getCellCenter,
  isInRange,
  normalise,
} from './pathfinding';

// ── Internal Types ──────────────────────────────────────────

export interface Projectile {
  id: string;
  sourceId: string;
  targetId: string;
  towerType: TowerType;
  position: WorldPosition;
  speed: number; // pixels per second
  damage: number;
  aoeRadius: number; // 0 = single target
  element: TowerElement;
  isCrit: boolean;
}

export interface VisualEffect {
  id: string;
  type: 'explosion' | 'lightning' | 'ice' | 'poison_cloud' | 'heal' | 'flame' | 'merge' | 'death';
  position: WorldPosition;
  radius: number;
  duration: number;
  elapsed: number;
  color: string;
}

export interface DamageText {
  id: string;
  text: string;
  position: WorldPosition;
  color: string;
  elapsed: number;
  duration: number;
  isCrit: boolean;
}

export interface WaveModifier {
  id: string;
  name: string;
  description: string;
  accent: string;
  enemyHpMultiplier?: number;
  enemySpeedMultiplier?: number;
  rewardMultiplier?: number;
  countMultiplier?: number;
  eliteEvery?: number;
}

type TowerElement = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'magic' | 'holy' | 'earth';

interface WaveSpawnState {
  waveIndex: number;
  enemyGroupIndex: number;
  spawnedInGroup: number;
  spawnTimer: number;
  allSpawned: boolean;
}

// ── Element Multiplier Table ───────────────────────────────

const ELEMENT_MULTIPLIER: Record<TowerElement, Record<string, number>> = {
  physical: {},
  fire: { ICE: 0.5, FIRE: 0.5 },
  ice: { FIRE: 0.5, ICE: 0.5 },
  lightning: { EARTH: 0.5 },
  poison: { UNDEAD: 0.5 },
  magic: { MAGIC_RESIST: 0.5 },
  holy: { DARK: 1.5, UNDEAD: 1.5 },
  earth: { FLYING: 0.5 },
};

// Map tower types to their element
const TOWER_ELEMENT: Record<TowerType, TowerElement> = {
  ARCHER: 'physical',
  MAGIC: 'magic',
  CANNON: 'physical',
  ICE: 'ice',
  LIGHTNING: 'lightning',
  POISON: 'poison',
  HEALER: 'holy',
  BARRICADE: 'earth',
  GOLDMINE: 'physical',
  SNIPER: 'physical',
  FLAME: 'fire',
  WORD: 'magic',
  METEOR: 'fire',
  VOID: 'poison',
  PHOENIX: 'fire',
  CHRONO: 'ice',
  DIVINE: 'holy',
};

// Mapping tower types to projectile speed (pixels/sec)
const PROJECTILE_SPEED: Record<TowerType, number> = {
  ARCHER: 600,
  MAGIC: 400,
  CANNON: 300,
  ICE: 350,
  LIGHTNING: 1200,
  POISON: 250,
  HEALER: 0,
  BARRICADE: 0,
  GOLDMINE: 0,
  SNIPER: 900,
  FLAME: 500,
  WORD: 450,
  METEOR: 200,
  VOID: 0,
  PHOENIX: 350,
  CHRONO: 0,
  DIVINE: 0,
};

// AOE radius in pixels (0 = single target)
const TOWER_AOE: Record<TowerType, number> = {
  ARCHER: 0,
  MAGIC: 0,
  CANNON: 60,
  ICE: 50,
  LIGHTNING: 40,
  POISON: 55,
  HEALER: 0,
  BARRICADE: 0,
  GOLDMINE: 0,
  SNIPER: 0,
  FLAME: 45,
  WORD: 35,
  METEOR: 80,
  VOID: 60,
  PHOENIX: 70,
  CHRONO: 0,
  DIVINE: 0,
};

// Enemy type categories for element interaction
const ENEMY_CATEGORIES: Partial<Record<EnemyType, string[]>> = {
  SKELETON: ['UNDEAD'],
  SPIRIT: ['UNDEAD', 'MAGIC_RESIST'],
  PHANTOM: ['UNDEAD', 'MAGIC_RESIST'],
  LICH_KING: ['UNDEAD', 'DARK'],
  WIZARD: ['MAGIC_RESIST'],
  DARK_MAGE: ['MAGIC_RESIST', 'DARK'],
  ENCHANTRESS: ['MAGIC_RESIST'],
  HARPY: ['FLYING'],
  DRAGON_WHELP: ['FLYING', 'FIRE'],
  GARGOYLE: ['FLYING'],
  PHOENIX_CHICK: ['FLYING', 'FIRE'],
  WYVERN: ['FLYING'],
  DRAGON: ['FLYING', 'FIRE'],
  GOLEM: ['EARTH'],
  IRON_TURTLE: ['EARTH'],
  WIND_SPRITE: ['FLYING'],
};

// Boss enemy types
const BOSS_TYPES: Set<EnemyType> = new Set([
  'DRAGON',
  'LICH_KING',
  'DEMON_LORD',
  'HYDRA',
  'WORD_DESTROYER',
] as EnemyType[]);

const WAVE_MODIFIER_POOL: WaveModifier[] = [
  {
    id: 'swarm',
    name: 'Swarm Surge',
    description: 'More enemies, lighter bodies, faster tempo.',
    accent: '#22c55e',
    enemyHpMultiplier: 0.82,
    enemySpeedMultiplier: 1.12,
    rewardMultiplier: 1.08,
    countMultiplier: 1.35,
  },
  {
    id: 'armored',
    name: 'Iron Vanguard',
    description: 'Heavier frontline with better rewards.',
    accent: '#94a3b8',
    enemyHpMultiplier: 1.35,
    enemySpeedMultiplier: 0.92,
    rewardMultiplier: 1.18,
  },
  {
    id: 'blitz',
    name: 'Blitz Route',
    description: 'Faster lane pressure and better payouts.',
    accent: '#f97316',
    enemyHpMultiplier: 0.95,
    enemySpeedMultiplier: 1.28,
    rewardMultiplier: 1.2,
  },
  {
    id: 'elite',
    name: 'Champion Procession',
    description: 'Every few enemies arrive as elite targets.',
    accent: '#facc15',
    enemyHpMultiplier: 1.08,
    rewardMultiplier: 1.15,
    eliteEvery: 4,
  },
];

// ── Enemy Stats Table ──────────────────────────────────────

interface EnemyTemplate {
  hp: number;
  speed: number;
  gold: number;
  exp: number;
}

const ENEMY_TEMPLATES: Record<EnemyType, EnemyTemplate> = {
  SLIME: { hp: 50, speed: 40, gold: 5, exp: 2 },
  GOBLIN: { hp: 60, speed: 55, gold: 6, exp: 3 },
  SKELETON: { hp: 70, speed: 45, gold: 7, exp: 3 },
  BAT: { hp: 35, speed: 70, gold: 5, exp: 2 },
  WOLF: { hp: 55, speed: 65, gold: 6, exp: 3 },
  KNIGHT: { hp: 150, speed: 30, gold: 12, exp: 6 },
  GOLEM: { hp: 250, speed: 20, gold: 18, exp: 8 },
  SHIELD_BEARER: { hp: 180, speed: 35, gold: 14, exp: 7 },
  IRON_TURTLE: { hp: 300, speed: 15, gold: 20, exp: 10 },
  ARMORED_ORC: { hp: 200, speed: 32, gold: 16, exp: 8 },
  THIEF: { hp: 40, speed: 90, gold: 8, exp: 4 },
  SHADOW: { hp: 45, speed: 85, gold: 9, exp: 5 },
  NINJA: { hp: 50, speed: 95, gold: 10, exp: 5 },
  WIND_SPRITE: { hp: 30, speed: 100, gold: 7, exp: 4 },
  HASTE_IMP: { hp: 35, speed: 110, gold: 8, exp: 4 },
  WIZARD: { hp: 80, speed: 40, gold: 10, exp: 5 },
  DARK_MAGE: { hp: 90, speed: 38, gold: 12, exp: 6 },
  SPIRIT: { hp: 60, speed: 50, gold: 9, exp: 4 },
  ENCHANTRESS: { hp: 75, speed: 42, gold: 11, exp: 5 },
  PHANTOM: { hp: 55, speed: 55, gold: 10, exp: 5 },
  HARPY: { hp: 45, speed: 75, gold: 8, exp: 4 },
  DRAGON_WHELP: { hp: 70, speed: 65, gold: 10, exp: 5 },
  GARGOYLE: { hp: 100, speed: 50, gold: 12, exp: 6 },
  PHOENIX_CHICK: { hp: 60, speed: 70, gold: 11, exp: 5 },
  WYVERN: { hp: 120, speed: 60, gold: 14, exp: 7 },
  DRAGON: { hp: 2000, speed: 25, gold: 100, exp: 50 },
  LICH_KING: { hp: 1800, speed: 28, gold: 90, exp: 45 },
  DEMON_LORD: { hp: 2500, speed: 22, gold: 120, exp: 60 },
  HYDRA: { hp: 3000, speed: 18, gold: 150, exp: 70 },
  WORD_DESTROYER: { hp: 2200, speed: 30, gold: 110, exp: 55 },
};

// ── Helper: unique IDs ─────────────────────────────────────

let _idCounter = 0;
function nextId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}_${_idCounter}_${Date.now().toString(36)}`;
}

// ── Callbacks ──────────────────────────────────────────────

export interface GameEngineCallbacks {
  onGoldEarned: (amount: number) => void;
  onHpLost: (amount: number) => void;
  onEnemyKilled: (enemy: Enemy) => void;
  onWaveComplete: (waveIndex: number) => void;
  onAllWavesComplete: () => void;
  onGameOver: () => void;
  onScoreAdd: (points: number) => void;
  onTreasureSpawn?: (chest: TreasureChest) => void;
  onSynergyActivated?: (synergy: TowerSynergy) => void;
  onComboMilestone?: (combo: number) => void;
  onBossWarning?: (bossType: EnemyType, waveIndex: number) => void;
  onCriticalHp?: (hp: number, maxHp: number) => void;
}

// ============================================================
// GameEngine Class
// ============================================================

export class GameEngine {
  // ── Canvas / rendering ────────────────────────────────────
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private renderCallback: ((ctx: CanvasRenderingContext2D, engine: GameEngine) => void) | null = null;

  // ── Game loop ─────────────────────────────────────────────
  private animationFrameId: number = 0;
  private running: boolean = false;
  private paused: boolean = false;
  private speed: GameSpeed = 1;
  private lastTimestamp: number = 0;

  // ── Map ───────────────────────────────────────────────────
  private mapData: MapData | null = null;
  private cellSize: number = 60;
  private pathTotalLength: number = 0;

  // ── Entities ──────────────────────────────────────────────
  public towers: Tower[] = [];
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public effects: VisualEffect[] = [];
  public damageTexts: DamageText[] = [];

  // ── Tower cooldowns ───────────────────────────────────────
  private towerCooldowns: Map<string, number> = new Map();
  private towerShotCounters: Map<string, number> = new Map();

  // ── Wave management ───────────────────────────────────────
  private waves: Wave[] = [];
  private waveSpawn: WaveSpawnState = {
    waveIndex: -1,
    enemyGroupIndex: 0,
    spawnedInGroup: 0,
    spawnTimer: 0,
    allSpawned: false,
  };
  private waveActive: boolean = false;
  private allWavesDone: boolean = false;
  private currentWaveIndex: number = -1;

  // ── Game state ────────────────────────────────────────────
  private gold: number = 100;
  private hp: number = 20;
  private maxHp: number = 20;
  private score: number = 0;
  private isGameOver: boolean = false;

  // ── Upgrade bonuses (from roguelike upgrades, quiz rewards, etc.) ──
  private globalDamageMultiplier: number = 1;
  private globalSpeedMultiplier: number = 1;
  private goldMultiplier: number = 1;

  // ── Callbacks ─────────────────────────────────────────────
  private callbacks: GameEngineCallbacks;

  // ── GoldMine tracking ────────────────────────────────────
  private goldMineTimers: Map<string, number> = new Map();
  private static readonly GOLDMINE_INTERVAL = 5; // seconds

  // ── Healer tracking ──────────────────────────────────────
  private healerTimers: Map<string, number> = new Map();
  private static readonly HEALER_INTERVAL = 3;

  // ── Treasure Chests ────────────────────────────────────
  public treasureChests: TreasureChest[] = [];
  private lastChestWave: number = 0;
  private static readonly CHEST_INTERVAL = 3; // Every 3 waves

  // ── Synergy System ─────────────────────────────────────
  private activeSynergies: Map<string, SynergyBonus> = new Map();

  // ── Screen Effects (for renderer to read) ──────────────
  public screenShake: { intensity: number; duration: number; elapsed: number } | null = null;
  public slowMotion: { timeScale: number; duration: number; elapsed: number } | null = null;
  public flashOverlay: { color: string; alpha: number; duration: number; elapsed: number } | null = null;

  // ── Kill Tracking ──────────────────────────────────────
  private totalKills: number = 0;
  private waveKills: number = 0;
  private killCombo: number = 0;
  private lastKillTime: number = 0;
  private static readonly COMBO_TIMEOUT = 2; // seconds

  // ── Tower Recoil Tracking ──────────────────────────────
  private towerRecoil: Map<string, number> = new Map(); // towerId -> recoil timer (0~1)

  // ── Boss Warning ───────────────────────────────────────
  private bossWarningShown: Set<number> = new Set();

  // ── Invincibility ──────────────────────────────────────
  private invincibleTimer: number = 0;

  // ── Perfect Wave Tracking ──────────────────────────────
  private wavePerfect: boolean = true;

  // ── Game Time (for fast-kill tracking) ─────────────────
  private gameTime: number = 0;
  private currentWaveModifier: WaveModifier | null = null;
  private heroEmpower: {
    damageMultiplier: number;
    attackSpeedMultiplier: number;
    remaining: number;
  } | null = null;
  private teslaField: {
    damagePerSecond: number;
    remaining: number;
  } | null = null;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  // ════════════════════════════════════════════════════════════
  // Lifecycle
  // ════════════════════════════════════════════════════════════

  /**
   * Bind the engine to a canvas and an external render function.
   */
  setCanvas(canvas: HTMLCanvasElement, cellSize: number): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = cellSize;
  }

  setRenderCallback(cb: (ctx: CanvasRenderingContext2D, engine: GameEngine) => void): void {
    this.renderCallback = cb;
  }

  /**
   * Load a stage — sets up the map and wave data.
   */
  loadStage(mapData: MapData, waves: Wave[], cellSize: number): void {
    this.mapData = mapData;
    this.cellSize = cellSize;
    this.waves = waves;
    this.pathTotalLength = getPathTotalLength(mapData.path, cellSize);

    // Reset entities
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.damageTexts = [];
    this.towerCooldowns.clear();
    this.towerShotCounters.clear();
    this.goldMineTimers.clear();
    this.healerTimers.clear();

    // Reset wave state
    this.waveSpawn = {
      waveIndex: -1,
      enemyGroupIndex: 0,
      spawnedInGroup: 0,
      spawnTimer: 0,
      allSpawned: false,
    };
    this.waveActive = false;
    this.allWavesDone = false;
    this.currentWaveIndex = -1;
    this.isGameOver = false;
    this.wavePerfect = true;
    this.gameTime = 0;
    this.currentWaveModifier = null;
    this.heroEmpower = null;
    this.teslaField = null;
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  /**
   * Stop the game loop entirely.
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  /**
   * Pause the game (loop continues for rendering, but updates are skipped).
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume from pause.
   */
  resume(): void {
    this.paused = false;
    this.lastTimestamp = performance.now();
  }

  /**
   * Set game speed multiplier (1x, 2x, 3x).
   */
  setSpeed(speed: GameSpeed): void {
    this.speed = speed;
  }

  // ════════════════════════════════════════════════════════════
  // External state sync
  // ════════════════════════════════════════════════════════════

  setTowers(towers: Tower[]): void {
    this.towers = towers;
    // Initialise cooldowns for new towers
    for (const t of towers) {
      if (!this.towerCooldowns.has(t.id)) {
        this.towerCooldowns.set(t.id, 0);
      }
    }
  }

  setGameState(gold: number, hp: number, maxHp: number, score: number): void {
    this.gold = gold;
    this.hp = hp;
    this.maxHp = maxHp;
    this.score = score;
  }

  setGlobalBonuses(damageMultiplier: number, speedMultiplier: number, goldMultiplier: number): void {
    this.globalDamageMultiplier = damageMultiplier;
    this.globalSpeedMultiplier = speedMultiplier;
    this.goldMultiplier = goldMultiplier;
  }

  getIsGameOver(): boolean {
    return this.isGameOver;
  }

  getCurrentWave(): number {
    return this.currentWaveIndex;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isRunning(): boolean {
    return this.running;
  }

  // ════════════════════════════════════════════════════════════
  // Wave Control
  // ════════════════════════════════════════════════════════════

  /**
   * Start the next wave. Returns the wave index or -1 if all waves done.
   */
  startNextWave(): number {
    if (this.allWavesDone) return -1;

    const nextIndex = this.currentWaveIndex + 1;
    if (nextIndex >= this.waves.length) {
      this.allWavesDone = true;
      return -1;
    }

    this.currentWaveIndex = nextIndex;
    this.currentWaveModifier = this.rollWaveModifier(nextIndex, this.waves[nextIndex]?.bossWave ?? false);
    this.waveSpawn = {
      waveIndex: nextIndex,
      enemyGroupIndex: 0,
      spawnedInGroup: 0,
      spawnTimer: 0,
      allSpawned: false,
    };
    this.waveActive = true;
    this.wavePerfect = true;

    // ── Gold Interest (BTD6-style) ───────────────────────
    // Award 5% interest on current gold, capped at 100
    if (nextIndex > 0) {
      const interest = Math.min(100, Math.floor(this.gold * 0.05));
      if (interest > 0) {
        this.gold += interest;
        this.callbacks.onGoldEarned(interest);

        // Show interest text at map center
        const centerX = this.mapData
          ? (this.mapData.grid[0]?.length ?? 10) * this.cellSize / 2
          : 300;
        const centerY = this.mapData
          ? (this.mapData.grid.length ?? 8) * this.cellSize / 2
          : 200;
        this.damageTexts.push({
          id: nextId('dt'),
          text: `Interest +${interest}`,
          position: { x: centerX, y: centerY + 30 },
          color: '#44ddff',
          elapsed: 0,
          duration: 1.8,
          isCrit: false,
        });
      }
    }

    return nextIndex;
  }

  // ════════════════════════════════════════════════════════════
  // Main Game Loop
  // ════════════════════════════════════════════════════════════

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000; // seconds
    this.lastTimestamp = timestamp;

    // Clamp delta to avoid spiral of death after tab switch
    const dt = Math.min(rawDt, 0.1) * this.speed;

    if (!this.paused && !this.isGameOver) {
      this.update(dt);
    }

    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // ════════════════════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════════════════════

  private update(dt: number): void {
    // Apply slow motion
    let effectiveDt = dt;
    if (this.slowMotion) {
      this.slowMotion.elapsed += dt;
      if (this.slowMotion.elapsed >= this.slowMotion.duration) {
        this.slowMotion = null;
      } else {
        effectiveDt = dt * this.slowMotion.timeScale;
      }
    }

    this.gameTime += effectiveDt;
    this.updateWaveSpawning(effectiveDt);
    this.updateEnemies(effectiveDt);
    this.updateTowers(effectiveDt);
    this.updateProjectiles(effectiveDt);
    this.updateEffects(effectiveDt);
    this.updateDamageTexts(effectiveDt);
    this.updateGoldMines(effectiveDt);
    this.updateHealers(effectiveDt);
    this.updateHeroEffects(effectiveDt);
    this.updateScreenEffects(dt); // raw dt for screen effects
    this.updateKillCombo(dt);
    this.updateInvincibility(dt);
    this.checkWaveComplete();
    this.checkBossWarning();
    this.checkCriticalHp();
    this.checkGameOver();
  }

  // ── Wave Spawning ─────────────────────────────────────────

  private updateWaveSpawning(dt: number): void {
    if (!this.waveActive || this.waveSpawn.allSpawned || !this.mapData) return;

    const wave = this.waves[this.waveSpawn.waveIndex];
    if (!wave) return;

    this.waveSpawn.spawnTimer -= dt;

    if (this.waveSpawn.spawnTimer <= 0) {
      const group = wave.enemies[this.waveSpawn.enemyGroupIndex];
      if (!group) {
        this.waveSpawn.allSpawned = true;
        return;
      }

      const effectiveGroupCount = this.getEffectiveGroupCount(group.count);

      // Spawn one enemy from current group
      this.spawnEnemy(
        group.type,
        wave.bossWave && BOSS_TYPES.has(group.type),
        this.waveSpawn.spawnedInGroup + 1
      );
      this.waveSpawn.spawnedInGroup += 1;

      if (this.waveSpawn.spawnedInGroup >= effectiveGroupCount) {
        // Move to next group
        this.waveSpawn.enemyGroupIndex += 1;
        this.waveSpawn.spawnedInGroup = 0;

        if (this.waveSpawn.enemyGroupIndex >= wave.enemies.length) {
          this.waveSpawn.allSpawned = true;
          return;
        }

        // Use the next group's delay (delay is already in seconds)
        const nextGroup = wave.enemies[this.waveSpawn.enemyGroupIndex];
        this.waveSpawn.spawnTimer = nextGroup ? nextGroup.delay : 0.5;
      } else {
        // Delay between enemies in the same group (delay is already in seconds)
        this.waveSpawn.spawnTimer = group.delay;
      }
    }
  }

  private getEffectiveGroupCount(baseCount: number): number {
    return Math.max(1, Math.round(baseCount * (this.currentWaveModifier?.countMultiplier ?? 1)));
  }

  private rollWaveModifier(waveIndex: number, bossWave: boolean): WaveModifier | null {
    if (bossWave || waveIndex < 2) return null;
    if ((waveIndex + 1) % 3 !== 0) return null;

    const rotation = (waveIndex + Math.floor(Math.random() * WAVE_MODIFIER_POOL.length)) % WAVE_MODIFIER_POOL.length;
    return WAVE_MODIFIER_POOL[rotation];
  }

  private spawnEnemy(type: EnemyType, isBoss: boolean, spawnOrdinal: number): void {
    if (!this.mapData) return;

    const template = ENEMY_TEMPLATES[type];
    const waveScaling = 1 + this.currentWaveIndex * 0.18;
    const bossMultiplier = isBoss ? 1.5 : 1;
    const waveModifier = this.currentWaveModifier;
    const isElite = !isBoss && !!waveModifier?.eliteEvery && spawnOrdinal % waveModifier.eliteEvery === 0;
    const eliteMultiplier = isElite ? 1.85 : 1;
    const eliteRewardMultiplier = isElite ? 1.55 : 1;

    const scaledHp = Math.round(
      template.hp *
      waveScaling *
      bossMultiplier *
      (waveModifier?.enemyHpMultiplier ?? 1) *
      eliteMultiplier
    );
    const startPos = getPositionOnPath(this.mapData.path, 0, this.cellSize);
    const rewardMultiplier = (waveModifier?.rewardMultiplier ?? 1) * eliteRewardMultiplier;
    const shieldValue = isBoss ? Math.round(scaledHp * 0.18) : 0;

    const enemy: Enemy = {
      id: nextId('e'),
      type,
      hp: scaledHp,
      maxHp: scaledHp,
      displayHp: scaledHp,
      speed: template.speed * this.globalSpeedMultiplier * (waveModifier?.enemySpeedMultiplier ?? 1) * (isElite ? 1.08 : 1),
      position: { ...startPos.position },
      pathIndex: 0,
      pathProgress: 0,
      effects: [],
      rewards: {
        gold: Math.round(template.gold * waveScaling * rewardMultiplier),
        exp: Math.round(template.exp * waveScaling * rewardMultiplier),
      },
      spawnTime: this.gameTime,
      isElite,
      eliteRank: isElite ? 1 : undefined,
      shield: shieldValue > 0 ? shieldValue : undefined,
      shieldMax: shieldValue > 0 ? shieldValue : undefined,
      bossAbilityCooldown: isBoss ? 6 + Math.random() * 3 : undefined,
    };

    this.enemies.push(enemy);
  }

  // ── Split Enemy Spawning ────────────────────────────────

  private spawnSplitEnemies(parent: Enemy, count: number, hpRatio: number, speedRatio: number): void {
    if (!this.mapData) return;

    for (let i = 0; i < count; i++) {
      const splitHp = Math.max(1, Math.round(parent.maxHp * hpRatio));
      const splitEnemy: Enemy = {
        id: nextId('e'),
        type: parent.type,
        hp: splitHp,
        maxHp: splitHp,
        displayHp: splitHp,
        speed: parent.speed * speedRatio,
        position: {
          x: parent.position.x + (Math.random() - 0.5) * 15,
          y: parent.position.y + (Math.random() - 0.5) * 15,
        },
        pathIndex: parent.pathIndex,
        pathProgress: parent.pathProgress,
        effects: [],
        rewards: {
          gold: Math.round(parent.rewards.gold * hpRatio),
          exp: Math.round(parent.rewards.exp * hpRatio),
        },
        isSplit: true,
        spawnTime: this.gameTime,
      };
      this.enemies.push(splitEnemy);
    }
  }

  // ── Enemy Movement ────────────────────────────────────────

  private updateEnemies(dt: number): void {
    if (!this.mapData) return;

    const path = this.mapData.path;
    const toRemove: string[] = [];

    // ── Enemy Rage Mode: last 3 enemies get speed boost ──
    const aliveCount = this.enemies.filter(e => e.hp > 0).length;
    const rageActive = this.waveActive && this.waveSpawn.allSpawned && aliveCount > 0 && aliveCount <= 3;
    for (const enemy of this.enemies) {
      if (rageActive && !enemy.isRaging) {
        enemy.isRaging = true;
        // Permanent 40% speed boost — applied once
        enemy.speed *= 1.4;
      }
    }

    for (const enemy of this.enemies) {
      // Apply status effects
      this.applyStatusEffects(enemy, dt);

      // Calculate effective speed
      let effectiveSpeed = enemy.speed;
      for (const eff of enemy.effects) {
        if (eff.type === 'slow') {
          effectiveSpeed *= (1 - eff.value);
        }
        if (eff.type === 'freeze' || eff.type === 'stun') {
          effectiveSpeed = 0;
        }
      }

      // Move along path
      if (effectiveSpeed > 0 && this.pathTotalLength > 0) {
        const progressDelta = (effectiveSpeed * dt) / this.pathTotalLength;
        enemy.pathProgress += progressDelta;

        if (enemy.pathProgress >= 1) {
          // Enemy reached the end — deal damage to player
          toRemove.push(enemy.id);
          // Mark wave as imperfect (enemy leaked)
          this.wavePerfect = false;
          if (!this.isInvincible()) {
            const dmg = BOSS_TYPES.has(enemy.type) ? 5 : 1;
            this.hp = Math.max(0, this.hp - dmg);
            this.callbacks.onHpLost(dmg);
            // Screen shake on base damage
            this.triggerScreenShake(BOSS_TYPES.has(enemy.type) ? 6 : 3, 0.3);
            this.triggerFlash('#ff0000', 0.2, 0.2);
          }
          // Reset kill combo when enemy reaches base
          this.killCombo = 0;
          continue;
        }

        const result = getPositionOnPath(path, enemy.pathProgress, this.cellSize);
        enemy.position = result.position;
        enemy.pathIndex = result.segmentIndex;
      }

      // Lerp displayHp toward actual hp (HP delay bar effect)
      if (enemy.displayHp > enemy.hp) {
        enemy.displayHp = Math.max(enemy.hp, enemy.displayHp - (enemy.maxHp * dt * 0.8));
      } else {
        enemy.displayHp = enemy.hp;
      }

      if (BOSS_TYPES.has(enemy.type) && enemy.bossAbilityCooldown !== undefined) {
        enemy.bossAbilityCooldown -= dt;
        if (enemy.bossAbilityCooldown <= 0) {
          this.triggerBossAbility(enemy);
          enemy.bossAbilityCooldown = 8 + Math.random() * 4;
        }
      }

      // Check if dead
      if (enemy.hp <= 0) {
        toRemove.push(enemy.id);
        this.onEnemyDeath(enemy);
      }
    }

    this.enemies = this.enemies.filter((e) => !toRemove.includes(e.id));
  }

  // ── Status Effects ────────────────────────────────────────

  private applyStatusEffects(enemy: Enemy, dt: number): void {
    const expired: number[] = [];

    for (let i = 0; i < enemy.effects.length; i++) {
      const eff = enemy.effects[i];
      eff.remainingTime -= dt;

      if (eff.type === 'poison') {
        // Poison deals damage over time
        enemy.hp -= eff.value * dt;
      }
      if (eff.type === 'burn') {
        // Burn deals damage over time, higher than poison
        enemy.hp -= eff.value * dt;
      }

      if (eff.remainingTime <= 0) {
        expired.push(i);
      }
    }

    // Remove expired effects (reverse order)
    for (let i = expired.length - 1; i >= 0; i--) {
      enemy.effects.splice(expired[i], 1);
    }
  }

  addStatusEffect(enemyId: string, effect: Omit<EnemyEffect, 'remainingTime'>): void {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (!enemy) return;

    // Check if same type from same source already exists → refresh
    const existing = enemy.effects.find(
      (e) => e.type === effect.type && e.sourceId === effect.sourceId
    );
    if (existing) {
      existing.remainingTime = effect.duration;
      existing.value = Math.max(existing.value, effect.value);
    } else {
      enemy.effects.push({
        ...effect,
        remainingTime: effect.duration,
      });
    }
  }

  private triggerBossAbility(boss: Enemy): void {
    boss.shield = Math.min(
      Math.round((boss.shield ?? 0) + boss.maxHp * 0.08),
      Math.round(boss.maxHp * 0.25)
    );
    boss.shieldMax = Math.max(boss.shieldMax ?? 0, boss.shield ?? 0);

    for (const enemy of this.enemies) {
      if (enemy.id === boss.id) continue;
      enemy.isRaging = true;
      enemy.speed *= 1.08;
    }

    this.effects.push({
      id: nextId('fx'),
      type: 'lightning',
      position: { ...boss.position },
      radius: 90,
      duration: 0.6,
      elapsed: 0,
      color: '#ffdd55',
    });
    this.triggerScreenShake(4, 0.2);
    this.triggerFlash('#ffcc66', 0.12, 0.15);
  }

  // ── Tower Targeting & Attacking ───────────────────────────

  private updateTowers(dt: number): void {
    if (!this.mapData) return;

    for (const tower of this.towers) {
      // Skip non-attacking towers
      if (tower.type === 'GOLDMINE' || tower.type === 'HEALER') {
        continue;
      }

      // Cooldown
      const cd = this.towerCooldowns.get(tower.id) ?? 0;
      const newCd = cd - dt;
      this.towerCooldowns.set(tower.id, newCd);

      if (newCd > 0) continue;

      // ── BARRICADE: area slow aura (no projectile) ──
      if (tower.type === 'BARRICADE') {
        const towerCenter = getCellCenter(tower.position.row, tower.position.col, this.cellSize);
        const rangePixels = tower.stats.range * this.cellSize;
        const enemiesInRange = this.enemies.filter((e) =>
          isInRange(tower.position, e.position, tower.stats.range, this.cellSize)
        );

        if (enemiesInRange.length > 0) {
          for (const enemy of enemiesInRange) {
            // Apply slow effect: 30% base + 5% per grade
            this.addStatusEffect(enemy.id, {
              type: 'slow',
              value: 0.3 + tower.grade * 0.05,
              duration: 1.5,
              sourceId: tower.id,
            });

            // Small damage
            const dmg = Math.round(tower.stats.damage * (1 + (tower.level - 1) * 0.15 + tower.mergeCount * 0.5) * this.globalDamageMultiplier);
            if (dmg > 0) {
              this.applyDamage(enemy, dmg, tower, false);
            }
          }

          // Visual effect at barricade position
          this.effects.push({
            id: nextId('fx'),
            type: 'ice',
            position: { ...towerCenter },
            radius: rangePixels * 0.5,
            duration: 0.4,
            elapsed: 0,
            color: '#a78bfa',
          });

          // Tower recoil animation
          this.towerRecoil.set(tower.id, 1.0);
        }

        // Reset cooldown
        const effectiveAttackSpeed = tower.stats.attackSpeed * (this.heroEmpower?.attackSpeedMultiplier ?? 1);
        const attackInterval = effectiveAttackSpeed > 0 ? 1 / effectiveAttackSpeed : 1;
        this.towerCooldowns.set(tower.id, attackInterval);
        continue;
      }

      // Find target
      const target = this.findTarget(tower);
      if (!target) continue;

      // Attack
      this.towerAttack(tower, target);

      // Reset cooldown (attackSpeed = attacks per second)
      const effectiveAttackSpeed = tower.stats.attackSpeed * (this.heroEmpower?.attackSpeedMultiplier ?? 1);
      const attackInterval = effectiveAttackSpeed > 0 ? 1 / effectiveAttackSpeed : 1;
      this.towerCooldowns.set(tower.id, attackInterval);
    }
  }

  private findTarget(tower: Tower): Enemy | null {
    const inRange = this.enemies.filter((e) =>
      isInRange(tower.position, e.position, tower.stats.range, this.cellSize)
    );

    if (inRange.length === 0) return null;

    switch (tower.targetingMode) {
      case 'first':
        // Furthest along the path = highest pathProgress
        return inRange.reduce((best, e) =>
          e.pathProgress > best.pathProgress ? e : best
        );

      case 'last':
        // Least along the path
        return inRange.reduce((best, e) =>
          e.pathProgress < best.pathProgress ? e : best
        );

      case 'strongest':
        // Highest current HP
        return inRange.reduce((best, e) =>
          e.hp > best.hp ? e : best
        );

      case 'weakest':
        // Lowest current HP
        return inRange.reduce((best, e) =>
          e.hp < best.hp ? e : best
        );

      case 'nearest': {
        const towerCenter = getCellCenter(tower.position.row, tower.position.col, this.cellSize);
        return inRange.reduce((best, e) => {
          const dBest = getDistanceBetweenPoints(towerCenter, best.position);
          const dE = getDistanceBetweenPoints(towerCenter, e.position);
          return dE < dBest ? e : best;
        });
      }

      default:
        return inRange[0];
    }
  }

  private towerAttack(tower: Tower, target: Enemy): void {
    const branchBonuses = tower.branchBonuses ?? {};
    const shotCounter = (this.towerShotCounters.get(tower.id) ?? 0) + 1;
    this.towerShotCounters.set(tower.id, shotCounter);

    // Calculate damage
    let baseDamage = tower.stats.damage + (branchBonuses.damageAdd ?? 0);
    if (branchBonuses.damageMultiply) {
      baseDamage *= 1 + branchBonuses.damageMultiply;
    }
    const upgradeBonus = (tower.level - 1) * 0.15 + (tower.mergeCount) * 0.5;
    const element = TOWER_ELEMENT[tower.type];
    const enemyCategories = ENEMY_CATEGORIES[target.type] ?? [];
    let elementMultiplier = 1;
    for (const cat of enemyCategories) {
      if (ELEMENT_MULTIPLIER[element]?.[cat] !== undefined) {
        elementMultiplier *= ELEMENT_MULTIPLIER[element][cat];
      }
    }

    // Crit
    const isCrit = Math.random() < tower.stats.critChance;
    const critMultiplier = isCrit ? tower.stats.critDamage : 1;
    const tripleHitMultiplier = tower.specialAbilities?.includes('magic_triple_hit') && shotCounter % 3 === 0 ? 3 : 1;

    const finalDamage = Math.round(
      baseDamage *
      (1 + upgradeBonus) *
      elementMultiplier *
      critMultiplier *
      tripleHitMultiplier *
      this.globalDamageMultiplier *
      (this.heroEmpower?.damageMultiplier ?? 1)
    );

    // Create projectile (unless instant-hit types)
    const projSpeed = PROJECTILE_SPEED[tower.type];
    const towerCenter = getCellCenter(tower.position.row, tower.position.col, this.cellSize);

    if (projSpeed <= 0) {
      // Instant effect (healer, barricade, goldmine — shouldn't reach here but safety)
      return;
    }

    if (tower.type === 'LIGHTNING') {
      // Lightning is instant — apply damage directly
      const chainCount = 1 + Math.round(branchBonuses.chainCountAdd ?? 0);
      const chainTargets = [target, ...this.enemies
        .filter((enemy) => enemy.id !== target.id)
        .sort((a, b) =>
          getDistanceBetweenPoints(a.position, target.position) - getDistanceBetweenPoints(b.position, target.position)
        )
        .slice(0, Math.max(0, chainCount - 1))];

      for (const [index, chainTarget] of chainTargets.entries()) {
        const chainDamage = Math.round(finalDamage * Math.max(0.55, 1 - index * 0.18));
        this.applyDamage(chainTarget, chainDamage, tower, isCrit && index === 0);
      }
      // Chain lightning visual
      this.effects.push({
        id: nextId('fx'),
        type: 'lightning',
        position: { ...target.position },
        radius: 30,
        duration: 0.3,
        elapsed: 0,
        color: '#ffff00',
      });
      // Apply status: stun
      this.addStatusEffect(target.id, {
        type: 'stun',
        value: 0,
        duration: 0.2 + tower.grade * 0.05,
        sourceId: tower.id,
      });
      return;
    }

    let projectileCount = 1;
    if (tower.specialAbilities?.includes('archer_double_shot')) projectileCount = 2;
    if (tower.specialAbilities?.includes('archer_rain')) projectileCount = 5;

    const alternateTargets = [target, ...this.enemies.filter((enemy) => enemy.id !== target.id)];
    for (let i = 0; i < projectileCount; i++) {
      const chosenTarget = alternateTargets[i] ?? target;
      const projectile: Projectile = {
        id: nextId('p'),
        sourceId: tower.id,
        targetId: chosenTarget.id,
        towerType: tower.type as TowerType,
        position: { ...towerCenter },
        speed: projSpeed,
        damage: projectileCount > 1 ? Math.round(finalDamage * (i === 0 ? 1 : 0.75)) : finalDamage,
        aoeRadius: TOWER_AOE[tower.type] + (branchBonuses.aoeRadiusAdd ?? 0),
        element,
        isCrit,
      };
      this.projectiles.push(projectile);
    }

    // Trigger tower recoil animation
    this.towerRecoil.set(tower.id, 1.0);

    // Tower-specific status effects on hit will be applied when projectile lands
  }

  // ── Projectiles ───────────────────────────────────────────

  private updateProjectiles(dt: number): void {
    const toRemove: string[] = [];

    for (const proj of this.projectiles) {
      const target = this.enemies.find((e) => e.id === proj.targetId);

      if (!target) {
        // Target died — remove projectile (or let AOE ones explode at last known pos)
        toRemove.push(proj.id);
        continue;
      }

      // Move toward target
      const dx = target.position.x - proj.position.x;
      const dy = target.position.y - proj.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const moveAmount = proj.speed * dt;

      if (dist <= moveAmount + 5) {
        // Hit!
        this.onProjectileHit(proj, target);
        toRemove.push(proj.id);
      } else {
        const norm = normalise(dx, dy);
        proj.position.x += norm.dx * moveAmount;
        proj.position.y += norm.dy * moveAmount;
      }
    }

    this.projectiles = this.projectiles.filter((p) => !toRemove.includes(p.id));
  }

  private onProjectileHit(proj: Projectile, target: Enemy): void {
    // Find the tower for status effect application
    const tower = this.towers.find((t) => t.id === proj.sourceId);

    if (proj.aoeRadius > 0) {
      // AOE damage
      for (const enemy of this.enemies) {
        const dist = getDistanceBetweenPoints(proj.position, enemy.position);
        if (dist <= proj.aoeRadius) {
          // Damage falloff: full at center, 50% at edge
          const falloff = 1 - (dist / proj.aoeRadius) * 0.5;
          const aoeDamage = Math.round(proj.damage * falloff);
          this.applyDamage(enemy, aoeDamage, tower ?? null, proj.isCrit && enemy.id === target.id);
          if (tower) {
            this.applyTowerStatusEffect(tower, enemy);
          }
        }
      }

      // AOE visual effect
      const effectType = this.getEffectTypeForTower(proj.towerType);
      this.effects.push({
        id: nextId('fx'),
        type: effectType,
        position: { ...proj.position },
        radius: proj.aoeRadius,
        duration: 0.4,
        elapsed: 0,
        color: this.getEffectColor(proj.towerType),
      });
    } else {
      // Single target
      this.applyDamage(target, proj.damage, tower ?? null, proj.isCrit);
      if (tower) {
        this.applyTowerStatusEffect(tower, target);
      }
    }
  }

  private applyDamage(enemy: Enemy, damage: number, tower: Tower | null, isCrit: boolean): void {
    let remainingDamage = damage;
    if ((enemy.shield ?? 0) > 0) {
      const shieldAbsorb = Math.min(enemy.shield ?? 0, remainingDamage);
      enemy.shield = Math.max(0, (enemy.shield ?? 0) - shieldAbsorb);
      remainingDamage -= shieldAbsorb;

      this.damageTexts.push({
        id: nextId('dt'),
        text: `-${shieldAbsorb}`,
        position: {
          x: enemy.position.x + (Math.random() - 0.5) * 16,
          y: enemy.position.y - 24,
        },
        color: '#7dd3fc',
        elapsed: 0,
        duration: 0.8,
        isCrit: false,
      });
    }

    enemy.hp = Math.max(0, enemy.hp - remainingDamage);

    // Floating damage text
    if (remainingDamage > 0) {
      this.damageTexts.push({
        id: nextId('dt'),
        text: remainingDamage.toString(),
        position: {
          x: enemy.position.x + (Math.random() - 0.5) * 20,
          y: enemy.position.y - 10,
        },
        color: isCrit ? '#ffcc00' : '#ffffff',
        elapsed: 0,
        duration: 1.0,
        isCrit,
      });
    }
  }

  private applyTowerStatusEffect(tower: Tower, enemy: Enemy): void {
    const branchBonuses = tower.branchBonuses ?? {};
    switch (tower.type) {
      case 'ICE':
        this.addStatusEffect(enemy.id, {
          type: 'slow',
          value: 0.3 + tower.grade * 0.05 + ((branchBonuses.slowPercentAdd ?? 0) / 100),
          duration: 2 + tower.grade * 0.3 + (branchBonuses.freezeDurationAdd ?? 0),
          sourceId: tower.id,
        });
        break;

      case 'POISON':
        this.addStatusEffect(enemy.id, {
          type: 'poison',
          value: tower.stats.damage * 0.2 + (branchBonuses.dotDamageAdd ?? 0),
          duration: 3 + tower.grade * 0.5,
          sourceId: tower.id,
        });
        break;

      case 'FLAME':
        this.addStatusEffect(enemy.id, {
          type: 'burn',
          value: tower.stats.damage * 0.3 + (branchBonuses.burnDamageAdd ?? 0),
          duration: 2 + tower.grade * 0.3,
          sourceId: tower.id,
        });
        break;

      case 'MAGIC':
        if (Math.random() < 0.15 + tower.grade * 0.03) {
          this.addStatusEffect(enemy.id, {
            type: 'weaken',
            value: 0.15 + tower.grade * 0.03,
            duration: 3,
            sourceId: tower.id,
          });
        }
        break;

      case 'WORD':
        // Word tower can apply random effect
        if (Math.random() < 0.2) {
          const types: EnemyEffect['type'][] = ['slow', 'poison', 'burn', 'freeze', 'stun'];
          const randomType = types[Math.floor(Math.random() * types.length)];
          this.addStatusEffect(enemy.id, {
            type: randomType,
            value: randomType === 'slow' ? 0.3 : tower.stats.damage * 0.15,
            duration: 1.5,
            sourceId: tower.id,
          });
        }
        break;

      default:
        break;
    }
  }

  private getEffectTypeForTower(towerType: TowerType): VisualEffect['type'] {
    switch (towerType) {
      case 'CANNON': return 'explosion';
      case 'ICE': return 'ice';
      case 'POISON': return 'poison_cloud';
      case 'FLAME': return 'flame';
      default: return 'explosion';
    }
  }

  private getEffectColor(towerType: TowerType): string {
    switch (towerType) {
      case 'CANNON': return '#ff6600';
      case 'ICE': return '#00ccff';
      case 'POISON': return '#44cc44';
      case 'FLAME': return '#ff4400';
      case 'LIGHTNING': return '#ffff00';
      default: return '#ffffff';
    }
  }

  // ── GoldMine ──────────────────────────────────────────────

  private updateGoldMines(dt: number): void {
    for (const tower of this.towers) {
      if (tower.type !== 'GOLDMINE') continue;

      const timer = (this.goldMineTimers.get(tower.id) ?? 0) + dt;
      if (timer >= GameEngine.GOLDMINE_INTERVAL) {
        const goldAmount = Math.round((5 + tower.grade * 3 + tower.level * 2 + (tower.branchBonuses?.goldProduceAdd ?? 0)) * this.goldMultiplier);
        this.gold += goldAmount;
        this.callbacks.onGoldEarned(goldAmount);

        this.damageTexts.push({
          id: nextId('dt'),
          text: `+${goldAmount}g`,
          position: {
            x: getCellCenter(tower.position.row, tower.position.col, this.cellSize).x,
            y: getCellCenter(tower.position.row, tower.position.col, this.cellSize).y - 15,
          },
          color: '#ffd700',
          elapsed: 0,
          duration: 1.2,
          isCrit: false,
        });

        this.goldMineTimers.set(tower.id, 0);
      } else {
        this.goldMineTimers.set(tower.id, timer);
      }
    }
  }

  // ── Healer ────────────────────────────────────────────────

  private updateHealers(dt: number): void {
    for (const tower of this.towers) {
      if (tower.type !== 'HEALER') continue;

      const timer = (this.healerTimers.get(tower.id) ?? 0) + dt;
      if (timer >= GameEngine.HEALER_INTERVAL) {
        // Heal nearby towers' "durability" — in this game we heal player HP
        const healAmount = Math.round(1 + tower.grade * 0.5 + tower.level * 0.3 + (tower.branchBonuses?.healAmountAdd ?? 0));
        if (this.hp < this.maxHp) {
          this.hp = Math.min(this.maxHp, this.hp + healAmount);
          this.callbacks.onHpLost(-healAmount); // negative = heal

          const center = getCellCenter(tower.position.row, tower.position.col, this.cellSize);
          this.effects.push({
            id: nextId('fx'),
            type: 'heal',
            position: { ...center },
            radius: tower.stats.range * this.cellSize,
            duration: 0.6,
            elapsed: 0,
            color: '#88ff88',
          });
        }

        this.healerTimers.set(tower.id, 0);
      } else {
        this.healerTimers.set(tower.id, timer);
      }
    }
  }

  private updateHeroEffects(dt: number): void {
    if (this.heroEmpower) {
      this.heroEmpower.remaining -= dt;
      if (this.heroEmpower.remaining <= 0) {
        this.heroEmpower = null;
      }
    }

    if (this.teslaField) {
      this.teslaField.remaining -= dt;
      for (const enemy of this.enemies) {
        enemy.hp = Math.max(0, enemy.hp - this.teslaField.damagePerSecond * dt);
      }

      if (this.enemies.length > 0) {
        const anchor = this.enemies[Math.floor(this.gameTime * 10) % this.enemies.length];
        this.effects.push({
          id: nextId('fx'),
          type: 'lightning',
          position: { ...anchor.position },
          radius: 45,
          duration: 0.18,
          elapsed: 0,
          color: '#00e5ff',
        });
      }

      if (this.teslaField.remaining <= 0) {
        this.teslaField = null;
      }
    }
  }

  boostHeroPower(damageMultiplier: number, attackSpeedMultiplier: number, duration: number): void {
    this.heroEmpower = {
      damageMultiplier,
      attackSpeedMultiplier,
      remaining: duration,
    };
    this.triggerFlash('#7c3aed', 0.12, 0.25);
  }

  damageEnemiesInRadius(position: WorldPosition, radius: number, damage: number, stunDuration = 0): void {
    for (const enemy of this.enemies) {
      const dist = getDistanceBetweenPoints(position, enemy.position);
      if (dist > radius) continue;
      this.applyDamage(enemy, damage, null, false);
      if (stunDuration > 0) {
        this.addStatusEffect(enemy.id, {
          type: 'stun',
          value: 0,
          duration: stunDuration,
          sourceId: 'hero',
        });
      }
    }

    this.effects.push({
      id: nextId('fx'),
      type: 'explosion',
      position,
      radius,
      duration: 0.45,
      elapsed: 0,
      color: '#ff8844',
    });
  }

  damageTopEnemies(count: number, damage: number): void {
    const targets = [...this.enemies]
      .sort((a, b) => b.hp - a.hp)
      .slice(0, count);

    for (const enemy of targets) {
      this.applyDamage(enemy, damage, null, true);
      this.effects.push({
        id: nextId('fx'),
        type: 'lightning',
        position: { ...enemy.position },
        radius: 54,
        duration: 0.24,
        elapsed: 0,
        color: '#fbbf24',
      });
    }

    if (targets.length > 0) {
      this.triggerFlash('#fbbf24', 0.14, 0.18);
    }
  }

  damageAllEnemies(damage: number, stunDuration = 0): void {
    for (const enemy of this.enemies) {
      this.applyDamage(enemy, damage, null, false);
      if (stunDuration > 0) {
        this.addStatusEffect(enemy.id, {
          type: 'stun',
          value: 0,
          duration: stunDuration,
          sourceId: 'hero',
        });
      }
    }

    if (this.enemies.length > 0) {
      const center = this.mapData
        ? { x: (this.mapData.grid[0]?.length ?? 10) * this.cellSize / 2, y: (this.mapData.grid.length ?? 8) * this.cellSize / 2 }
        : { x: 300, y: 220 };
      this.effects.push({
        id: nextId('fx'),
        type: 'explosion',
        position: center,
        radius: this.cellSize * 4.2,
        duration: 0.5,
        elapsed: 0,
        color: '#fb7185',
      });
      this.triggerFlash('#fb7185', 0.18, 0.24);
    }
  }

  slowAllEnemies(percent: number, duration: number): void {
    for (const enemy of this.enemies) {
      this.addStatusEffect(enemy.id, {
        type: 'slow',
        value: percent,
        duration,
        sourceId: 'hero',
      });
    }

    if (this.enemies.length > 0) {
      const center = this.mapData
        ? { x: (this.mapData.grid[0]?.length ?? 10) * this.cellSize / 2, y: (this.mapData.grid.length ?? 8) * this.cellSize / 2 }
        : { x: 300, y: 220 };
      this.effects.push({
        id: nextId('fx'),
        type: 'ice',
        position: center,
        radius: this.cellSize * 4,
        duration: 0.5,
        elapsed: 0,
        color: '#7dd3fc',
      });
      this.triggerFlash('#7dd3fc', 0.14, 0.22);
    }
  }

  freezeAllEnemies(duration: number, shatterPercent = 0): void {
    for (const enemy of this.enemies) {
      this.addStatusEffect(enemy.id, {
        type: 'freeze',
        value: 1,
        duration,
        sourceId: 'hero',
      });
      if (shatterPercent > 0) {
        this.applyDamage(enemy, Math.round(enemy.maxHp * shatterPercent), null, true);
      }
    }
    this.triggerSlowMotion(0.45, 0.3);
  }

  stunArmoredEnemies(duration: number, bonusDamageMultiplier = 0): void {
    let affected = 0;
    for (const enemy of this.enemies) {
      if (!['KNIGHT', 'GOLEM', 'SHIELD_BEARER', 'IRON_TURTLE', 'ARMORED_ORC'].includes(enemy.type)) {
        continue;
      }
      affected += 1;
      this.addStatusEffect(enemy.id, {
        type: 'stun',
        value: 0,
        duration,
        sourceId: 'hero',
      });
      if (bonusDamageMultiplier > 0) {
        this.applyDamage(enemy, Math.round(enemy.maxHp * bonusDamageMultiplier), null, false);
      }
    }

    if (affected > 0) {
      this.triggerFlash('#60a5fa', 0.12, 0.18);
    }
  }

  startTeslaField(duration: number, damagePerSecond: number): void {
    this.teslaField = { remaining: duration, damagePerSecond };
    this.triggerFlash('#38bdf8', 0.16, 0.24);
  }

  getHeroEmpowerRemaining(): number {
    return this.heroEmpower?.remaining ?? 0;
  }

  getTeslaFieldRemaining(): number {
    return this.teslaField?.remaining ?? 0;
  }

  // ── Effects & Damage Texts ────────────────────────────────

  private updateEffects(dt: number): void {
    for (const effect of this.effects) {
      effect.elapsed += dt;
    }
    this.effects = this.effects.filter((e) => e.elapsed < e.duration);
  }

  private updateDamageTexts(dt: number): void {
    for (const text of this.damageTexts) {
      text.elapsed += dt;
      text.position.y -= 40 * dt; // float upward
    }
    this.damageTexts = this.damageTexts.filter((t) => t.elapsed < t.duration);
  }

  // ── Wave Complete Check ───────────────────────────────────

  private checkWaveComplete(): void {
    if (!this.waveActive) return;

    if (this.waveSpawn.allSpawned && this.enemies.length === 0) {
      this.waveActive = false;

      // ── Perfect Wave Bonus ─────────────────────────────
      if (this.wavePerfect && this.currentWaveIndex >= 0) {
        const bonusGold = Math.floor(20 + this.currentWaveIndex * 5);
        this.gold += bonusGold;
        this.callbacks.onGoldEarned(bonusGold);

        // Show "PERFECT!" text at map center
        const centerX = this.mapData
          ? (this.mapData.grid[0]?.length ?? 10) * this.cellSize / 2
          : 300;
        const centerY = this.mapData
          ? (this.mapData.grid.length ?? 8) * this.cellSize / 2
          : 200;
        this.damageTexts.push({
          id: nextId('dt'),
          text: `PERFECT! +${bonusGold} Gold`,
          position: { x: centerX, y: centerY },
          color: '#ffdd00',
          elapsed: 0,
          duration: 2.0,
          isCrit: true, // renders larger/bolder
        });

        // Celebratory flash
        this.triggerFlash('#ffdd00', 0.15, 0.25);
      }

      this.waveKills = 0;
      this.callbacks.onWaveComplete(this.currentWaveIndex);

      // Update synergies after wave
      this.updateSynergies();

      // Clean up collected treasure chests
      this.treasureChests = this.treasureChests.filter(c => !c.collected);

      // Spawn treasure chest every N waves
      if (this.currentWaveIndex > 0 &&
          this.currentWaveIndex - this.lastChestWave >= GameEngine.CHEST_INTERVAL) {
        this.lastChestWave = this.currentWaveIndex;
        this.spawnTreasureChest();
      }

      if (this.currentWaveIndex >= this.waves.length - 1) {
        this.allWavesDone = true;
        this.callbacks.onAllWavesComplete();
      }
    }
  }

  // ── Game Over ─────────────────────────────────────────────

  private checkGameOver(): void {
    if (this.hp <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.callbacks.onGameOver();
    }
  }

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.renderCallback) {
      this.renderCallback(this.ctx, this);
    }
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC GETTERS (for renderer)
  // ════════════════════════════════════════════════════════════

  getMapData(): MapData | null {
    return this.mapData;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getTowers(): Tower[] {
    return this.towers;
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  getEffects(): VisualEffect[] {
    return this.effects;
  }

  getDamageTexts(): DamageText[] {
    return this.damageTexts;
  }

  getGold(): number {
    return this.gold;
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  getScore(): number {
    return this.score;
  }

  getSpeed(): GameSpeed {
    return this.speed;
  }

  getWaveCount(): number {
    return this.waves.length;
  }

  isAllWavesDone(): boolean {
    return this.allWavesDone;
  }

  isWaveActive(): boolean {
    return this.waveActive;
  }

  getTreasureChests(): TreasureChest[] {
    return this.treasureChests;
  }

  getScreenShake(): typeof this.screenShake {
    return this.screenShake;
  }

  getSlowMotion(): typeof this.slowMotion {
    return this.slowMotion;
  }

  getFlashOverlay(): typeof this.flashOverlay {
    return this.flashOverlay;
  }

  getKillCombo(): number {
    return this.killCombo;
  }

  getTowerRecoil(towerId: string): number {
    return this.towerRecoil.get(towerId) ?? 0;
  }

  getTotalKills(): number {
    return this.totalKills;
  }

  getActiveSynergies(): Map<string, SynergyBonus> {
    return this.activeSynergies;
  }

  getWavePerfect(): boolean {
    return this.wavePerfect;
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getCurrentWaveModifier(): WaveModifier | null {
    return this.currentWaveModifier;
  }

  // ════════════════════════════════════════════════════════════
  // NEW SYSTEMS
  // ════════════════════════════════════════════════════════════

  // ── Screen Effects ─────────────────────────────────────

  triggerScreenShake(intensity: number, duration: number): void {
    this.screenShake = { intensity, duration, elapsed: 0 };
  }

  triggerSlowMotion(timeScale: number, duration: number): void {
    this.slowMotion = { timeScale, duration, elapsed: 0 };
  }

  triggerFlash(color: string, alpha: number, duration: number): void {
    this.flashOverlay = { color, alpha, duration, elapsed: 0 };
  }

  private updateScreenEffects(dt: number): void {
    if (this.screenShake) {
      this.screenShake.elapsed += dt;
      if (this.screenShake.elapsed >= this.screenShake.duration) {
        this.screenShake = null;
      }
    }
    if (this.flashOverlay) {
      this.flashOverlay.elapsed += dt;
      if (this.flashOverlay.elapsed >= this.flashOverlay.duration) {
        this.flashOverlay = null;
      }
    }
    // Tower recoil decay
    for (const [id, val] of this.towerRecoil) {
      const newVal = val - dt * 8; // decay in ~0.125 seconds
      if (newVal <= 0) {
        this.towerRecoil.delete(id);
      } else {
        this.towerRecoil.set(id, newVal);
      }
    }
  }

  // ── Kill Combo ─────────────────────────────────────────

  private updateKillCombo(dt: number): void {
    void dt;
    if (this.killCombo > 0) {
      const timeSinceLastKill = (performance.now() / 1000) - this.lastKillTime;
      if (timeSinceLastKill > GameEngine.COMBO_TIMEOUT) {
        this.killCombo = 0;
      }
    }
  }

  // ── Invincibility ──────────────────────────────────────

  setInvincible(duration: number): void {
    this.invincibleTimer = duration;
  }

  private updateInvincibility(dt: number): void {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    }
  }

  isInvincible(): boolean {
    return this.invincibleTimer > 0;
  }

  // ── Boss Warning ───────────────────────────────────────

  private checkBossWarning(): void {
    if (!this.waveActive) return;

    const nextWaveIdx = this.currentWaveIndex + 1;
    if (nextWaveIdx >= this.waves.length) return;
    if (this.bossWarningShown.has(nextWaveIdx)) return;

    const nextWave = this.waves[nextWaveIdx];
    if (nextWave?.bossWave) {
      // Find the boss enemy type
      for (const group of nextWave.enemies) {
        if (BOSS_TYPES.has(group.type)) {
          this.bossWarningShown.add(nextWaveIdx);
          this.callbacks.onBossWarning?.(group.type, nextWaveIdx);
          break;
        }
      }
    }
  }

  // ── Critical HP Check ──────────────────────────────────

  private checkCriticalHp(): void {
    if (this.hp > 0 && this.hp <= this.maxHp * 0.25) {
      this.callbacks.onCriticalHp?.(this.hp, this.maxHp);
    }
  }

  // ── Treasure Chest System ──────────────────────────────

  spawnTreasureChest(): void {
    if (!this.mapData) return;

    const path = this.mapData.path;
    if (path.length < 3) return;

    // Place chest near a random point on the path (but off the path)
    const pathIdx = Math.floor(Math.random() * (path.length - 2)) + 1;
    const pathPos = path[pathIdx];

    // Offset from path
    const offsets: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const validOffsets = offsets.filter(([dr, dc]) => {
      const r = pathPos[0] + dr;
      const c = pathPos[1] + dc;
      return r >= 0 && r < this.mapData!.grid.length &&
             c >= 0 && c < this.mapData!.grid[0].length &&
             this.mapData!.grid[r][c] !== 1; // not a wall/path
    });

    if (validOffsets.length === 0) return;

    const [dr, dc] = validOffsets[Math.floor(Math.random() * validOffsets.length)];
    const chestRow = pathPos[0] + dr;
    const chestCol = pathPos[1] + dc;

    // Generate random reward
    const rewards: ChestReward[] = [
      { type: 'gold', amount: 50 + Math.floor(Math.random() * 100) },
      { type: 'gold', amount: 100 + Math.floor(Math.random() * 150) },
      { type: 'diamond', amount: 1 + Math.floor(Math.random() * 3) },
      { type: 'heal', amount: 3 + Math.floor(Math.random() * 5) },
      { type: 'buff', buffType: 'damage', duration: 15, value: 0.3 },
      { type: 'buff', buffType: 'speed', duration: 15, value: 0.2 },
    ];

    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    const chest: TreasureChest = {
      id: nextId('chest'),
      position: {
        x: chestCol * this.cellSize + this.cellSize / 2,
        y: chestRow * this.cellSize + this.cellSize / 2,
      },
      spawnWave: this.currentWaveIndex,
      collected: false,
      reward,
    };

    this.treasureChests.push(chest);
    this.callbacks.onTreasureSpawn?.(chest);
  }

  collectTreasureChest(chestId: string): ChestReward | null {
    const chest = this.treasureChests.find(c => c.id === chestId && !c.collected);
    if (!chest) return null;

    chest.collected = true;
    return chest.reward;
  }

  // ── Synergy System ─────────────────────────────────────

  updateSynergies(): void {
    this.activeSynergies.clear();

    // Count towers by type
    const towerCounts = new Map<TowerType, number>();
    for (const tower of this.towers) {
      towerCounts.set(tower.type, (towerCounts.get(tower.type) ?? 0) + 1);
    }

    // Check synergy conditions
    for (const synergy of TOWER_SYNERGIES) {
      let active = true;
      for (const type of synergy.requiredTypes) {
        if ((towerCounts.get(type) ?? 0) < synergy.requiredCount) {
          active = false;
          break;
        }
      }
      if (active) {
        this.activeSynergies.set(synergy.id, synergy.bonus);
        this.callbacks.onSynergyActivated?.(synergy);
      }
    }
  }

  getSynergyDamageMultiplier(): number {
    let multiplier = 1;
    for (const bonus of this.activeSynergies.values()) {
      if (bonus.damageMultiplier) multiplier *= bonus.damageMultiplier;
    }
    return multiplier;
  }

  // ── Enhanced Enemy Death ──────────────────────────────

  private onEnemyDeath(enemy: Enemy): void {
    // ── Fast Kill Bonus: 50% more gold if killed within 2s of spawn ──
    let fastKillBonus = 0;
    if (enemy.spawnTime !== undefined && (this.gameTime - enemy.spawnTime) < 2) {
      fastKillBonus = Math.round(enemy.rewards.gold * this.goldMultiplier * 0.5);
    }

    const goldReward = Math.round(enemy.rewards.gold * this.goldMultiplier) + fastKillBonus;
    this.gold += goldReward;
    this.score += enemy.rewards.exp * 10;

    // Fast kill text
    if (fastKillBonus > 0) {
      this.damageTexts.push({
        id: nextId('dt'),
        text: `FAST! +${fastKillBonus}g`,
        position: {
          x: enemy.position.x + 15,
          y: enemy.position.y - 25,
        },
        color: '#ff8800',
        elapsed: 0,
        duration: 1.2,
        isCrit: false,
      });
    }

    // ── Enemy Split on Death ─────────────────────────────
    if (!enemy.isSplit) {
      if (enemy.type === 'SLIME') {
        this.spawnSplitEnemies(enemy, 2, 0.3, 0.7);
      } else if (enemy.type === 'GOLEM') {
        this.spawnSplitEnemies(enemy, 3, 0.2, 0.8);
      }
    }

    if (enemy.isElite) {
      for (const nearby of this.enemies) {
        if (nearby.id === enemy.id) continue;
        if (getDistanceBetweenPoints(enemy.position, nearby.position) > 100) continue;
        nearby.isRaging = true;
        nearby.speed *= 1.06;
      }
      this.effects.push({
        id: nextId('fx'),
        type: 'merge',
        position: { ...enemy.position },
        radius: 70,
        duration: 0.5,
        elapsed: 0,
        color: '#facc15',
      });
    }

    // Kill combo
    this.totalKills += 1;
    this.waveKills += 1;
    this.killCombo += 1;
    this.lastKillTime = performance.now() / 1000;

    // Combo shake/flash escalation
    if (this.killCombo === 5) {
      this.triggerScreenShake(2, 0.15);
    } else if (this.killCombo === 10) {
      this.triggerScreenShake(3, 0.2);
      this.triggerFlash('#ffcc00', 0.15, 0.15);
    } else if (this.killCombo === 20) {
      this.triggerScreenShake(5, 0.3);
      this.triggerFlash('#ff6600', 0.2, 0.2);
    } else if (this.killCombo >= 30 && this.killCombo % 10 === 0) {
      this.triggerScreenShake(6, 0.35);
      this.triggerFlash('#ff0044', 0.25, 0.25);
    }

    // Combo milestone notifications
    if (this.killCombo > 0 && this.killCombo % 10 === 0) {
      this.callbacks.onComboMilestone?.(this.killCombo);
      // Bonus gold for combo
      const comboBonus = Math.round(this.killCombo * 2);
      this.gold += comboBonus;
      this.callbacks.onGoldEarned(comboBonus);
    }

    this.callbacks.onGoldEarned(goldReward);
    this.callbacks.onEnemyKilled(enemy);
    this.callbacks.onScoreAdd(enemy.rewards.exp * 10);

    // Death visual effects
    const isBoss = BOSS_TYPES.has(enemy.type);
    this.effects.push({
      id: nextId('fx'),
      type: 'death',
      position: { ...enemy.position },
      radius: isBoss ? 60 : 20,
      duration: isBoss ? 1.0 : 0.5,
      elapsed: 0,
      color: isBoss ? '#ff8800' : '#ff4444',
    });

    // Boss death: screen shake + slow motion + flash
    if (isBoss) {
      this.triggerScreenShake(8, 0.5);
      this.triggerSlowMotion(0.3, 0.8);
      this.triggerFlash('#ffffff', 0.4, 0.3);
    } else if (this.killCombo >= 5) {
      // Multi-kill screen shake (smaller)
      this.triggerScreenShake(2, 0.15);
    }

    // Treasure chest spawn check
    if (this.currentWaveIndex - this.lastChestWave >= GameEngine.CHEST_INTERVAL && isBoss) {
      this.lastChestWave = this.currentWaveIndex;
      this.spawnTreasureChest();
    }
  }
}

// ── Tower Synergy Definitions ────────────────────────────

const TOWER_SYNERGIES: TowerSynergy[] = [
  {
    id: 'elemental_trio',
    name: 'Elemental Trio',
    nameKr: '원소 삼위일체',
    description: 'Have Fire, Ice, and Lightning towers',
    requiredTypes: ['FLAME' as TowerType, 'ICE' as TowerType, 'LIGHTNING' as TowerType],
    requiredCount: 1,
    bonus: { damageMultiplier: 1.2 },
  },
  {
    id: 'magic_circle',
    name: 'Magic Circle',
    nameKr: '마법진',
    description: 'Have 3 or more Magic towers',
    requiredTypes: ['MAGIC' as TowerType],
    requiredCount: 3,
    bonus: { damageMultiplier: 1.15, rangeMultiplier: 1.1 },
  },
  {
    id: 'archer_brigade',
    name: 'Archer Brigade',
    nameKr: '궁수대',
    description: 'Have 3 or more Archer towers',
    requiredTypes: ['ARCHER' as TowerType],
    requiredCount: 3,
    bonus: { attackSpeedMultiplier: 1.2 },
  },
  {
    id: 'artillery_battery',
    name: 'Artillery Battery',
    nameKr: '포병대',
    description: 'Have Cannon and Sniper towers',
    requiredTypes: ['CANNON' as TowerType, 'SNIPER' as TowerType],
    requiredCount: 1,
    bonus: { damageMultiplier: 1.25 },
  },
  {
    id: 'nature_harmony',
    name: 'Nature Harmony',
    nameKr: '자연의 조화',
    description: 'Have Poison, Healer, and Goldmine',
    requiredTypes: ['POISON' as TowerType, 'HEALER' as TowerType, 'GOLDMINE' as TowerType],
    requiredCount: 1,
    bonus: { damageMultiplier: 1.1, specialEffect: 'hp_regen' },
  },
  {
    id: 'word_scholar',
    name: 'Word Scholar',
    nameKr: '단어 학자',
    description: 'Have 2 or more Word towers',
    requiredTypes: ['WORD' as TowerType],
    requiredCount: 2,
    bonus: { damageMultiplier: 1.3, specialEffect: 'quiz_bonus' },
  },
  {
    id: 'fortress_wall',
    name: 'Fortress Wall',
    nameKr: '요새',
    description: 'Have 3 or more Barricades',
    requiredTypes: ['BARRICADE' as TowerType],
    requiredCount: 3,
    bonus: { specialEffect: 'thorns_aura' },
  },
  {
    id: 'economic_empire',
    name: 'Economic Empire',
    nameKr: '경제 제국',
    description: 'Have 3 or more Goldmines',
    requiredTypes: ['GOLDMINE' as TowerType],
    requiredCount: 3,
    bonus: { specialEffect: 'gold_interest' },
  },
];
