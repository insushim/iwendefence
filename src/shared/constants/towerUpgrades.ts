// ============================================================
// WordGuard - Branching Tower Upgrade System (BTD6-style)
// 12 Towers x 3 Paths x 5 Tiers = 180 Upgrades
// Rule: Max one path to tier 5, one path to tier 2, third stays 0
// ============================================================

import { TowerType } from '@/shared/types/game';

// ── Interfaces ─────────────────────────────────────────────

export interface UpgradeEffect {
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
  hpAdd?: number;
  hpMultiply?: number;
  thornsDamageAdd?: number;
  buffPercentAdd?: number;
  investmentReturnAdd?: number;
  luckChanceAdd?: number;
  armorPenAdd?: number;
  burnDamageAdd?: number;
  pierceCountAdd?: number;
  quizPowerAdd?: number;
  quizPowerMultiply?: number;
  globalBuffPercent?: number;
  stunChanceAdd?: number;
  stunDurationAdd?: number;
  freezeDurationAdd?: number;
  shatterDamageAdd?: number;
}

export interface TowerUpgrade {
  id: string;
  towerId: TowerType;
  path: 0 | 1 | 2;
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  nameKr: string;
  description: string;
  descriptionKr: string;
  cost: number;
  icon: string;
  effect: UpgradeEffect;
}

// ── Cost Scaling ───────────────────────────────────────────

const TIER_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 2.5,
  3: 6,
  4: 15,
  5: 40,
};

const BASE_COSTS: Record<TowerType, number> = {
  [TowerType.ARCHER]: 30,
  [TowerType.MAGIC]: 50,
  [TowerType.CANNON]: 60,
  [TowerType.ICE]: 45,
  [TowerType.LIGHTNING]: 55,
  [TowerType.POISON]: 40,
  [TowerType.HEALER]: 50,
  [TowerType.BARRICADE]: 35,
  [TowerType.GOLDMINE]: 65,
  [TowerType.SNIPER]: 70,
  [TowerType.FLAME]: 55,
  [TowerType.WORD]: 60,
};

function tierCost(tower: TowerType, tier: 1 | 2 | 3 | 4 | 5): number {
  return Math.round(BASE_COSTS[tower] * TIER_MULTIPLIERS[tier]);
}

// ── Helper to build upgrade entries ────────────────────────

function u(
  towerId: TowerType,
  path: 0 | 1 | 2,
  tier: 1 | 2 | 3 | 4 | 5,
  name: string,
  nameKr: string,
  description: string,
  descriptionKr: string,
  icon: string,
  effect: UpgradeEffect,
): TowerUpgrade {
  return {
    id: `${towerId}_P${path}_T${tier}`,
    towerId,
    path,
    tier,
    name,
    nameKr,
    description,
    descriptionKr,
    cost: tierCost(towerId, tier),
    icon,
    effect,
  };
}

// ============================================================
// ARCHER - Path 0: Sharpshooter | Path 1: Rapid Fire | Path 2: Volley
// ============================================================

const ARCHER_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Sharpshooter (Damage)
  u(TowerType.ARCHER, 0, 1,
    'Keen Eye', '날카로운 눈',
    '+20% damage', '공격력 +20%',
    '🎯', { damageMultiply: 0.2 }),
  u(TowerType.ARCHER, 0, 2,
    'Piercing Arrow', '관통 화살',
    '+30% damage, +10% crit chance', '공격력 +30%, 치명타 확률 +10%',
    '🏹', { damageMultiply: 0.3, critChanceAdd: 0.1 }),
  u(TowerType.ARCHER, 0, 3,
    'Deadly Precision', '치명적 정밀사격',
    '+50% damage, +25% crit damage', '공격력 +50%, 치명타 피해 +25%',
    '💀', { damageMultiply: 0.5, critDamageAdd: 0.25 }),
  u(TowerType.ARCHER, 0, 4,
    'Headhunter', '헤드헌터',
    '+100% crit damage, crit hits stun 0.5s', '치명타 피해 +100%, 치명타 시 0.5초 기절',
    '👁️', { critDamageAdd: 1.0, specialAbility: 'archer_crit_stun' }),
  u(TowerType.ARCHER, 0, 5,
    'True Sight', '진실의 눈',
    'Attacks ignore all defenses, 500% damage', '모든 방어 무시, 공격력 500%',
    '🌟', { damageMultiply: 5.0, specialAbility: 'archer_true_sight' }),

  // Path 1 - Rapid Fire (Speed)
  u(TowerType.ARCHER, 1, 1,
    'Quick Draw', '빠른 손',
    '+15% attack speed', '공격속도 +15%',
    '💨', { attackSpeedMultiply: 0.15 }),
  u(TowerType.ARCHER, 1, 2,
    'Double Nock', '더블 시위',
    '+25% attack speed', '공격속도 +25%',
    '🏃', { attackSpeedMultiply: 0.25 }),
  u(TowerType.ARCHER, 1, 3,
    'Swift Fingers', '번개손',
    '+40% attack speed, +10% damage', '공격속도 +40%, 공격력 +10%',
    '⚡', { attackSpeedMultiply: 0.4, damageMultiply: 0.1 }),
  u(TowerType.ARCHER, 1, 4,
    'Arrow Storm', '화살 폭풍',
    '+75% attack speed, fires 2 arrows', '공격속도 +75%, 화살 2발 발사',
    '🌪️', { attackSpeedMultiply: 0.75, specialAbility: 'archer_double_shot' }),
  u(TowerType.ARCHER, 1, 5,
    'Rain of Arrows', '화살비',
    'Fires 5 arrows per attack, +100% speed', '공격당 화살 5발, 공격속도 +100%',
    '🌧️', { attackSpeedMultiply: 1.0, specialAbility: 'archer_rain' }),

  // Path 2 - Volley (Multi-target)
  u(TowerType.ARCHER, 2, 1,
    'Wide Aim', '넓은 조준',
    '+15% range', '사거리 +15%',
    '🔭', { rangeMultiply: 0.15 }),
  u(TowerType.ARCHER, 2, 2,
    'Scatter Shot', '산탄 화살',
    'Hits 2 enemies per shot', '공격당 적 2체 타격',
    '✨', { specialAbility: 'archer_scatter_2' }),
  u(TowerType.ARCHER, 2, 3,
    'Barrage', '일제 사격',
    'Hits 4 enemies, +20% range', '적 4체 타격, 사거리 +20%',
    '💥', { rangeMultiply: 0.2, specialAbility: 'archer_scatter_4' }),
  u(TowerType.ARCHER, 2, 4,
    'Shrapnel Tips', '파편 화살촉',
    'Arrows explode on hit (AoE 30)', '화살 적중 시 폭발 (범위 30)',
    '💣', { aoeRadiusAdd: 30, specialAbility: 'archer_shrapnel' }),
  u(TowerType.ARCHER, 2, 5,
    'Sky Volley', '하늘의 화살',
    'Hits ALL enemies in range every 3s', '3초마다 범위 내 모든 적 타격',
    '☁️', { specialAbility: 'archer_sky_volley' }),
];

// ============================================================
// MAGIC - Path 0: Archmage | Path 1: Hex Mage | Path 2: Storm Mage
// ============================================================

const MAGIC_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Archmage (Raw Power)
  u(TowerType.MAGIC, 0, 1,
    'Focused Mind', '집중의 정신',
    '+25% damage', '공격력 +25%',
    '🔮', { damageMultiply: 0.25 }),
  u(TowerType.MAGIC, 0, 2,
    'Arcane Bolt', '비전 화살',
    '+40% damage, hits bypass shields', '공격력 +40%, 방패 관통',
    '💎', { damageMultiply: 0.4, specialAbility: 'magic_shield_bypass' }),
  u(TowerType.MAGIC, 0, 3,
    'Mana Surge', '마나 폭주',
    '+80% damage, +15% crit chance', '공격력 +80%, 치명타 확률 +15%',
    '🌀', { damageMultiply: 0.8, critChanceAdd: 0.15 }),
  u(TowerType.MAGIC, 0, 4,
    'Arcane Mastery', '비전 마스터',
    '+150% damage, every 3rd hit does 3x', '공격력 +150%, 3번째 타격마다 3배 피해',
    '⭐', { damageMultiply: 1.5, specialAbility: 'magic_triple_hit' }),
  u(TowerType.MAGIC, 0, 5,
    'Arcane Devastation', '비전 대파괴',
    'Every 5th attack is a screen nuke dealing 10x damage', '5번째 공격마다 화면 전체 10배 피해',
    '🌠', { specialAbility: 'magic_screen_nuke' }),

  // Path 1 - Hex Mage (Debuff)
  u(TowerType.MAGIC, 1, 1,
    'Hex Bolt', '저주의 화살',
    'Attacks slow enemies 10% for 2s', '공격 시 적 10% 감속 2초',
    '🟣', { slowPercentAdd: 10 }),
  u(TowerType.MAGIC, 1, 2,
    'Weakening Curse', '약화 저주',
    'Attacked enemies take +15% damage from all', '피격된 적은 모든 피해 +15% 받음',
    '😈', { specialAbility: 'magic_weaken_15' }),
  u(TowerType.MAGIC, 1, 3,
    'Soul Drain', '영혼 흡수',
    'Kills restore 2 gold, slow +20%', '처치 시 골드 2 회복, 감속 +20%',
    '👻', { slowPercentAdd: 20, specialAbility: 'magic_soul_drain' }),
  u(TowerType.MAGIC, 1, 4,
    'Doom Mark', '파멸의 표식',
    'Marked enemies take 2x damage from all towers', '표식된 적은 모든 타워에게 2배 피해',
    '🔴', { specialAbility: 'magic_doom_mark' }),
  u(TowerType.MAGIC, 1, 5,
    'Grand Hexmaster', '대주술사',
    'All enemies on screen permanently slowed 30%, take +50% damage', '화면 내 모든 적 영구 30% 감속, 피해 +50% 증가',
    '🦇', { specialAbility: 'magic_grand_hex' }),

  // Path 2 - Storm Mage (AoE)
  u(TowerType.MAGIC, 2, 1,
    'Spark Blast', '스파크 폭발',
    '+15 AoE radius', 'AoE 범위 +15',
    '💫', { aoeRadiusAdd: 15 }),
  u(TowerType.MAGIC, 2, 2,
    'Chain Spark', '연쇄 스파크',
    'Attacks chain to 2 nearby enemies', '공격이 주변 적 2체에게 연쇄',
    '⚡', { chainCountAdd: 2 }),
  u(TowerType.MAGIC, 2, 3,
    'Thunder Cloud', '천둥구름',
    'AoE +30, chain +2, +30% damage', 'AoE +30, 연쇄 +2, 공격력 +30%',
    '🌩️', { aoeRadiusAdd: 30, chainCountAdd: 2, damageMultiply: 0.3 }),
  u(TowerType.MAGIC, 2, 4,
    'Tempest', '폭풍우',
    'Creates a storm zone that damages enemies over time', '지속 피해를 주는 폭풍 지대 생성',
    '🌊', { specialAbility: 'magic_tempest_zone', aoeRadiusAdd: 20 }),
  u(TowerType.MAGIC, 2, 5,
    'Cataclysm', '대격변',
    'Permanent storm around tower, 3x AoE, hits all in range every 0.5s', '타워 주변 영구 폭풍, AoE 3배, 0.5초마다 범위 내 전체 타격',
    '🌋', { specialAbility: 'magic_cataclysm' }),
];

