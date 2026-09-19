import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'danger' | 'warning' | 'info' | 'success' | 'indigo';
  pulse?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'indigo',
  pulse = false,
}) => {
  const borderVariants = {
    danger: 'border-red-500/30 hover:border-red-500/60 shadow-red-950/20',
    warning: 'border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/20',
    info: 'border-cyan-500/30 hover:border-cyan-500/60 shadow-cyan-950/20',
    success: 'border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20',
    indigo: 'border-indigo-500/30 hover:border-indigo-500/60 shadow-indigo-950/20',
  };

  const iconVariants = {
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <div
      className={`relative p-5 rounded-2xl bg-obsidian-800/80 backdrop-blur-md border transition-all duration-300 shadow-lg ${
        borderVariants[variant]
      } ${pulse ? 'ring-2 ring-red-500/40 animate-pulse-slow' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${iconVariants[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-gray-400 font-medium">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
