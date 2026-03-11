'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Music,
  GraduationCap,
  Gauge,
  Globe,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

import { useSettingsStore, usePlayerStore } from '@/shared/lib/store';
import type { WordGrade } from '@/shared/types/game';
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';

const gradeOptions: { value: WordGrade | 'mixed'; label: string; desc: string }[] = [
  { value: 3, label: '3학년', desc: '기초 영단어' },
  { value: 4, label: '4학년', desc: '초급 영단어' },
  { value: 5, label: '5학년', desc: '중급 영단어' },
  { value: 6, label: '6학년', desc: '상급 영단어' },
  { value: 'mixed', label: '혼합', desc: '모든 학년 혼합' },
];

const difficultyOptions: {
  value: 1 | 2 | 3;
  label: string;
  desc: string;
  emoji: string;
  color: string;
}[] = [
  {
    value: 1,
    label: '쉬움',
    desc: '느린 적, 많은 골드',
    emoji: '🟢',
    color: 'border-emerald-500/50 bg-emerald-500/10',
  },
  {
    value: 2,
    label: '보통',
    desc: '균형 잡힌 난이도',
    emoji: '🟡',
    color: 'border-amber-500/50 bg-amber-500/10',
  },
  {
    value: 3,
    label: '어려움',
    desc: '빠른 적, 적은 골드',
    emoji: '🔴',
    color: 'border-red-500/50 bg-red-500/10',
  },
];

export default function SettingsPage() {
  const { volume, sfxVolume, grade, difficulty, setVolume, setSfxVolume, setGrade, setDifficulty } =
    useSettingsStore();
  const [showReset, setShowReset] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);

  const handleReset = () => {
    // Clear all persisted data
    try {
      localStorage.removeItem('wordguard-player');
      localStorage.removeItem('wordguard-settings');
      localStorage.removeItem('wordguard-player-backup');
      window.location.reload();
    } catch {
      // If localStorage fails, just reload
      window.location.reload();
    }
  };

  return (
    <div className="min-h-dvh bg-[#0F172A]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <a href="/">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </motion.div>
          </a>
          <h1 className="text-lg font-bold text-white">설정</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6 pb-8">
        {/* Sound Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            소리
          </h2>
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-4">
            {/* BGM Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-white">배경 음악</span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-lg"
              />
            </div>

            {/* SFX Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {sfxVolume > 0 ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-sm text-white">효과음</span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(sfxVolume * 100)}
                onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg"
              />
            </div>
          </div>
        </motion.section>

        {/* Grade Selection */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            학년 선택
          </h2>
          <div className="space-y-2">
            {gradeOptions.map((opt) => (
              <motion.button
                key={String(opt.value)}
                whileTap={{ scale: 0.98 }}
                onClick={() => setGrade(opt.value)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl text-left
                  border transition-all
                  ${
                    grade === opt.value
                      ? 'border-indigo-500/50 bg-indigo-600/10'
                      : 'border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/50'
                  }
                `}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    grade === opt.value
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {opt.value === 'mixed' ? 'M' : opt.value}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-[10px] text-slate-500">{opt.desc}</p>
                </div>
                {grade === opt.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center"
                  >
                    <span className="text-white text-xs">✓</span>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Difficulty */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            난이도
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {difficultyOptions.map((opt) => (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDifficulty(opt.value)}
                className={`
                  p-3 rounded-xl text-center border transition-all
                  ${
                    difficulty === opt.value
                      ? opt.color
                      : 'border-slate-700/30 bg-slate-800/30'
                  }
                `}
              >
                <span className="text-xl">{opt.emoji}</span>
                <p className="text-sm font-bold text-white mt-1">{opt.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Language */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            언어
          </h2>
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">한국어</span>
              <span className="text-xs text-indigo-400 px-2 py-1 rounded-full bg-indigo-500/20">
                기본
              </span>
            </div>
          </div>
        </motion.section>

        {/* Reset */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-bold text-red-400/60 mb-3 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            데이터 관리
          </h2>
          <div className="bg-red-950/20 rounded-2xl p-4 border border-red-500/20">
            <p className="text-xs text-slate-500 mb-3">
              모든 진행 데이터, 학습 기록, 설정이 초기화됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowReset(true)}
              icon={<Trash2 className="w-4 h-4" />}
            >
              진행 초기화
            </Button>
          </div>
        </motion.section>

        {/* Version */}
        <p className="text-center text-xs text-slate-700 pt-4">
          WordGuard v0.1.0
        </p>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal isOpen={showReset} onClose={() => { setShowReset(false); setResetConfirmed(false); }}>
        <div className="bg-slate-800 rounded-3xl p-6 w-80 text-center border border-slate-700">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">진행 초기화</h2>
          <p className="text-sm text-slate-400 mb-4">
            정말로 모든 데이터를 초기화하시겠습니까?
            <br />
            <span className="text-red-400 font-medium">이 작업은 되돌릴 수 없습니다.</span>
          </p>

          {!resetConfirmed ? (
            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => { setShowReset(false); setResetConfirmed(false); }}
              >
                취소
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => setResetConfirmed(true)}
              >
                초기화
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-400">정말 확실한가요?</p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => { setShowReset(false); setResetConfirmed(false); }}
                >
                  아니오
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleReset}
                >
                  네, 초기화
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
