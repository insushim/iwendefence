// ============================================================
// WordGuard - Stage Definitions (10 worlds x 10 stages = 100)
// ============================================================

import {
  WorldId,
  StageId,
  Stage,
  Wave,
  WaveEnemy,
  MapData,
  EnvironmentType,
  EnemyType,
} from '@/shared/types/game';

// ── World Themes ─────────────────────────────────────────────

export interface WorldDefinition {
  worldId: WorldId;
  name: string;
  nameKr: string;
  environment: EnvironmentType;
  description: string;
  color: string;
  icon: string;
  unlockCondition: string;
}

export const WORLD_DEFINITIONS: Record<WorldId, WorldDefinition> = {
  1: {
    worldId: 1,
    name: 'Green Forest',
    nameKr: '초록 숲',
    environment: 'forest',
    description: '단어의 여정이 시작되는 평화로운 숲',
    color: '#22C55E',
    icon: '🌲',
    unlockCondition: '기본 해금',
  },
  2: {
    worldId: 2,
    name: 'Scorching Desert',
    nameKr: '뜨거운 사막',
    environment: 'desert',
    description: '모래폭풍이 몰아치는 끝없는 사막',
    color: '#F59E0B',
    icon: '🏜️',
    unlockCondition: '월드 1 클리어',
  },
  3: {
    worldId: 3,
    name: 'Frozen Tundra',
    nameKr: '얼어붙은 설원',
    environment: 'snow',
    description: '만년설에 뒤덮인 혹한의 대지',
    color: '#38BDF8',
    icon: '❄️',
    unlockCondition: '월드 2 클리어',
  },
  4: {
    worldId: 4,
    name: 'Burning Volcano',
    nameKr: '불타는 화산',
    environment: 'volcano',
    description: '끓어오르는 용암이 흐르는 화산 지대',
    color: '#EF4444',
    icon: '🌋',
    unlockCondition: '월드 3 클리어',
  },
  5: {
    worldId: 5,
    name: 'Deep Ocean',
    nameKr: '심해',
    environment: 'ocean',
    description: '깊은 바다 속 신비로운 해저 세계',
    color: '#0EA5E9',
    icon: '🌊',
    unlockCondition: '월드 4 클리어',
  },
  6: {
    worldId: 6,
    name: 'Sky Kingdom',
    nameKr: '하늘 왕국',
    environment: 'sky',
    description: '구름 위에 떠 있는 천공의 왕국',
    color: '#A78BFA',
    icon: '☁️',
    unlockCondition: '월드 5 클리어',
  },
  7: {
    worldId: 7,
    name: 'Dark Dungeon',
    nameKr: '어둠의 던전',
    environment: 'dungeon',
    description: '빛이 닿지 않는 지하 미궁',
    color: '#6B7280',
    icon: '🏰',
    unlockCondition: '월드 6 클리어',
  },
  8: {
    worldId: 8,
    name: 'Poison Swamp',
    nameKr: '독의 늪',
    environment: 'swamp',
    description: '독안개가 피어오르는 위험한 늪지대',
    color: '#84CC16',
    icon: '🐸',
    unlockCondition: '월드 7 클리어',
  },
  9: {
    worldId: 9,
    name: 'Ancient Ruins',
    nameKr: '고대 유적',
    environment: 'ruins',
    description: '잃어버린 문명의 거대한 유적지',
    color: '#D97706',
    icon: '🏛️',
    unlockCondition: '월드 8 클리어',
  },
  10: {
    worldId: 10,
    name: 'Void Dimension',
    nameKr: '공허의 차원',
    environment: 'void',
    description: '모든 것이 사라지는 차원의 끝',
    color: '#1E1B4B',
    icon: '🌀',
    unlockCondition: '월드 9 클리어',
  },
};

// ── Environmental Effects ────────────────────────────────────

export interface EnvironmentEffect {
  environment: EnvironmentType;
  name: string;
  nameKr: string;
  description: string;
  effect: Record<string, number>;
}

