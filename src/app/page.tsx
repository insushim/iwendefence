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

/* ────────────────────── Data ────────────────────── */

const menuItems = [
  {
    label: '모험 시작',
    icon: Gamepad2,
    href: '/adventure',
    emoji: '🎮',
    color: 'from-indigo-600 to-purple-600',
    glowColor: 'rgba(99,102,241,0.4)',
    shadow: 'shadow-indigo-500/30',
    description: '스테이지를 클리어하며 모험을 떠나세요',
  },
  {
    label: '무한 모드',
    icon: Swords,
    href: '/endless',
    emoji: '⚔️',
    color: 'from-red-600 to-orange-600',
    glowColor: 'rgba(239,68,68,0.4)',
    shadow: 'shadow-red-500/30',
    description: '끝없는 웨이브에 도전하세요',
  },
  {
    label: '단어장',
    icon: BookOpen,
    href: '/wordbook',
    emoji: '📚',
    color: 'from-emerald-600 to-teal-600',
    glowColor: 'rgba(16,185,129,0.4)',
    shadow: 'shadow-emerald-500/30',
    description: '학습한 단어를 복습하세요',
  },
  {
    label: '기록실',
    icon: Trophy,
    href: '/records',
    emoji: '🏆',
    color: 'from-amber-600 to-yellow-500',
    glowColor: 'rgba(245,158,11,0.4)',
    shadow: 'shadow-amber-500/30',
    description: '나의 기록을 확인하세요',
  },
  {
    label: '히어로',
    icon: User,
    href: '/heroes',
    emoji: '👤',
    color: 'from-pink-600 to-rose-600',
    glowColor: 'rgba(236,72,153,0.4)',
    shadow: 'shadow-pink-500/30',
    description: '영웅을 선택하고 관리하세요',
  },
  {
    label: '설정',
    icon: Settings,
    href: '/settings',
    emoji: '⚙️',
    color: 'from-slate-600 to-slate-500',
    glowColor: 'rgba(100,116,139,0.4)',
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

/* ────────────────── Floating Letters ────────────────── */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

interface FloatingLetter {
  id: number;
  char: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function useFloatingLetters(count: number): FloatingLetter[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    char: LETTERS[Math.floor(seededUnit(i + 1) * LETTERS.length)],
    x: seededUnit(i + 11) * 100,
    y: seededUnit(i + 21) * 100,
    size: 12 + seededUnit(i + 31) * 20,
    duration: 12 + seededUnit(i + 41) * 18,
    delay: seededUnit(i + 51) * -20,
    opacity: 0.03 + seededUnit(i + 61) * 0.06,
  }));
}

/* ────────────────── Sparkle Particles ────────────────── */

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function useSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 20 + seededUnit(i + 101) * 60,
    y: 10 + seededUnit(i + 111) * 30,
    size: 2 + seededUnit(i + 121) * 3,
    delay: seededUnit(i + 131) * 3,
    duration: 1.5 + seededUnit(i + 141) * 2,
  }));
}

/* ────────────────── Geometric Shapes ────────────────── */

interface GeoShape {
  id: number;
  type: 'diamond' | 'hexagon' | 'triangle';
  x: number;
  y: number;
  size: number;
  rotation: number;
  duration: number;
  delay: number;
}

function useGeoShapes(count: number): GeoShape[] {
  const types: GeoShape['type'][] = ['diamond', 'hexagon', 'triangle'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    type: types[i % 3],
    x: seededUnit(i + 201) * 100,
    y: seededUnit(i + 211) * 100,
    size: 20 + seededUnit(i + 221) * 40,
    rotation: seededUnit(i + 231) * 360,
    duration: 15 + seededUnit(i + 241) * 20,
    delay: seededUnit(i + 251) * -10,
  }));
}

function GeoShapeSVG({ type, size }: { type: GeoShape['type']; size: number }) {
  const half = size / 2;
  switch (type) {
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},0 ${size},${half} ${half},${size} 0,${half}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      );
    case 'hexagon': {
      const r = half * 0.9;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return `${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`;
      }).join(' ');
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      );
    }
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},${size * 0.1} ${size * 0.9},${size * 0.85} ${size * 0.1},${size * 0.85}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      );
  }
}

/* ────────────────── Card Border Gradient ────────────────── */

