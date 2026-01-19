import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
};

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'rounded-full px-5 py-3 transition';
  const variants = {
    primary: 'bg-ocean text-white hover:bg-ocean/90',
    outline: 'border border-gold text-gold hover:bg-gold hover:text-ocean',
    ghost: 'text-ocean hover:text-gold'
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

