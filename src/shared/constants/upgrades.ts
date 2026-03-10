// ============================================================
// WordGuard - Roguelike Upgrade Definitions (50 upgrades)
// ============================================================

import { UpgradeCategory, UpgradeEffect } from '@/shared/types/game';

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  effect: UpgradeEffect;
  icon: string;
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  // ── Tower Upgrades (1-15) ────────────────────────────────────

  {
    id: 'tower_damage_1',
    name: '공격력 강화 I',
    description: '모든 타워 공격력 +10%',
    category: 'tower',
    effect: { stat: 'towerDamage', value: 0.1, operation: 'multiply' },
    icon: '⚔️',
  },
  {
    id: 'tower_damage_2',
    name: '공격력 강화 II',
    description: '모든 타워 공격력 +20%',
    category: 'tower',
    effect: { stat: 'towerDamage', value: 0.2, operation: 'multiply' },
    icon: '⚔️',
  },
  {
    id: 'tower_damage_3',
    name: '공격력 강화 III',
    description: '모든 타워 공격력 +35%',
    category: 'tower',
    effect: { stat: 'towerDamage', value: 0.35, operation: 'multiply' },
    icon: '⚔️',
  },
  {
    id: 'tower_speed_1',
    name: '공격속도 강화 I',
    description: '모든 타워 공격속도 +10%',
    category: 'tower',
    effect: { stat: 'towerAttackSpeed', value: 0.1, operation: 'multiply' },
    icon: '💨',
  },
  {
    id: 'tower_speed_2',
    name: '공격속도 강화 II',
    description: '모든 타워 공격속도 +20%',
    category: 'tower',
    effect: { stat: 'towerAttackSpeed', value: 0.2, operation: 'multiply' },
    icon: '💨',
  },
  {
    id: 'tower_range_1',
    name: '사거리 확장 I',
    description: '모든 타워 사거리 +15%',
    category: 'tower',
    effect: { stat: 'towerRange', value: 0.15, operation: 'multiply' },
    icon: '🎯',
  },
  {
    id: 'tower_range_2',
    name: '사거리 확장 II',
    description: '모든 타워 사거리 +25%',
    category: 'tower',
    effect: { stat: 'towerRange', value: 0.25, operation: 'multiply' },
    icon: '🎯',
  },
  {
    id: 'tower_crit_chance',
    name: '치명타 확률 증가',
    description: '모든 타워 치명타 확률 +10%',
    category: 'tower',
    effect: { stat: 'towerCritChance', value: 0.1, operation: 'add' },
    icon: '💥',
  },
  {
    id: 'tower_crit_damage',
    name: '치명타 피해 증가',
    description: '모든 타워 치명타 피해 +50%',
    category: 'tower',
    effect: { stat: 'towerCritDamage', value: 0.5, operation: 'add' },
    icon: '💥',
  },
  {
    id: 'archer_mastery',
    name: '궁수 마스터리',
    description: '궁수탑 공격력 +30%, 공격속도 +15%',
    category: 'tower',
    effect: { stat: 'archerDamage', value: 0.3, operation: 'multiply' },
    icon: '🏹',
  },
  {
    id: 'magic_mastery',
    name: '마법 마스터리',
    description: '마법탑 공격력 +30%, 사거리 +20%',
    category: 'tower',
    effect: { stat: 'magicDamage', value: 0.3, operation: 'multiply' },
    icon: '🔮',
  },
  {
    id: 'cannon_mastery',
    name: '포격 마스터리',
    description: '대포탑 공격력 +25%, 범위 +30%',
    category: 'tower',
    effect: { stat: 'cannonDamage', value: 0.25, operation: 'multiply' },
    icon: '💣',
  },
  {
    id: 'ice_mastery',
    name: '빙결 마스터리',
    description: '얼음탑 슬로우 +20%, 지속시간 +1초',
    category: 'tower',
    effect: { stat: 'iceSlow', value: 0.2, operation: 'add' },
    icon: '❄️',
  },
  {
    id: 'lightning_mastery',
    name: '번개 마스터리',
    description: '번개탑 연쇄 +2, 피해 감소 없음',
    category: 'tower',
    effect: { stat: 'lightningChain', value: 2, operation: 'add' },
    icon: '⚡',
  },
  {
    id: 'poison_mastery',
    name: '맹독 마스터리',
    description: '독탑 지속 피해 +40%, 지속시간 +2초',
    category: 'tower',
    effect: { stat: 'poisonDot', value: 0.4, operation: 'multiply' },
    icon: '☠️',
  },

  // ── Economy Upgrades (16-27) ─────────────────────────────────

  {
    id: 'gold_bonus_1',
    name: '골드 보너스 I',
    description: '적 처치 골드 +15%',
    category: 'economy',
    effect: { stat: 'goldBonus', value: 0.15, operation: 'multiply' },
    icon: '💰',
  },
  {
    id: 'gold_bonus_2',
    name: '골드 보너스 II',
    description: '적 처치 골드 +30%',
    category: 'economy',
    effect: { stat: 'goldBonus', value: 0.3, operation: 'multiply' },
    icon: '💰',
  },
  {
    id: 'gold_bonus_3',
    name: '골드 보너스 III',
    description: '적 처치 골드 +50%',
    category: 'economy',
    effect: { stat: 'goldBonus', value: 0.5, operation: 'multiply' },
    icon: '💰',
  },
  {
    id: 'starting_gold',
    name: '시작 자금 증가',
    description: '시작 골드 +100',
    category: 'economy',
    effect: { stat: 'startingGold', value: 100, operation: 'add' },
    icon: '🪙',
  },
  {
    id: 'interest',
    name: '이자 수익',
    description: '웨이브 종료 시 보유 골드의 5% 이자',
    category: 'economy',
    effect: { stat: 'interestRate', value: 0.05, operation: 'set' },
    icon: '🏦',
  },
  {
    id: 'tower_discount_1',
    name: '건설 할인 I',
    description: '타워 건설 비용 -10%',
    category: 'economy',
    effect: { stat: 'towerCostReduction', value: 0.1, operation: 'add' },
    icon: '🏗️',
  },
  {
    id: 'tower_discount_2',
    name: '건설 할인 II',
    description: '타워 건설 비용 -20%',
    category: 'economy',
    effect: { stat: 'towerCostReduction', value: 0.2, operation: 'add' },
    icon: '🏗️',
  },
  {
    id: 'merge_discount',
    name: '합성 할인',
    description: '합성 비용 -25%',
    category: 'economy',
    effect: { stat: 'mergeCostReduction', value: 0.25, operation: 'add' },
    icon: '🔄',
  },
  {
    id: 'goldmine_boost',
    name: '금광 강화',
    description: '금광 생산량 +50%',
    category: 'economy',
    effect: { stat: 'goldProduceBonus', value: 0.5, operation: 'multiply' },
    icon: '⛏️',
  },
  {
    id: 'wave_gold_bonus',
    name: '웨이브 보너스',
    description: '웨이브 클리어 보너스 골드 +30',
    category: 'economy',
    effect: { stat: 'waveClearGold', value: 30, operation: 'add' },
    icon: '🎉',
  },
  {
    id: 'boss_gold',
    name: '보스 현상금',
    description: '보스 처치 골드 +100%',
    category: 'economy',
    effect: { stat: 'bossGoldBonus', value: 1.0, operation: 'multiply' },
    icon: '👑',
  },
  {
    id: 'sell_bonus',
    name: '매각 보너스',
    description: '타워 판매 시 원가의 75% 회수 (기본 50%)',
    category: 'economy',
    effect: { stat: 'sellRefundRate', value: 0.75, operation: 'set' },
    icon: '💱',
  },

  // ── Word Upgrades (28-37) ────────────────────────────────────

  {
    id: 'quiz_time_1',
    name: '시간 연장 I',
    description: '퀴즈 제한시간 +3초',
    category: 'word',
    effect: { stat: 'quizTimeBonus', value: 3, operation: 'add' },
    icon: '⏰',
  },
  {
    id: 'quiz_time_2',
    name: '시간 연장 II',
    description: '퀴즈 제한시간 +5초',
    category: 'word',
    effect: { stat: 'quizTimeBonus', value: 5, operation: 'add' },
    icon: '⏰',
  },
  {
    id: 'quiz_reward_1',
    name: '퀴즈 보상 강화 I',
    description: '퀴즈 정답 보상 +20%',
    category: 'word',
    effect: { stat: 'quizRewardBonus', value: 0.2, operation: 'multiply' },
    icon: '📝',
  },
  {
    id: 'quiz_reward_2',
    name: '퀴즈 보상 강화 II',
    description: '퀴즈 정답 보상 +40%',
    category: 'word',
    effect: { stat: 'quizRewardBonus', value: 0.4, operation: 'multiply' },
    icon: '📝',
  },
  {
    id: 'combo_bonus',
    name: '콤보 마스터',
    description: '퀴즈 콤보 보너스 +50%',
    category: 'word',
    effect: { stat: 'comboBonus', value: 0.5, operation: 'multiply' },
    icon: '🔥',
  },
  {
    id: 'hint_system',
    name: '힌트 시스템',
    description: '퀴즈에서 오답 1개 제거',
    category: 'word',
    effect: { stat: 'hintCount', value: 1, operation: 'add' },
    icon: '💡',
  },
  {
    id: 'word_tower_boost',
    name: '워드타워 강화',
    description: '워드타워 공격력 +50%, 퀴즈 성공 시 추가 전체 공격',
    category: 'word',
    effect: { stat: 'wordTowerDamage', value: 0.5, operation: 'multiply' },
    icon: '📖',
  },
  {
    id: 'speed_answer',
    name: '속답 보너스',
    description: '3초 이내 정답 시 추가 골드 +20',
    category: 'word',
    effect: { stat: 'speedAnswerGold', value: 20, operation: 'set' },
    icon: '⚡',
  },
  {
    id: 'mastery_bonus',
    name: '숙달 보너스',
    description: '마스터리 5인 단어 정답 시 공격력 버프 2배',
    category: 'word',
    effect: { stat: 'masteryBuffMultiplier', value: 2.0, operation: 'set' },
    icon: '🌟',
  },
  {
    id: 'wrong_forgive',
    name: '오답 용서',
    description: '오답 시 콤보가 절반만 감소 (리셋 대신)',
    category: 'word',
    effect: { stat: 'wrongComboKeep', value: 0.5, operation: 'set' },
    icon: '🕊️',
  },

  // ── Defense Upgrades (38-45) ─────────────────────────────────

  {
    id: 'max_hp_1',
    name: '최대 HP 증가 I',
    description: '최대 HP +10',
    category: 'defense',
    effect: { stat: 'maxHp', value: 10, operation: 'add' },
    icon: '❤️',
  },
  {
    id: 'max_hp_2',
    name: '최대 HP 증가 II',
    description: '최대 HP +25',
    category: 'defense',
    effect: { stat: 'maxHp', value: 25, operation: 'add' },
    icon: '❤️',
  },
  {
    id: 'hp_regen',
    name: 'HP 재생',
    description: '웨이브 종료 시 HP 5 회복',
    category: 'defense',
    effect: { stat: 'waveHealAmount', value: 5, operation: 'add' },
    icon: '💚',
  },
  {
    id: 'barricade_boost',
    name: '바리케이드 강화',
    description: '바리케이드 HP +50%',
    category: 'defense',
    effect: { stat: 'barricadeHpBonus', value: 0.5, operation: 'multiply' },
    icon: '🧱',
  },
  {
    id: 'healer_boost',
    name: '치유탑 강화',
    description: '치유탑 회복량 +40%',
    category: 'defense',
    effect: { stat: 'healerAmount', value: 0.4, operation: 'multiply' },
    icon: '💖',
  },
  {
    id: 'damage_reduction',
    name: '피해 감소',
    description: '적 도착 시 HP 피해 -1',
    category: 'defense',
    effect: { stat: 'enemyDamageReduction', value: 1, operation: 'add' },
    icon: '🛡️',
  },
  {
    id: 'last_stand',
    name: '최후의 저항',
    description: 'HP 1일 때 한 번 죽지 않음 (게임당 1회)',
    category: 'defense',
    effect: { stat: 'lastStand', value: 1, operation: 'set' },
    icon: '🔰',
  },
  {
    id: 'slow_aura',
    name: '감속 필드',
    description: '모든 적 기본 이동속도 -10%',
    category: 'defense',
    effect: { stat: 'globalSlowPercent', value: 0.1, operation: 'add' },
    icon: '🐌',
  },

  // ── Special Upgrades (46-50) ─────────────────────────────────

  {
    id: 'double_merge',
    name: '이중 합성',
    description: '합성 시 30% 확률로 2등급 상승',
    category: 'special',
    effect: { stat: 'doubleMergeChance', value: 0.3, operation: 'set' },
    icon: '✨',
  },
  {
    id: 'lucky_tower',
    name: '행운의 타워',
    description: '타워 소환 시 15% 확률로 1등급 높게 소환',
    category: 'special',
    effect: { stat: 'luckySpawnChance', value: 0.15, operation: 'set' },
    icon: '🍀',
  },
  {
    id: 'elemental_mastery',
    name: '원소 마스터리',
    description: '속성 약점 피해 +30% 추가',
    category: 'special',
    effect: { stat: 'elementalWeaknessBonus', value: 0.3, operation: 'add' },
    icon: '🌈',
  },
  {
    id: 'exp_boost',
    name: '경험치 부스트',
    description: '영웅 경험치 획득 +50%',
    category: 'special',
    effect: { stat: 'heroExpBonus', value: 0.5, operation: 'multiply' },
    icon: '📈',
  },
  {
    id: 'synergy_master',
    name: '시너지 마스터',
    description: '같은 종류 타워 3개 이상 시 추가 공격력 +20%',
    category: 'special',
    effect: { stat: 'synergyDamageBonus', value: 0.2, operation: 'set' },
    icon: '🔗',
  },
];

/** Quick lookup by upgrade ID */
export const UPGRADE_MAP: Record<string, UpgradeDefinition> = Object.fromEntries(
  UPGRADE_DEFINITIONS.map((u) => [u.id, u])
);

/** Get upgrades by category */
export function getUpgradesByCategory(category: UpgradeCategory): UpgradeDefinition[] {
  return UPGRADE_DEFINITIONS.filter((u) => u.category === category);
}

/** Pick N random upgrades for roguelike selection (no duplicates) */
export function pickRandomUpgrades(count: number, excludeIds: string[] = []): UpgradeDefinition[] {
  const pool = UPGRADE_DEFINITIONS.filter((u) => !excludeIds.includes(u.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
