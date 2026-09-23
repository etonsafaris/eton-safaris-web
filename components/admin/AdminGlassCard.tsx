'use client';

import type { ReactNode } from 'react';

export function AdminGlassCard({
  children,
  className = '',
  hoverable,
  onClick,
  style,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const interactive = hoverable || onClick;
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      style={style}
      className={`admin-glass-card relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-gray-700/80 dark:bg-gray-800/50 ${
        interactive
          ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-md'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