// ============================================================
// CANNON - Path 0: Bombardier | Path 1: Siege | Path 2: Gatling
// ============================================================

const CANNON_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Bombardier (Explosion)
  u(TowerType.CANNON, 0, 1,
    'Bigger Shells', '대형 포탄',
    '+20% AoE radius, +15% damage', 'AoE 범위 +20%, 공격력 +15%',
    '💣', { aoeRadiusAdd: 20, damageMultiply: 0.15 }),
  u(TowerType.CANNON, 0, 2,
    'Blast Expert', '폭파 전문가',
    '+30% AoE radius, +25% damage', 'AoE 범위 +30%, 공격력 +25%',
    '🔥', { aoeRadiusAdd: 30, damageMultiply: 0.25 }),
  u(TowerType.CANNON, 0, 3,
    'Cluster Bomb', '확산탄',
    'Explosions spawn 3 mini-blasts', '폭발 후 소형 폭발 3개 추가',
    '🎆', { specialAbility: 'cannon_cluster', damageMultiply: 0.3 }),
  u(TowerType.CANNON, 0, 4,
    'Napalm Shell', '네이팔름탄',
    'Explosions leave burning ground for 3s', '폭발 지역 3초간 화염 지대 생성',
    '☄️', { specialAbility: 'cannon_napalm', burnDamageAdd: 15 }),
  u(TowerType.CANNON, 0, 5,
    'Carpet Bomb', '융단폭격',
    'Fires 3 shells simultaneously, +200% damage', '포탄 3발 동시 발사, 공격력 +200%',
    '🛩️', { damageMultiply: 2.0, specialAbility: 'cannon_carpet_bomb' }),

  // Path 1 - Siege (Armor Penetration)
  u(TowerType.CANNON, 1, 1,
    'Hardened Tips', '강화 탄두',
    '+20% armor penetration', '방어 관통 +20%',
    '🔩', { armorPenAdd: 0.2 }),
  u(TowerType.CANNON, 1, 2,
    'Tungsten Core', '텅스텐 탄심',
    '+40% armor pen, +20% damage', '방어 관통 +40%, 공격력 +20%',
    '🪨', { armorPenAdd: 0.4, damageMultiply: 0.2 }),
  u(TowerType.CANNON, 1, 3,
    'Siege Breaker', '공성 파괴자',
    '+30% damage to bosses, full armor pen', '보스에게 +30% 피해, 방어력 완전 관통',
    '🏰', { armorPenAdd: 1.0, specialAbility: 'cannon_boss_damage_30' }),
  u(TowerType.CANNON, 1, 4,
    'Demolisher', '파괴자',
    '+100% damage to bosses, stuns bosses 1s', '보스에게 +100% 피해, 보스 1초 기절',
    '🔨', { specialAbility: 'cannon_boss_stun' }),
  u(TowerType.CANNON, 1, 5,
    'World Breaker', '세계 파괴자',
    '+300% damage to bosses, removes boss shields and abilities', '보스에게 +300% 피해, 보스 방패/능력 제거',
    '🌍', { specialAbility: 'cannon_world_breaker' }),

  // Path 2 - Gatling (Fire Rate)
  u(TowerType.CANNON, 2, 1,
    'Faster Loader', '빠른 장전',
    '+20% attack speed', '공격속도 +20%',
    '⚙️', { attackSpeedMultiply: 0.2 }),
  u(TowerType.CANNON, 2, 2,
    'Auto Loader', '자동 장전기',
    '+40% attack speed', '공격속도 +40%',
    '🔧', { attackSpeedMultiply: 0.4 }),
  u(TowerType.CANNON, 2, 3,
    'Machine Gun', '기관총',
    '+80% attack speed, -30% AoE (focused fire)', '공격속도 +80%, AoE -30% (집중 사격)',
    '🔫', { attackSpeedMultiply: 0.8, specialAbility: 'cannon_focused_fire' }),
  u(TowerType.CANNON, 2, 4,
    'Minigun', '미니건',
    '+150% attack speed, attack speed ramps up over time', '공격속도 +150%, 시간에 따라 공격속도 증가',
    '🎯', { attackSpeedMultiply: 1.5, specialAbility: 'cannon_ramp_speed' }),
  u(TowerType.CANNON, 2, 5,
    'Bullet Hell', '탄막 지옥',
    'Fires continuously at max speed, hits everything in range', '최대 속도 연속 발사, 범위 내 전체 타격',
    '🌀', { specialAbility: 'cannon_bullet_hell' }),
];

// ============================================================
// ICE - Path 0: Absolute Zero | Path 1: Cryo Shatter | Path 2: Blizzard
// ============================================================

const ICE_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Absolute Zero (Freeze)
  u(TowerType.ICE, 0, 1,
    'Deeper Chill', '깊은 냉기',
    'Freeze duration +0.5s', '빙결 시간 +0.5초',
    '❄️', { freezeDurationAdd: 0.5 }),
  u(TowerType.ICE, 0, 2,
    'Permafrost', '영구 동토',
    'Freeze duration +1s, frozen enemies take +10% damage', '빙결 +1초, 빙결된 적 피해 +10%',
    '🧊', { freezeDurationAdd: 1.0, specialAbility: 'ice_frozen_vuln_10' }),
  u(TowerType.ICE, 0, 3,
    'Deep Freeze', '극한 냉동',
    'Freeze +1.5s, frozen enemies take +25% damage', '빙결 +1.5초, 빙결된 적 피해 +25%',
    '💠', { freezeDurationAdd: 1.5, specialAbility: 'ice_frozen_vuln_25' }),
  u(TowerType.ICE, 0, 4,
    'Cryogenic Lock', '냉동 잠금',
    'Freeze +2s, frozen enemies cannot be unfrozen by fire', '빙결 +2초, 화염으로 해동 불가',
    '🔒', { freezeDurationAdd: 2.0, specialAbility: 'ice_cryo_lock' }),
  u(TowerType.ICE, 0, 5,
    'Absolute Zero', '절대 영도',
    'Every 10s, freezes ALL enemies in range for 3s, frozen take 2x damage', '10초마다 범위 내 전체 3초 빙결, 빙결 시 2배 피해',
    '🌬️', { specialAbility: 'ice_absolute_zero' }),

  // Path 1 - Cryo Shatter
  u(TowerType.ICE, 1, 1,
    'Ice Spike', '얼음 가시',
    '+15 damage to frozen targets', '빙결된 적에게 피해 +15',
    '🔱', { damageAdd: 15 }),
  u(TowerType.ICE, 1, 2,
    'Frost Bite', '동상',
    '+30% damage, slowed enemies take extra hit', '공격력 +30%, 감속 적에게 추가 타격',
    '🦷', { damageMultiply: 0.3, specialAbility: 'ice_frost_bite' }),
  u(TowerType.ICE, 1, 3,
    'Shatter Strike', '분쇄 타격',
    'Frozen enemies shatter for AoE damage on kill', '빙결된 적 처치 시 AoE 분쇄 피해',
    '💎', { shatterDamageAdd: 50, specialAbility: 'ice_shatter' }),
  u(TowerType.ICE, 1, 4,
    'Crystal Storm', '수정 폭풍',
    'Shatter damage +100, creates ice shards hitting nearby', '분쇄 피해 +100, 주변에 얼음 파편 발사',
    '🌟', { shatterDamageAdd: 100, specialAbility: 'ice_crystal_storm' }),
  u(TowerType.ICE, 1, 5,
    'Glacial Executioner', '빙하의 처형자',
    'Frozen enemies below 30% HP instantly die, shattering for massive AoE', 'HP 30% 이하 빙결 적 즉사, 대규모 AoE 분쇄',
    '⚰️', { specialAbility: 'ice_glacial_execute' }),

  // Path 2 - Blizzard (Area)
  u(TowerType.ICE, 2, 1,
    'Cold Aura', '냉기 오라',
    '+20% slow range', '감속 범위 +20%',
    '🌐', { rangeMultiply: 0.2 }),
  u(TowerType.ICE, 2, 2,
    'Frost Field', '서리 필드',
    '+30% range, all enemies in range slowed 15%', '범위 +30%, 범위 내 모든 적 15% 감속',
    '🏔️', { rangeMultiply: 0.3, slowPercentAdd: 15 }),
  u(TowerType.ICE, 2, 3,
    'Snowstorm', '눈보라',
    '+20% range, slow +25%, damage +20%', '범위 +20%, 감속 +25%, 공격력 +20%',
    '🌨️', { rangeMultiply: 0.2, slowPercentAdd: 25, damageMultiply: 0.2 }),
  u(TowerType.ICE, 2, 4,
    'Hailstorm', '우박 폭풍',
    'Rains hail in range dealing damage over time', '범위 내 지속 피해 우박',
    '🧿', { specialAbility: 'ice_hailstorm', dotDamageAdd: 8 }),
  u(TowerType.ICE, 2, 5,
    'Eternal Winter', '영원한 겨울',
    'Massive range, all enemies on screen slowed 40%, constant AoE ice damage', '초대형 범위, 화면 전체 적 40% 감속, 지속 AoE 냉기 피해',
    '🏳️', { specialAbility: 'ice_eternal_winter' }),
];

