'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: string;
  bgColor?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'bg-indigo-500',
  bgColor = 'bg-slate-700',
  height = 8,
  showLabel = false,
  label,
  animated = true,
  className = '',
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
          <span>{label || ''}</span>
          {showLabel && (
            <span>
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden ${bgColor}`}
        style={{ height: `${height}px` }}
      >
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