function AnimatedBorderCard({
  children,
  glowColor,
  index,
}: {
  children: React.ReactNode;
  glowColor: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.15 + index * 0.07,
        duration: 0.5,
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      className="group relative"
    >
      {/* Animated border glow on hover */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]"
        style={{
          background: `conic-gradient(from var(--border-angle, 0deg), transparent 40%, ${glowColor}, transparent 60%)`,
        }}
      />
      {/* Inner glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${glowColor}, transparent 70%)`,
        }}
      />
      {children}
    </motion.div>
  );
}

/* ────────────────────── Page ────────────────────── */

export default function HomePage() {
  const { grade, difficulty, setGrade, setDifficulty } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);

  const floatingLetters = useFloatingLetters(18);
  const sparkles = useSparkles(12);
  const geoShapes = useGeoShapes(8);

  return (
    <div className="min-h-dvh relative overflow-hidden flex flex-col">
      {/* ═══════════════ Background Layers ═══════════════ */}
      <div className="absolute inset-0 bg-[#0F172A]">
        {/* Animated gradient mesh - large orbs that drift */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[130px]"
          style={{ bottom: '-15%', right: '-10%', background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)' }}
          animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{ top: '35%', right: '15%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }}
          animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[350px] h-[350px] rounded-full blur-[110px]"
          style={{ top: '60%', left: '20%', background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' }}
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />

        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* Refined grid with perspective fade */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)',
          }}
        />

        {/* Floating geometric shapes */}
        {geoShapes.map((shape) => (
            <motion.div
              key={`geo-${shape.id}`}
              className="absolute text-white/[0.03] pointer-events-none"
              style={{ left: `${shape.x}%`, top: `${shape.y}%` }}
              animate={{
                rotate: [shape.rotation, shape.rotation + 360],
                y: [0, -30, 0],
              }}
              transition={{
                rotate: { duration: shape.duration, repeat: Infinity, ease: 'linear' },
                y: { duration: shape.duration / 2, repeat: Infinity, ease: 'easeInOut', delay: shape.delay },
              }}
            >
              <GeoShapeSVG type={shape.type} size={shape.size} />
            </motion.div>
          ))}

        {/* Floating letter runes */}
        {floatingLetters.map((letter) => (
            <motion.span
              key={`letter-${letter.id}`}
              className="absolute pointer-events-none select-none font-display text-white"
              style={{
                left: `${letter.x}%`,
                top: `${letter.y}%`,
                fontSize: `${letter.size}px`,
                opacity: 0,
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0, letter.opacity, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: letter.duration,
                repeat: Infinity,
                delay: letter.delay,
                ease: 'easeInOut',
              }}
            >
              {letter.char}
            </motion.span>
          ))}
      </div>

      {/* ═══════════════ Main Content ═══════════════ */}
      <div className="relative z-10 flex flex-col items-center px-4 py-8 flex-1">
        {/* ──── Hero / Logo Section ──── */}
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8 relative"
        >
          {/* Sparkle particles around logo */}
          {sparkles.map((s) => (
              <motion.div
                key={`sparkle-${s.id}`}
                className="absolute rounded-full bg-white pointer-events-none"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: s.size,
                  height: s.size,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0, 1.2, 0],
                }}
                transition={{
                  duration: s.duration,
                  repeat: Infinity,
                  delay: s.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}

          {/* Shield Logo */}
          <motion.div
            className="relative inline-block mb-5"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute -inset-3 rounded-[28px]"
              style={{
                background: 'conic-gradient(from 0deg, rgba(99,102,241,0.4), rgba(236,72,153,0.4), rgba(6,182,212,0.3), rgba(99,102,241,0.4))',
                filter: 'blur(12px)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            {/* Pulsing glow behind shield */}
            <motion.div
              className="absolute -inset-4 rounded-[32px]"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1)',
                  '0 0 30px rgba(236,72,153,0.4), 0 0 80px rgba(236,72,153,0.15)',
                  '0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Shield body */}
            <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-white/20">
              {/* Inner highlight */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                }}
              />
              <Shield className="w-12 h-12 text-white drop-shadow-lg relative z-10" strokeWidth={2.5} />
            </div>
            {/* Castle badge */}
            <motion.div
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm shadow-lg shadow-amber-500/40 border border-amber-300/50"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="relative z-10">&#x1F3F0;</span>
            </motion.div>
          </motion.div>

          {/* Title with shimmer */}
          <div className="relative">
            <h1
              className="text-5xl sm:text-6xl font-black tracking-tight font-display"
              style={{
                background: 'linear-gradient(90deg, #818cf8, #c084fc, #f472b6, #818cf8)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite',
              }}
            >
              WordGuard
            </h1>
            {/* Ghost glow text behind */}
            <h1
              className="absolute inset-0 text-5xl sm:text-6xl font-black tracking-tight font-display pointer-events-none select-none"
              aria-hidden="true"
              style={{
                background: 'linear-gradient(90deg, #818cf8, #c084fc, #f472b6, #818cf8)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite',
                filter: 'blur(16px)',
                opacity: 0.5,
              }}
            >
              WordGuard
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-slate-400 mt-3 text-sm sm:text-base tracking-wide"
          >
            <span className="text-slate-500">&#x2726;</span>
            {' '}단어로 지키는 마법의 왕국{' '}
            <span className="text-slate-500">&#x2726;</span>
          </motion.p>
        </motion.div>

        {/* ──── Grade & Difficulty Selector ──── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="w-full max-w-md mb-7"
        >
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-center gap-3 text-sm text-slate-400 hover:text-slate-300 transition-colors py-2.5 group"
          >
            <span className="px-4 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-semibold border border-indigo-500/20 backdrop-blur-sm">
              {gradeOptions.find((g) => g.value === grade)?.label}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-500/20 backdrop-blur-sm">
              {difficultyOptions.find((d) => d.value === difficulty)?.label}
            </span>
            <motion.div
              animate={{ rotate: showSettings ? 180 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-4 h-4 group-hover:text-slate-300 transition-colors" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/40 p-5 mt-3 space-y-5 shadow-xl shadow-black/20">
                  {/* Grade - pill-shaped segmented control */}
                  <div>
                    <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">
                      &#x1F393; 학년 선택
                    </p>
                    <div className="relative flex bg-slate-900/60 rounded-xl p-1 border border-slate-700/30">
                      {gradeOptions.map((opt) => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setGrade(opt.value)}
                          className="relative flex-1 z-10"
                        >
                          {grade === opt.value && (
                            <motion.div
                              layoutId="gradeIndicator"
                              className="absolute inset-0 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/30"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span
                            className={`relative block py-2 text-sm font-medium transition-colors duration-200 ${
                              grade === opt.value
                                ? 'text-white'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty - pill-shaped segmented control */}
                  <div>
                    <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">
                      &#x2694;&#xFE0F; 난이도
                    </p>
                    <div className="relative flex bg-slate-900/60 rounded-xl p-1 border border-slate-700/30">
                      {difficultyOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDifficulty(opt.value)}
                          className="relative flex-1 z-10"
                        >
                          {difficulty === opt.value && (
                            <motion.div
                              layoutId="difficultyIndicator"
                              className="absolute inset-0 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/30"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span
                            className={`relative block py-2 text-sm font-medium transition-colors duration-200 ${
                              difficulty === opt.value
                                ? 'text-amber-950'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {opt.emoji} {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ──── Menu Grid ──── */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3.5">
          {menuItems.map((item, index) => (
            <AnimatedBorderCard
              key={item.href}
              glowColor={item.glowColor}
              index={index}
            >
              <a href={item.href} className="block">
                <motion.div
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`
                    relative overflow-hidden rounded-2xl p-4 h-[130px]
                    bg-gradient-to-br ${item.color}
                    shadow-xl ${item.shadow}
                    flex flex-col justify-between
                    cursor-pointer select-none
                    border border-white/[0.12]
                  `}
                >
                  {/* Glassmorphism inner layer */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 40%, transparent 100%)',
                    }}
                  />

                  {/* BG circle decoration with animated glow */}
                  <div className="absolute top-0 right-0 w-24 h-24 -translate-y-1/2 translate-x-1/2">
                    <div className="w-full h-full rounded-full bg-white/10" />
                    <div className="absolute inset-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors duration-500" />
                  </div>

                  {/* Bottom light streak */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[1px]"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    }}
                  />

                  {/* Icon with animated background circle */}
                  <div className="relative flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                        <span className="text-xl leading-none">{item.emoji}</span>
                      </div>
                    </div>
                    <item.icon className="w-4 h-4 text-white/40" />
                  </div>

                  <div className="relative">
                    <p className="font-bold text-white text-lg leading-tight tracking-tight">
                      {item.label}
                    </p>
                    <p className="text-white/50 text-[10px] mt-0.5 leading-tight tracking-wide">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              </a>
            </AnimatedBorderCard>
          ))}
        </div>

        {/* ──── Footer ──── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 mb-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/30 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500 text-[11px] font-medium tracking-wider uppercase">
              WordGuard v0.1.0
            </span>
          </div>
        </motion.div>
      </div>

      {/* ═══════ Inline CSS for animated border rotation ═══════ */}
      <style jsx global>{`
        @property --border-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        .group:hover {
          --border-angle: 360deg;
          transition: --border-angle 3s linear infinite;
        }
        @keyframes border-rotate {
          to { --border-angle: 360deg; }
        }
        .group:hover .absolute.-inset-\\[1px\\] {
          animation: border-rotate 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