// ============================================================
// LIGHTNING - Path 0: Tesla | Path 1: Thunderlord | Path 2: Storm
// ============================================================

const LIGHTNING_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Tesla (Chain)
  u(TowerType.LIGHTNING, 0, 1,
    'Conduction', '전도체',
    '+1 chain target', '연쇄 대상 +1',
    '⚡', { chainCountAdd: 1 }),
  u(TowerType.LIGHTNING, 0, 2,
    'Arc Surge', '아크 서지',
    '+2 chain, chain damage reduced less', '연쇄 +2, 연쇄 피해 감소율 줄어듦',
    '🔗', { chainCountAdd: 2, specialAbility: 'lightning_less_decay' }),
  u(TowerType.LIGHTNING, 0, 3,
    'Lightning Rod', '피뢰침',
    '+3 chain, no damage decay on chains', '연쇄 +3, 연쇄 피해 감소 없음',
    '📡', { chainCountAdd: 3, specialAbility: 'lightning_no_decay' }),
  u(TowerType.LIGHTNING, 0, 4,
    'Plasma Field', '플라즈마 필드',
    'Chains can hit same target twice, +50% damage', '연쇄가 같은 적 2번 타격 가능, 공격력 +50%',
    '🟡', { damageMultiply: 0.5, specialAbility: 'lightning_double_chain' }),
  u(TowerType.LIGHTNING, 0, 5,
    'Tesla Coil', '테슬라 코일',
    'Continuous lightning to ALL enemies in range, +200% damage', '범위 내 모든 적에게 지속 번개, 공격력 +200%',
    '🌐', { damageMultiply: 2.0, specialAbility: 'lightning_tesla_coil' }),

  // Path 1 - Thunderlord (Stun)
  u(TowerType.LIGHTNING, 1, 1,
    'Static Shock', '정전기 충격',
    '15% stun chance for 0.3s', '15% 확률로 0.3초 기절',
    '😵', { stunChanceAdd: 0.15, stunDurationAdd: 0.3 }),
  u(TowerType.LIGHTNING, 1, 2,
    'Paralyze', '마비',
    '+15% stun chance, stun +0.3s', '기절 확률 +15%, 기절 +0.3초',
    '💫', { stunChanceAdd: 0.15, stunDurationAdd: 0.3 }),
  u(TowerType.LIGHTNING, 1, 3,
    'Thunder Clap', '천둥벽력',
    '+20% stun, stun +0.5s, stunned take +20% damage', '기절 +20%, 기절시간 +0.5초, 기절 적 피해 +20%',
    '🔔', { stunChanceAdd: 0.2, stunDurationAdd: 0.5, specialAbility: 'lightning_stun_vuln' }),
  u(TowerType.LIGHTNING, 1, 4,
    'Judgment', '심판의 번개',
    '75% stun, stun 1.5s, stunned enemies take 2x', '75% 기절, 1.5초 기절, 기절 적 2배 피해',
    '⚖️', { stunChanceAdd: 0.25, stunDurationAdd: 0.4, specialAbility: 'lightning_judgment' }),
  u(TowerType.LIGHTNING, 1, 5,
    'Wrath of Thor', '토르의 분노',
    'Every 8s, massive lightning bolt stuns all enemies for 2s and deals 5x damage', '8초마다 대형 번개, 모든 적 2초 기절 + 5배 피해',
    '🔱', { specialAbility: 'lightning_wrath_of_thor' }),

  // Path 2 - Storm (Speed)
  u(TowerType.LIGHTNING, 2, 1,
    'Quick Zap', '빠른 번개',
    '+20% attack speed', '공격속도 +20%',
    '💨', { attackSpeedMultiply: 0.2 }),
  u(TowerType.LIGHTNING, 2, 2,
    'Overcharge', '과충전',
    '+35% attack speed, +10% damage', '공격속도 +35%, 공격력 +10%',
    '🔋', { attackSpeedMultiply: 0.35, damageMultiply: 0.1 }),
  u(TowerType.LIGHTNING, 2, 3,
    'Surge Capacitor', '서지 축전기',
    '+60% attack speed, +20% range', '공격속도 +60%, 사거리 +20%',
    '🔌', { attackSpeedMultiply: 0.6, rangeMultiply: 0.2 }),
  u(TowerType.LIGHTNING, 2, 4,
    'Ball Lightning', '구형 번개',
    'Spawns homing ball lightning every 3s', '3초마다 유도 구형 번개 발사',
    '🟣', { specialAbility: 'lightning_ball', attackSpeedMultiply: 0.3 }),
  u(TowerType.LIGHTNING, 2, 5,
    'Supercell', '슈퍼셀',
    'Attack speed 3x, generates lightning orbs that orbit and damage enemies', '공격속도 3배, 궤도 번개구 생성으로 적 지속 피해',
    '🌀', { specialAbility: 'lightning_supercell' }),
];

// ============================================================
// POISON - Path 0: Plague | Path 1: Miasma | Path 2: Venom
// ============================================================

const POISON_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Plague (DoT)
  u(TowerType.POISON, 0, 1,
    'Potent Toxin', '강력한 독소',
    '+5 poison damage per second', '초당 독 피해 +5',
    '☠️', { dotDamageAdd: 5 }),
  u(TowerType.POISON, 0, 2,
    'Corrosive Acid', '부식성 산',
    '+10 DoT, poison reduces armor 10%', '초당 독 +10, 독 적중 시 방어력 10% 감소',
    '🧪', { dotDamageAdd: 10, specialAbility: 'poison_armor_reduce_10' }),
  u(TowerType.POISON, 0, 3,
    'Lethal Dose', '치사량',
    '+20 DoT, poison duration +3s', '초당 독 +20, 독 지속시간 +3초',
    '💀', { dotDamageAdd: 20, specialAbility: 'poison_extended_3s' }),
  u(TowerType.POISON, 0, 4,
    'Necrosis', '괴사',
    '+40 DoT, poisoned enemies cannot heal', '초당 독 +40, 독 걸린 적 회복 불가',
    '🖤', { dotDamageAdd: 40, specialAbility: 'poison_anti_heal' }),
  u(TowerType.POISON, 0, 5,
    'Black Death', '흑사병',
    'Poison deals 5% max HP per second, spreads to nearby on kill', '초당 최대HP 5% 독 피해, 처치 시 주변에 독 전파',
    '🕷️', { specialAbility: 'poison_black_death' }),

  // Path 1 - Miasma (AoE)
  u(TowerType.POISON, 1, 1,
    'Toxic Splash', '독성 튀김',
    '+15 AoE radius on poison', '독 AoE 범위 +15',
    '💧', { aoeRadiusAdd: 15 }),
  u(TowerType.POISON, 1, 2,
    'Poison Cloud', '독구름',
    'Creates poison cloud lasting 2s, AoE +20', '2초간 유지되는 독구름 생성, AoE +20',
    '🌫️', { aoeRadiusAdd: 20, specialAbility: 'poison_cloud_2s' }),
  u(TowerType.POISON, 1, 3,
    'Noxious Zone', '독성 지대',
    'Poison cloud lasts 4s, +25 AoE', '독구름 4초 유지, AoE +25',
    '🟢', { aoeRadiusAdd: 25, specialAbility: 'poison_cloud_4s' }),
  u(TowerType.POISON, 1, 4,
    'Toxic Wasteland', '독성 황무지',
    'Permanent poison zone around tower, AoE +40', '타워 주변 영구 독성 지대, AoE +40',
    '🏜️', { aoeRadiusAdd: 40, specialAbility: 'poison_wasteland' }),
  u(TowerType.POISON, 1, 5,
    'Pandemic', '팬데믹',
    'Every poisoned enemy spreads poison to all nearby, entire path becomes toxic', '독 걸린 적이 주변에 독 전파, 경로 전체 독성화',
    '🦠', { specialAbility: 'poison_pandemic' }),

  // Path 2 - Venom (Debuff)
  u(TowerType.POISON, 2, 1,
    'Numbing Venom', '마비 독',
    'Poisoned enemies slowed 10%', '독 적중 적 10% 감속',
    '🐍', { slowPercentAdd: 10 }),
  u(TowerType.POISON, 2, 2,
    'Crippling Poison', '쇠약 독',
    'Slow +15%, poisoned enemies deal -15% damage', '감속 +15%, 독 적 공격력 -15%',
    '🕸️', { slowPercentAdd: 15, specialAbility: 'poison_weaken_15' }),
  u(TowerType.POISON, 2, 3,
    'Hallucinogen', '환각독',
    'Slow +20%, poisoned enemies may attack each other', '감속 +20%, 독 적이 서로 공격할 수 있음',
    '🍄', { slowPercentAdd: 20, specialAbility: 'poison_confuse' }),
  u(TowerType.POISON, 2, 4,
    'Nerve Agent', '신경 작용제',
    'Slow +30%, poisoned enemies stop abilities', '감속 +30%, 독 적 특수능력 차단',
    '🧬', { slowPercentAdd: 30, specialAbility: 'poison_silence' }),
  u(TowerType.POISON, 2, 5,
    'Basilisk Venom', '바실리스크 독',
    'Poisoned enemies petrify after 5s (permanent stun until dead)', '독 5초 후 석화 (사망까지 영구 기절)',
    '🗿', { specialAbility: 'poison_petrify' }),
];

