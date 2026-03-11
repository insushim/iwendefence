// ============================================================
// WordGuard - Game Type Definitions
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export enum TowerType {
  ARCHER = 'ARCHER',
  MAGIC = 'MAGIC',
  CANNON = 'CANNON',
  ICE = 'ICE',
  LIGHTNING = 'LIGHTNING',
  POISON = 'POISON',
  HEALER = 'HEALER',
  BARRICADE = 'BARRICADE',
  GOLDMINE = 'GOLDMINE',
  SNIPER = 'SNIPER',
  FLAME = 'FLAME',
  WORD = 'WORD',
}

export enum TowerGrade {
  NORMAL = 1,
  RARE = 2,
  EPIC = 3,
  LEGENDARY = 4,
  MYTHIC = 5,
}

export enum EnemyType {
  // Basic
  SLIME = 'SLIME',
  GOBLIN = 'GOBLIN',
  SKELETON = 'SKELETON',
  BAT = 'BAT',
  WOLF = 'WOLF',
  // Armored
  KNIGHT = 'KNIGHT',
  GOLEM = 'GOLEM',
  SHIELD_BEARER = 'SHIELD_BEARER',
  IRON_TURTLE = 'IRON_TURTLE',
  ARMORED_ORC = 'ARMORED_ORC',
  // Fast
  THIEF = 'THIEF',
  SHADOW = 'SHADOW',
  NINJA = 'NINJA',
  WIND_SPRITE = 'WIND_SPRITE',
  HASTE_IMP = 'HASTE_IMP',
  // Magic
  WIZARD = 'WIZARD',
  DARK_MAGE = 'DARK_MAGE',
  SPIRIT = 'SPIRIT',
  ENCHANTRESS = 'ENCHANTRESS',
  PHANTOM = 'PHANTOM',
  // Flying
  HARPY = 'HARPY',
  DRAGON_WHELP = 'DRAGON_WHELP',
  GARGOYLE = 'GARGOYLE',
  PHOENIX_CHICK = 'PHOENIX_CHICK',
  WYVERN = 'WYVERN',
  // Boss
  DRAGON = 'DRAGON',
  LICH_KING = 'LICH_KING',
  DEMON_LORD = 'DEMON_LORD',
  HYDRA = 'HYDRA',
  WORD_DESTROYER = 'WORD_DESTROYER',
}

// ── Targeting ────────────────────────────────────────────────

export type TargetingMode = 'first' | 'last' | 'strongest' | 'weakest' | 'nearest';

// ── Tower ────────────────────────────────────────────────────

export interface TowerStats {
  damage: number;
  range: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  grade: TowerGrade;
  position: GridPosition;
  stats: TowerStats;
  level: number;
  mergeCount: number;
  targetingMode: TargetingMode;
}

// ── Enemy ────────────────────────────────────────────────────

export interface WorldPosition {
  x: number;
  y: number;
}

export interface EnemyEffect {
  type: 'slow' | 'poison' | 'burn' | 'freeze' | 'stun' | 'weaken';
  value: number;
  duration: number;
  remainingTime: number;
  sourceId: string;
}

export interface EnemyReward {
  gold: number;
  exp: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  displayHp: number; // for HP delay bar (lerps toward hp)
  speed: number;
  position: WorldPosition;
  pathIndex: number;
  pathProgress: number;
  effects: EnemyEffect[];
  rewards: EnemyReward;
}

// ── Hero ─────────────────────────────────────────────────────

export type Element = 'fire' | 'ice' | 'lightning' | 'earth' | 'light' | 'dark' | 'wind' | 'water';

export interface HeroSkill {
  name: string;
  description: string;
  cooldown: number;
  effect: Record<string, number | string>;
}

export interface HeroCooldowns {
  active: number;
  ultimate: number;
}

export interface Hero {
  id: string;
  name: string;
  element: Element;
  passive: HeroSkill;
  activeSkill: HeroSkill;
  ultimate: HeroSkill;
  cooldowns: HeroCooldowns;
}

// ── Word / Quiz ──────────────────────────────────────────────

export type WordGrade = 3 | 4 | 5 | 6;

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'interjection';

export interface WordData {
  id: string;
  english: string;
  korean: string;
  grade: WordGrade;
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  phonetic: string;
  partOfSpeech: PartOfSpeech;
  exampleSentence: string;
  exampleKorean: string;
  synonyms: string[];
  antonyms: string[];
  relatedWords: string[];
}

export type QuizType =
  | 'kr2en'
  | 'en2kr'
  | 'listening'
  | 'spelling'
  | 'sentence'
  | 'image'
  | 'combo';

export interface Quiz {
  type: QuizType;
  word: WordData;
  options: string[];
  timeLimit: number;
  reward: QuizReward;
}

