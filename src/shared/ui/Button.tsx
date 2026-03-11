'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'gold' | 'diamond' | 'ghost' | 'glow';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50',
  secondary:
    'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/25 border border-pink-500/50',
  danger:
    'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25 border border-red-500/50',
  gold:
    'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-amber-950 shadow-lg shadow-amber-500/25 border border-amber-400/50',
  diamond:
    'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-cyan-950 shadow-lg shadow-cyan-500/25 border border-cyan-400/50',
  ghost:
    'bg-transparent hover:bg-white/10 text-slate-300 border border-slate-600',
  glow:
    'bg-slate-900/80 text-white border border-indigo-500/60 shadow-lg shadow-indigo-500/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-base rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-lg rounded-2xl gap-3',
};

/** Variants that get the mount shimmer effect */
const shimmerVariants = new Set<ButtonVariant>(['primary', 'gold', 'glow']);

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const [showShimmer, setShowShimmer] = useState(false);
  const shimmerTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (shimmerVariants.has(variant) && !disabled) {
      // Small delay so it plays visibly after paint
      shimmerTimer.current = setTimeout(() => setShowShimmer(true), 100);
      const end = setTimeout(() => setShowShimmer(false), 900);
      return () => {
        clearTimeout(shimmerTimer.current);
        clearTimeout(end);
      };
    }
  }, [variant, disabled]);

  const isGlow = variant === 'glow';

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center font-medium
        transition-all duration-200 overflow-hidden
        ${disabled ? 'opacity-35 cursor-not-allowed blur-[0.5px] saturate-50' : 'disabled:opacity-50 disabled:cursor-not-allowed'}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${!disabled && !isGlow ? 'hover:shadow-xl hover:-translate-y-[1px] active:translate-y-0 active:shadow-md' : ''}
        ${isGlow && !disabled ? 'animate-border-glow btn-glow' : ''}
        ${className}
      `}
      style={isGlow && !disabled ? {
        backgroundClip: 'padding-box',
        boxShadow: '0 0 12px rgba(99,102,241,0.35), 0 0 30px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
      } : undefined}
      {...props}
    >
      {/* Hover gradient overlay (inner shine) */}
      {!disabled && !loading && (
        <span
          className="btn-shine-overlay pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 rounded-[inherit]"
          aria-hidden="true"
        />
      )}

      {/* Mount shimmer gleam */}
      {showShimmer && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          aria-hidden="true"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.18) 60%, transparent 100%)',
            animation: 'glassShimmer 0.7s ease-out forwards',
          }}
        />
      )}

      {/* Glow variant animated border ring */}
      {isGlow && !disabled && (
        <span
          className="pointer-events-none absolute -inset-[1px] rounded-[inherit] opacity-60"
          aria-hidden="true"
          style={{
            background: 'linear-gradient(270deg, #6366F1, #EC4899, #06B6D4, #6366F1)',
            backgroundSize: '600% 600%',
            animation: 'borderGlow 4s ease infinite',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1.5px',
          }}
        />
      )}

      {/* Content */}
      <span className="relative z-10 inline-flex items-center justify-center gap-[inherit]">
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </span>
    </motion.button>
  );
}
