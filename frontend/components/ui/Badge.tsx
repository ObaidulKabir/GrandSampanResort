import React from 'react';

type BadgeVariant = 'gold' | 'ocean' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  gold: 'bg-gold/15 text-[#886915] border border-gold/40',
  ocean: 'bg-ocean/10 text-ocean border border-ocean/20',
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
  warning: 'bg-amber-50 text-amber-800 border border-amber-300',
  danger: 'bg-rose-50 text-rose-800 border border-rose-300',
  neutral: 'bg-stone-100 text-stone-700 border border-stone-200',
  outline: 'bg-transparent text-ocean/80 border border-ocean/25'
};

const dotColors: Record<BadgeVariant, string> = {
  gold: 'bg-[#D4AF37]',
  ocean: 'bg-ocean',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-stone-400',
  outline: 'bg-ocean/60'
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 font-medium tracking-wide',
  md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
  lg: 'text-sm px-3 py-1.5 font-semibold'
};

export default function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2 items-center justify-center">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
}