export const ENVIRONMENT_EFFECTS: Record<EnvironmentType, EnvironmentEffect> = {
  forest: {
    environment: 'forest',
    name: 'Nature\'s Blessing',
    nameKr: '자연의 축복',
    description: '궁수탑 사거리 +10%',
    effect: { archerRangeBonus: 0.1 },
  },
  desert: {
    environment: 'desert',
    name: 'Heat Wave',
    nameKr: '열파',
    description: '화염 피해 +15%, 얼음 피해 -15%',
    effect: { fireDamageBonus: 0.15, iceDamagePenalty: -0.15 },
  },
  snow: {
    environment: 'snow',
    name: 'Permafrost',
    nameKr: '영구 동토',
    description: '얼음탑 슬로우 +15%, 적 이동속도 -5%',
    effect: { iceSlowBonus: 0.15, enemySpeedReduction: 0.05 },
  },
  volcano: {
    environment: 'volcano',
    name: 'Lava Flow',
    nameKr: '용암 흐름',
    description: '대포/화염탑 공격력 +20%, 적 HP +10%',
    effect: { fireTowerDamageBonus: 0.2, enemyHpBonus: 0.1 },
  },
  ocean: {
    environment: 'ocean',
    name: 'Deep Current',
    nameKr: '심해 해류',
    description: '번개 피해 +20%, 비행 적 이동속도 +10%',
    effect: { lightningDamageBonus: 0.2, flyingSpeedBonus: 0.1 },
  },
  sky: {
    environment: 'sky',
    name: 'High Altitude',
    nameKr: '고도 효과',
    description: '비행 적 다수 출현, 바람 속성 피해 +15%',
    effect: { windDamageBonus: 0.15, flyingEnemyRate: 0.3 },
  },
  dungeon: {
    environment: 'dungeon',
    name: 'Darkness',
    nameKr: '어둠',
    description: '모든 타워 사거리 -15%, 암흑 적 저항 +20%',
    effect: { towerRangePenalty: -0.15, darkResistBonus: 0.2 },
  },
  swamp: {
    environment: 'swamp',
    name: 'Miasma',
    nameKr: '독기',
    description: '독 피해 +25%, 모든 적 이동속도 -10%',
    effect: { poisonDamageBonus: 0.25, enemySpeedReduction: 0.1 },
  },
  ruins: {
    environment: 'ruins',
    name: 'Ancient Power',
    nameKr: '고대의 힘',
    description: '마법탑 공격력 +15%, 골드 보너스 +10%',
    effect: { magicDamageBonus: 0.15, goldBonus: 0.1 },
  },
  void: {
    environment: 'void',
    name: 'Void Energy',
    nameKr: '공허 에너지',
    description: '모든 타워 공격력 +10%, 모든 적 HP +20%',
    effect: { allDamageBonus: 0.1, enemyHpBonus: 0.2 },
  },
};

// ── Map Generation ───────────────────────────────────────────

// 0 = empty, 1 = path, 2 = tower slot, 3 = blocked
// Grid is 8 rows x 12 cols

