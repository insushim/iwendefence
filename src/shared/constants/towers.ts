// ============================================================
// WordGuard - Tower Definitions
// ============================================================

import { TowerType } from '@/shared/types/game';

export interface TowerDefinition {
  type: TowerType;
  name: string;
  nameKr: string;
  element: string;
  attackType: 'single' | 'area' | 'chain' | 'dot' | 'heal' | 'block' | 'produce' | 'buff';
  baseStats: {
    damage: number;
    range: number;
    attackSpeed: number;
    critChance: number;
    critDamage: number;
  };
  cost: number;
  description: string;
  color: string;
  icon: string;
  areaRadius?: number;
  chainCount?: number;
  dotDamage?: number;
  dotDuration?: number;
  slowPercent?: number;
  healAmount?: number;
  blockHp?: number;
  goldProduce?: number;
  produceInterval?: number;
}

export const TOWER_DEFINITIONS: Record<TowerType, TowerDefinition> = {
  [TowerType.ARCHER]: {
    type: TowerType.ARCHER,
    name: 'Archer',
    nameKr: '궁수탑',
    element: 'wind',
    attackType: 'single',
    baseStats: {
      damage: 10,
      range: 3,
      attackSpeed: 1.0,
      critChance: 0.1,
      critDamage: 1.5,
    },
    cost: 50,
    description: '빠른 공격속도로 단일 적을 공격하는 기본 타워',
    color: '#22C55E',
    icon: '🏹',
  },

  [TowerType.MAGIC]: {
    type: TowerType.MAGIC,
    name: 'Magic',
    nameKr: '마법탑',
    element: 'light',
    attackType: 'single',
    baseStats: {
      damage: 18,
      range: 3.5,
      attackSpeed: 0.7,
      critChance: 0.15,
      critDamage: 2.0,
    },
    cost: 80,
    description: '마법 공격으로 적의 방어를 무시하는 타워',
    color: '#A855F7',
    icon: '🔮',
  },

  [TowerType.CANNON]: {
    type: TowerType.CANNON,
    name: 'Cannon',
    nameKr: '대포탑',
    element: 'fire',
    attackType: 'area',
    baseStats: {
      damage: 30,
      range: 2.5,
      attackSpeed: 0.4,
      critChance: 0.05,
      critDamage: 1.8,
    },
    cost: 100,
    description: '폭발로 범위 내 모든 적에게 피해를 주는 타워',
    color: '#EF4444',
    icon: '💣',
    areaRadius: 1.5,
  },

  [TowerType.ICE]: {
    type: TowerType.ICE,
    name: 'Ice',
    nameKr: '얼음탑',
    element: 'ice',
    attackType: 'single',
    baseStats: {
      damage: 8,
      range: 3,
      attackSpeed: 0.8,
      critChance: 0.05,
      critDamage: 1.3,
    },
    cost: 70,
    description: '적을 느리게 만드는 빙결 공격 타워',
    color: '#38BDF8',
    icon: '❄️',
    slowPercent: 30,
  },

  [TowerType.LIGHTNING]: {
    type: TowerType.LIGHTNING,
    name: 'Lightning',
    nameKr: '번개탑',
    element: 'lightning',
    attackType: 'chain',
    baseStats: {
      damage: 15,
      range: 3,
      attackSpeed: 0.6,
      critChance: 0.2,
      critDamage: 2.5,
    },
    cost: 120,
    description: '번개가 여러 적에게 연쇄적으로 튕기는 타워',
    color: '#FACC15',
    icon: '⚡',
    chainCount: 3,
  },

  [TowerType.POISON]: {
    type: TowerType.POISON,
    name: 'Poison',
    nameKr: '독탑',
    element: 'dark',
    attackType: 'dot',
    baseStats: {
      damage: 5,
      range: 2.5,
      attackSpeed: 0.5,
      critChance: 0.1,
      critDamage: 1.5,
    },
    cost: 90,
    description: '독을 퍼뜨려 지속적으로 피해를 주는 타워',
    color: '#84CC16',
    icon: '☠️',
    dotDamage: 8,
    dotDuration: 5,
    areaRadius: 1.2,
  },

  [TowerType.HEALER]: {
    type: TowerType.HEALER,
    name: 'Healer',
    nameKr: '치유탑',
    element: 'light',
    attackType: 'heal',
    baseStats: {
      damage: 0,
      range: 2.5,
      attackSpeed: 0.5,
      critChance: 0.0,
      critDamage: 1.0,
    },
    cost: 100,
    description: '주변 타워를 강화하고 플레이어 HP를 회복하는 타워',
    color: '#F472B6',
    icon: '💖',
    healAmount: 5,
  },

  [TowerType.BARRICADE]: {
    type: TowerType.BARRICADE,
    name: 'Barricade',
    nameKr: '바리케이드',
    element: 'earth',
    attackType: 'block',
    baseStats: {
      damage: 0,
      range: 0,
      attackSpeed: 0,
      critChance: 0,
      critDamage: 1.0,
    },
    cost: 60,
    description: '적의 경로를 막아 이동을 지연시키는 방어 구조물',
    color: '#A78BFA',
    icon: '🧱',
    blockHp: 200,
  },

  [TowerType.GOLDMINE]: {
    type: TowerType.GOLDMINE,
    name: 'GoldMine',
    nameKr: '금광',
    element: 'earth',
    attackType: 'produce',
    baseStats: {
      damage: 0,
      range: 0,
      attackSpeed: 0,
      critChance: 0,
      critDamage: 1.0,
    },
    cost: 150,
    description: '주기적으로 골드를 생산하는 경제 타워',
    color: '#F59E0B',
    icon: '⛏️',
    goldProduce: 10,
    produceInterval: 5,
  },

  [TowerType.SNIPER]: {
    type: TowerType.SNIPER,
    name: 'Sniper',
    nameKr: '저격탑',
    element: 'wind',
    attackType: 'single',
    baseStats: {
      damage: 50,
      range: 5,
      attackSpeed: 0.25,
      critChance: 0.3,
      critDamage: 3.0,
    },
    cost: 150,
    description: '긴 사거리에서 높은 피해를 주는 저격 타워',
    color: '#64748B',
    icon: '🎯',
  },

  [TowerType.FLAME]: {
    type: TowerType.FLAME,
    name: 'Flame',
    nameKr: '화염탑',
    element: 'fire',
    attackType: 'dot',
    baseStats: {
      damage: 12,
      range: 2,
      attackSpeed: 0.8,
      critChance: 0.1,
      critDamage: 1.5,
    },
    cost: 110,
    description: '근거리에서 지속적인 화염 피해를 주는 타워',
    color: '#FB923C',
    icon: '🔥',
    dotDamage: 10,
    dotDuration: 3,
    areaRadius: 1.0,
  },

  [TowerType.WORD]: {
    type: TowerType.WORD,
    name: 'Word',
    nameKr: '워드타워',
    element: 'light',
    attackType: 'buff',
    baseStats: {
      damage: 20,
      range: 4,
      attackSpeed: 0.5,
      critChance: 0.25,
      critDamage: 2.0,
    },
    cost: 200,
    description: '단어 퀴즈 정답 시 강력한 전체 공격을 발동하는 특수 타워',
    color: '#06B6D4',
    icon: '📖',
  },
};

// ── Merge & Grade Constants ──────────────────────────────────

/** Grade -> cost to merge two towers of that grade */
export const MERGE_COSTS: Record<number, number> = {
  1: 50,
  2: 150,
  3: 500,
  4: 2000,
};

/** Grade -> stat multiplier */
export const GRADE_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 2.5,
  3: 6,
  4: 15,
  5: 40,
};

/** Grade -> Korean display name */
export const GRADE_NAMES: Record<number, string> = {
  1: '일반',
  2: '고급',
  3: '희귀',
  4: '전설',
  5: '신화',
};

/** Grade -> CSS color */
export const GRADE_COLORS: Record<number, string> = {
  1: '#9CA3AF',
  2: '#10B981',
  3: '#3B82F6',
  4: '#F59E0B',
  5: '#EF4444',
};
