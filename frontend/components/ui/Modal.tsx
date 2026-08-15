'use client';
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl'
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg'
}: ModalProps) {
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-ocean/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full rounded-xl border border-gold/30 bg-white p-6 shadow-2xl transition-all animate-fade-up ${maxWidthClasses[maxWidth]}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="font-display text-xl text-ocean md:text-2xl">{title}</h3>}
            {description && <p className="mt-1 text-sm text-ocean/70">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-ocean/60 transition hover:bg-ocean/5 hover:text-ocean"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
