'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Lock,
  Shield,
  Flame,
  Snowflake,
  Zap,
  Mountain,
  Sun,
  Moon,
  Wind,
  Droplets,
  Star,
  CheckCircle2,
} from 'lucide-react';

import { usePlayerStore } from '@/shared/lib/store';
import type { Element } from '@/shared/types/game';
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';

interface HeroDefinition {
  id: string;
  name: string;
  title: string;
  element: Element;
  description: string;
  passiveName: string;
  passiveDesc: string;
  activeName: string;
  activeDesc: string;
  ultimateName: string;
  ultimateDesc: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  portrait: string; // Emoji-based portrait
  unlockCondition: string;
}

const HEROES: HeroDefinition[] = [
  {
    id: 'aria',
    name: '아리아',
    title: '불꽃의 마법사',
    element: 'fire',
    description: '강력한 화염 마법으로 적을 소각하는 공격형 영웅',
    passiveName: '불꽃의 가호',
    passiveDesc: '화염 타워 데미지 +15%',
    activeName: '파이어볼',
    activeDesc: '범위 내 적에게 큰 화염 피해',
    ultimateName: '메테오',
    ultimateDesc: '전체 적에게 대규모 화염 피해',
    color: '#EF4444',
    gradientFrom: 'from-red-600',
    gradientTo: 'to-orange-500',
    portrait: '🔥',
    unlockCondition: '기본 영웅',
  },
  {
    id: 'frost',
    name: '프로스트',
    title: '겨울의 수호자',
    element: 'ice',
    description: '적을 얼려 이동속도를 늦추는 제어형 영웅',
    passiveName: '서리의 보호',
    passiveDesc: '얼음 타워 감속 효과 +20%',
    activeName: '빙결의 화살',
    activeDesc: '대상 적을 3초간 완전 동결',
    ultimateName: '블리자드',
    ultimateDesc: '전체 적 속도 50% 감소 10초',
    color: '#38BDF8',
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-blue-600',
    portrait: '❄️',
    unlockCondition: 'World 2 클리어',
  },
  {
    id: 'volt',
    name: '볼트',
    title: '번개의 기사',
    element: 'lightning',
    description: '번개처럼 빠른 연쇄 공격으로 다수의 적을 제압',
    passiveName: '전류의 흐름',
    passiveDesc: '번개 타워 연쇄 수 +1',
    activeName: '체인 라이트닝',
    activeDesc: '5명의 적에게 연쇄 번개 공격',
    ultimateName: '썬더 스톰',
    ultimateDesc: '랜덤 번개가 10초간 적을 타격',
    color: '#FACC15',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-amber-600',
    portrait: '⚡',
    unlockCondition: 'World 4 클리어',
  },
  {
    id: 'gaia',
    name: '가이아',
    title: '대지의 여신',
    element: 'earth',
    description: '견고한 방어로 아군을 보호하는 방어형 영웅',
    passiveName: '대지의 축복',
    passiveDesc: '최대 HP +5, 바리케이드 HP +30%',
    activeName: '돌의 벽',
    activeDesc: '3초간 모든 피해를 50% 감소',
    ultimateName: '지진',
    ultimateDesc: '전체 적 3초간 기절 + 피해',
    color: '#A78BFA',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-violet-700',
    portrait: '🌿',
    unlockCondition: 'World 6 클리어',
  },
  {
    id: 'lux',
    name: '룩스',
    title: '빛의 현자',
    element: 'light',
    description: '단어 퀴즈 보상을 극대화하는 학습 특화 영웅',
    passiveName: '지혜의 빛',
    passiveDesc: '퀴즈 보상 골드 +30%',
    activeName: '깨달음',
    activeDesc: '다음 퀴즈 정답 시 보상 3배',
    ultimateName: '지식의 폭발',
    ultimateDesc: '모든 타워 공격력 2배, 10초',
    color: '#FBBF24',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-yellow-500',
    portrait: '✨',
    unlockCondition: '단어 100개 마스터',
  },
  {
    id: 'nyx',
    name: '닉스',
    title: '어둠의 암살자',
    element: 'dark',
    description: '크리티컬 확률을 극대화하는 공격 특화 영웅',
    passiveName: '그림자 일격',
    passiveDesc: '모든 타워 크리티컬 확률 +10%',
    activeName: '암살',
    activeDesc: '가장 강한 적에게 HP 20% 즉사 피해',
    ultimateName: '어둠의 장막',
    ultimateDesc: '15초간 크리티컬 데미지 x2',
    color: '#8B5CF6',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-purple-900',
    portrait: '🌙',
    unlockCondition: 'World 8 클리어',
  },
];

