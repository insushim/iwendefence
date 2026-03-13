'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Coins, Sword, Zap, BookOpen } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import type { RoguelikeUpgrade, UpgradeCategory } from '@/shared/types/game';

interface UpgradePanelProps {
  isOpen: boolean;
  upgrades: RoguelikeUpgrade[];
  onSelect: (upgrade: RoguelikeUpgrade) => void;
  waveNumber: number;
}

const categoryIcons: Record<UpgradeCategory, React.ReactNode> = {
  tower: <Sword className="w-6 h-6" />,
  economy: <Coins className="w-6 h-6" />,
  word: <BookOpen className="w-6 h-6" />,
  defense: <Shield className="w-6 h-6" />,
  special: <Zap className="w-6 h-6" />,
};

const categoryColors: Record<UpgradeCategory, { bg: string; border: string; text: string }> = {
  tower: {
    bg: 'from-red-600/20 to-orange-600/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
  economy: {
    bg: 'from-amber-600/20 to-yellow-600/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  word: {
    bg: 'from-indigo-600/20 to-purple-600/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
  },
  defense: {
    bg: 'from-emerald-600/20 to-teal-600/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  special: {
    bg: 'from-fuchsia-600/20 to-pink-600/20',
    border: 'border-fuchsia-500/30',
    text: 'text-fuchsia-400',
  },
};

export default function UpgradePanel({
  isOpen,
  upgrades,
  onSelect,
  waveNumber,
}: UpgradePanelProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (upgrade: RoguelikeUpgrade) => {
    if (selected) return;
    setSelected(upgrade.id);

    // Delay to show selection animation
    setTimeout(() => {
      onSelect(upgrade);
      setSelected(null);
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} closeOnBackdrop={false} closeOnEscape={false}>
      <div className="w-[340px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-indigo-300">
              웨이브 {waveNumber} 클리어!
            </span>
          </div>
          <h2 className="text-xl font-black text-white">업그레이드 선택</h2>
          <p className="text-xs text-slate-500 mt-1">하나를 선택하세요</p>
        </motion.div>

        {/* Upgrade Cards */}
        <div className="space-y-3">
          {upgrades.map((upgrade, index) => {
            const colors = categoryColors[upgrade.category];
            const isSelected = selected === upgrade.id;
            const isOther = selected !== null && !isSelected;

            return (
              <motion.div
                key={upgrade.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{
                  opacity: isOther ? 0.3 : 1,
                  y: 0,
                  scale: isSelected ? 1.05 : isOther ? 0.95 : 1,
                }}
                transition={{
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 300,
                }}
              >
                <motion.button
                  whileHover={!selected ? { scale: 1.02 } : {}}
                  whileTap={!selected ? { scale: 0.98 } : {}}
                  onClick={() => handleSelect(upgrade)}
                  disabled={selected !== null}
                  className={`
                    w-full p-4 rounded-2xl text-left
                    bg-gradient-to-r ${colors.bg}
                    border ${isSelected ? 'border-white/50' : colors.border}
                    backdrop-blur-sm
                    transition-all cursor-pointer
                    disabled:cursor-not-allowed
                    ${isSelected ? 'ring-2 ring-white/30 shadow-xl' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center flex-shrink-0 ${colors.text}`}
                    >
                      {upgrade.icon ? (
                        <span className="text-2xl">{upgrade.icon}</span>
                      ) : (
                        categoryIcons[upgrade.category]
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-sm">
                          {upgrade.name}
                        </h3>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.text} bg-slate-800/50`}
                        >
                          {upgrade.category === 'tower'
                            ? '타워'
                            : upgrade.category === 'economy'
                              ? '경제'
                              : upgrade.category === 'word'
                                ? '단어'
                                : upgrade.category === 'defense'
                                  ? '방어'
                                  : '특수'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {upgrade.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
