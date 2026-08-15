import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills' | 'segmented';
  className?: string;
}

export default function Tabs({
  items,
  activeId,
  onChange,
  variant = 'underline',
  className = ''
}: TabsProps) {
  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex rounded-lg border border-ocean/10 bg-pearl p-1 shadow-inner ${className}`}
        role="tablist"
      >
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all sm:text-sm ${
                isActive
                  ? 'bg-white text-ocean shadow-sm'
                  : 'text-ocean/70 hover:text-ocean'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && <span>{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`} role="tablist">
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all sm:text-sm ${
                isActive
                  ? 'border-gold bg-ocean text-white shadow-sm'
                  : 'border-ocean/15 bg-white text-ocean hover:border-ocean/30'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && <span>{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex overflow-x-auto border-b border-ocean/10 ${className}`} role="tablist">
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold tracking-wide transition-colors ${
              isActive
                ? 'border-gold text-ocean'
                : 'border-transparent text-ocean/60 hover:border-ocean/20 hover:text-ocean'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && <span>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