const elementIcons: Record<Element, React.ReactNode> = {
  fire: <Flame className="w-4 h-4" />,
  ice: <Snowflake className="w-4 h-4" />,
  lightning: <Zap className="w-4 h-4" />,
  earth: <Mountain className="w-4 h-4" />,
  light: <Sun className="w-4 h-4" />,
  dark: <Moon className="w-4 h-4" />,
  wind: <Wind className="w-4 h-4" />,
  water: <Droplets className="w-4 h-4" />,
};

export default function HeroesPage() {
  const heroes = usePlayerStore((s) => s.heroes);
  const [selectedHero, setSelectedHero] = useState<HeroDefinition | null>(null);
  const [activeHeroId, setActiveHeroId] = useState<string>('aria');

  const isUnlocked = (heroId: string) => {
    if (heroId === 'aria') return true; // Default hero
    return heroes.some((h) => h.heroId === heroId && h.unlocked);
  };

  const getHeroLevel = (heroId: string) => {
    const hero = heroes.find((h) => h.heroId === heroId);
    return hero?.level ?? 1;
  };

  return (
    <div className="min-h-dvh bg-[#0F172A]">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-pink-600/10 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </motion.div>
          </Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-pink-400" />
            히어로
          </h1>
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-4 space-y-3 pb-8">
        {/* Hero Grid */}
        {HEROES.map((hero, index) => {
          const unlocked = isUnlocked(hero.id);
          const isActive = activeHeroId === hero.id;
          const level = getHeroLevel(hero.id);

          return (
            <motion.div
              key={hero.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedHero(hero)}
                className={`
                  w-full rounded-2xl overflow-hidden text-left
                  border transition-all
                  ${
                    isActive
                      ? 'border-indigo-500/50 bg-indigo-600/10'
                      : unlocked
                        ? 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600/50'
                        : 'border-slate-800/30 bg-slate-900/30 opacity-60'
                  }
                `}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Portrait */}
                  <div
                    className={`
                      w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0
                      bg-gradient-to-br ${hero.gradientFrom} ${hero.gradientTo}
                      shadow-lg
                    `}
                    style={{ boxShadow: `0 4px 20px ${hero.color}33` }}
                  >
                    {unlocked ? hero.portrait : <Lock className="w-7 h-7 text-white/40" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{hero.name}</h3>
                      <span
                        className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${hero.color}20`,
                          color: hero.color,
                        }}
                      >
                        {elementIcons[hero.element]}
                      </span>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{hero.title}</p>
                    {unlocked ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-amber-400 font-medium">
                          Lv.{level}
                        </span>
                        <span className="text-[10px] text-slate-600">|</span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {hero.passiveDesc}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        해금: {hero.unlockCondition}
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Hero Detail Modal */}
      <Modal
        isOpen={selectedHero !== null}
        onClose={() => setSelectedHero(null)}
        showCloseButton
      >
        {selectedHero && (
          <div className="bg-slate-800 rounded-3xl w-80 overflow-hidden border border-slate-700">
            {/* Hero Header */}
            <div
              className={`relative p-6 text-center bg-gradient-to-br ${selectedHero.gradientFrom} ${selectedHero.gradientTo}`}
            >
              <div className="text-5xl mb-2">{selectedHero.portrait}</div>
              <h2 className="text-xl font-black text-white">{selectedHero.name}</h2>
              <p className="text-sm text-white/70">{selectedHero.title}</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-white/80">{elementIcons[selectedHero.element]}</span>
                <span className="text-xs text-white/70 capitalize">
                  {selectedHero.element}
                </span>
              </div>
            </div>

            {/* Skills */}
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-400">{selectedHero.description}</p>

              {/* Passive */}
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">패시브</span>
                </div>
                <p className="text-sm font-medium text-white">
                  {selectedHero.passiveName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedHero.passiveDesc}
                </p>
              </div>

              {/* Active */}
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-300">액티브</span>
                </div>
                <p className="text-sm font-medium text-white">
                  {selectedHero.activeName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedHero.activeDesc}
                </p>
              </div>

              {/* Ultimate */}
              <div className="bg-slate-900/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-bold text-red-300">궁극기</span>
                </div>
                <p className="text-sm font-medium text-white">
                  {selectedHero.ultimateName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedHero.ultimateDesc}
                </p>
              </div>

              {/* Select / Lock button */}
              {isUnlocked(selectedHero.id) ? (
                <Button
                  variant={activeHeroId === selectedHero.id ? 'ghost' : 'primary'}
                  fullWidth
                  onClick={() => {
                    setActiveHeroId(selectedHero.id);
                    setSelectedHero(null);
                  }}
                >
                  {activeHeroId === selectedHero.id ? '선택됨' : '영웅 선택'}
                </Button>
              ) : (
                <div className="text-center py-2">
                  <Lock className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-600">{selectedHero.unlockCondition}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