/** Pre-defined path templates for variety */
const PATH_TEMPLATES: { path: [number, number][]; grid: number[][] }[] = [
  // Template 0: S-curve (left to right)
  {
    path: [
      [0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 4], [2, 5],
      [2, 6], [2, 7], [3, 7], [4, 7], [4, 6], [4, 5], [4, 4], [4, 3],
      [5, 3], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9],
      [6, 10], [6, 11], [7, 11],
    ],
    grid: [
      [1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2],
      [2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2],
      [2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    ],
  },
  // Template 1: Zigzag (top to bottom)
  {
    path: [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5],
      [2, 4], [2, 3], [2, 2], [2, 1], [3, 1], [4, 1], [4, 2], [4, 3],
      [4, 4], [4, 5], [4, 6], [4, 7], [5, 7], [6, 7], [6, 8], [6, 9],
      [6, 10], [6, 11], [7, 11],
    ],
    grid: [
      [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
      [2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    ],
  },
  // Template 2: L-shape with loop
  {
    path: [
      [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [3, 5], [3, 4], [3, 3],
      [3, 2], [4, 2], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7],
      [5, 8], [5, 9], [6, 9], [7, 9], [7, 10], [7, 11],
    ],
    grid: [
      [2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2],
      [2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
      [2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1],
    ],
  },
  // Template 3: Spiral inward
  {
    path: [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
      [0, 8], [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [5, 8],
      [5, 7], [5, 6], [5, 5], [5, 4], [5, 3], [4, 3], [3, 3], [2, 3],
      [2, 4], [2, 5], [2, 6], [3, 6], [4, 6],
    ],
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2],
      [2, 2, 2, 1, 1, 1, 1, 2, 2, 1, 2, 2],
      [2, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2],
      [2, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2],
      [2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  // Template 4: Double lane merge
  {
    path: [
      [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3],
      [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [5, 8], [6, 8], [6, 9],
      [6, 10], [6, 11], [7, 11],
    ],
    grid: [
      [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    ],
  },
];

function getMapForStage(worldId: WorldId, stageId: StageId): MapData {
  const templateIndex = ((worldId - 1) * 10 + (stageId - 1)) % PATH_TEMPLATES.length;
  const template = PATH_TEMPLATES[templateIndex];
  const path = template.path;
  return {
    grid: template.grid.map((row) => [...row]),
    path: path as [number, number][],
    startPoint: { row: path[0][0], col: path[0][1] },
    endPoint: { row: path[path.length - 1][0], col: path[path.length - 1][1] },
  };
}

// ── Enemy Pool per World ─────────────────────────────────────

const WORLD_ENEMY_POOLS: Record<WorldId, { normal: EnemyType[]; elite: EnemyType[]; boss: EnemyType }> = {
  1: {
    normal: [EnemyType.SLIME, EnemyType.GOBLIN, EnemyType.BAT],
    elite: [EnemyType.WOLF, EnemyType.SKELETON],
    boss: EnemyType.DRAGON,
  },
  2: {
    normal: [EnemyType.GOBLIN, EnemyType.SKELETON, EnemyType.WOLF],
    elite: [EnemyType.KNIGHT, EnemyType.THIEF],
    boss: EnemyType.DRAGON,
  },
  3: {
    normal: [EnemyType.SKELETON, EnemyType.BAT, EnemyType.WOLF],
    elite: [EnemyType.KNIGHT, EnemyType.GOLEM, EnemyType.WIND_SPRITE],
    boss: EnemyType.LICH_KING,
  },
  4: {
    normal: [EnemyType.GOBLIN, EnemyType.WOLF, EnemyType.THIEF],
    elite: [EnemyType.SHIELD_BEARER, EnemyType.DRAGON_WHELP, EnemyType.WIZARD],
    boss: EnemyType.DRAGON,
  },
  5: {
    normal: [EnemyType.SLIME, EnemyType.BAT, EnemyType.WIND_SPRITE],
    elite: [EnemyType.SHADOW, EnemyType.SPIRIT, EnemyType.HARPY],
    boss: EnemyType.HYDRA,
  },
  6: {
    normal: [EnemyType.HARPY, EnemyType.WIND_SPRITE, EnemyType.BAT],
    elite: [EnemyType.GARGOYLE, EnemyType.PHOENIX_CHICK, EnemyType.WYVERN],
    boss: EnemyType.DRAGON,
  },
  7: {
    normal: [EnemyType.SKELETON, EnemyType.SHADOW, EnemyType.DARK_MAGE],
    elite: [EnemyType.PHANTOM, EnemyType.NINJA, EnemyType.ENCHANTRESS],
    boss: EnemyType.LICH_KING,
  },
  8: {
    normal: [EnemyType.SLIME, EnemyType.GOBLIN, EnemyType.HASTE_IMP],
    elite: [EnemyType.IRON_TURTLE, EnemyType.ARMORED_ORC, EnemyType.ENCHANTRESS],
    boss: EnemyType.HYDRA,
  },
  9: {
    normal: [EnemyType.KNIGHT, EnemyType.WIZARD, EnemyType.GOLEM],
    elite: [EnemyType.DARK_MAGE, EnemyType.NINJA, EnemyType.GARGOYLE],
    boss: EnemyType.DEMON_LORD,
  },
  10: {
    normal: [EnemyType.PHANTOM, EnemyType.NINJA, EnemyType.WYVERN],
    elite: [EnemyType.ARMORED_ORC, EnemyType.PHOENIX_CHICK, EnemyType.DARK_MAGE],
    boss: EnemyType.WORD_DESTROYER,
  },
};

// ── Wave Generation ──────────────────────────────────────────

function generateWavesForStage(worldId: WorldId, stageId: StageId): Wave[] {
  const pool = WORLD_ENEMY_POOLS[worldId];
  const totalWaves = 5 + stageId; // 6~15 waves per stage
  const waves: Wave[] = [];

  for (let w = 1; w <= totalWaves; w++) {
    const isBoss = w === totalWaves || (w % 5 === 0);
    const waveEnemies: WaveEnemy[] = [];

    if (isBoss) {
      // Boss wave: boss + some normal enemies
      const normalCount = 3 + Math.floor(worldId * 0.5) + Math.floor(stageId * 0.3);
      const normalType = pool.normal[w % pool.normal.length];
      waveEnemies.push({ type: normalType, count: normalCount, delay: 0.8 });
      waveEnemies.push({ type: pool.boss, count: 1, delay: 2.0 });
    } else if (w % 3 === 0) {
      // Elite wave: mix of elite + normal
      const eliteType = pool.elite[w % pool.elite.length];
      const normalType = pool.normal[w % pool.normal.length];
      const normalCount = 4 + Math.floor(worldId * 0.4) + Math.floor(w * 0.3);
      const eliteCount = 1 + Math.floor(w / 4);
      waveEnemies.push({ type: normalType, count: normalCount, delay: 0.8 });
      waveEnemies.push({ type: eliteType, count: eliteCount, delay: 1.5 });
    } else {
      // Normal wave
      const type1 = pool.normal[w % pool.normal.length];
      const type2 = pool.normal[(w + 1) % pool.normal.length];
      const count1 = 5 + Math.floor(worldId * 0.5) + Math.floor(w * 0.5);
      const count2 = 2 + Math.floor(w * 0.3);
      waveEnemies.push({ type: type1, count: count1, delay: 0.8 });
      if (w > 2) {
        waveEnemies.push({ type: type2, count: count2, delay: 1.0 });
      }
    }

    waves.push({ enemies: waveEnemies, bossWave: isBoss });
  }

  return waves;
}

// ── Stage Generation ─────────────────────────────────────────

function generateStage(worldId: WorldId, stageId: StageId): Stage {
  return {
    worldId,
    stageId,
    waves: generateWavesForStage(worldId, stageId),
    mapData: getMapForStage(worldId, stageId),
    environment: WORLD_DEFINITIONS[worldId].environment,
  };
}

/** All 100 stages, lazily generated and cached */
let _allStagesCache: Stage[] | null = null;

export function getAllStages(): Stage[] {
  if (_allStagesCache) return _allStagesCache;

  const stages: Stage[] = [];
  for (let w = 1; w <= 10; w++) {
    for (let s = 1; s <= 10; s++) {
      stages.push(generateStage(w as WorldId, s as StageId));
    }
  }
  _allStagesCache = stages;
  return stages;
}

/** Get a specific stage */
export function getStage(worldId: WorldId, stageId: StageId): Stage {
  return generateStage(worldId, stageId);
}

/** Get all stages for a specific world */
export function getWorldStages(worldId: WorldId): Stage[] {
  const stages: Stage[] = [];
  for (let s = 1; s <= 10; s++) {
    stages.push(generateStage(worldId, s as StageId));
  }
  return stages;
}

/** Total number of stages */
export const TOTAL_STAGES = 100;

/** Total number of worlds */
export const TOTAL_WORLDS = 10;