export interface QuizReward {
  goldMultiplier: number;
  attackBoost: number;
  ultimateCharge: number;
  invincible: number;
  speedBoost: number;
}

// ── Word Stat ────────────────────────────────────────────────

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface WordStat {
  wordId: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  lastAttempted: number; // timestamp
  mastery: MasteryLevel;
  streak: number;
  averageResponseTime: number;
}

// ── Stage / Wave / Map ───────────────────────────────────────

export type WorldId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface WaveEnemy {
  type: EnemyType;
  count: number;
  delay: number;
}

export interface Wave {
  enemies: WaveEnemy[];
  bossWave: boolean;
}

export type EnvironmentType =
  | 'forest'
  | 'desert'
  | 'snow'
  | 'volcano'
  | 'ocean'
  | 'sky'
  | 'dungeon'
  | 'swamp'
  | 'ruins'
  | 'void';

export interface MapData {
  grid: number[][];
  path: [number, number][];
  startPoint: GridPosition;
  endPoint: GridPosition;
}

export interface Stage {
  worldId: WorldId;
  stageId: StageId;
  waves: Wave[];
  mapData: MapData;
  environment: EnvironmentType;
}

// ── Game State ───────────────────────────────────────────────

export type GameSpeed = 1 | 2 | 3;

export interface GameState {
  gold: number;
  diamonds: number;
  hp: number;
  maxHp: number;
  wave: number;
  towers: Tower[];
  enemies: Enemy[];
  score: number;
  combo: number;
  quizCombo: number;
  speed: GameSpeed;
  isPaused: boolean;
  isGameOver: boolean;
  currentHero: Hero | null;
}

// ── Player Progress ──────────────────────────────────────────

export interface StageKey {
  worldId: WorldId;
  stageId: StageId;
}

export interface HeroProgress {
  heroId: string;
  unlocked: boolean;
  level: number;
  experience: number;
}

export interface PlayerUpgrade {
  id: string;
  level: number;
}

export interface PlayerProgress {
  unlockedStages: StageKey[];
  heroes: HeroProgress[];
  upgrades: PlayerUpgrade[];
  wordStats: WordStat[];
  highScores: Record<string, number>; // "worldId-stageId" -> score
}

// ── Roguelike Upgrade ────────────────────────────────────────

export type UpgradeCategory = 'tower' | 'economy' | 'word' | 'defense' | 'special';

export interface UpgradeEffect {
  stat: string;
  value: number;
  operation: 'add' | 'multiply' | 'set';
}

export interface RoguelikeUpgrade {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  effect: UpgradeEffect;
  icon: string;
}

// ── Store Action Types (for Zustand stores) ──────────────────

export interface GameActions {
  // Gold
  setGold: (gold: number) => void;
  addGold: (amount: number) => void;
  // HP
  setHp: (hp: number) => void;
  takeDamage: (amount: number) => void;
  healHp: (amount: number) => void;
  // Tower
  addTower: (tower: Tower) => void;
  removeTower: (towerId: string) => void;
  upgradeTower: (towerId: string) => void;
  mergeTowers: (sourceId: string, targetId: string) => void;
  // Enemy
  spawnEnemy: (enemy: Enemy) => void;
  damageEnemy: (enemyId: string, damage: number) => void;
  removeEnemy: (enemyId: string) => void;
  // Wave
  nextWave: () => void;
  setSpeed: (speed: GameSpeed) => void;
  togglePause: () => void;
  // Combo
  setCombo: (combo: number) => void;
  resetCombo: () => void;
  incrementCombo: () => void;
  // Quiz
  startQuiz: (quiz: Quiz) => void;
  completeQuiz: (correct: boolean, reward: QuizReward) => void;
  // Upgrade
  applyUpgrade: (upgrade: RoguelikeUpgrade) => void;
  // Game over
  setGameOver: () => void;
  // Reset
  reset: () => void;
}

export interface PlayerActions {
  unlockStage: (worldId: WorldId, stageId: StageId) => void;
  setHighScore: (worldId: WorldId, stageId: StageId, score: number) => void;
  addWordStat: (stat: WordStat) => void;
  updateWordStat: (wordId: string, correct: boolean, responseTime: number) => void;
  unlockHero: (heroId: string) => void;
  upgradeHero: (heroId: string) => void;
  saveProgress: () => void;
  loadProgress: () => void;
}

export interface WordActions {
  setWords: (words: WordData[]) => void;
  getWordsByGrade: (grade: WordGrade) => WordData[];
  getWordsByCategory: (category: string) => WordData[];
  getQuizWord: (wordStats: WordStat[]) => WordData | null;
  generateQuiz: (type: QuizType, wordStats: WordStat[]) => Quiz | null;
}

export interface SettingsState {
  volume: number;
  sfxVolume: number;
  grade: WordGrade | 'mixed';
  difficulty: 1 | 2 | 3 | 4 | 5;
  language: 'ko' | 'en';
}