// ============================================================
// HEALER - Path 0: Saint | Path 1: Paladin | Path 2: Oracle
// ============================================================

const HEALER_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Saint (Heal Power)
  u(TowerType.HEALER, 0, 1,
    'Gentle Touch', '부드러운 손길',
    '+3 heal per tick', '틱당 치유량 +3',
    '💚', { healAmountAdd: 3 }),
  u(TowerType.HEALER, 0, 2,
    'Healing Light', '치유의 빛',
    '+5 heal, heals 2 towers at once', '치유 +5, 동시에 타워 2개 치유',
    '✨', { healAmountAdd: 5, specialAbility: 'healer_multi_2' }),
  u(TowerType.HEALER, 0, 3,
    'Sacred Spring', '성스러운 샘',
    '+10 heal, heals 3 towers, restores barricades', '치유 +10, 타워 3개, 바리케이드 수리',
    '⛲', { healAmountAdd: 10, specialAbility: 'healer_repair_barricade' }),
  u(TowerType.HEALER, 0, 4,
    'Divine Grace', '신의 은총',
    '+20 heal, healed towers get +15% damage for 5s', '치유 +20, 치유받은 타워 5초간 공격력 +15%',
    '👼', { healAmountAdd: 20, specialAbility: 'healer_damage_buff' }),
  u(TowerType.HEALER, 0, 5,
    'Miracle', '기적',
    'Every 15s fully heals all towers and grants 3s invincibility', '15초마다 모든 타워 완전 회복 + 3초 무적',
    '🌈', { specialAbility: 'healer_miracle' }),

  // Path 1 - Paladin (Buff)
  u(TowerType.HEALER, 1, 1,
    'Battle Cry', '함성',
    'Nearby towers +10% damage', '주변 타워 공격력 +10%',
    '📯', { buffPercentAdd: 10 }),
  u(TowerType.HEALER, 1, 2,
    'Inspiring Aura', '영감의 오라',
    'Nearby towers +15% damage, +10% speed', '주변 타워 공격력 +15%, 공격속도 +10%',
    '🌟', { buffPercentAdd: 15, specialAbility: 'healer_speed_buff_10' }),
  u(TowerType.HEALER, 1, 3,
    'War Banner', '전쟁의 깃발',
    'Buff range +30%, +20% damage buff, +10% crit', '버프 범위 +30%, 공격력 +20%, 치명타 +10%',
    '🚩', { buffPercentAdd: 20, rangeMultiply: 0.3, specialAbility: 'healer_crit_buff' }),
  u(TowerType.HEALER, 1, 4,
    'Champion Aura', '챔피언 오라',
    '+30% damage, +20% speed, +15% crit to all nearby', '주변 전체: 공격력 +30%, 속도 +20%, 치명타 +15%',
    '🏆', { buffPercentAdd: 30, specialAbility: 'healer_champion_aura' }),
  u(TowerType.HEALER, 1, 5,
    'Avatar of War', '전쟁의 화신',
    'All towers on map get +50% damage, +30% speed, +20% crit', '맵 전체 타워: 공격력 +50%, 속도 +30%, 치명타 +20%',
    '⚔️', { specialAbility: 'healer_avatar_of_war' }),

  // Path 2 - Oracle (Cleanse/Support)
  u(TowerType.HEALER, 2, 1,
    'Purify', '정화',
    'Removes 1 debuff from nearby towers per tick', '틱마다 주변 타워 디버프 1개 제거',
    '🕊️', { specialAbility: 'healer_cleanse_1' }),
  u(TowerType.HEALER, 2, 2,
    'Ward', '결계',
    'Nearby towers take 15% less damage', '주변 타워 피해 15% 감소',
    '🛡️', { specialAbility: 'healer_ward_15' }),
  u(TowerType.HEALER, 2, 3,
    'Foresight', '예지력',
    '+25% range, reveals invisible enemies for all towers', '범위 +25%, 모든 타워가 투명 적 감지',
    '🔮', { rangeMultiply: 0.25, specialAbility: 'healer_reveal_invis' }),
  u(TowerType.HEALER, 2, 4,
    'Spirit Link', '영혼 연결',
    'Links nearby towers: damage to one heals others', '주변 타워 연결: 피해받으면 다른 타워 회복',
    '🔗', { specialAbility: 'healer_spirit_link' }),
  u(TowerType.HEALER, 2, 5,
    'Divine Oracle', '신탁',
    'Grants 10s preview of next wave, all towers get perfect targeting and +20% to all stats', '다음 웨이브 10초 미리보기, 전 타워 완벽 타겟팅 + 전 스탯 +20%',
    '🏛️', { specialAbility: 'healer_divine_oracle' }),
];

// ============================================================
// BARRICADE - Path 0: Fortress | Path 1: Spikes | Path 2: Tar
// ============================================================

const BARRICADE_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Fortress (HP)
  u(TowerType.BARRICADE, 0, 1,
    'Reinforced', '보강',
    '+30% HP', 'HP +30%',
    '🧱', { hpMultiply: 0.3 }),
  u(TowerType.BARRICADE, 0, 2,
    'Iron Wall', '철벽',
    '+60% HP, -10% damage taken', 'HP +60%, 받는 피해 -10%',
    '🪨', { hpMultiply: 0.6, specialAbility: 'barricade_damage_reduce_10' }),
  u(TowerType.BARRICADE, 0, 3,
    'Steel Fortress', '강철 요새',
    '+100% HP, -20% damage taken, self-repair', 'HP +100%, 받는 피해 -20%, 자동 수리',
    '🏰', { hpMultiply: 1.0, specialAbility: 'barricade_self_repair' }),
  u(TowerType.BARRICADE, 0, 4,
    'Titan Wall', '타이탄 장벽',
    '+200% HP, -30% damage, blocks flying enemies', 'HP +200%, 피해 -30%, 비행 적도 차단',
    '🗿', { hpMultiply: 2.0, specialAbility: 'barricade_block_flying' }),
  u(TowerType.BARRICADE, 0, 5,
    'Eternal Bastion', '영원한 성채',
    'Indestructible for 10s every 30s, +500% HP, reflects 20% damage', '30초마다 10초 파괴불가, HP +500%, 피해 20% 반사',
    '🏯', { hpMultiply: 5.0, specialAbility: 'barricade_eternal' }),

  // Path 1 - Spikes (Thorns)
  u(TowerType.BARRICADE, 1, 1,
    'Sharp Spikes', '날카로운 가시',
    '+5 thorns damage to attackers', '공격한 적에게 반사 피해 +5',
    '🦔', { thornsDamageAdd: 5 }),
  u(TowerType.BARRICADE, 1, 2,
    'Razor Wire', '면도날 철조망',
    '+10 thorns, enemies slowed when hitting', '반사 +10, 접촉 적 감속',
    '🪡', { thornsDamageAdd: 10, specialAbility: 'barricade_thorn_slow' }),
  u(TowerType.BARRICADE, 1, 3,
    'Spiked Armor', '가시 갑옷',
    '+20 thorns, +25% HP', '반사 +20, HP +25%',
    '🛡️', { thornsDamageAdd: 20, hpMultiply: 0.25 }),
  u(TowerType.BARRICADE, 1, 4,
    'Punishment Wall', '징벌의 벽',
    '+40 thorns, thorns apply bleed (DoT 5/s)', '반사 +40, 반사 시 출혈 (초당 5 피해)',
    '🩸', { thornsDamageAdd: 40, specialAbility: 'barricade_bleed' }),
  u(TowerType.BARRICADE, 1, 5,
    'Iron Maiden', '철의 처녀',
    'Thorns deal 100% of incoming damage back, kills grant gold', '받은 피해 100% 반사, 반사로 처치 시 골드 획득',
    '⚰️', { specialAbility: 'barricade_iron_maiden' }),

  // Path 2 - Tar (Slow)
  u(TowerType.BARRICADE, 2, 1,
    'Sticky Surface', '끈적한 표면',
    'Enemies near barricade slowed 15%', '근처 적 15% 감속',
    '🍯', { slowPercentAdd: 15 }),
  u(TowerType.BARRICADE, 2, 2,
    'Tar Pit', '타르 구덩이',
    'Slow +25%, slow area +20%', '감속 +25%, 감속 범위 +20%',
    '🕳️', { slowPercentAdd: 25, rangeMultiply: 0.2 }),
  u(TowerType.BARRICADE, 2, 3,
    'Quicksand', '늪',
    'Slow +35%, enemies stuck for 0.5s on contact', '감속 +35%, 접촉 시 0.5초 정지',
    '🏝️', { slowPercentAdd: 35, specialAbility: 'barricade_root_05' }),
  u(TowerType.BARRICADE, 2, 4,
    'Gravity Well', '중력장',
    'Slow +50%, pulls enemies toward barricade', '감속 +50%, 적을 바리케이드 쪽으로 끌어당김',
    '🌀', { slowPercentAdd: 50, specialAbility: 'barricade_gravity_pull' }),
  u(TowerType.BARRICADE, 2, 5,
    'Event Horizon', '사건의 지평선',
    'Enemies in range nearly stopped (90% slow), cannot use abilities, dragged in', '범위 내 적 90% 감속, 능력 사용 불가, 강제 끌어당김',
    '🕳️', { specialAbility: 'barricade_event_horizon' }),
];

// ============================================================
// GOLDMINE - Path 0: Bank | Path 1: Market | Path 2: Lucky Mine
// ============================================================

