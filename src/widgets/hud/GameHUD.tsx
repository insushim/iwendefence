'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { Heart, Coins, Diamond, Waves, Flame, Zap, Trophy } from 'lucide-react';

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

/* ── Animated Number with pop + color flash ────────────── */
function AnimatedNumber({
  value,
  className,
  flashColor = 'text-white',
}: {
  value: number;
  className?: string;
  flashColor?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState(false);
  const [delta, setDelta] = useState(0);
  const controls = useAnimationControls();

  useEffect(() => {
    if (value !== displayValue) {
      const frame = window.requestAnimationFrame(() => {
        setDelta(value - displayValue);
        setFlash(true);
        setDisplayValue(value);
      });
      controls.start({
        scale: [1, 1.35, 0.95, 1.1, 1],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
      const timer = window.setTimeout(() => setFlash(false), 400);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timer);
      };
    }
  }, [value, displayValue, controls]);

  return (
    <span className="relative inline-flex items-center">
      <motion.span
        className={`tabular-nums font-bold ${className} ${flash ? flashColor : ''}`}
        animate={controls}
        style={{ display: 'inline-block', willChange: 'transform' }}
      >
        {value.toLocaleString()}
      </motion.span>
      {/* Delta pop indicator */}
      <AnimatePresence>
        {flash && delta !== 0 && (
          <motion.span
            key={`delta-${value}`}
            initial={{ opacity: 1, y: 0, scale: 0.7 }}
            animate={{ opacity: 0, y: -16, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`absolute -top-1 left-full ml-0.5 text-[9px] font-bold whitespace-nowrap pointer-events-none ${
              delta > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {delta > 0 ? '+' : ''}{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ── HP Bar: multi-layer glass with animated fill ──────── */
function HPBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isLowHp = hpPercent <= 30;
  const isMidHp = hpPercent > 30 && hpPercent <= 60;
  const prevHpRef = useRef(hp);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const [trailingPercent, setTrailingPercent] = useState(hpPercent);

  // Damage flash effect
  useEffect(() => {
    if (hp < prevHpRef.current) {
      const frame = window.requestAnimationFrame(() => {
        setShowDamageFlash(true);
      });
      // Trailing bar effect -- the red "ghost" bar lags behind
      const timer = window.setTimeout(() => {
        setTrailingPercent(hpPercent);
        setShowDamageFlash(false);
      }, 500);
      prevHpRef.current = hp;
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timer);
      };
    } else {
      const frame = window.requestAnimationFrame(() => {
        setTrailingPercent(hpPercent);
      });
      prevHpRef.current = hp;
      return () => window.cancelAnimationFrame(frame);
    }
  }, [hp, hpPercent]);

  // Gradient color based on HP
  const barGradient = isLowHp
    ? 'from-red-600 via-red-500 to-red-400'
    : isMidHp
    ? 'from-amber-600 via-amber-500 to-yellow-400'
    : 'from-emerald-600 via-emerald-500 to-green-400';

  const glowColor = isLowHp
    ? 'rgba(239, 68, 68, 0.6)'
    : isMidHp
    ? 'rgba(245, 158, 11, 0.4)'
    : 'rgba(16, 185, 129, 0.3)';

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {/* Heart icon with pulse */}
      <motion.div
        className="relative flex-shrink-0"
        animate={
          isLowHp
            ? {
                scale: [1, 1.25, 1, 1.15, 1],
              }
            : {}
        }
        transition={
          isLowHp
            ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      >
        <Heart
          className={`w-[18px] h-[18px] drop-shadow-lg ${
            isLowHp ? 'text-red-500' : isMidHp ? 'text-amber-400' : 'text-red-400'
          }`}
          fill="currentColor"
        />
        {/* Glow behind heart */}
        <div
          className="absolute inset-0 rounded-full blur-sm -z-10"
          style={{ background: glowColor, transform: 'scale(1.6)' }}
        />
      </motion.div>

      <div className="flex flex-col gap-[3px] min-w-[72px]">
        {/* HP numbers */}
        <div className="flex items-baseline gap-0.5 leading-none">
          <AnimatedNumber
            value={hp}
            className={`text-[11px] ${
              isLowHp ? 'text-red-400' : isMidHp ? 'text-amber-300' : 'text-white'
            }`}
            flashColor={isLowHp ? 'text-red-300' : 'text-white'}
          />
          <span className="text-[9px] text-slate-500 font-medium">/{maxHp}</span>
        </div>

        {/* Multi-layer HP bar */}
        <div
          className="relative w-full h-[7px] rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Trailing damage bar (red ghost) */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-red-900/80"
            animate={{ width: `${trailingPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Main HP fill */}
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barGradient}`}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              boxShadow: `0 0 8px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.3)`,
            }}
          >
            {/* Inner glass highlight */}
            <div
              className="absolute inset-x-0 top-0 h-[3px] rounded-full"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
              }}
            />
            {/* Liquid shimmer effect */}
            <div
              className="absolute inset-0 rounded-full animate-shimmer opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          </motion.div>

          {/* Damage flash overlay */}
          <AnimatePresence>
            {showDamageFlash && (
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-white/40 rounded-full"
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Currency Counter (Gold/Diamond) with glow ─────────── */
function CurrencyCounter({
  icon: Icon,
  value,
  color,
  glowColor,
  iconSize = 'w-[18px] h-[18px]',
}: {
  icon: typeof Coins;
  value: number;
  color: string;
  glowColor: string;
  iconSize?: string;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [gained, setGained] = useState(false);
  const iconControls = useAnimationControls();

  useEffect(() => {
    if (value > prevValue) {
      const frame = window.requestAnimationFrame(() => {
        setGained(true);
        setPrevValue(value);
      });
      iconControls.start({
        rotate: [0, -15, 15, -10, 10, 0],
        scale: [1, 1.3, 1],
        transition: { duration: 0.5 },
      });
      const t = window.setTimeout(() => setGained(false), 500);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(t);
      };
    }
    const frame = window.requestAnimationFrame(() => {
      setPrevValue(value);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [value, prevValue, iconControls]);

  return (
    <div className="flex items-center gap-1 relative">
      <motion.div className="relative flex-shrink-0" animate={iconControls}>
        <Icon
          className={`${iconSize} ${color} drop-shadow-md`}
          fill="currentColor"
          strokeWidth={1}
        />
        {/* Subtle glow behind icon */}
        <div
          className="absolute inset-0 rounded-full blur-[6px] -z-10 opacity-50"
          style={{ background: glowColor, transform: 'scale(1.8)' }}
        />
      </motion.div>
      <AnimatedNumber
        value={value}
        className={`text-[12px] ${color}`}
        flashColor="text-white"
      />
      {/* Gain flash */}
      <AnimatePresence>
        {gained && (
          <motion.div
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-full"
            style={{ background: glowColor, filter: 'blur(8px)' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Wave Badge with progress arc feel ─────────────────── */
function WaveBadge({ wave }: { wave: number }) {
  const [prevWave, setPrevWave] = useState(wave);
  const controls = useAnimationControls();

  useEffect(() => {
    if (wave !== prevWave) {
      controls.start({
        scale: [1, 1.4, 0.9, 1.1, 1],
        rotate: [0, -5, 5, 0],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
      const frame = window.requestAnimationFrame(() => {
        setPrevWave(wave);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [wave, prevWave, controls]);

  return (
    <motion.div
      className="relative flex items-center gap-1 px-2 py-[3px] rounded-lg"
      animate={controls}
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 100%)',
        border: '1px solid rgba(99,102,241,0.35)',
        boxShadow: '0 0 10px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <Waves className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
      <span className="text-[11px] font-extrabold text-indigo-200 tabular-nums tracking-wide">
        W{wave}
      </span>
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 rounded-lg animate-shimmer opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(165,180,252,0.3) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </motion.div>
  );
}

/* ── Score Display with shimmer ────────────────────────── */
function ScoreDisplay({ score }: { score: number }) {
  return (
    <div className="relative flex items-center gap-1">
      <Trophy className="w-3.5 h-3.5 text-yellow-500/70 flex-shrink-0" />
      <div className="relative">
        <AnimatedNumber
          value={score}
          className="text-[12px] text-slate-200"
          flashColor="text-yellow-300"
        />
        {/* Shimmer overlay on the score text */}
        <div
          className="absolute inset-0 animate-shimmer pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, rgba(253,224,71,0.5) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </div>
  );
}

/* ── Combo Badge ───────────────────────────────────────── */
function ComboBadge({ combo }: { combo: number }) {
  const controls = useAnimationControls();
  const prevComboRef = useRef(combo);

  useEffect(() => {
    if (combo > prevComboRef.current) {
      controls.start({
        scale: [1, 1.3, 0.95, 1.1, 1],
        x: [0, -2, 2, -1, 1, 0],
        transition: { duration: 0.4 },
      });
    }
    prevComboRef.current = combo;
  }, [combo, controls]);

  const intensity = Math.min(combo / 10, 1);
  const fireColor = combo >= 8
    ? 'from-red-500 to-orange-400'
    : combo >= 5
    ? 'from-orange-500 to-amber-400'
    : 'from-amber-500 to-yellow-400';

  return (
    <motion.div
      className="flex items-center gap-1 px-2 py-[2px] rounded-full relative overflow-hidden"
      animate={controls}
      style={{
        background: `linear-gradient(135deg, rgba(249,115,22,${0.15 + intensity * 0.15}) 0%, rgba(234,88,12,${0.1 + intensity * 0.1}) 100%)`,
        border: `1px solid rgba(249,115,22,${0.3 + intensity * 0.3})`,
        boxShadow: `0 0 ${8 + intensity * 12}px rgba(249,115,22,${0.15 + intensity * 0.2})`,
      }}
    >
      {/* Fire icon with animated glow */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [0, -8, 8, 0],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Flame className="w-3.5 h-3.5 text-orange-400" fill="currentColor" />
      </motion.div>
      <span className={`text-[11px] font-extrabold bg-gradient-to-r ${fireColor} bg-clip-text text-transparent`}>
        {combo}
      </span>
      <span className="text-[9px] font-bold text-orange-300/80 tracking-wider">
        콤보
      </span>
      <span
        className="text-[9px] font-bold tabular-nums"
        style={{ color: `rgba(251,191,36,${0.5 + intensity * 0.5})` }}
      >
        x{(1 + combo * 0.1).toFixed(1)}
      </span>
      {/* Hot shimmer for high combo */}
      {combo >= 5 && (
        <div
          className="absolute inset-0 rounded-full animate-shimmer pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, rgba(251,146,60,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
    </motion.div>
  );
}

/* ── Kill Streak Badge ─────────────────────────────────── */
function KillBadge({ killCombo }: { killCombo: number }) {
  const controls = useAnimationControls();
  const prevRef = useRef(killCombo);

  useEffect(() => {
    if (killCombo > prevRef.current) {
      controls.start({
        scale: [1, 1.25, 0.95, 1.05, 1],
        x: [0, -3, 3, -1, 0],
        transition: { duration: 0.35 },
      });
    }
    prevRef.current = killCombo;
  }, [killCombo, controls]);

  const isMega = killCombo >= 10;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="flex items-center gap-1 px-2 py-[2px] rounded-full relative overflow-hidden"
      style={{
        background: isMega
          ? 'linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(220,38,38,0.2) 100%)'
          : 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.1) 100%)',
        border: `1px solid rgba(239,68,68,${isMega ? 0.5 : 0.3})`,
        boxShadow: isMega ? '0 0 16px rgba(239,68,68,0.3)' : '0 0 8px rgba(239,68,68,0.15)',
      }}
    >
      <motion.div animate={controls}>
        <Zap
          className={`w-3 h-3 ${isMega ? 'text-red-400' : 'text-red-400/80'}`}
          fill="currentColor"
        />
      </motion.div>
      <span className={`text-[10px] font-extrabold ${isMega ? 'text-red-300' : 'text-red-300/90'}`}>
        {killCombo}
      </span>
      <span className="text-[9px] font-bold text-red-400/60 tracking-wider">킬</span>
      {isMega && (
        <div
          className="absolute inset-0 rounded-full animate-shimmer pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, rgba(248,113,113,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
    </motion.div>
  );
}

/* ── Synergy Chip ──────────────────────────────────────── */
function SynergyChip({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="flex items-center gap-1 px-2 py-[2px] rounded-full relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(8,145,178,0.1) 100%)',
        border: '1px solid rgba(6,182,212,0.3)',
        boxShadow: '0 0 8px rgba(6,182,212,0.1)',
      }}
    >
      <span className="text-[10px] font-bold text-cyan-300">{name}</span>
      <div
        className="absolute inset-0 rounded-full animate-shimmer pointer-events-none opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(103,232,249,0.3) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </motion.div>
  );
}

/* ── Main HUD ──────────────────────────────────────────── */
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
      className="relative z-20 select-none"
      style={{
        background: isLowHp
          ? 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,10,10,0.9) 100%)'
          : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 100%)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        borderBottom: '1px solid rgba(100,116,139,0.2)',
        boxShadow: isLowHp
          ? '0 2px 20px rgba(239,68,68,0.2), 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.03)'
          : '0 2px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Top inner highlight line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
      />

      {/* Low HP vignette overlay */}
      {isLowHp && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-b-sm"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 30%, transparent 70%, rgba(239,68,68,0.15) 100%)',
          }}
        />
      )}

      {/* Main HUD Row */}
      <div className="flex items-center gap-2 px-2.5 py-[6px] relative">
        {/* HP Bar */}
        <HPBar hp={hp} maxHp={maxHp} />

        {/* Thin divider */}
        <div
          className="w-px h-5 flex-shrink-0 rounded-full"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.2) 50%, transparent 100%)',
          }}
        />

        {/* Gold */}
        <CurrencyCounter
          icon={Coins}
          value={gold}
          color="text-amber-400"
          glowColor="rgba(245,158,11,0.4)"
        />

        {/* Diamonds */}
        <CurrencyCounter
          icon={Diamond}
          value={diamonds}
          color="text-cyan-400"
          glowColor="rgba(6,182,212,0.4)"
          iconSize="w-4 h-4"
        />

        <div className="flex-1 min-w-1" />

        {/* Wave Badge */}
        <WaveBadge wave={wave} />

        {/* Score */}
        <ScoreDisplay score={score} />
      </div>

      {/* Combo & Synergy Row */}
      <AnimatePresence>
        {(combo > 1 || killCombo >= 3 || activeSynergies.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-center gap-2 pb-[5px] px-2.5 flex-wrap"
              style={{
                borderTop: '1px solid rgba(100,116,139,0.1)',
              }}
            >
              {/* Quiz Combo */}
              {combo > 1 && <ComboBadge combo={combo} />}

              {/* Kill Streak */}
              <AnimatePresence>
                {killCombo >= 3 && <KillBadge killCombo={killCombo} />}
              </AnimatePresence>

              {/* Active Synergies */}
              <AnimatePresence>
                {activeSynergies.map((syn) => (
                  <SynergyChip key={syn} name={syn} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
