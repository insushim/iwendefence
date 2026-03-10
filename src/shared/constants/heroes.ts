// ============================================================
// WordGuard - Hero Definitions (6 heroes)
// ============================================================

import { Element, HeroSkill } from '@/shared/types/game';

export interface HeroDefinition {
  id: string;
  name: string;
  nameKr: string;
  title: string;
  element: Element;
  description: string;
  passive: HeroSkill;
  activeSkill: HeroSkill;
  ultimate: HeroSkill;
  baseStats: {
    hp: number;
    attackBoost: number;
    defenseBoost: number;
  };
  unlockCondition: string;
  color: string;
  icon: string;
}

export const HERO_DEFINITIONS: Record<string, HeroDefinition> = {
  aria: {
    id: 'aria',
    name: 'Aria',
    nameKr: '아리아',
    title: '바람의 궁수',
    element: 'wind',
    description: '빠른 공격속도와 치명타로 적을 무력화하는 궁수 영웅',
    passive: {
      name: '바람의 축복',
      description: '모든 궁수탑 공격속도 +15%, 치명타 확률 +5%',
      cooldown: 0,
      effect: { archerAttackSpeed: 0.15, archerCritChance: 0.05 },
    },
    activeSkill: {
      name: '화살비',
      description: '랜덤 적 10마리에게 궁수탑 공격력의 200% 피해',
      cooldown: 15,
      effect: { targetCount: 10, damageMultiplier: 2.0, type: 'arrowRain' },
    },
    ultimate: {
      name: '폭풍의 화살',
      description: '전체 적에게 궁수탑 공격력의 500% 피해 + 3초 슬로우',
      cooldown: 60,
      effect: { damageMultiplier: 5.0, slowDuration: 3, slowPercent: 50, type: 'stormArrow' },
    },
    baseStats: { hp: 100, attackBoost: 0.1, defenseBoost: 0 },
    unlockCondition: '기본 해금',
    color: '#22C55E',
    icon: '🏹',
  },

  luna: {
    id: 'luna',
    name: 'Luna',
    nameKr: '루나',
    title: '별빛의 마법사',
    element: 'light',
    description: '강력한 마법 공격과 범위 디버프로 전장을 지배하는 마법사 영웅',
    passive: {
      name: '별의 가호',
      description: '모든 마법탑 공격력 +20%, 적 마법 저항 -10%',
      cooldown: 0,
      effect: { magicDamage: 0.2, enemyMagicResist: -0.1 },
    },
    activeSkill: {
      name: '메테오',
      description: '지정 영역에 마법탑 공격력의 300% 범위 피해',
      cooldown: 20,
      effect: { damageMultiplier: 3.0, areaRadius: 2.0, type: 'meteor' },
    },
    ultimate: {
      name: '스타폴',
      description: '전체 맵에 마법탑 공격력의 400% 피해 + 2초 스턴',
      cooldown: 75,
      effect: { damageMultiplier: 4.0, stunDuration: 2, type: 'starfall' },
    },
    baseStats: { hp: 80, attackBoost: 0.15, defenseBoost: 0 },
    unlockCondition: '월드 2 클리어',
    color: '#A855F7',
    icon: '🔮',
  },

  gaia: {
    id: 'gaia',
    name: 'Gaia',
    nameKr: '가이아',
    title: '대지의 팔라딘',
    element: 'earth',
    description: '강력한 방어력과 회복으로 팀을 지키는 수호 영웅',
    passive: {
      name: '대지의 보호',
      description: '바리케이드 HP +30%, 플레이어 최대 HP +20',
      cooldown: 0,
      effect: { barricadeHp: 0.3, maxHpBonus: 20 },
    },
    activeSkill: {
      name: '성스러운 방벽',
      description: '5초간 모든 타워에 보호막 (피해 50% 감소)',
      cooldown: 25,
      effect: { duration: 5, damageReduction: 0.5, type: 'holyShield' },
    },
    ultimate: {
      name: '가이아의 축복',
      description: '전체 HP 회복 + 모든 바리케이드 복구 + 10초간 방어력 2배',
      cooldown: 90,
      effect: { healPercent: 0.5, defenseMultiplier: 2.0, duration: 10, type: 'gaiaBlessing' },
    },
    baseStats: { hp: 150, attackBoost: 0, defenseBoost: 0.2 },
    unlockCondition: '월드 3 클리어',
    color: '#D97706',
    icon: '🛡️',
  },

  kai: {
    id: 'kai',
    name: 'Kai',
    nameKr: '카이',
    title: '그림자의 닌자',
    element: 'dark',
    description: '치명타와 연쇄 공격으로 적을 순식간에 제거하는 암살자 영웅',
    passive: {
      name: '암살자의 본능',
      description: '모든 타워 치명타 피해 +25%, 보스 적에게 추가 피해 +10%',
      cooldown: 0,
      effect: { critDamageBonus: 0.25, bossDamageBonus: 0.1 },
    },
    activeSkill: {
      name: '그림자 분신',
      description: '8초간 모든 타워 공격이 2회 적중 (2번째는 50% 피해)',
      cooldown: 18,
      effect: { duration: 8, doubleStrikeRatio: 0.5, type: 'shadowClone' },
    },
    ultimate: {
      name: '암흑 질풍참',
      description: 'HP가 가장 높은 적 3마리에게 전체 타워 공격력 합산의 300% 피해',
      cooldown: 60,
      effect: { targetCount: 3, damageMultiplier: 3.0, type: 'darkSlash' },
    },
    baseStats: { hp: 90, attackBoost: 0.2, defenseBoost: 0 },
    unlockCondition: '월드 5 클리어',
    color: '#6366F1',
    icon: '🥷',
  },

  frost: {
    id: 'frost',
    name: 'Frost',
    nameKr: '프로스트',
    title: '겨울의 빙결사',
    element: 'ice',
    description: '적을 얼려 이동을 멈추고 취약하게 만드는 제어 전문 영웅',
    passive: {
      name: '영구 동토',
      description: '얼음탑 슬로우 효과 +20%, 빙결된 적 받는 피해 +15%',
      cooldown: 0,
      effect: { iceSlowBonus: 0.2, frozenDamageBonus: 0.15 },
    },
    activeSkill: {
      name: '블리자드',
      description: '전체 적 3초 슬로우 60% + 얼음 속성 피해',
      cooldown: 20,
      effect: { slowPercent: 60, slowDuration: 3, damageMultiplier: 1.5, type: 'blizzard' },
    },
    ultimate: {
      name: '절대 영도',
      description: '전체 적 5초 완전 빙결(이동 불가) + 빙결 해제 시 HP 20% 피해',
      cooldown: 80,
      effect: { freezeDuration: 5, shatterDamagePercent: 0.2, type: 'absoluteZero' },
    },
    baseStats: { hp: 100, attackBoost: 0.05, defenseBoost: 0.1 },
    unlockCondition: '월드 4 클리어',
    color: '#38BDF8',
    icon: '❄️',
  },

  volt: {
    id: 'volt',
    name: 'Volt',
    nameKr: '볼트',
    title: '천둥의 엔지니어',
    element: 'lightning',
    description: '타워 강화와 골드 생산을 극대화하는 경제/유틸 영웅',
    passive: {
      name: '과부하',
      description: '번개탑 연쇄 +1, 금광 생산량 +20%',
      cooldown: 0,
      effect: { lightningChainBonus: 1, goldProduceBonus: 0.2 },
    },
    activeSkill: {
      name: '전자기 펄스',
      description: '전체 적 2초 스턴 + 기계/갑옷 적에게 추가 피해',
      cooldown: 22,
      effect: { stunDuration: 2, armoredBonusDamage: 0.5, type: 'empPulse' },
    },
    ultimate: {
      name: '테슬라 코일',
      description: '15초간 맵 중앙에 테슬라 코일 설치. 매초 전체 적에게 번개 피해',
      cooldown: 70,
      effect: { duration: 15, damagePerSecond: 50, type: 'teslaCoil' },
    },
    baseStats: { hp: 110, attackBoost: 0.1, defenseBoost: 0.05 },
    unlockCondition: '월드 6 클리어',
    color: '#FACC15',
    icon: '⚡',
  },
};

/** All hero IDs in order */
export const HERO_IDS = ['aria', 'luna', 'gaia', 'kai', 'frost', 'volt'] as const;

/** Default hero for new players */
export const DEFAULT_HERO_ID = 'aria';