const GOLDMINE_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Bank (Production)
  u(TowerType.GOLDMINE, 0, 1,
    'Extra Miners', '추가 광부',
    '+3 gold per production cycle', '생산 주기당 골드 +3',
    '⛏️', { goldProduceAdd: 3 }),
  u(TowerType.GOLDMINE, 0, 2,
    'Deeper Shaft', '더 깊은 갱도',
    '+6 gold per cycle, -10% cycle time', '주기당 +6 골드, 생산 시간 -10%',
    '🕳️', { goldProduceAdd: 6, specialAbility: 'goldmine_faster_10' }),
  u(TowerType.GOLDMINE, 0, 3,
    'Gold Refinery', '금 정련소',
    '+12 gold per cycle, -20% cycle time', '주기당 +12 골드, 생산 시간 -20%',
    '🏭', { goldProduceAdd: 12, specialAbility: 'goldmine_faster_20' }),
  u(TowerType.GOLDMINE, 0, 4,
    'Treasure Vault', '보물 금고',
    '+20 gold per cycle, stores up to 500 gold (collect manually for bonus)', '주기당 +20 골드, 최대 500 골드 저장 (수동 수거 시 보너스)',
    '🏦', { goldProduceAdd: 20, specialAbility: 'goldmine_vault' }),
  u(TowerType.GOLDMINE, 0, 5,
    'Midas Touch', '미다스의 손',
    '+50 gold per cycle, every 5th cycle produces 5x, nearby killed enemies drop 2x gold', '주기당 +50 골드, 매 5주기 5배 생산, 근처 처치 적 골드 2배',
    '👑', { goldProduceAdd: 50, specialAbility: 'goldmine_midas' }),

  // Path 1 - Market (Investment)
  u(TowerType.GOLDMINE, 1, 1,
    'Trade Post', '교역소',
    'Wave end: earn 3% interest on stored gold', '웨이브 종료 시 저장 골드 3% 이자',
    '🏪', { investmentReturnAdd: 0.03 }),
  u(TowerType.GOLDMINE, 1, 2,
    'Merchant Guild', '상인 길드',
    'Interest +5%, tower sell price +10%', '이자 +5%, 타워 판매가 +10%',
    '🤝', { investmentReturnAdd: 0.05, specialAbility: 'goldmine_sell_bonus_10' }),
  u(TowerType.GOLDMINE, 1, 3,
    'Stock Exchange', '증권 거래소',
    'Interest +8%, upgrade costs -10%', '이자 +8%, 업그레이드 비용 -10%',
    '📈', { investmentReturnAdd: 0.08, specialAbility: 'goldmine_upgrade_discount' }),
  u(TowerType.GOLDMINE, 1, 4,
    'Central Bank', '중앙 은행',
    'Interest +12%, all towers nearby cost -20% to upgrade', '이자 +12%, 주변 타워 업그레이드 비용 -20%',
    '🏛️', { investmentReturnAdd: 0.12, specialAbility: 'goldmine_area_discount' }),
  u(TowerType.GOLDMINE, 1, 5,
    'World Treasury', '세계 금고',
    'Interest +20%, start each wave with bonus gold equal to wave number x10', '이자 +20%, 매 웨이브 시작 시 (웨이브 x 10) 보너스 골드',
    '💎', { investmentReturnAdd: 0.2, specialAbility: 'goldmine_world_treasury' }),

  // Path 2 - Lucky Mine
  u(TowerType.GOLDMINE, 2, 1,
    'Lucky Nugget', '행운의 금덩이',
    '10% chance to produce 3x gold', '10% 확률로 3배 골드 생산',
    '🍀', { luckChanceAdd: 0.1 }),
  u(TowerType.GOLDMINE, 2, 2,
    'Fortune Cookie', '행운의 쿠키',
    'Luck +15%, sometimes drops diamonds', '행운 +15%, 가끔 다이아몬드 드롭',
    '🥠', { luckChanceAdd: 0.15, specialAbility: 'goldmine_diamond_drop' }),
  u(TowerType.GOLDMINE, 2, 3,
    'Wishing Well', '소원의 우물',
    'Luck +20%, 5% chance for 10x gold jackpot', '행운 +20%, 5% 확률 10배 잭팟',
    '⛲', { luckChanceAdd: 0.2, specialAbility: 'goldmine_jackpot' }),
  u(TowerType.GOLDMINE, 2, 4,
    'Leprechaun', '레프리콘',
    'Luck +25%, gold production attracts gold from killed enemies', '행운 +25%, 처치된 적 골드를 자동 흡수',
    '🧝', { luckChanceAdd: 0.25, specialAbility: 'goldmine_gold_magnet' }),
  u(TowerType.GOLDMINE, 2, 5,
    'Pot of Gold', '황금 항아리',
    'Every 30s, a rainbow appears granting massive random bonus (gold, buffs, or free upgrade)', '30초마다 무지개 등장: 대량 골드/버프/무료 업그레이드 랜덤',
    '🌈', { specialAbility: 'goldmine_pot_of_gold' }),
];

// ============================================================
// SNIPER - Path 0: Assassin | Path 1: Destroyer | Path 2: Eagle Eye
// ============================================================

const SNIPER_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Assassin (Crit)
  u(TowerType.SNIPER, 0, 1,
    'Steady Aim', '안정된 조준',
    '+15% crit chance', '치명타 확률 +15%',
    '🎯', { critChanceAdd: 0.15 }),
  u(TowerType.SNIPER, 0, 2,
    'Vital Strike', '급소 타격',
    '+15% crit chance, +50% crit damage', '치명타 +15%, 치명타 피해 +50%',
    '💉', { critChanceAdd: 0.15, critDamageAdd: 0.5 }),
  u(TowerType.SNIPER, 0, 3,
    'Assassin Training', '암살자 훈련',
    '+20% crit, +100% crit damage', '치명타 +20%, 치명타 피해 +100%',
    '🗡️', { critChanceAdd: 0.2, critDamageAdd: 1.0 }),
  u(TowerType.SNIPER, 0, 4,
    'Death Mark', '죽음의 표식',
    'Crit hits mark target: next hit from any tower also crits', '치명타 시 표식: 다음에 다른 타워도 치명타',
    '☠️', { critChanceAdd: 0.1, specialAbility: 'sniper_death_mark' }),
  u(TowerType.SNIPER, 0, 5,
    'One Shot One Kill', '원샷 원킬',
    '100% crit chance, 500% crit damage, enemies below 25% HP instantly die', '치명타 100%, 치명타 피해 500%, HP 25% 이하 즉사',
    '💀', { critChanceAdd: 1.0, critDamageAdd: 5.0, specialAbility: 'sniper_execute' }),

  // Path 1 - Destroyer (Anti-Boss)
  u(TowerType.SNIPER, 1, 1,
    'Heavy Round', '중탄',
    '+30% damage', '공격력 +30%',
    '🔩', { damageMultiply: 0.3 }),
  u(TowerType.SNIPER, 1, 2,
    'Armor Piercing', '철갑탄',
    '+50% damage, +30% armor pen', '공격력 +50%, 방어 관통 +30%',
    '🪨', { damageMultiply: 0.5, armorPenAdd: 0.3 }),
  u(TowerType.SNIPER, 1, 3,
    'Anti-Material', '대물 저격',
    '+80% damage, +50% vs bosses', '공격력 +80%, 보스에게 +50%',
    '🔫', { damageMultiply: 0.8, specialAbility: 'sniper_boss_bonus_50' }),
  u(TowerType.SNIPER, 1, 4,
    'Dragon Slayer', '드래곤 슬레이어',
    '+150% damage, +100% vs bosses, stuns bosses 0.5s', '공격력 +150%, 보스 +100%, 보스 0.5초 기절',
    '🐉', { damageMultiply: 1.5, specialAbility: 'sniper_dragon_slayer' }),
  u(TowerType.SNIPER, 1, 5,
    'God Killer', '신 살해자',
    '+300% damage, +200% vs bosses, removes boss immunity and passives', '공격력 +300%, 보스 +200%, 보스 면역/패시브 제거',
    '⚡', { damageMultiply: 3.0, specialAbility: 'sniper_god_killer' }),

  // Path 2 - Eagle Eye (Range)
  u(TowerType.SNIPER, 2, 1,
    'Scope', '스코프',
    '+25% range', '사거리 +25%',
    '🔭', { rangeMultiply: 0.25 }),
  u(TowerType.SNIPER, 2, 2,
    'Advanced Optics', '고급 광학장치',
    '+40% range, can detect invisible', '사거리 +40%, 투명 적 탐지',
    '👁️', { rangeMultiply: 0.4, specialAbility: 'sniper_detect_invis' }),
  u(TowerType.SNIPER, 2, 3,
    'Satellite Link', '위성 연결',
    '+60% range, shares vision with nearby towers', '사거리 +60%, 주변 타워와 시야 공유',
    '📡', { rangeMultiply: 0.6, specialAbility: 'sniper_share_vision' }),
  u(TowerType.SNIPER, 2, 4,
    'Orbital Scope', '궤도 조준기',
    '+100% range, can target any enemy on map', '사거리 +100%, 맵 어디든 타격 가능',
    '🛰️', { rangeMultiply: 1.0, specialAbility: 'sniper_global_range' }),
  u(TowerType.SNIPER, 2, 5,
    'All-Seeing Eye', '만물을 보는 눈',
    'Infinite range, reveals entire map, grants +15% range to all towers, priority targets strongest', '무한 사거리, 맵 전체 공개, 모든 타워 사거리 +15%, 최강 적 우선',
    '🌍', { specialAbility: 'sniper_all_seeing' }),
];

// ============================================================
// FLAME - Path 0: Inferno | Path 1: Phoenix | Path 2: Meteor
// ============================================================

