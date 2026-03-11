'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Swords,
  BookOpen,
  Trophy,
  User,
  Settings,
  ChevronDown,
  Shield,
} from 'lucide-react';

import { useSettingsStore } from '@/shared/lib/store';
import type { WordGrade } from '@/shared/types/game';

const menuItems = [
  {
    label: '모험 시작',
    icon: Gamepad2,
    href: '/adventure',
    emoji: '🎮',
    color: 'from-indigo-600 to-purple-600',
    shadow: 'shadow-indigo-500/30',
    description: '스테이지를 클리어하며 모험을 떠나세요',
  },
  {
    label: '무한 모드',
    icon: Swords,
    href: '/endless',
    emoji: '⚔️',
    color: 'from-red-600 to-orange-600',
    shadow: 'shadow-red-500/30',
    description: '끝없는 웨이브에 도전하세요',
  },
  {
    label: '단어장',
    icon: BookOpen,
    href: '/wordbook',
    emoji: '📚',
    color: 'from-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/30',
    description: '학습한 단어를 복습하세요',
  },
  {
    label: '기록실',
    icon: Trophy,
    href: '/records',
    emoji: '🏆',
    color: 'from-amber-600 to-yellow-500',
    shadow: 'shadow-amber-500/30',
    description: '나의 기록을 확인하세요',
  },
  {
    label: '히어로',
    icon: User,
    href: '/heroes',
    emoji: '👤',
    color: 'from-pink-600 to-rose-600',
    shadow: 'shadow-pink-500/30',
    description: '영웅을 선택하고 관리하세요',
  },
  {
    label: '설정',
    icon: Settings,
    href: '/settings',
    emoji: '⚙️',
    color: 'from-slate-600 to-slate-500',
    shadow: 'shadow-slate-500/30',
    description: '게임 설정을 변경하세요',
  },
];

const gradeOptions: { value: WordGrade | 'mixed'; label: string }[] = [
  { value: 3, label: '3학년' },
  { value: 4, label: '4학년' },
  { value: 5, label: '5학년' },
  { value: 6, label: '6학년' },
  { value: 'mixed', label: '혼합' },
];

const difficultyOptions = [
  { value: 1 as const, label: '쉬움', emoji: '🟢' },
  { value: 2 as const, label: '보통', emoji: '🟡' },
  { value: 3 as const, label: '어려움', emoji: '🔴' },
];

export default function HomePage() {
  const { grade, difficulty, setGrade, setDifficulty } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-dvh relative overflow-hidden flex flex-col">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0F172A]">
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-600/15 blur-[120px]" />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-600/10 blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4 py-8 flex-1">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          {/* Shield icon */}
          <motion.div
            className="relative inline-block mb-4"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-sm shadow-lg">
              🏰
            </div>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight"
              style={{ fontFamily: 'var(--font-black-han-sans)' }}>
            WordGuard
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            단어로 지키는 마법의 왕국
          </p>
        </motion.div>

        {/* Grade & Difficulty Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md mb-6"
        >
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors py-2"
          >
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
              {gradeOptions.find((g) => g.value === grade)?.label}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
              {difficultyOptions.find((d) => d.value === difficulty)?.label}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 mt-2 space-y-4">
                  {/* Grade */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">학년 선택</p>
                    <div className="flex gap-2 flex-wrap">
                      {gradeOptions.map((opt) => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setGrade(opt.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            grade === opt.value
                              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">난이도</p>
                    <div className="flex gap-2">
                      {difficultyOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDifficulty(opt.value)}
                          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            difficulty === opt.value
                              ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/30'
                              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {opt.emoji} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Menu Grid */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
            >
              <a href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`
                    relative overflow-hidden rounded-2xl p-4 h-[120px]
                    bg-gradient-to-br ${item.color}
                    shadow-xl ${item.shadow}
                    flex flex-col justify-between
                    cursor-pointer select-none
                    border border-white/10
                  `}
                >
                  {/* BG Decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.emoji}</span>
                    <item.icon className="w-5 h-5 text-white/70" />
                  </div>

                  <div>
                    <p className="font-bold text-white text-lg leading-tight">
                      {item.label}
                    </p>
                    <p className="text-white/60 text-[10px] mt-0.5 leading-tight">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              </a>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-slate-600 text-xs mt-8"
        >
          WordGuard v0.1.0
        </motion.p>
      </div>
    </div>
  );
}
