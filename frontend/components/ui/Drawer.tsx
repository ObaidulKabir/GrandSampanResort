'use client';
import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  position?: 'right' | 'left';
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'half';
  footer?: React.ReactNode;
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  half: 'max-w-3xl lg:max-w-4xl'
};

export default function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  position = 'right',
  width = 'md',
  footer
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex overflow-hidden" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-ocean/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 ${
          position === 'right' ? 'right-0' : 'left-0'
        } flex w-full ${widthClasses[width]} flex-col border-l border-gold/30 bg-white shadow-2xl transition-transform animate-fade-up`}
      >
        <div className="flex items-center justify-between border-b border-ocean/10 bg-pearl px-6 py-4">
          <div>
            {title && <h3 className="font-display text-lg font-bold text-ocean md:text-xl">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-ocean/65">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-lg p-1.5 text-ocean/60 transition hover:bg-ocean/5 hover:text-ocean"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="border-t border-ocean/10 bg-pearl/60 p-4">{footer}</div>}
      </div>
    </div>
  );
}