const FLAME_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Inferno (Burn)
  u(TowerType.FLAME, 0, 1,
    'Hotter Flames', '더 뜨거운 불꽃',
    '+5 burn damage per second', '초당 화상 피해 +5',
    '🔥', { burnDamageAdd: 5 }),
  u(TowerType.FLAME, 0, 2,
    'Searing Heat', '타오르는 열기',
    '+10 burn, burn lasts +2s', '화상 +10, 화상 시간 +2초',
    '🌡️', { burnDamageAdd: 10, specialAbility: 'flame_longer_burn' }),
  u(TowerType.FLAME, 0, 3,
    'White Fire', '백색 화염',
    '+20 burn, burning enemies take +20% damage', '화상 +20, 화상 적 받는 피해 +20%',
    '⚪', { burnDamageAdd: 20, specialAbility: 'flame_burn_vuln' }),
  u(TowerType.FLAME, 0, 4,
    'Hellfire', '지옥불',
    '+40 burn, fire cannot be extinguished, ignores fire resistance', '화상 +40, 소화 불가, 화염 저항 무시',
    '😈', { burnDamageAdd: 40, specialAbility: 'flame_unquenchable' }),
  u(TowerType.FLAME, 0, 5,
    'Solar Flare', '태양 폭발',
    'Burns deal 8% max HP/s, burning enemies explode on death damaging nearby', '화상이 초당 최대HP 8%, 화상 적 사망 시 폭발',
    '☀️', { specialAbility: 'flame_solar_flare' }),

  // Path 1 - Phoenix (AoE)
  u(TowerType.FLAME, 1, 1,
    'Fire Burst', '화염 작렬',
    '+15 AoE radius', 'AoE 범위 +15',
    '💥', { aoeRadiusAdd: 15 }),
  u(TowerType.FLAME, 1, 2,
    'Flame Wave', '화염파',
    '+25 AoE, +15% damage', 'AoE +25, 공격력 +15%',
    '🌊', { aoeRadiusAdd: 25, damageMultiply: 0.15 }),
  u(TowerType.FLAME, 1, 3,
    'Fire Ring', '화염의 고리',
    'Creates expanding fire ring every 5s', '5초마다 확장하는 화염 고리 생성',
    '⭕', { specialAbility: 'flame_fire_ring', aoeRadiusAdd: 20 }),
  u(TowerType.FLAME, 1, 4,
    'Phoenix Wings', '불사조 날개',
    'When destroyed, respawns in 10s at full power', '파괴 시 10초 후 완전한 상태로 부활',
    '🐦', { specialAbility: 'flame_phoenix_rebirth', damageMultiply: 0.5 }),
  u(TowerType.FLAME, 1, 5,
    'Rebirth Inferno', '불사조의 환생',
    'Phoenix explosion on rebirth damages all enemies. Permanent fire aura damages all nearby.', '부활 시 전체 폭발. 영구 화염 오라로 주변 적 지속 피해',
    '🔶', { specialAbility: 'flame_rebirth_inferno' }),

  // Path 2 - Meteor (Piercing)
  u(TowerType.FLAME, 2, 1,
    'Focused Beam', '집중 광선',
    '+20% damage, attacks pierce 1 enemy', '공격력 +20%, 적 1체 관통',
    '🔴', { damageMultiply: 0.2, pierceCountAdd: 1 }),
  u(TowerType.FLAME, 2, 2,
    'Flame Jet', '화염 분사',
    '+30% damage, pierce +2', '공격력 +30%, 관통 +2',
    '🚀', { damageMultiply: 0.3, pierceCountAdd: 2 }),
  u(TowerType.FLAME, 2, 3,
    'Dragon Breath', '용의 숨결',
    'Cone attack hitting all in front, +40% damage', '전방 부채꼴 공격, 공격력 +40%',
    '🐲', { damageMultiply: 0.4, specialAbility: 'flame_cone_attack' }),
  u(TowerType.FLAME, 2, 4,
    'Magma Cannon', '마그마 캐논',
    'Fires magma balls that leave lava pools (DoT zone)', '마그마 구슬 발사, 용암 웅덩이 생성 (지속 피해)',
    '🌋', { specialAbility: 'flame_magma_pool', burnDamageAdd: 15 }),
  u(TowerType.FLAME, 2, 5,
    'Meteor Strike', '메테오 스트라이크',
    'Every 12s, calls a meteor on the densest enemy cluster dealing 20x damage in huge AoE', '12초마다 적 밀집 지역에 메테오 (20배 피해, 초대형 AoE)',
    '☄️', { specialAbility: 'flame_meteor_strike' }),
];

// ============================================================
// WORD - Path 0: Scholar | Path 1: Library | Path 2: Oracle
// ============================================================

const WORD_UPGRADES: TowerUpgrade[] = [
  // Path 0 - Scholar (Quiz Power)
  u(TowerType.WORD, 0, 1,
    'Bookworm', '책벌레',
    '+20% quiz reward gold', '퀴즈 보상 골드 +20%',
    '📚', { quizPowerAdd: 0.2 }),
  u(TowerType.WORD, 0, 2,
    'Quick Learner', '빠른 학습자',
    '+40% quiz reward, +2s quiz time', '퀴즈 보상 +40%, 퀴즈 시간 +2초',
    '🎓', { quizPowerAdd: 0.4, specialAbility: 'word_extra_time_2' }),
  u(TowerType.WORD, 0, 3,
    'Linguist', '언어학자',
    '+70% quiz power, correct answers deal AoE damage', '퀴즈 파워 +70%, 정답 시 AoE 피해',
    '📖', { quizPowerMultiply: 0.7, specialAbility: 'word_answer_damage' }),
  u(TowerType.WORD, 0, 4,
    'Word Master', '단어의 달인',
    '+120% quiz power, combo multiplier x2', '퀴즈 파워 +120%, 콤보 배율 2배',
    '🏅', { quizPowerMultiply: 1.2, specialAbility: 'word_combo_double' }),
  u(TowerType.WORD, 0, 5,
    'Grand Scholar', '대학자',
    'Perfect quiz answers (under 3s) instantly kill weakest enemy, +200% rewards', '3초 이내 정답 시 최약 적 즉사, 보상 +200%',
    '🌟', { quizPowerMultiply: 2.0, specialAbility: 'word_grand_scholar' }),

  // Path 1 - Library (Support)
  u(TowerType.WORD, 1, 1,
    'Study Hall', '자습실',
    'Nearby towers +5% damage', '주변 타워 공격력 +5%',
    '🏫', { buffPercentAdd: 5 }),
  u(TowerType.WORD, 1, 2,
    'Reference Desk', '참고 자료실',
    'Nearby +10% damage, quiz hints available', '주변 +10%, 퀴즈 힌트 사용 가능',
    '📋', { buffPercentAdd: 10, specialAbility: 'word_hint_system' }),
  u(TowerType.WORD, 1, 3,
    'Knowledge Aura', '지식의 오라',
    'Nearby +20% damage, +10% speed, mastered words give extra buff', '주변 공격력 +20%, 속도 +10%, 마스터 단어 추가 버프',
    '💫', { buffPercentAdd: 20, specialAbility: 'word_mastery_buff' }),
  u(TowerType.WORD, 1, 4,
    'Grand Library', '대도서관',
    '+30% buff range, nearby towers gain XP faster', '버프 범위 +30%, 주변 타워 경험치 가속',
    '🏛️', { buffPercentAdd: 15, rangeMultiply: 0.3, specialAbility: 'word_xp_boost' }),
  u(TowerType.WORD, 1, 5,
    'Akashic Records', '아카식 레코드',
    'All towers on map +30% all stats, quiz always shows words you need to learn most', '맵 전체 타워 전 스탯 +30%, 가장 필요한 단어 자동 출제',
    '📜', { specialAbility: 'word_akashic_records' }),

  // Path 2 - Global Oracle
  u(TowerType.WORD, 2, 1,
    'Broadcast', '방송',
    '+20% range for word effects', '워드 효과 범위 +20%',
    '📡', { rangeMultiply: 0.2 }),
  u(TowerType.WORD, 2, 2,
    'Loudspeaker', '확성기',
    '+40% range, quiz buffs last +3s', '범위 +40%, 퀴즈 버프 +3초 연장',
    '📢', { rangeMultiply: 0.4, specialAbility: 'word_longer_buff' }),
  u(TowerType.WORD, 2, 3,
    'Satellite Broadcast', '위성 방송',
    'Word tower effects reach entire map', '워드 타워 효과가 맵 전체에 적용',
    '🛰️', { specialAbility: 'word_global_range' }),
  u(TowerType.WORD, 2, 4,
    'Mind Link', '정신 연결',
    'Quiz answers buff ALL towers for 10s, correct = +20% damage', '퀴즈 정답 시 10초간 모든 타워 공격력 +20%',
    '🧠', { specialAbility: 'word_mind_link' }),
  u(TowerType.WORD, 2, 5,
    'Word of Power', '힘의 단어',
    'Every 5 correct answers triggers global attack (all enemies take 500 damage). Streaks of 10 trigger screen wipe.', '정답 5회마다 전체 500 피해. 10연속 정답 시 화면 정리',
    '🌠', { specialAbility: 'word_of_power' }),
];

// ============================================================
// MASTER REGISTRY
// ============================================================

/** All 180 tower upgrades in one flat array */
export const ALL_TOWER_UPGRADES: TowerUpgrade[] = [
  ...ARCHER_UPGRADES,
  ...MAGIC_UPGRADES,
  ...CANNON_UPGRADES,
  ...ICE_UPGRADES,
  ...LIGHTNING_UPGRADES,
  ...POISON_UPGRADES,
  ...HEALER_UPGRADES,
  ...BARRICADE_UPGRADES,
  ...GOLDMINE_UPGRADES,
  ...SNIPER_UPGRADES,
  ...FLAME_UPGRADES,
  ...WORD_UPGRADES,
];

/** Quick lookup by upgrade ID */
export const TOWER_UPGRADE_MAP: Record<string, TowerUpgrade> = Object.fromEntries(
  ALL_TOWER_UPGRADES.map((u) => [u.id, u]),
);

