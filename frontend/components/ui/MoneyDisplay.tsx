import React from 'react';
import { formatMoney } from '@/lib/format';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'ocean' | 'gold' | 'muted' | 'white';
  showSymbol?: boolean;
  className?: string;
  subtext?: string;
}

const sizeClasses = {
  sm: 'text-sm font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-xl font-bold',
  xl: 'text-2xl sm:text-3xl font-bold font-display',
  '2xl': 'text-3xl sm:text-4xl lg:text-5xl font-bold font-display'
};

const variantClasses = {
  ocean: 'text-ocean',
  gold: 'text-[#997D25]',
  muted: 'text-ocean/70',
  white: 'text-white'
};

export default function MoneyDisplay({
  amount,
  size = 'md',
  variant = 'ocean',
  className = '',
  subtext
}: MoneyDisplayProps) {
  const formatted = formatMoney(amount || 0);

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={`tracking-tight tabular-nums ${sizeClasses[size]} ${variantClasses[variant]}`}>
        {formatted}
      </span>
      {subtext && <span className="text-xs font-normal text-ocean/55">{subtext}</span>}
    </span>
  );
}
