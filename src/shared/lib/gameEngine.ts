// ============================================================
// WordGuard - Core Game Loop Engine
// ============================================================

import type {
  Tower,
  TowerType,
  TowerGrade,
  Enemy,
  EnemyType,
  EnemyEffect,
  WorldPosition,
  GridPosition,
  MapData,
  Wave,
  WaveEnemy,
  GameSpeed,
  TargetingMode,
  Element,
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
  getAngle,
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

type TowerElement = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'magic' | 'holy' | 'earth';

interface TowerCooldown {
  towerId: string;
  lastAttackTime: number;
}

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

  // ── Boss Warning ───────────────────────────────────────
  private bossWarningShown: Set<number> = new Set();

  // ── Invincibility ──────────────────────────────────────
  private invincibleTimer: number = 0;

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
    this.waveSpawn = {
      waveIndex: nextIndex,
      enemyGroupIndex: 0,
      spawnedInGroup: 0,
      spawnTimer: 0,
      allSpawned: false,
    };
    this.waveActive = true;
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

    this.updateWaveSpawning(effectiveDt);
    this.updateEnemies(effectiveDt);
    this.updateTowers(effectiveDt);
    this.updateProjectiles(effectiveDt);
    this.updateEffects(effectiveDt);
    this.updateDamageTexts(effectiveDt);
    this.updateGoldMines(effectiveDt);
    this.updateHealers(effectiveDt);
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

      // Spawn one enemy from current group
      this.spawnEnemy(group.type, wave.bossWave && BOSS_TYPES.has(group.type));
      this.waveSpawn.spawnedInGroup += 1;

      if (this.waveSpawn.spawnedInGroup >= group.count) {
        // Move to next group
        this.waveSpawn.enemyGroupIndex += 1;
        this.waveSpawn.spawnedInGroup = 0;

        if (this.waveSpawn.enemyGroupIndex >= wave.enemies.length) {
          this.waveSpawn.allSpawned = true;
          return;
        }

        // Use the next group's delay
        const nextGroup = wave.enemies[this.waveSpawn.enemyGroupIndex];
        this.waveSpawn.spawnTimer = nextGroup ? nextGroup.delay / 1000 : 0.5;
      } else {
        // Delay between enemies in the same group
        this.waveSpawn.spawnTimer = group.delay / 1000;
      }
    }
  }

  private spawnEnemy(type: EnemyType, isBoss: boolean): void {
    if (!this.mapData) return;

    const template = ENEMY_TEMPLATES[type];
    const waveScaling = 1 + this.currentWaveIndex * 0.12;
    const bossMultiplier = isBoss ? 1 : 1; // boss stats are already high in template

    const scaledHp = Math.round(template.hp * waveScaling * bossMultiplier);
    const startPos = getPositionOnPath(this.mapData.path, 0, this.cellSize);

    const enemy: Enemy = {
      id: nextId('e'),
      type,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: template.speed * this.globalSpeedMultiplier,
      position: { ...startPos.position },
      pathIndex: 0,
      pathProgress: 0,
      effects: [],
      rewards: {
        gold: Math.round(template.gold * waveScaling),
        exp: Math.round(template.exp * waveScaling),
      },
    };

    this.enemies.push(enemy);
  }

  // ── Enemy Movement ────────────────────────────────────────

  private updateEnemies(dt: number): void {
    if (!this.mapData) return;

    const path = this.mapData.path;
    const toRemove: string[] = [];

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

  // ── Tower Targeting & Attacking ───────────────────────────

  private updateTowers(dt: number): void {
    if (!this.mapData) return;

    for (const tower of this.towers) {
      // Skip non-attacking towers
      if (tower.type === 'BARRICADE' || tower.type === 'GOLDMINE' || tower.type === 'HEALER') {
        continue;
      }

      // Cooldown
      const cd = this.towerCooldowns.get(tower.id) ?? 0;
      const newCd = cd - dt;
      this.towerCooldowns.set(tower.id, newCd);

      if (newCd > 0) continue;

      // Find target
      const target = this.findTarget(tower);
      if (!target) continue;

      // Attack
      this.towerAttack(tower, target);

      // Reset cooldown (attackSpeed = attacks per second)
      const attackInterval = tower.stats.attackSpeed > 0 ? 1 / tower.stats.attackSpeed : 1;
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
    // Calculate damage
    const baseDamage = tower.stats.damage;
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

    const finalDamage = Math.round(
      baseDamage * (1 + upgradeBonus) * elementMultiplier * critMultiplier * this.globalDamageMultiplier
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
      this.applyDamage(target, finalDamage, tower, isCrit);
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

    // For all other tower types, create a projectile
    const projectile: Projectile = {
      id: nextId('p'),
      sourceId: tower.id,
      targetId: target.id,
      towerType: tower.type as TowerType,
      position: { ...towerCenter },
      speed: projSpeed,
      damage: finalDamage,
      aoeRadius: TOWER_AOE[tower.type],
      element,
      isCrit,
    };
    this.projectiles.push(projectile);

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
    enemy.hp = Math.max(0, enemy.hp - damage);

    // Floating damage text
    this.damageTexts.push({
      id: nextId('dt'),
      text: damage.toString(),
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

  private applyTowerStatusEffect(tower: Tower, enemy: Enemy): void {
    switch (tower.type) {
      case 'ICE':
        this.addStatusEffect(enemy.id, {
          type: 'slow',
          value: 0.3 + tower.grade * 0.05,
          duration: 2 + tower.grade * 0.3,
          sourceId: tower.id,
        });
        break;

      case 'POISON':
        this.addStatusEffect(enemy.id, {
          type: 'poison',
          value: tower.stats.damage * 0.2,
          duration: 3 + tower.grade * 0.5,
          sourceId: tower.id,
        });
        break;

      case 'FLAME':
        this.addStatusEffect(enemy.id, {
          type: 'burn',
          value: tower.stats.damage * 0.3,
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
        const goldAmount = Math.round((5 + tower.grade * 3 + tower.level * 2) * this.goldMultiplier);
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
        const healAmount = Math.round(1 + tower.grade * 0.5 + tower.level * 0.3);
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

  getTotalKills(): number {
    return this.totalKills;
  }

  getActiveSynergies(): Map<string, SynergyBonus> {
    return this.activeSynergies;
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
  }

  // ── Kill Combo ─────────────────────────────────────────

  private updateKillCombo(dt: number): void {
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
    const goldReward = Math.round(enemy.rewards.gold * this.goldMultiplier);
    this.gold += goldReward;
    this.score += enemy.rewards.exp * 10;

    // Kill combo
    this.totalKills += 1;
    this.waveKills += 1;
    this.killCombo += 1;
    this.lastKillTime = performance.now() / 1000;

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