// ── Lookup by tower ────────────────────────────────────────

const _byTower = new Map<TowerType, TowerUpgrade[]>();
for (const up of ALL_TOWER_UPGRADES) {
  if (!_byTower.has(up.towerId)) _byTower.set(up.towerId, []);
  _byTower.get(up.towerId)!.push(up);
}

// ============================================================
// PUBLIC API
// ============================================================

/** Get all 15 upgrades (3 paths x 5 tiers) for a tower type */
export function getUpgradesForTower(towerType: TowerType): TowerUpgrade[] {
  return _byTower.get(towerType) ?? [];
}

/** Get 5 upgrades for a specific tower path */
export function getUpgradePath(
  towerType: TowerType,
  path: 0 | 1 | 2,
): TowerUpgrade[] {
  return getUpgradesForTower(towerType)
    .filter((u) => u.path === path)
    .sort((a, b) => a.tier - b.tier);
}

/** Get the cost of a specific upgrade tier */
export function getUpgradeCost(
  towerType: TowerType,
  path: 0 | 1 | 2,
  tier: number,
): number {
  if (tier < 1 || tier > 5) return Infinity;
  const upgrade = ALL_TOWER_UPGRADES.find(
    (u) => u.towerId === towerType && u.path === path && u.tier === tier,
  );
  return upgrade?.cost ?? Infinity;
}

/** Get a specific upgrade by tower, path, and tier */
export function getUpgrade(
  towerType: TowerType,
  path: 0 | 1 | 2,
  tier: 1 | 2 | 3 | 4 | 5,
): TowerUpgrade | undefined {
  return ALL_TOWER_UPGRADES.find(
    (u) => u.towerId === towerType && u.path === path && u.tier === tier,
  );
}

/**
 * Check if a tower can be upgraded on a given path, respecting the 5/2/0 rule:
 * - One path can go up to tier 5 (primary)
 * - A second path can go up to tier 2 (secondary)
 * - The third path must stay at tier 0
 *
 * @param currentPaths - Current tier levels of [path0, path1, path2]
 * @param targetPath - The path the player wants to upgrade
 * @returns true if the upgrade is allowed
 */
export function canUpgrade(
  towerType: TowerType,
  currentPaths: [number, number, number],
  targetPath: 0 | 1 | 2,
): boolean {
  const currentTier = currentPaths[targetPath];

  // Already maxed at tier 5
  if (currentTier >= 5) return false;

  // Determine the next tier
  const nextTier = currentTier + 1;

  // Count how many paths have upgrades
  const otherPaths = [0, 1, 2].filter((p) => p !== targetPath) as (0 | 1 | 2)[];
  const otherTiers = otherPaths.map((p) => currentPaths[p]);

  // Sort other paths by tier descending to identify primary/secondary
  const sortedOther = [...otherTiers].sort((a, b) => b - a);
  const highestOther = sortedOther[0]; // highest tier among the other two paths
  const lowestOther = sortedOther[1]; // lowest tier among the other two paths

  // If the target path wants to go above tier 2, it must be the primary path
  // That means no OTHER path can also be above tier 2
  if (nextTier > 2) {
    // This path is trying to be primary (tier 3-5)
    // No other path should be above tier 2
    if (highestOther > 2) return false;
    // The third path (lowest other) must stay at 0
    // But we only block if it would ALREADY violate: if the highest other > 0 and lowest other > 0
    // Actually: if this path goes above 2, the other two can be at most [2, 0]
    if (lowestOther > 0 && highestOther > 0) {
      // Two other paths have upgrades - third path rule violated
      // Only block if BOTH others have upgrades AND the lower one > 0
      // Wait, this is the scenario: target wants tier 3+, both others > 0
      // This is only OK if one of the others is the secondary (<=2) and the other is 0
      // Since both > 0, this is invalid IF any of them went above 0
      // Actually the rule is: third path stays at 0
      // So if both other paths > 0, then we'd have 3 paths with upgrades = invalid for tier 3+
      return false;
    }
  }

  // If the target path wants to go to tier 1 or 2:
  if (nextTier <= 2) {
    // Check if another path is already primary (> 2)
    // If so, this target is trying to be secondary - that's fine if the third path is 0
    if (highestOther > 2) {
      // One path is primary. Is the target becoming a second upgraded path?
      // Count paths that already have upgrades (excluding target)
      const otherUpgradedCount = otherTiers.filter((t) => t > 0).length;
      if (currentTier === 0 && otherUpgradedCount >= 2) {
        // Would be 3 paths with upgrades - blocked
        return false;
      }
      // If no primary path exists but both others have tiers 1-2, and target also wants to upgrade:
    } else {
      // No primary path yet. All paths are <= 2.
      // The 5/2/0 rule says at most 2 paths can have upgrades
      const totalUpgraded = currentPaths.filter((t) => t > 0).length;
      if (currentTier === 0 && totalUpgraded >= 2) {
        // This would be a 3rd path getting upgrades - blocked
        return false;
      }
    }
  }

  // Ensure the upgrade actually exists
  const upgrade = getUpgrade(towerType, targetPath, nextTier as 1 | 2 | 3 | 4 | 5);
  if (!upgrade) return false;

  return true;
}

/**
 * Get total cost to reach a specific tier on a path
 */
export function getTotalUpgradeCost(
  towerType: TowerType,
  path: 0 | 1 | 2,
  targetTier: number,
): number {
  let total = 0;
  for (let t = 1; t <= targetTier; t++) {
    total += getUpgradeCost(towerType, path, t);
  }
  return total;
}

/**
 * Collect all effects from applied upgrades on a tower's paths
 */
export function getAccumulatedEffects(
  towerType: TowerType,
  currentPaths: [number, number, number],
): UpgradeEffect {
  const merged: UpgradeEffect = {};

  for (let path = 0; path < 3; path++) {
    const tier = currentPaths[path];
    for (let t = 1; t <= tier; t++) {
      const upgrade = getUpgrade(towerType, path as 0 | 1 | 2, t as 1 | 2 | 3 | 4 | 5);
      if (!upgrade) continue;
      const eff = upgrade.effect;

      // Accumulate additive values
      if (eff.damageAdd) merged.damageAdd = (merged.damageAdd ?? 0) + eff.damageAdd;
      if (eff.damageMultiply) merged.damageMultiply = (merged.damageMultiply ?? 0) + eff.damageMultiply;
      if (eff.rangeAdd) merged.rangeAdd = (merged.rangeAdd ?? 0) + eff.rangeAdd;
      if (eff.rangeMultiply) merged.rangeMultiply = (merged.rangeMultiply ?? 0) + eff.rangeMultiply;
      if (eff.attackSpeedAdd) merged.attackSpeedAdd = (merged.attackSpeedAdd ?? 0) + eff.attackSpeedAdd;
      if (eff.attackSpeedMultiply) merged.attackSpeedMultiply = (merged.attackSpeedMultiply ?? 0) + eff.attackSpeedMultiply;
      if (eff.critChanceAdd) merged.critChanceAdd = (merged.critChanceAdd ?? 0) + eff.critChanceAdd;
      if (eff.critDamageAdd) merged.critDamageAdd = (merged.critDamageAdd ?? 0) + eff.critDamageAdd;
      if (eff.aoeRadiusAdd) merged.aoeRadiusAdd = (merged.aoeRadiusAdd ?? 0) + eff.aoeRadiusAdd;
      if (eff.slowPercentAdd) merged.slowPercentAdd = (merged.slowPercentAdd ?? 0) + eff.slowPercentAdd;
      if (eff.dotDamageAdd) merged.dotDamageAdd = (merged.dotDamageAdd ?? 0) + eff.dotDamageAdd;
      if (eff.chainCountAdd) merged.chainCountAdd = (merged.chainCountAdd ?? 0) + eff.chainCountAdd;
      if (eff.goldProduceAdd) merged.goldProduceAdd = (merged.goldProduceAdd ?? 0) + eff.goldProduceAdd;
      if (eff.healAmountAdd) merged.healAmountAdd = (merged.healAmountAdd ?? 0) + eff.healAmountAdd;
      if (eff.hpAdd) merged.hpAdd = (merged.hpAdd ?? 0) + eff.hpAdd;
      if (eff.hpMultiply) merged.hpMultiply = (merged.hpMultiply ?? 0) + eff.hpMultiply;
      if (eff.thornsDamageAdd) merged.thornsDamageAdd = (merged.thornsDamageAdd ?? 0) + eff.thornsDamageAdd;
      if (eff.buffPercentAdd) merged.buffPercentAdd = (merged.buffPercentAdd ?? 0) + eff.buffPercentAdd;
      if (eff.investmentReturnAdd) merged.investmentReturnAdd = (merged.investmentReturnAdd ?? 0) + eff.investmentReturnAdd;
      if (eff.luckChanceAdd) merged.luckChanceAdd = (merged.luckChanceAdd ?? 0) + eff.luckChanceAdd;
      if (eff.armorPenAdd) merged.armorPenAdd = (merged.armorPenAdd ?? 0) + eff.armorPenAdd;
      if (eff.burnDamageAdd) merged.burnDamageAdd = (merged.burnDamageAdd ?? 0) + eff.burnDamageAdd;
      if (eff.pierceCountAdd) merged.pierceCountAdd = (merged.pierceCountAdd ?? 0) + eff.pierceCountAdd;
      if (eff.quizPowerAdd) merged.quizPowerAdd = (merged.quizPowerAdd ?? 0) + eff.quizPowerAdd;
      if (eff.quizPowerMultiply) merged.quizPowerMultiply = (merged.quizPowerMultiply ?? 0) + eff.quizPowerMultiply;
      if (eff.globalBuffPercent) merged.globalBuffPercent = (merged.globalBuffPercent ?? 0) + eff.globalBuffPercent;
      if (eff.stunChanceAdd) merged.stunChanceAdd = (merged.stunChanceAdd ?? 0) + eff.stunChanceAdd;
      if (eff.stunDurationAdd) merged.stunDurationAdd = (merged.stunDurationAdd ?? 0) + eff.stunDurationAdd;
      if (eff.freezeDurationAdd) merged.freezeDurationAdd = (merged.freezeDurationAdd ?? 0) + eff.freezeDurationAdd;
      if (eff.shatterDamageAdd) merged.shatterDamageAdd = (merged.shatterDamageAdd ?? 0) + eff.shatterDamageAdd;

      // Special abilities: collect the highest-tier one per path
      if (eff.specialAbility) merged.specialAbility = eff.specialAbility;
    }
  }

  return merged;
}

