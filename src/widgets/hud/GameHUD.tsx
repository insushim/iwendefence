'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Coins, Diamond, Waves, Flame } from 'lucide-react';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  gold: number;
  diamonds: number;
  wave: number;
  score: number;
  combo: number;
  killCombo?: number;
  activeSynergies?: string[];
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setFlash(true);
      setDisplayValue(value);
      const timer = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <motion.span
      className={`tabular-nums ${className} ${flash ? 'text-white' : ''}`}
      animate={flash ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

export default function GameHUD({
  hp,
  maxHp,
  gold,
  diamonds,
  wave,
  score,
  combo,
  killCombo = 0,
  activeSynergies = [],
}: GameHUDProps) {
  const hpPercent = Math.max(0, (hp / maxHp) * 100);
  const isLowHp = hpPercent <= 30;

  return (
    <div
      className={`
        relative z-20 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50
        ${isLowHp ? 'animate-pulse-glow' : ''}
      `}
      style={isLowHp ? { boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' } : undefined}
    >
      {/* Main HUD Row */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* HP */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Heart
            className={`w-4 h-4 flex-shrink-0 ${
              isLowHp ? 'text-red-500 animate-heartbeat' : 'text-red-400'
            }`}
            fill="currentColor"
          />
          <div className="flex flex-col gap-0.5 min-w-[60px]">
            <div className="flex items-baseline gap-1">
              <AnimatedNumber
                value={hp}
                className={`text-xs font-bold ${isLowHp ? 'text-red-400' : 'text-white'}`}
              />
              <span className="text-[10px] text-slate-500">/{maxHp}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-700 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  isLowHp ? 'bg-red-500' : hpPercent > 60 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700/50" />

        {/* Gold */}
        <div className="flex items-center gap-1">
          <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <AnimatedNumber value={gold} className="text-xs font-bold text-amber-400" />
        </div>

        {/* Diamonds */}
        <div className="flex items-center gap-1">
          <Diamond className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <AnimatedNumber value={diamonds} className="text-xs font-bold text-cyan-400" />
        </div>

        <div className="flex-1" />

        {/* Wave */}
        <div className="flex items-center gap-1">
          <Waves className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="text-xs font-bold text-indigo-300 tabular-nums">W{wave}</span>
        </div>

        {/* Score */}
        <div className="text-xs font-bold text-slate-300 tabular-nums">
          {score.toLocaleString()}
        </div>
      </div>

      {/* Combo & Synergy Bar */}
      <AnimatePresence>
        {(combo > 1 || killCombo >= 3 || activeSynergies.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3 pb-1.5 px-3 flex-wrap">
              {/* Quiz Combo */}
              {combo > 1 && (
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-orange-300">
                    {combo} COMBO
                  </span>
                  <span className="text-[10px] text-orange-400/60">
                    x{(1 + combo * 0.1).toFixed(1)}
                  </span>
                </div>
              )}

              {/* Kill Streak */}
              {killCombo >= 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30"
                >
                  <span className="text-[10px] font-bold text-red-300">
                    {killCombo} KILL
                  </span>
                </motion.div>
              )}

              {/* Active Synergies */}
              {activeSynergies.map((syn) => (
                <motion.div
                  key={syn}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25"
                >
                  <span className="text-[10px] font-bold text-cyan-300">{syn}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
