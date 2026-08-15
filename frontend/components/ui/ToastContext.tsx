'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev: ToastMessage[]) => prev.filter((t: ToastMessage) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: ToastMessage = { id, message, type, title, duration };
      setToasts((prev: ToastMessage[]) => [...prev, toast]);
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex max-w-sm flex-col gap-2 p-2 sm:bottom-6 sm:right-6"
      >
        {toasts.map((t: ToastMessage) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-fade-up ${
              t.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
                : t.type === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-900'
                : t.type === 'warning'
                ? 'border-amber-200 bg-amber-50/95 text-amber-900'
                : 'border-ocean/15 bg-white/95 text-ocean'
            }`}
          >
            <span className="mt-0.5 shrink-0 text-base">
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '✕'}
              {t.type === 'warning' && '⚠'}
              {t.type === 'info' && 'ℹ'}
            </span>
            <div className="flex-1 text-sm">
              {t.title && <div className="font-semibold">{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-lg leading-none opacity-60 transition hover:opacity-100"
              aria-label="Dismiss toast"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (m: string) => console.log(m),
      success: (m: string) => console.log(m),
      error: (m: string) => console.error(m),
      info: (m: string) => console.log(m)
    };
  }
  return ctx;
}