/**
 * Get all active special abilities for a tower's current upgrade state
 */
export function getActiveAbilities(
  towerType: TowerType,
  currentPaths: [number, number, number],
): string[] {
  const abilities: string[] = [];

  for (let path = 0; path < 3; path++) {
    const tier = currentPaths[path];
    for (let t = 1; t <= tier; t++) {
      const upgrade = getUpgrade(towerType, path as 0 | 1 | 2, t as 1 | 2 | 3 | 4 | 5);
      if (upgrade?.effect.specialAbility) {
        abilities.push(upgrade.effect.specialAbility);
      }
    }
  }

  return abilities;
}

// ── Path Metadata (for UI) ─────────────────────────────────

export interface PathInfo {
  towerId: TowerType;
  path: 0 | 1 | 2;
  name: string;
  nameKr: string;
  description: string;
  descriptionKr: string;
  icon: string;
}

export const PATH_INFO: PathInfo[] = [
  // ARCHER
  { towerId: TowerType.ARCHER, path: 0, name: 'Sharpshooter', nameKr: '명사수', description: 'Pure damage and critical hits', descriptionKr: '순수 공격력과 치명타', icon: '🎯' },
  { towerId: TowerType.ARCHER, path: 1, name: 'Rapid Fire', nameKr: '속사', description: 'Attack speed and multi-shot', descriptionKr: '공격속도와 다중 발사', icon: '💨' },
  { towerId: TowerType.ARCHER, path: 2, name: 'Volley', nameKr: '일제사격', description: 'Multi-target and AoE', descriptionKr: '다중 대상과 범위 공격', icon: '☁️' },
  // MAGIC
  { towerId: TowerType.MAGIC, path: 0, name: 'Archmage', nameKr: '대마법사', description: 'Raw magical power', descriptionKr: '순수 마법 파괴력', icon: '🌠' },
  { towerId: TowerType.MAGIC, path: 1, name: 'Hex Mage', nameKr: '주술사', description: 'Debuffs and curses', descriptionKr: '디버프와 저주', icon: '🦇' },
  { towerId: TowerType.MAGIC, path: 2, name: 'Storm Mage', nameKr: '폭풍 마법사', description: 'AoE and chain attacks', descriptionKr: '범위 공격과 연쇄', icon: '🌋' },
  // CANNON
  { towerId: TowerType.CANNON, path: 0, name: 'Bombardier', nameKr: '폭격수', description: 'Bigger explosions', descriptionKr: '더 큰 폭발', icon: '🛩️' },
  { towerId: TowerType.CANNON, path: 1, name: 'Siege', nameKr: '공성병기', description: 'Armor piercing and anti-boss', descriptionKr: '방어 관통과 보스 특화', icon: '🏰' },
  { towerId: TowerType.CANNON, path: 2, name: 'Gatling', nameKr: '개틀링', description: 'Rapid fire rate', descriptionKr: '빠른 연사속도', icon: '🌀' },
  // ICE
  { towerId: TowerType.ICE, path: 0, name: 'Absolute Zero', nameKr: '절대 영도', description: 'Longer and stronger freezes', descriptionKr: '더 길고 강한 빙결', icon: '🌬️' },
  { towerId: TowerType.ICE, path: 1, name: 'Cryo Shatter', nameKr: '결정 분쇄', description: 'Shatter frozen enemies for bonus damage', descriptionKr: '빙결 적 분쇄로 추가 피해', icon: '💎' },
  { towerId: TowerType.ICE, path: 2, name: 'Blizzard', nameKr: '눈보라', description: 'Wider slow and AoE cold', descriptionKr: '넓은 감속과 범위 냉기', icon: '🏳️' },
  // LIGHTNING
  { towerId: TowerType.LIGHTNING, path: 0, name: 'Tesla', nameKr: '테슬라', description: 'Chain lightning to many targets', descriptionKr: '다수 대상 연쇄 번개', icon: '🌐' },
  { towerId: TowerType.LIGHTNING, path: 1, name: 'Thunderlord', nameKr: '천둥군주', description: 'Stun and disable enemies', descriptionKr: '적 기절과 무력화', icon: '🔱' },
  { towerId: TowerType.LIGHTNING, path: 2, name: 'Storm', nameKr: '폭풍', description: 'Attack speed and orbs', descriptionKr: '공격속도와 에너지구', icon: '🌀' },
  // POISON
  { towerId: TowerType.POISON, path: 0, name: 'Plague', nameKr: '역병', description: 'Deadly damage over time', descriptionKr: '치명적 지속 피해', icon: '🕷️' },
  { towerId: TowerType.POISON, path: 1, name: 'Miasma', nameKr: '독안개', description: 'AoE poison zones', descriptionKr: '범위 독성 지대', icon: '🦠' },
  { towerId: TowerType.POISON, path: 2, name: 'Venom', nameKr: '맹독', description: 'Slow and disable enemies', descriptionKr: '적 감속과 무력화', icon: '🗿' },
  // HEALER
  { towerId: TowerType.HEALER, path: 0, name: 'Saint', nameKr: '성자', description: 'Powerful healing', descriptionKr: '강력한 치유', icon: '🌈' },
  { towerId: TowerType.HEALER, path: 1, name: 'Paladin', nameKr: '팔라딘', description: 'Buff nearby towers', descriptionKr: '주변 타워 강화', icon: '⚔️' },
  { towerId: TowerType.HEALER, path: 2, name: 'Oracle', nameKr: '신탁자', description: 'Cleanse, ward, and foresight', descriptionKr: '정화, 결계, 예지', icon: '🏛️' },
  // BARRICADE
  { towerId: TowerType.BARRICADE, path: 0, name: 'Fortress', nameKr: '요새', description: 'Maximum durability', descriptionKr: '최대 내구도', icon: '🏯' },
  { towerId: TowerType.BARRICADE, path: 1, name: 'Spikes', nameKr: '가시', description: 'Thorns damage to attackers', descriptionKr: '공격자에게 반사 피해', icon: '⚰️' },
  { towerId: TowerType.BARRICADE, path: 2, name: 'Tar', nameKr: '타르', description: 'Slow and trap enemies', descriptionKr: '적 감속과 속박', icon: '🕳️' },
  // GOLDMINE
  { towerId: TowerType.GOLDMINE, path: 0, name: 'Bank', nameKr: '은행', description: 'Maximum gold production', descriptionKr: '최대 골드 생산', icon: '👑' },
  { towerId: TowerType.GOLDMINE, path: 1, name: 'Market', nameKr: '시장', description: 'Interest and cost reduction', descriptionKr: '이자와 비용 절감', icon: '💎' },
  { towerId: TowerType.GOLDMINE, path: 2, name: 'Lucky Mine', nameKr: '행운 광산', description: 'Chance for jackpots', descriptionKr: '잭팟 확률', icon: '🌈' },
  // SNIPER
  { towerId: TowerType.SNIPER, path: 0, name: 'Assassin', nameKr: '암살자', description: 'Critical hit specialist', descriptionKr: '치명타 전문가', icon: '💀' },
  { towerId: TowerType.SNIPER, path: 1, name: 'Destroyer', nameKr: '파괴자', description: 'Anti-boss specialist', descriptionKr: '보스 전문가', icon: '🐉' },
  { towerId: TowerType.SNIPER, path: 2, name: 'Eagle Eye', nameKr: '독수리 눈', description: 'Extreme range and vision', descriptionKr: '극한 사거리와 시야', icon: '🌍' },
  // FLAME
  { towerId: TowerType.FLAME, path: 0, name: 'Inferno', nameKr: '지옥불', description: 'Devastating burn damage', descriptionKr: '치명적 화상 피해', icon: '☀️' },
  { towerId: TowerType.FLAME, path: 1, name: 'Phoenix', nameKr: '불사조', description: 'AoE fire and rebirth', descriptionKr: '범위 화염과 부활', icon: '🔶' },
  { towerId: TowerType.FLAME, path: 2, name: 'Meteor', nameKr: '메테오', description: 'Piercing and meteor strikes', descriptionKr: '관통과 메테오 소환', icon: '☄️' },
  // WORD
  { towerId: TowerType.WORD, path: 0, name: 'Scholar', nameKr: '학자', description: 'Quiz power and rewards', descriptionKr: '퀴즈 파워와 보상', icon: '🌟' },
  { towerId: TowerType.WORD, path: 1, name: 'Library', nameKr: '도서관', description: 'Support nearby towers', descriptionKr: '주변 타워 지원', icon: '📜' },
  { towerId: TowerType.WORD, path: 2, name: 'Word Oracle', nameKr: '단어 신탁', description: 'Global word power effects', descriptionKr: '전역 단어 파워 효과', icon: '🌠' },
];

/** Get path info for a specific tower and path */
export function getPathInfo(
  towerType: TowerType,
  path: 0 | 1 | 2,
): PathInfo | undefined {
  return PATH_INFO.find((p) => p.towerId === towerType && p.path === path);
}

/** Get all 3 path infos for a tower */
export function getTowerPathInfos(towerType: TowerType): PathInfo[] {
  return PATH_INFO.filter((p) => p.towerId === towerType);
}
