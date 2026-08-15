import React from 'react';
import MoneyDisplay from './MoneyDisplay';

interface StatCardProps {
  label: string;
  value?: string | number;
  isMoney?: boolean;
  moneyAmount?: number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  variant?: 'default' | 'gold' | 'ocean' | 'pearl';
  subtext?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  isMoney = false,
  moneyAmount = 0,
  change,
  changeType = 'neutral',
  icon,
  variant = 'default',
  subtext,
  className = ''
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-white border-ocean/10 text-ocean',
    gold: 'bg-gradient-to-br from-gold/10 via-pearl to-white border-gold/40 text-ocean',
    ocean: 'bg-gradient-to-br from-ocean to-ocean-dark border-ocean text-white',
    pearl: 'bg-pearl border-ocean/15 text-ocean'
  };

  const labelColors = {
    default: 'text-ocean/60',
    gold: 'text-[#886915]',
    ocean: 'text-white/70',
    pearl: 'text-ocean/65'
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition hover:shadow-md ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wider ${labelColors[variant]}`}>{label}</p>
          <div className="mt-1.5">
            {isMoney ? (
              <MoneyDisplay
                amount={moneyAmount}
                size="xl"
                variant={variant === 'ocean' ? 'white' : variant === 'gold' ? 'gold' : 'ocean'}
              />
            ) : (
              <div className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{value}</div>
            )}
          </div>
          {subtext && <p className={`mt-1 text-xs ${labelColors[variant]}`}>{subtext}</p>}
        </div>
        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
              variant === 'ocean'
                ? 'border-white/20 bg-white/10 text-gold'
                : 'border-ocean/10 bg-pearl/80 text-ocean'
            }`}
          >
            {icon}
          </div>
        )}
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={
              changeType === 'positive'
                ? 'text-emerald-600'
                : changeType === 'negative'
                ? 'text-rose-600'
                : 'text-ocean/60'
            }
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}