export interface SettingsActions {
  setVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setGrade: (grade: WordGrade | 'mixed') => void;
  setDifficulty: (difficulty: 1 | 2 | 3 | 4 | 5) => void;
  setLanguage: (language: 'ko' | 'en') => void;
}

// ── Branching Upgrade System (BTD6-style) ─────────────────

export type UpgradePath = 0 | 1 | 2;
export type UpgradeTier = 0 | 1 | 2 | 3 | 4 | 5;

/** Tracks which tier each of the 3 paths is at for a tower */
export type TowerUpgradePaths = [UpgradeTier, UpgradeTier, UpgradeTier];

export interface TowerBranchUpgrade {
  id: string;
  towerType: TowerType;
  path: UpgradePath;
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  nameKr: string;
  description: string;
  descriptionKr: string;
  cost: number;
  icon: string;
  effect: BranchUpgradeEffect;
}

export interface BranchUpgradeEffect {
  damageAdd?: number;
  damageMultiply?: number;
  rangeAdd?: number;
  rangeMultiply?: number;
  attackSpeedAdd?: number;
  attackSpeedMultiply?: number;
  critChanceAdd?: number;
  critDamageAdd?: number;
  specialAbility?: string;
  aoeRadiusAdd?: number;
  slowPercentAdd?: number;
  dotDamageAdd?: number;
  chainCountAdd?: number;
  goldProduceAdd?: number;
  healAmountAdd?: number;
}

// ── Quiz Context System (Ad Replacement) ──────────────────

export type QuizContext =
  | { type: 'wave_bonus'; waveIndex: number; bonusGold: number }
  | { type: 'boss'; waveIndex: number }
  | { type: 'revive' }
  | { type: 'free_tower' }
  | { type: 'crisis'; currentHp: number }
  | { type: 'treasure'; chestId: string }
  | { type: 'speed_unlock' }
  | { type: 'streak_bonus'; comboCount: number }
  | { type: 'quick'; waveIndex: number }
  | { type: 'manual' }
  | null;

// ── Tower with Branching Upgrades ─────────────────────────

export interface TowerV2 extends Tower {
  upgradePaths: TowerUpgradePaths;
  specialAbilities: string[];
  synergyBonuses: { type: string; value: number }[];
}

// ── Treasure Chest ────────────────────────────────────────

export interface TreasureChest {
  id: string;
  position: WorldPosition;
  spawnWave: number;
  collected: boolean;
  reward: ChestReward;
}

export type ChestReward =
  | { type: 'gold'; amount: number }
  | { type: 'diamond'; amount: number }
  | { type: 'tower_upgrade'; towerType: TowerType }
  | { type: 'buff'; buffType: string; duration: number; value: number }
  | { type: 'heal'; amount: number };

// ── Achievement System ────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  nameKr: string;
  description: string;
  descriptionKr: string;
  icon: string;
  condition: AchievementCondition;
  reward: AchievementReward;
  unlocked: boolean;
  unlockedAt?: number;
}

export type AchievementCondition =
  | { type: 'quiz_streak'; count: number }
  | { type: 'waves_cleared'; count: number }
  | { type: 'enemies_killed'; count: number }
  | { type: 'towers_built'; count: number }
  | { type: 'words_mastered'; count: number }
  | { type: 'stages_cleared'; count: number }
  | { type: 'boss_killed'; bossType?: EnemyType }
  | { type: 'no_damage_wave' }
  | { type: 'speed_clear'; maxWaves: number; maxTime: number };

export type AchievementReward =
  | { type: 'gold'; amount: number }
  | { type: 'diamond'; amount: number }
  | { type: 'hero_unlock'; heroId: string }
  | { type: 'title'; title: string };

// ── Synergy System ────────────────────────────────────────

export interface TowerSynergy {
  id: string;
  name: string;
  nameKr: string;
  description: string;
  requiredTypes: TowerType[];
  requiredCount: number;
  bonus: SynergyBonus;
}

export interface SynergyBonus {
  damageMultiplier?: number;
  attackSpeedMultiplier?: number;
  rangeMultiplier?: number;
  specialEffect?: string;
}

// ── Daily Challenge ───────────────────────────────────────

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  nameKr: string;
  description: string;
  modifiers: ChallengeModifier[];
  worldId: WorldId;
  stageId: StageId;
  rewards: { gold: number; diamonds: number };
}

export type ChallengeModifier =
  | { type: 'enemy_hp_multiply'; value: number }
  | { type: 'enemy_speed_multiply'; value: number }
  | { type: 'tower_cost_multiply'; value: number }
  | { type: 'starting_gold'; value: number }
  | { type: 'max_towers'; value: number }
  | { type: 'quiz_only_type'; quizType: QuizType }
  | { type: 'no_healer' }
  | { type: 'double_boss' };
