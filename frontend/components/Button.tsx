import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
};

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean disabled:opacity-60';
  const variants = {
    primary: 'bg-ocean text-white hover:bg-ocean/90',
    outline: 'border border-gold bg-transparent text-ocean hover:bg-gold/15',
    ghost: 'text-ocean hover:text-gold'
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
